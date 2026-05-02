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
        .single();

      const { data: profile } = await supabase
        .from('user_profiles')
        .select('daily_calorie_target, protein_target, carbs_target, fats_target')
        .eq('user_id', userId)
        .single();

      return res.json({
        progress: progress || { total_calories: 0, total_protein: 0, total_carbs: 0, total_fats: 0 },
        targets: profile || { daily_calorie_target: 2200, protein_target: 120, carbs_target: 200, fats_target: 65 }
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
          calories: p?.total_calories || 0,
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
      // Get recent goal_met days in descending order
      const { data: progress } = await supabase
        .from('daily_progress')
        .select('log_date, goal_met')
        .eq('user_id', userId)
        .order('log_date', { ascending: false })
        .limit(30);

      let streak = 0;
      if (progress) {
        for (const day of progress) {
          if (day.goal_met) {
            streak++;
          } else {
            break;
          }
        }
      }

      return res.json({ streak });
    } else {
      return res.json({ streak: 12 }); // Demo: matching progress screen
    }
  } catch (error) {
    console.error('Get streak error:', error);
    return res.status(500).json({ error: 'Failed to fetch streak.' });
  }
};
