/*
  # Add ESPP Support, Grant ID, Vesting Prices, and Advisor Branding

  ## Summary
  This migration extends the equity compensation platform to support:
  - ESPP (Employee Stock Purchase Plan) grants with discount tracking
  - External Grant IDs for duplicate detection and reporting
  - Vest-date historical prices for accurate gain calculations
  - Advisor branding with custom logos

  ## Changes Made

  ### 1. Modified Tables
  
  #### grants table - New Columns
  - `external_grant_id` (text, optional) - External grant ID from source documents for tracking/deduping
  - `espp_discount_percent` (numeric, optional) - ESPP discount percentage (typically 15%)
  - `espp_purchase_price` (numeric, optional) - Actual purchase price after discount
  - `espp_offering_start_date` (date, optional) - ESPP offering period start
  - `espp_offering_end_date` (date, optional) - ESPP offering period end (purchase date)
  - `espp_fmv_at_offering_start` (numeric, optional) - FMV at start of offering
  - `espp_fmv_at_purchase` (numeric, optional) - FMV at purchase date
  
  #### grants table - Type constraint update
  - Extended type check to include 'ESPP' and 'NSO' grant types

  ### 2. New Tables

  #### vesting_prices
  Stores historical stock prices at vest dates for accurate gain calculations
  - `id` (uuid, primary key) - Unique identifier
  - `grant_id` (uuid, foreign key) - Links to grants table
  - `vest_date` (date) - The vesting date
  - `price_at_vest` (numeric) - Stock price on vest date
  - `shares_vested` (numeric) - Number of shares that vested
  - `source` (text) - Where the price came from ('api', 'manual', 'document')

  #### advisor_profiles
  Stores advisor-specific branding and settings
  - `id` (uuid, primary key) - Unique identifier
  - `user_id` (uuid, foreign key) - Links to auth.users
  - `logo_url` (text, optional) - URL to uploaded custom logo
  - `company_name` (text, optional) - Advisor's company name for branding
  - `primary_color` (text, optional) - Custom primary brand color

  ## Security
  
  - Row Level Security (RLS) enabled on all new tables
  - Users can only access their own advisor profile
  - Users can only access vesting prices for grants they own
*/

-- Update grants table type constraint to include ESPP and NSO
-- First drop the existing constraint, then recreate it
ALTER TABLE grants DROP CONSTRAINT IF EXISTS grants_type_check;
ALTER TABLE grants ADD CONSTRAINT grants_type_check CHECK (type IN ('RSU', 'ISO', 'ESPP', 'NSO'));

-- Add new columns to grants table for external grant ID and ESPP support
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'grants' AND column_name = 'external_grant_id'
  ) THEN
    ALTER TABLE grants ADD COLUMN external_grant_id text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'grants' AND column_name = 'espp_discount_percent'
  ) THEN
    ALTER TABLE grants ADD COLUMN espp_discount_percent numeric;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'grants' AND column_name = 'espp_purchase_price'
  ) THEN
    ALTER TABLE grants ADD COLUMN espp_purchase_price numeric;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'grants' AND column_name = 'espp_offering_start_date'
  ) THEN
    ALTER TABLE grants ADD COLUMN espp_offering_start_date date;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'grants' AND column_name = 'espp_offering_end_date'
  ) THEN
    ALTER TABLE grants ADD COLUMN espp_offering_end_date date;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'grants' AND column_name = 'espp_fmv_at_offering_start'
  ) THEN
    ALTER TABLE grants ADD COLUMN espp_fmv_at_offering_start numeric;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'grants' AND column_name = 'espp_fmv_at_purchase'
  ) THEN
    ALTER TABLE grants ADD COLUMN espp_fmv_at_purchase numeric;
  END IF;
END $$;

-- Create index on external_grant_id for faster duplicate lookups
CREATE INDEX IF NOT EXISTS idx_grants_external_grant_id ON grants(external_grant_id) WHERE external_grant_id IS NOT NULL;

-- Create vesting_prices table for vest-date historical prices
CREATE TABLE IF NOT EXISTS vesting_prices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  grant_id uuid REFERENCES grants(id) ON DELETE CASCADE NOT NULL,
  vest_date date NOT NULL,
  price_at_vest numeric NOT NULL CHECK (price_at_vest >= 0),
  shares_vested numeric NOT NULL CHECK (shares_vested > 0),
  source text DEFAULT 'manual' CHECK (source IN ('api', 'manual', 'document')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(grant_id, vest_date)
);

-- Create indexes for vesting_prices
CREATE INDEX IF NOT EXISTS idx_vesting_prices_grant_id ON vesting_prices(grant_id);
CREATE INDEX IF NOT EXISTS idx_vesting_prices_vest_date ON vesting_prices(vest_date);

-- Enable RLS on vesting_prices
ALTER TABLE vesting_prices ENABLE ROW LEVEL SECURITY;

-- RLS Policies for vesting_prices table
CREATE POLICY "Users can view vesting prices for own grants"
  ON vesting_prices FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM grants
      JOIN clients ON clients.id = grants.client_id
      WHERE grants.id = vesting_prices.grant_id
      AND clients.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert vesting prices for own grants"
  ON vesting_prices FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM grants
      JOIN clients ON clients.id = grants.client_id
      WHERE grants.id = vesting_prices.grant_id
      AND clients.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update vesting prices for own grants"
  ON vesting_prices FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM grants
      JOIN clients ON clients.id = grants.client_id
      WHERE grants.id = vesting_prices.grant_id
      AND clients.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM grants
      JOIN clients ON clients.id = grants.client_id
      WHERE grants.id = vesting_prices.grant_id
      AND clients.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete vesting prices for own grants"
  ON vesting_prices FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM grants
      JOIN clients ON clients.id = grants.client_id
      WHERE grants.id = vesting_prices.grant_id
      AND clients.user_id = auth.uid()
    )
  );

-- Create trigger for vesting_prices updated_at
CREATE TRIGGER update_vesting_prices_updated_at
  BEFORE UPDATE ON vesting_prices
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create advisor_profiles table for branding
CREATE TABLE IF NOT EXISTS advisor_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  logo_url text,
  company_name text,
  primary_color text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create index on user_id
CREATE INDEX IF NOT EXISTS idx_advisor_profiles_user_id ON advisor_profiles(user_id);

-- Enable RLS on advisor_profiles
ALTER TABLE advisor_profiles ENABLE ROW LEVEL SECURITY;

-- RLS Policies for advisor_profiles table
CREATE POLICY "Users can view own advisor profile"
  ON advisor_profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own advisor profile"
  ON advisor_profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own advisor profile"
  ON advisor_profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own advisor profile"
  ON advisor_profiles FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create trigger for advisor_profiles updated_at
CREATE TRIGGER update_advisor_profiles_updated_at
  BEFORE UPDATE ON advisor_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
