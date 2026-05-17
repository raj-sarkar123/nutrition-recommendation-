const { supabaseAdmin: supabase } = require('../config/supabase');

exports.getDailyProgress = async (req, res) => {
  try {
    const userId = req.user.id;
    const date = req.query.date || new Date().toISOString().split('T')[0];

    if (supabase) {
      const { data: progress } = await supabase
        .from('daily_progress')
        .select('*')
        .eq('user_id', userId)
        .eq('log_date', date)
        .maybeSingle();

      const { data: profile } = await supabase
        .from('user_profiles')
        .select('daily_calorie_target, protein_target, carbs_target, fats_target')
        .eq('user_id', userId)
        .maybeSingle();

      // Supabase returns DECIMAL columns as strings — coerce to numbers
      const normalizedProgress = progress ? {
        total_calories: parseInt(progress.total_calories) || 0,
        total_protein:  parseFloat(progress.total_protein) || 0,
        total_carbs:    parseFloat(progress.total_carbs) || 0,
        total_fats:     parseFloat(progress.total_fats) || 0,
        goal_met:       progress.goal_met || false,
      } : { total_calories: 0, total_protein: 0, total_carbs: 0, total_fats: 0, goal_met: false };

      const normalizedTargets = profile ? {
        daily_calorie_target: parseInt(profile.daily_calorie_target) || 2200,
        protein_target:       parseInt(profile.protein_target) || 120,
        carbs_target:         parseInt(profile.carbs_target) || 200,
        fats_target:          parseInt(profile.fats_target) || 65,
      } : { daily_calorie_target: 2200, protein_target: 120, carbs_target: 200, fats_target: 65 };

      return res.json({
        progress: normalizedProgress,
        targets: normalizedTargets
      });
    } else {
      // Demo data matching home_nova_refined screen
      return res.json({
        progress: {
          total_calories: 780,
          total_protein: 84,
          total_carbs: 110,
          total_fats: 42,
          goal_met: false
        },
        targets: {
          daily_calorie_target: 2200,
          protein_target: 120,
          carbs_target: 200,
          fats_target: 65
        }
      });
    }
  } catch (error) {
    console.error('Get daily progress error:', error);
    return res.status(500).json({ error: 'Failed to fetch progress.' });
  }
};

exports.getWeeklyProgress = async (req, res) => {
  try {
    const userId = req.user.id;

    // Get last 7 days
    const days = [];
    const dayNames = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      days.push({
        date: date.toISOString().split('T')[0],
        day: dayNames[date.getDay()]
      });
    }

    if (supabase) {
      const dates = days.map(d => d.date);
      const { data: progress } = await supabase
        .from('daily_progress')
        .select('log_date, total_calories, goal_met')
        .eq('user_id', userId)
        .in('log_date', dates)
        .order('log_date');

      const weeklyData = days.map(day => {
        const p = progress?.find(p => p.log_date === day.date);
        return {
          day: day.day,
          date: day.date,
          calories: parseInt(p?.total_calories) || 0,
          goal_met: p?.goal_met || false
        };
      });

      return res.json({ weekly: weeklyData });
    } else {
      // Demo data matching progress_nova_refined screen
      return res.json({
        weekly: [
          { day: 'MON', calories: 1800, goal_met: true },
          { day: 'TUE', calories: 2100, goal_met: true },
          { day: 'WED', calories: 1200, goal_met: false },
          { day: 'THU', calories: 2400, goal_met: true },
          { day: 'FRI', calories: 1900, goal_met: true },
          { day: 'SAT', calories: 800, goal_met: false },
          { day: 'SUN', calories: 1400, goal_met: false }
        ]
      });
    }
  } catch (error) {
    console.error('Get weekly progress error:', error);
    return res.status(500).json({ error: 'Failed to fetch weekly progress.' });
  }
};

exports.getStreak = async (req, res) => {
  try {
    const userId = req.user.id;

    if (supabase) {
      const { data: progress } = await supabase
        .from('daily_progress')
        .select('log_date, goal_met')
        .eq('user_id', userId)
        .order('log_date', { ascending: false })
        .limit(60); // enough for 2 months

      let streak = 0;

      if (progress?.length) {
        // Build a Set of dates where goal was met
        const metDates = new Set(
          progress.filter(d => d.goal_met).map(d => d.log_date)
        );

        // Walk backwards from yesterday (today might not be complete yet)
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Start from today — if today's goal is met count it, else start from yesterday
        const todayStr = today.toISOString().split('T')[0];
        let checkFrom = metDates.has(todayStr) ? 0 : 1;

        for (let i = checkFrom; i < 60; i++) {
          const d = new Date(today);
          d.setDate(today.getDate() - i);
          const dateStr = d.toISOString().split('T')[0];
          if (metDates.has(dateStr)) {
            streak++;
          } else {
            break; // gap found — streak ends
          }
        }
      }

      return res.json({ streak });
    } else {
      return res.json({ streak: 12 });
    }
  } catch (error) {
    console.error('Get streak error:', error);
    return res.status(500).json({ error: 'Failed to fetch streak.' });
  }
};

exports.generateAiInsight = async (req, res) => {
  try {
    const { meals, progress, targets } = req.body;
    
    const allItems = Object.values(meals || {})
      .flatMap((m) => m?.items || [])
      .map((i) => `${i.food_name} (${i.calories} kcal, P:${i.protein}g C:${i.carbs}g F:${i.fats}g)`);
      
    const prompt = `You are a friendly, concise nutritionist AI. Analyze the user's food log and give ONE specific, actionable insight in 2–3 sentences. Be conversational, warm, and specific to the actual foods eaten. No generic advice. No bullet points. No markdown. No intro phrases like "Based on your log".\n\nToday's food log:\n${allItems.join('\\n')}\n\nCalorie target: ${targets?.daily_calorie_target} kcal | Consumed: ${progress?.total_calories} kcal\nProtein: ${progress?.total_protein}g / ${targets?.protein_target}g | Carbs: ${progress?.total_carbs}g / ${targets?.carbs_target}g | Fats: ${progress?.total_fats}g / ${targets?.fats_target}g`;

    const { GoogleGenerativeAI } = require('@google/genai');
    // Using global fetch or standard fetch logic if GoogleGenerativeAI is an SDK
    // But @google/genai syntax: const { GoogleGenAI } = require('@google/genai'); const ai = new GoogleGenAI(); ...
    // Wait, let's use global fetch for Gemini API directly or just Groq since maybe they still have Groq SDK?
    // Wait, the backend package.json has "@google/genai": "^1.50.1"
    const ai = new (require('@google/genai').GoogleGenAI)({ apiKey: process.env.GEMINI_API_KEY });
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });
    
    return res.json({ insight: response.text });
  } catch (error) {
    console.error('AI Insight error:', error);
    return res.status(500).json({ error: 'Failed to generate insight.' });
  }
};

