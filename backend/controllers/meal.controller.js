const { supabase, supabaseAdmin } = require('../config/supabase');

// ─── client helper ───────────────────────────────────────────────────────────
// All meal operations run server-side (no user JWT in supabase-js client),
// so we must use the service-role client to bypass RLS for writes.
// Falls back to anon client only if supabaseAdmin is not configured.
function getClient() {
  return supabaseAdmin || supabase;
}

// ─── shared helpers ──────────────────────────────────────────────────────────

function todayStr() {
  return new Date().toISOString().split('T')[0];
}

/**
 * Find or create a meal row for (userId, mealType, date).
 * Idempotent — never creates duplicates.
 * Returns the full meal row { id, meal_type, meal_date }.
 */
async function getOrCreateMeal(userId, mealType, date) {
  const db = getClient();

  const { data: existing, error: findErr } = await db
    .from('meals')
    .select('id, meal_type, meal_date')
    .eq('user_id', userId)
    .eq('meal_type', mealType)
    .eq('meal_date', date)
    .maybeSingle();

  if (findErr) throw findErr;
  if (existing) return existing;

  const { data: created, error: createErr } = await db
    .from('meals')
    .insert({ user_id: userId, meal_type: mealType, meal_date: date })
    .select('id, meal_type, meal_date')
    .single();

  if (createErr) throw createErr;
  return created;
}

/**
 * Recalculate totals from raw meal_items and upsert into daily_progress.
 * Requires the unique constraint: UNIQUE (user_id, log_date).
 * Fire-and-forget safe: catches and logs its own errors.
 */
async function syncDailyProgress(userId, date) {
  if (!getClient()) return;
  const db = getClient();

  try {
    const { data: meals } = await db
      .from('meals')
      .select('id')
      .eq('user_id', userId)
      .eq('meal_date', date);

    let totals = {
      total_calories: 0,
      total_protein: 0,
      total_carbs: 0,
      total_fats: 0,
    };

    if (meals?.length) {
      const { data: items } = await db
        .from('meal_items')
        .select('calories, protein, carbs, fats')
        .in('meal_id', meals.map(m => m.id));

      const raw = (items || []).reduce((acc, item) => ({
        total_calories: acc.total_calories + (parseInt(item.calories) || 0),
        total_protein:  acc.total_protein  + (parseFloat(item.protein) || 0),
        total_carbs:    acc.total_carbs    + (parseFloat(item.carbs)   || 0),
        total_fats:     acc.total_fats     + (parseFloat(item.fats)    || 0),
      }), totals);

      // Round macros to 1dp to match DECIMAL(5,1) column precision
      totals = {
        total_calories: raw.total_calories,
        total_protein:  Math.round(raw.total_protein * 10) / 10,
        total_carbs:    Math.round(raw.total_carbs * 10) / 10,
        total_fats:     Math.round(raw.total_fats * 10) / 10,
      };
    }

    const { data: profile } = await db
      .from('user_profiles')
      .select('daily_calorie_target')
      .eq('user_id', userId)
      .maybeSingle();

    const target  = profile?.daily_calorie_target || 2200;
    const goalMet =
      totals.total_calories >= target * 0.9 &&
      totals.total_calories <= target * 1.1;

    const { data: existingProgress } = await db
      .from('daily_progress')
      .select('id')
      .eq('user_id', userId)
      .eq('log_date', date)
      .maybeSingle();

    if (existingProgress) {
      await db
        .from('daily_progress')
        .update({ ...totals, goal_met: goalMet })
        .eq('id', existingProgress.id);
    } else {
      await db
        .from('daily_progress')
        .insert({ user_id: userId, log_date: date, ...totals, goal_met: goalMet });
    }
  } catch (err) {
    console.error('syncDailyProgress error:', err.message);
  }
}

// ─── GET /api/meals  ─────────────────────────────────────────────────────────

