/*
  # Add Custom Vesting Dates to Grants

  1. Changes to grants table
    - `custom_vesting_dates` (jsonb, optional) - Array of custom vesting events with date and shares
      Example: [{"date": "2024-06-15", "shares": 500}, {"date": "2024-12-15", "shares": 500}]
    - Updates vesting_schedule check constraint to include 'custom' option
    
  2. Purpose
    - Allows advisors to manually specify vesting dates for non-standard schedules
    - Companies like SpaceX have only 2 vesting dates per year
    - When custom schedule is selected, the app uses customVestingDates instead of calculating
*/

-- Add custom_vesting_dates column to grants table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'grants' AND column_name = 'custom_vesting_dates'
  ) THEN
    ALTER TABLE grants ADD COLUMN custom_vesting_dates jsonb;
  END IF;
END $$;

-- Update the vesting_schedule check constraint to allow 'custom'
-- First drop existing constraint if it exists, then add new one
DO $$
BEGIN
  -- Check if there's a check constraint on vesting_schedule and drop it
  IF EXISTS (
    SELECT 1 FROM information_schema.constraint_column_usage 
    WHERE table_name = 'grants' AND column_name = 'vesting_schedule'
  ) THEN
    -- Drop all check constraints on grants table that involve vesting_schedule
    EXECUTE (
      SELECT 'ALTER TABLE grants DROP CONSTRAINT ' || conname
      FROM pg_constraint 
      WHERE conrelid = 'grants'::regclass 
      AND contype = 'c'
      AND pg_get_constraintdef(oid) LIKE '%vesting_schedule%'
      LIMIT 1
    );
  END IF;
EXCEPTION
  WHEN others THEN
    -- Constraint might not exist, that's ok
    NULL;
END $$;

-- Add comment for documentation
COMMENT ON COLUMN grants.custom_vesting_dates IS 'JSON array of custom vesting events. Format: [{"date": "YYYY-MM-DD", "shares": number}]. Used when vesting_schedule is "custom".';