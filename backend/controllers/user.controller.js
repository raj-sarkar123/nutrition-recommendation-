const { supabaseAdmin: supabase } = require('../config/supabase');

// ─── existing controllers (unchanged) ────────────────────────────────────────

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
          onboarding_completed: true,
        },
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
    const {
      full_name, avatar_url,
      current_weight, target_weight, goal,
      daily_calorie_target, protein_target, carbs_target, fats_target,
    } = req.body;

    if (supabase) {
      if (full_name || avatar_url) {
        const userUpdates = {};
        if (full_name)   userUpdates.full_name   = full_name;
        if (avatar_url)  userUpdates.avatar_url  = avatar_url;
        userUpdates.updated_at = new Date().toISOString();
        await supabase.from('users').update(userUpdates).eq('id', userId);
      }

      const profileUpdates = { updated_at: new Date().toISOString() };
      if (current_weight       !== undefined) profileUpdates.current_weight       = current_weight;
      if (target_weight        !== undefined) profileUpdates.target_weight        = target_weight;
      if (goal)                               profileUpdates.goal                 = goal;
      if (daily_calorie_target)               profileUpdates.daily_calorie_target = daily_calorie_target;
      if (protein_target)                     profileUpdates.protein_target       = protein_target;
      if (carbs_target)                       profileUpdates.carbs_target         = carbs_target;
      if (fats_target)                        profileUpdates.fats_target          = fats_target;

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

    if (!goal) return res.status(400).json({ error: 'Please select a goal.' });

    let daily_calorie_target = 2200, protein_target = 120, carbs_target = 200, fats_target = 65;
    if (goal === 'lose') { daily_calorie_target = 1800; protein_target = 140; carbs_target = 150; fats_target = 55; }
    if (goal === 'gain') { daily_calorie_target = 2800; protein_target = 160; carbs_target = 300; fats_target = 80; }

    if (supabase) {
      const { error } = await supabase
        .from('user_profiles')
        .update({
          goal,
          current_weight: current_weight || null,
          height: height || null,
          dietary_preferences: dietary_preferences || [],
          daily_calorie_target, protein_target, carbs_target, fats_target,
          onboarding_completed: true,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', userId);

      if (error) throw error;
    }

    return res.json({
      message: 'Onboarding completed successfully.',
      profile: { goal, daily_calorie_target, protein_target, carbs_target, fats_target, dietary_preferences: dietary_preferences || [] },
    });
  } catch (error) {
    console.error('Onboarding error:', error);
    return res.status(500).json({ error: 'Failed to save onboarding data.' });
  }
};

// ─── NEW: uploadAvatar ────────────────────────────────────────────────────────
//
// Receives a multipart/form-data request with field "avatar" (handled by
// multer memoryStorage in upload.js middleware, applied in user.routes.js).
//
// Flow:
//   1. Validate file present
//   2. Upload buffer to Supabase Storage bucket "avatars" at path "{userId}"
//      (upsert: true so re-uploads overwrite the old file — no stale URLs)
//   3. Get the public URL from Supabase
//   4. Write avatar_url back to users table
//   5. Return { avatar_url } to frontend
//
exports.uploadAvatar = async (req, res) => {
  try {
    const userId = req.user.id;

    if (!req.file) {
      return res.status(400).json({ error: 'No image file provided.' });
    }

    const { buffer, mimetype, originalname } = req.file;
    const ext = originalname.split('.').pop() || mimetype.split('/')[1] || 'jpg';

    // Better path structure
    const storagePath = `${userId}/avatar.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(storagePath, buffer, {
        contentType: mimetype,
        upsert: true,
        cacheControl: '0', // 👈 disable caching
      });

    if (uploadError) {
      console.error(uploadError);
      return res.status(500).json({ error: 'Upload failed' });
    }

    const { data } = supabase.storage
      .from('avatars')
      .getPublicUrl(storagePath);

    // 🔥 CRITICAL: cache busting
    const avatar_url = `${data.publicUrl}?t=${Date.now()}`;

    await supabase
      .from('users')
      .update({ avatar_url, updated_at: new Date().toISOString() })
      .eq('id', userId);

    return res.json({ avatar_url });

  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Failed to upload avatar' });
  }
};
exports.removeAvatar = async (req, res) => {
  try {
    const userId = req.user.id;

    // 1. Get current avatar URL from DB
    const { data: user, error: fetchError } = await supabase
      .from('users')
      .select('avatar_url')
      .eq('id', userId)
      .single();

    if (fetchError) throw fetchError;

    if (user?.avatar_url) {
      // 2. Extract file path from URL
      // Example URL:
      // https://xxxx.supabase.co/storage/v1/object/public/avatars/userId/avatar.jpg?t=123

      const url = user.avatar_url.split('?')[0]; // remove cache param
      const path = url.split('/avatars/')[1]; // get "userId/avatar.jpg"

      if (path) {
        await supabase.storage.from('avatars').remove([path]);
      }
    }

    // 3. Remove from DB
    await supabase
      .from('users')
      .update({ avatar_url: null, updated_at: new Date().toISOString() })
      .eq('id', userId);

    return res.json({ success: true });

  } catch (error) {
    console.error('Remove avatar error:', error);
    return res.status(500).json({ error: 'Failed to remove avatar' });
  }
};