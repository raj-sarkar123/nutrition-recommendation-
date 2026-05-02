const { supabaseAdmin: supabase } = require('../config/supabase');

exports.getProfile = async (req, res) => {
  try {
    const userId = req.user.id;

    if (supabase) {
      const { data: user, error: userError } = await supabase
        .from('users')
        .select('id, full_name, email, avatar_url, membership_tier, created_at')
        .eq('id', userId)
        .maybeSingle();

      if (userError) throw userError;
      if (!user) return res.status(404).json({ error: 'User not found' });

      const { data: profile, error: profileError } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (profileError) throw profileError;

      return res.json({ ...user, profile: profile || {} });
    } else {
      return res.json({
        id: userId,
        full_name: req.user.full_name,
        email: req.user.email,
        avatar_url: null,
        membership_tier: 'premium',
        profile: {
          goal: 'lose',
          current_weight: 64.2,
          height: 168,
          target_weight: 62.0,
          daily_calorie_target: 2200,
          protein_target: 120,
          carbs_target: 200,
          fats_target: 65,
          dietary_preferences: ['Keto'],
          onboarding_completed: true
        }
      });
    }
  } catch (error) {
    console.error('Get profile error:', error);
    return res.status(500).json({ error: 'Failed to fetch profile.' });
  }
};

exports.updateProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const { full_name, avatar_url, current_weight, target_weight, goal, daily_calorie_target, protein_target, carbs_target, fats_target } = req.body;

    if (supabase) {
      // Update user table fields
      if (full_name || avatar_url) {
        const userUpdates = {};
        if (full_name) userUpdates.full_name = full_name;
        if (avatar_url) userUpdates.avatar_url = avatar_url;
        userUpdates.updated_at = new Date().toISOString();

        await supabase.from('users').update(userUpdates).eq('id', userId);
      }

      // Update profile fields
      const profileUpdates = { updated_at: new Date().toISOString() };
      if (current_weight !== undefined) profileUpdates.current_weight = current_weight;
      if (target_weight !== undefined) profileUpdates.target_weight = target_weight;
      if (goal) profileUpdates.goal = goal;
      if (daily_calorie_target) profileUpdates.daily_calorie_target = daily_calorie_target;
      if (protein_target) profileUpdates.protein_target = protein_target;
      if (carbs_target) profileUpdates.carbs_target = carbs_target;
      if (fats_target) profileUpdates.fats_target = fats_target;

      await supabase.from('user_profiles').update(profileUpdates).eq('user_id', userId);

      return res.json({ message: 'Profile updated successfully.' });
    } else {
      return res.json({ message: 'Profile updated successfully (demo mode).' });
    }
  } catch (error) {
    console.error('Update profile error:', error);
    return res.status(500).json({ error: 'Failed to update profile.' });
  }
};

exports.saveOnboarding = async (req, res) => {
  try {
    const userId = req.user.id;
    const { goal, current_weight, height, dietary_preferences } = req.body;

    if (!goal) {
      return res.status(400).json({ error: 'Please select a goal.' });
    }

    // Compute calorie targets based on goal
    let daily_calorie_target = 2200;
    let protein_target = 120;
    let carbs_target = 200;
    let fats_target = 65;

    if (goal === 'lose') {
      daily_calorie_target = 1800;
      protein_target = 140;
      carbs_target = 150;
      fats_target = 55;
    } else if (goal === 'gain') {
      daily_calorie_target = 2800;
      protein_target = 160;
      carbs_target = 300;
      fats_target = 80;
    }

    if (supabase) {
      const { error } = await supabase
        .from('user_profiles')
        .update({
          goal,
          current_weight: current_weight || null,
          height: height || null,
          dietary_preferences: dietary_preferences || [],
          daily_calorie_target,
          protein_target,
          carbs_target,
          fats_target,
          onboarding_completed: true,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId);

      if (error) throw error;
    }

    return res.json({
      message: 'Onboarding completed successfully.',
      profile: {
        goal,
        daily_calorie_target,
        protein_target,
        carbs_target,
        fats_target,
        dietary_preferences: dietary_preferences || []
      }
    });
  } catch (error) {
    console.error('Onboarding error:', error);
    return res.status(500).json({ error: 'Failed to save onboarding data.' });
  }
};