exports.getMealsByDate = async (req, res) => {
  try {
    const userId = req.user.id;
    const date   = req.query.date || todayStr();
    const db     = getClient();

    if (!db) {
      return res.json({
        breakfast: { id: 'demo-breakfast', meal_type: 'breakfast', meal_date: date, items: [] },
        lunch:     { id: 'demo-lunch',     meal_type: 'lunch',     meal_date: date, items: [] },
        dinner:    { id: 'demo-dinner',    meal_type: 'dinner',    meal_date: date, items: [] },
        snack:     { id: 'demo-snack',     meal_type: 'snack',     meal_date: date, items: [] },
      });
    }

    const { data: meals, error } = await db
      .from('meals')
      .select(`
        id, meal_type, meal_date, created_at,
        meal_items (
          id, food_name, quantity, calories,
          protein, carbs, fats, image_url, source, created_at
        )
      `)
      .eq('user_id', userId)
      .eq('meal_date', date)
      .order('created_at');

    if (error) throw error;

    const grouped = {
      breakfast: null,
      lunch:     null,
      dinner:    null,
      snack:     null,
    };

    for (const meal of meals || []) {
      grouped[meal.meal_type] = {
        ...meal,
        items: (meal.meal_items || [])
          .sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
          .map(item => ({
            ...item,
            // Supabase returns DECIMAL as strings — coerce to numbers
            calories: parseInt(item.calories) || 0,
            protein:  parseFloat(item.protein) || 0,
            carbs:    parseFloat(item.carbs) || 0,
            fats:     parseFloat(item.fats) || 0,
          })),
      };
    }

    // Ensure this list includes 'snack'
for (const mealType of ['breakfast', 'lunch', 'dinner', 'snack']) {
  if (!grouped[mealType]) {
    const row = await getOrCreateMeal(userId, mealType, date);
    grouped[mealType] = { ...row, items: [] };
  }
}

    return res.json(grouped);
  } catch (error) {
    console.error('getMealsByDate error:', error);
    return res.status(500).json({ error: 'Failed to fetch meals.' });
  }
};

// ─── POST /api/meals  ────────────────────────────────────────────────────────

exports.createMeal = async (req, res) => {
  try {
    const userId              = req.user.id;
    const { meal_type, meal_date } = req.body;
    const db                  = getClient();

    if (!meal_type) {
      return res.status(400).json({ error: 'Meal type is required.' });
    }

    const date = meal_date || todayStr();

    if (!db) {
      return res.status(201).json({
        id: `demo-${meal_type}`,
        meal_type,
        meal_date: date,
        items: [],
      });
    }

    const row = await getOrCreateMeal(userId, meal_type, date);
    return res.status(201).json({ ...row, items: [] });
  } catch (error) {
    console.error('createMeal error:', error);
    return res.status(500).json({ error: 'Failed to create meal.' });
  }
};

// ─── POST /api/meals/:mealId/items  ─────────────────────────────────────────

