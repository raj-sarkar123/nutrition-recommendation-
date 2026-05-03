const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { supabase, supabaseAdmin } = require('../config/supabase');
console.log('supabase:', !!supabase, '| supabaseAdmin:', !!supabaseAdmin);
require('dotenv').config();

const JWT_SECRET = process.env.JWT_SECRET || 'nutriscan-ai-dev-secret';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

// Demo users storage (when Supabase is not configured)
const demoUsers = [];

const generateToken = (user) => {
  return jwt.sign(
    { id: user.id, email: user.email, full_name: user.full_name },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
};

exports.signup = async (req, res) => {
  try {
    const { full_name, email, password } = req.body;

    if (!full_name || !email || !password) {
      return res.status(400).json({ error: 'All fields are required.' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters.' });
    }

    const password_hash = await bcrypt.hash(password, 12);

    if (supabase) {
      // Check if user exists
      const { data: existing } = await supabaseAdmin  
        .from('users')
        .select('id')
        .eq('email', email)
        .single();

      if (existing) {
        return res.status(409).json({ error: 'An account with this email already exists.' });
      }

      // Create user
      const { data: user, error } = await supabaseAdmin
        .from('users')
        .insert({ full_name, email, password_hash })
        .select()
        .single();

      if (error) throw error;

      // Create empty profile
      await supabaseAdmin
        .from('user_profiles')
        .insert({ user_id: user.id });

      const token = generateToken(user);
      return res.status(201).json({
        message: 'Account created successfully.',
        token,
        user: { id: user.id, full_name: user.full_name, email: user.email }
      });
    } else {
      // Demo mode
      const exists = demoUsers.find(u => u.email === email);
      if (exists) {
        return res.status(409).json({ error: 'An account with this email already exists.' });
      }

      const user = {
        id: require('crypto').randomUUID(),
        full_name,
        email,
        password_hash,
        created_at: new Date().toISOString()
      };
      demoUsers.push(user);

      const token = generateToken(user);
      return res.status(201).json({
        message: 'Account created successfully (demo mode).',
        token,
        user: { id: user.id, full_name: user.full_name, email: user.email }
      });
    }
  } catch (error) {
    console.error('Signup error:', error);
    return res.status(500).json({ error: 'Internal server error.' });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    let user;

    if (supabase) {
      const { data, error } = await supabaseAdmin  
        .from('users')
        .select('*')
        .eq('email', email)
        .single();

      if (error || !data) {
        return res.status(401).json({ error: 'Invalid email or password.' });
      }
      user = data;
    } else {
      // Demo mode
      user = demoUsers.find(u => u.email === email);
      if (!user) {
        return res.status(401).json({ error: 'Invalid email or password.' });
      }
    }

    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    // Check onboarding status
    let onboardingCompleted = false;
    if (supabase) {
      const { data: profile } = await supabaseAdmin  
        .from('user_profiles')
        .select('onboarding_completed')
        .eq('user_id', user.id)
        .single();
      onboardingCompleted = profile?.onboarding_completed || false;
    }

    const token = generateToken(user);
    return res.json({
      message: 'Login successful.',
      token,
      user: {
        id: user.id,
        full_name: user.full_name,
        email: user.email,
        avatar_url: user.avatar_url,
        membership_tier: user.membership_tier
      },
      onboarding_completed: onboardingCompleted
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ error: 'Internal server error.' });
  }
};
