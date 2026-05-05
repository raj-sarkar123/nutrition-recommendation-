-- NutriScan AI Database Schema
-- Derived from UI screens: login, signup, onboarding, dashboard, scan, analysis, tracker, progress, profile

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- USERS TABLE
-- Source: signup_nova_edition (Full Identity, Medical Email, Secure Passkey)
--         profile_nova_refined (avatar, membership tier)
-- ============================================================
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  full_name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  avatar_url TEXT,
  membership_tier VARCHAR(50) DEFAULT 'free',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- USER PROFILES TABLE
-- Source: onboarding_nova_refined (goal, weight, height, dietary prefs)
--         profile_nova_refined (target weight, calorie/macro targets)
--         home_nova_refined (macro targets: protein 120g, carbs 200g, fats 65g)
-- ============================================================
CREATE TABLE user_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  goal VARCHAR(50),
  current_weight DECIMAL(5,1),
  height DECIMAL(5,1),
  daily_calorie_target INTEGER DEFAULT 2200,
  protein_target INTEGER DEFAULT 120,
  carbs_target INTEGER DEFAULT 200,
  fats_target INTEGER DEFAULT 65,
  dietary_preferences TEXT[] DEFAULT '{}',
  onboarding_completed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- MEALS TABLE
-- Source: meal_tracker_nova_refined (Breakfast, Lunch, Dinner sections)
-- ============================================================
CREATE TABLE meals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  meal_type VARCHAR(20) NOT NULL CHECK (meal_type IN ('breakfast', 'lunch', 'dinner', 'snack')),
  meal_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- MEAL ITEMS TABLE
-- Source: meal_tracker_nova_refined (Avocado Sourdough: 2 slices, 320 kcal)
--         (Quinoa Power Bowl: 450g, 612 kcal)
-- ============================================================
CREATE TABLE meal_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  meal_id UUID REFERENCES meals(id) ON DELETE CASCADE,
  food_name VARCHAR(255) NOT NULL,
  quantity VARCHAR(100),
  calories INTEGER NOT NULL DEFAULT 0,
  protein DECIMAL(5,1) DEFAULT 0,
  carbs DECIMAL(5,1) DEFAULT 0,
  fats DECIMAL(5,1) DEFAULT 0,
  image_url TEXT,
  source VARCHAR(50) DEFAULT 'manual' CHECK (source IN ('manual', 'scan', 'ai_verified')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- MENU SCANS TABLE
-- Source: menu_scan_nova_edition (image upload, OCR progress 84%, status)
-- ============================================================
CREATE TABLE menu_scans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  image_url TEXT,
  raw_ocr_text TEXT,
  status VARCHAR(20) DEFAULT 'processing' CHECK (status IN ('processing', 'completed', 'failed')),
  scan_progress INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- SCAN RESULTS TABLE
-- Source: analysis_nova_refined
--   - Mediterranean Quinoa Power Bowl: 98/100, 420 kcal, 32g protein, 18g carbs, "Nova's Pick"
--   - Grilled Chicken & Nut Salad: "Safe", 380 kcal, "High Fiber"
--   - Miso Glazed Atlantic Salmon: "Moderate", 510 kcal, "High Sodium"
--   - Nova Signature Burger: "Avoid", "Exceeds Fat Budget"
-- ============================================================
CREATE TABLE scan_results (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  scan_id UUID REFERENCES menu_scans(id) ON DELETE CASCADE,
  food_name VARCHAR(255) NOT NULL,
  description TEXT,
  calories INTEGER,
  protein DECIMAL(5,1),
  net_carbs DECIMAL(5,1),
  fats DECIMAL(5,1),
  fiber DECIMAL(5,1),
  sodium INTEGER,
  score INTEGER,
  classification VARCHAR(20) CHECK (classification IN ('recommended', 'moderate', 'avoid')),
  tags TEXT[] DEFAULT '{}',
  image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- DAILY PROGRESS TABLE
-- Source: progress_nova_refined (78% daily goal, 1716/2200 kcal)
--         (weekly chart: MON 1.8k, TUE 2.1k, WED 1.2k, THU 2.4k...)
--         (streak tracker: 12 days, MON-THU completed, FRI in progress)
--         (protein peak: 142g, metabolic: 92.4%)
-- ============================================================
CREATE TABLE daily_progress (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  log_date DATE NOT NULL DEFAULT CURRENT_DATE,
  total_calories INTEGER DEFAULT 0,
  total_protein DECIMAL(5,1) DEFAULT 0,
  total_carbs DECIMAL(5,1) DEFAULT 0,
  total_fats DECIMAL(5,1) DEFAULT 0,
  goal_met BOOLEAN DEFAULT FALSE,
  UNIQUE(user_id, log_date),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- INDEXES for common queries
-- ============================================================
CREATE INDEX idx_meals_user_date ON meals(user_id, meal_date);
CREATE INDEX idx_meal_items_meal ON meal_items(meal_id);
CREATE INDEX idx_menu_scans_user ON menu_scans(user_id);
CREATE INDEX idx_scan_results_scan ON scan_results(scan_id);
CREATE INDEX idx_daily_progress_user_date ON daily_progress(user_id, log_date);

-- ============================================================
-- ROW LEVEL SECURITY (RLS) Policies
-- ============================================================
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE meals ENABLE ROW LEVEL SECURITY;
ALTER TABLE meal_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_scans ENABLE ROW LEVEL SECURITY;
ALTER TABLE scan_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_progress ENABLE ROW LEVEL SECURITY;
