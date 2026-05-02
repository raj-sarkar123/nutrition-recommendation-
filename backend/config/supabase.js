const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const anonKey     = process.env.SUPABASE_ANON_KEY;
const serviceKey  = process.env.SUPABASE_SERVICE_ROLE_KEY;

const isValidUrl  = supabaseUrl?.startsWith('https://') && !supabaseUrl.includes('your-project');
const isValidAnon = anonKey?.length > 20 && !anonKey.includes('your-');
const isValidSvc  = serviceKey?.length > 20 && !serviceKey.includes('your-');

if (!isValidUrl || !isValidAnon) {
  console.warn('⚠️  Supabase credentials not configured. Running in demo mode.');
}

// ✅ Use for all user-facing queries — respects RLS
const supabase = (isValidUrl && isValidAnon)
  ? createClient(supabaseUrl, anonKey)
  : null;

// ✅ Use ONLY for admin tasks (no user context) e.g. creating records server-side
const supabaseAdmin = (isValidUrl && isValidSvc)
  ? createClient(supabaseUrl, serviceKey)
  : null;

module.exports = { supabase, supabaseAdmin };