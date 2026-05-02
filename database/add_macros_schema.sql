-- Schema updates for NutriScan AI meals and macros

-- 1. Ensure meal_items table has macro columns (protein, carbs, fats)
-- If these columns don't exist, this will add them.
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='meal_items' AND column_name='protein') THEN
        ALTER TABLE meal_items ADD COLUMN protein numeric DEFAULT 0;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='meal_items' AND column_name='carbs') THEN
        ALTER TABLE meal_items ADD COLUMN carbs numeric DEFAULT 0;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='meal_items' AND column_name='fats') THEN
        ALTER TABLE meal_items ADD COLUMN fats numeric DEFAULT 0;
    END IF;
END $$;

-- 2. Ensure daily_progress table has macro columns
-- This stores the aggregated daily totals.
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='daily_progress' AND column_name='total_protein') THEN
        ALTER TABLE daily_progress ADD COLUMN total_protein numeric DEFAULT 0;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='daily_progress' AND column_name='total_carbs') THEN
        ALTER TABLE daily_progress ADD COLUMN total_carbs numeric DEFAULT 0;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='daily_progress' AND column_name='total_fats') THEN
        ALTER TABLE daily_progress ADD COLUMN total_fats numeric DEFAULT 0;
    END IF;
END $$;
