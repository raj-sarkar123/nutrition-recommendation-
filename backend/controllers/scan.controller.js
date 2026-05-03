const { createClient } = require('@supabase/supabase-js');
const path = require('path');
const { supabase, supabaseAdmin } = require('../config/supabase');
const { analyzeMenu, retryWithFix } = require('../services/analysis.groq.service');
const { preprocessImage } = require('../services/imagePreprocess.service');
const { parseGeminiResponse } = require('../services/parser.service');
const { generateHash, getCache, setCache } = require('../services/cache.service');

// Helper — build a user-scoped Supabase client that respects RLS
// const getUserClient = (req) =>
//   createClient(
//     process.env.SUPABASE_URL,
//     process.env.SUPABASE_ANON_KEY,
//     {
//       global: {
//         headers: {
//           Authorization: `Bearer ${req.headers.authorization?.split(' ')[1]}`,
//         },
//       },
//     }
//   );

// ── Upload & Analyse ──────────────────────────────────────────────────────────
exports.uploadAndAnalyze = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image uploaded.' });
    }

    const rawBuffer = req.file.buffer;
    const imageHash = generateHash(rawBuffer);

    // Cache hit
    const cached = getCache(imageHash);
    if (cached) {
      return res.json({ ...cached, from_cache: true });
    }

    // Pre-process
    const processedBuffer = await preprocessImage(rawBuffer);

    // Fetch user profile for personalised scoring (admin client — internal read)
    let userProfile = {};
    if (supabaseAdmin && req.user?.id) {
      const { data: profile } = await supabaseAdmin
        .from('user_profiles')
        .select('goal, daily_calorie_target, protein_target, carbs_target, fats_target, dietary_preferences')
        .eq('user_id', req.user.id)
        .single();
      if (profile) userProfile = profile;
    }

    // Call Groq
    let parsed;
    try {
      const rawText = await analyzeMenu(processedBuffer, userProfile);
      parsed = await parseGeminiResponse(rawText, retryWithFix);
    } catch (groqErr) {
      console.error('Groq failed, falling back to local DB:', groqErr.message);
      // local analysis.service.js fallback would go here if needed
      return res.status(503).json({ error: 'AI analysis temporarily unavailable. Please try again.' });
    }

    const items = parsed?.extracted_items || [];
    if (!items.length) {
      return res.status(422).json({ error: 'No menu items could be detected. Please try a clearer image.' });
    }

    // Persist to Supabase (admin client — writes on behalf of user)
    let scanId = null;
    if (supabaseAdmin && req.user?.id) {
      // 1. Create menu_scan record
      const { data: scanRecord, error: scanErr } = await supabaseAdmin
        .from('menu_scans')
        .insert({
          user_id: req.user.id,
          image_url: req.file.originalname || 'uploaded_menu.jpg',
          status: 'completed',
          scan_progress: 100,
          scan_name: req.file.originalname || 'Scanned Menu',
        })
        .select('id')
        .single();

      if (scanErr) console.error('menu_scans insert error:', scanErr);
      else scanId = scanRecord.id;

      // 2. Bulk insert scan_results
      if (scanId) {
        const rows = items.map(item => ({
          scan_id: scanId,
          food_name: item.food_name,
          description: item.description || null,
          calories: item.calories || 0,
          protein: item.protein || 0,
          net_carbs: item.net_carbs || 0,
          fats: item.fats || 0,
          fiber: item.fiber || 0,
          sodium: item.sodium || null,
          score: item.score || 50,
          classification: item.classification || 'moderate',
          tags: item.tags || [],
        }));

        const { error: resultsErr } = await supabaseAdmin
          .from('scan_results')
          .insert(rows);

        if (resultsErr) console.error('scan_results insert error:', resultsErr);
      }
    }

    const response = {
      scan_id: scanId,
      extracted_items: items,
      total_items: items.length,
    };

    setCache(imageHash, response);
    return res.json(response);

  } catch (err) {
    console.error('Scan error:', err);
    return res.status(500).json({ error: 'Scan failed. Please try again.' });
  }
};

// ── History ───────────────────────────────────────────────────────────────────
exports.getScanHistory = async (req, res) => {
  try {
    if (!req.user?.id) return res.json({ history: [] });

    const { data, error } = await supabaseAdmin  // ← was getUserClient(req)
      .from('scan_history')
      .select('*')
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) throw error;
    return res.json({ history: data || [] });
  } catch (err) {
    console.error('Scan history error:', err);
    return res.status(500).json({ error: 'Failed to fetch scan history.' });
  }
};

// ── Single Scan Result ────────────────────────────────────────────────────────
exports.getScanResult = async (req, res) => {
  try {
    const { scanId } = req.params;
    if (!req.user?.id) return res.status(401).json({ error: 'Unauthorized.' });

    const { data: scan, error: scanErr } = await supabaseAdmin  // ← was getUserClient
      .from('menu_scans')
      .select('id, status, created_at, image_url')
      .eq('id', scanId)
      .eq('user_id', req.user.id)  // still manually enforce ownership
      .single();

    if (scanErr || !scan) return res.status(404).json({ error: 'Scan not found.' });

    const { data: results } = await supabaseAdmin  // ← was getUserClient
      .from('scan_results')
      .select('*')
      .eq('scan_id', scanId)
      .order('score', { ascending: false });

    return res.json({
      scan_id: scan.id,
      status: scan.status,
      created_at: scan.created_at,
      extracted_items: results || [],
    });
  } catch (err) {
    console.error('Get scan result error:', err);
    return res.status(500).json({ error: 'Failed to fetch scan result.' });
  }
};