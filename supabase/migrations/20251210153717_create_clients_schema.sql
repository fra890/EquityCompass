/*
  # EquityCompass Database Schema

  Creates the complete database schema for the EquityCompass equity compensation management platform.

  ## Tables Created
  
  ### clients
  Main client table storing advisor client information
  - `id` (uuid, primary key) - Unique client identifier
  - `user_id` (uuid, foreign key) - Links to auth.users (advisor who owns this client)
  - `name` (text) - Client name
  - `state` (text) - Client's state code (e.g., 'CA', 'NY')
  - `filing_status` (text) - Tax filing status ('single' or 'married_joint')
  - `tax_bracket` (numeric) - Federal ordinary income tax bracket percentage
  - `estimated_income` (numeric, optional) - Annual income estimate for AMT calculations
  - `custom_state_tax_rate` (numeric, optional) - Override for state tax percentage
  - `custom_ltcg_tax_rate` (numeric, optional) - Override for long-term capital gains tax rate
  - `custom_amt_safe_harbor` (numeric, optional) - Override for AMT spread capacity
  - `created_at` (timestamptz) - Record creation timestamp
  - `updated_at` (timestamptz) - Record last update timestamp

  ### grants
  Equity grants (RSUs, ISOs) owned by clients
  - `id` (uuid, primary key) - Unique grant identifier
  - `client_id` (uuid, foreign key) - Links to clients table
  - `type` (text) - Grant type ('RSU' or 'ISO')
  - `ticker` (text) - Stock ticker symbol (empty if private)
  - `company_name` (text) - Company name
  - `current_price` (numeric) - Current fair market value
  - `grant_price` (numeric, optional) - FMV at time of grant (historical)
  - `strike_price` (numeric, optional) - Strike price for ISOs/Options
  - `grant_date` (date) - Date grant was issued
  - `total_shares` (numeric) - Total shares in grant
  - `vesting_schedule` (text) - Vesting schedule type
  - `withholding_rate` (numeric, optional) - User-elected withholding percentage
  - `custom_held_shares` (numeric, optional) - Manual override for shares held
  - `average_cost_basis` (numeric, optional) - Manual override for cost basis
  - `created_at` (timestamptz) - Record creation timestamp
  - `updated_at` (timestamptz) - Record last update timestamp

  ### planned_exercises
  Planned ISO exercise scenarios
  - `id` (uuid, primary key) - Unique exercise plan identifier
  - `client_id` (uuid, foreign key) - Links to clients table
  - `grant_id` (uuid, foreign key) - Links to grants table
  - `grant_ticker` (text) - Stock ticker for quick reference
  - `shares` (numeric) - Number of shares to exercise
  - `exercise_date` (date) - Planned exercise date
  - `exercise_price` (numeric) - Strike price at exercise
  - `fmv_at_exercise` (numeric) - Fair market value at exercise
  - `type` (text) - Exercise type (currently 'ISO')
  - `amt_exposure` (numeric) - Alternative minimum tax exposure
  - `estimated_cost` (numeric) - Estimated cost of exercise
  - `created_at` (timestamptz) - Record creation timestamp
  - `updated_at` (timestamptz) - Record last update timestamp

  ## Security
  
  - Row Level Security (RLS) enabled on all tables
  - Advisors can only access their own clients and related data
  - All policies verify ownership through user_id or client_id chain
  - Authenticated users required for all operations
*/

-- Create clients table
CREATE TABLE IF NOT EXISTS clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  state text NOT NULL,
  filing_status text NOT NULL CHECK (filing_status IN ('single', 'married_joint')),
  tax_bracket numeric NOT NULL,
  estimated_income numeric DEFAULT 0,
  custom_state_tax_rate numeric,
  custom_ltcg_tax_rate numeric,
  custom_amt_safe_harbor numeric,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create grants table
CREATE TABLE IF NOT EXISTS grants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid REFERENCES clients(id) ON DELETE CASCADE NOT NULL,
  type text NOT NULL CHECK (type IN ('RSU', 'ISO')),
  ticker text DEFAULT '',
  company_name text NOT NULL,
  current_price numeric NOT NULL,
  grant_price numeric,
  strike_price numeric,
  grant_date date NOT NULL,
  total_shares numeric NOT NULL,
  vesting_schedule text NOT NULL,
  withholding_rate numeric,
  custom_held_shares numeric,
  average_cost_basis numeric,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create planned_exercises table
CREATE TABLE IF NOT EXISTS planned_exercises (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid REFERENCES clients(id) ON DELETE CASCADE NOT NULL,
  grant_id uuid REFERENCES grants(id) ON DELETE CASCADE NOT NULL,
  grant_ticker text DEFAULT '',
  shares numeric NOT NULL,
  exercise_date date NOT NULL,
  exercise_price numeric NOT NULL,
  fmv_at_exercise numeric NOT NULL,
  type text NOT NULL DEFAULT 'ISO',
  amt_exposure numeric DEFAULT 0,
  estimated_cost numeric DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_clients_user_id ON clients(user_id);
CREATE INDEX IF NOT EXISTS idx_grants_client_id ON grants(client_id);
CREATE INDEX IF NOT EXISTS idx_planned_exercises_client_id ON planned_exercises(client_id);
CREATE INDEX IF NOT EXISTS idx_planned_exercises_grant_id ON planned_exercises(grant_id);

-- Enable Row Level Security
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE grants ENABLE ROW LEVEL SECURITY;
ALTER TABLE planned_exercises ENABLE ROW LEVEL SECURITY;

-- RLS Policies for clients table
CREATE POLICY "Users can view own clients"
  ON clients FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own clients"
  ON clients FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own clients"
  ON clients FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own clients"
  ON clients FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- RLS Policies for grants table
CREATE POLICY "Users can view grants for own clients"
  ON grants FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM clients
      WHERE clients.id = grants.client_id
      AND clients.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert grants for own clients"
  ON grants FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM clients
      WHERE clients.id = grants.client_id
      AND clients.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update grants for own clients"
  ON grants FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM clients
      WHERE clients.id = grants.client_id
      AND clients.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM clients
      WHERE clients.id = grants.client_id
      AND clients.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete grants for own clients"
  ON grants FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM clients
      WHERE clients.id = grants.client_id
      AND clients.user_id = auth.uid()
    )
  );

-- RLS Policies for planned_exercises table
CREATE POLICY "Users can view planned exercises for own clients"
  ON planned_exercises FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM clients
      WHERE clients.id = planned_exercises.client_id
      AND clients.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert planned exercises for own clients"
  ON planned_exercises FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM clients
      WHERE clients.id = planned_exercises.client_id
      AND clients.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update planned exercises for own clients"
  ON planned_exercises FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM clients
      WHERE clients.id = planned_exercises.client_id
      AND clients.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM clients
      WHERE clients.id = planned_exercises.client_id
      AND clients.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete planned exercises for own clients"
  ON planned_exercises FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM clients
      WHERE clients.id = planned_exercises.client_id
      AND clients.user_id = auth.uid()
    )
  );

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers to auto-update updated_at
CREATE TRIGGER update_clients_updated_at
  BEFORE UPDATE ON clients
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_grants_updated_at
  BEFORE UPDATE ON grants
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_planned_exercises_updated_at
  BEFORE UPDATE ON planned_exercises
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
