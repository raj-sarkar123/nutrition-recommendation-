// dotenv MUST be loaded before any process.env reads.
// In production the platform injects vars directly into the environment,
// so dotenv is a no-op there — but the order still prevents local breakage.
require('dotenv').config();

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { supabase, supabaseAdmin } = require('../config/supabase');
console.log('supabase:', !!supabase, '| supabaseAdmin:', !!supabaseAdmin);

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

// Fail fast on startup if JWT_SECRET is missing in production.
// A missing secret means every token will be signed with undefined, which
// jwt.sign() converts to the string "undefined" — silently broken in prod.
if (!JWT_SECRET) {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('FATAL: JWT_SECRET environment variable is not set.');
  }
  console.warn('[auth] JWT_SECRET not set — using insecure dev fallback.');
}

const EFFECTIVE_SECRET = JWT_SECRET || 'nutriscan-ai-dev-secret';

// Demo users storage (when Supabase is not configured)
const demoUsers = [];

const generateToken = (user) => {
  return jwt.sign(
    { id: user.id, email: user.email, full_name: user.full_name },
    EFFECTIVE_SECRET,
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

    if (supabaseAdmin) {
      const { data: existing } = await supabaseAdmin
        .from('users')
        .select('id')
        .eq('email', email)
        .single();

      if (existing) {
        return res.status(409).json({ error: 'An account with this email already exists.' });
      }

      const { data: user, error } = await supabaseAdmin
        .from('users')
        .insert({ full_name, email, password_hash })
        .select()
        .single();

      if (error) throw error;

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

    if (supabaseAdmin) {
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
      user = demoUsers.find(u => u.email === email);
      if (!user) {
        return res.status(401).json({ error: 'Invalid email or password.' });
      }
    }

    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    let onboardingCompleted = false;
    if (supabaseAdmin) {
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