exports.addMealItem = async (req, res) => {
  try {
    const { mealId } = req.params;
    const db = getClient();
    const {
      food_name, quantity, calories,
      protein, carbs, fats, image_url, source,
    } = req.body;

    if (!food_name || calories === undefined) {
      return res.status(400).json({ error: 'Food name and calories are required.' });
    }

    if (!mealId || mealId === 'undefined' || mealId === 'null') {
      return res.status(400).json({ error: 'Invalid meal ID.' });
    }

    if (!db) {
      return res.status(201).json({
        id:        `demo-item-${Date.now()}`,
        meal_id:   mealId,
        food_name,
        quantity:  quantity || '1 serving',
        calories:  parseInt(calories) || 0,
        protein:   parseFloat(protein) || 0,
        carbs:     parseFloat(carbs) || 0,
        fats:      parseFloat(fats) || 0,
        source:    source || 'manual',
      });
    }

    const { data: item, error: itemErr } = await db
      .from('meal_items')
      .insert({
        meal_id:   mealId,
        user_id: req.user.id,
        food_name,
        quantity:  quantity || '1 serving',
        calories:  parseInt(calories) || 0,
        protein:   parseFloat(protein) || 0,
        carbs:     parseFloat(carbs) || 0,
        fats:      parseFloat(fats) || 0,
        image_url: image_url || null,
        source:    source || 'manual',
      })
      .select()
      .single();

    if (itemErr) throw itemErr;

    const { data: meal } = await db
      .from('meals')
      .select('user_id, meal_date')
      .eq('id', mealId)
      .single();

    if (meal) {
      await syncDailyProgress(meal.user_id, meal.meal_date);
    }

    return res.status(201).json({
      ...item,
      calories: parseInt(item.calories) || 0,
      protein:  parseFloat(item.protein) || 0,
      carbs:    parseFloat(item.carbs) || 0,
      fats:     parseFloat(item.fats) || 0,
    });
  } catch (error) {
    console.error('addMealItem error:', error);
    return res.status(500).json({ error: 'Failed to add meal item.' });
  }
};

// ─── POST /api/meals/quick-add  ─────────────────────────────────────────────

exports.quickAddItem = async (req, res) => {
  try {
    const userId = req.user.id;
    const db     = getClient();
    const {
      meal_type = 'lunch',
      food_name, calories,
      protein, carbs, fats, source,
    } = req.body;

    if (!food_name || calories === undefined) {
      return res.status(400).json({ error: 'Food name and calories are required.' });
    }

    const date = todayStr();

    if (!db) {
      return res.status(201).json({
        id:        `demo-item-${Date.now()}`,
        food_name,
        calories:  parseInt(calories) || 0,
        protein:   parseFloat(protein) || 0,
        carbs:     parseFloat(carbs) || 0,
        fats:      parseFloat(fats) || 0,
        source:    source || 'scan',
      });
    }

    const meal = await getOrCreateMeal(userId, meal_type, date);

    const { data: item, error: itemErr } = await db
      .from('meal_items')
      .insert({
        meal_id:  meal.id,
        user_id: userId,
        food_name,
        quantity: '1 serving',
        calories: parseInt(calories) || 0,
        protein:  parseFloat(protein) || 0,
        carbs:    parseFloat(carbs) || 0,
        fats:     parseFloat(fats) || 0,
        source:   source || 'scan',
      })
      .select()
      .single();

    if (itemErr) throw itemErr;

    await syncDailyProgress(userId, date);

    return res.status(201).json({
      ...item,
      calories: parseInt(item.calories) || 0,
      protein:  parseFloat(item.protein) || 0,
      carbs:    parseFloat(item.carbs) || 0,
      fats:     parseFloat(item.fats) || 0,
    });
  } catch (error) {
    console.error('quickAddItem error:', error);
    return res.status(500).json({ error: 'Failed to add item.' });
  }
};

// ─── DELETE /api/meals/items/:itemId  ───────────────────────────────────────

exports.removeMealItem = async (req, res) => {
  try {
    const { itemId } = req.params;
    const db = getClient();

    if (!db) {
      return res.json({ message: 'Item removed.' });
    }

    const { data: item } = await db
      .from('meal_items')
      .select('meal_id')
      .eq('id', itemId)
      .single();

    const { error } = await db
      .from('meal_items')
      .delete()
      .eq('id', itemId);

    if (error) throw error;

    if (item?.meal_id) {
      const { data: meal } = await db
        .from('meals')
        .select('user_id, meal_date')
        .eq('id', item.meal_id)
        .single();

      if (meal) {
        await syncDailyProgress(meal.user_id, meal.meal_date);
      }
    }

    return res.json({ message: 'Item removed.' });
  } catch (error) {
    console.error('removeMealItem error:', error);
    return res.status(500).json({ error: 'Failed to remove item.' });
  }
};