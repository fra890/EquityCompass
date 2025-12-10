/*
  # Add Stock Sales Tracking and Grant Notes

  ## Changes Made

  ### 1. Modified Tables
  
  #### grants table - New Column
  - `plan_notes` (text, optional) - Notes about client's plans for the grant (hold, sell, diversify, etc.)

  ### 2. New Tables
  
  #### stock_sales
  Tracks all stock sales/liquidations from equity grants
  - `id` (uuid, primary key) - Unique sale identifier
  - `grant_id` (uuid, foreign key) - Links to grants table
  - `client_id` (uuid, foreign key) - Links to clients table (for easier querying)
  - `sale_date` (date) - Date of sale
  - `shares_sold` (numeric) - Number of shares sold
  - `sale_price` (numeric) - Price per share at sale
  - `total_proceeds` (numeric) - Total sale proceeds (shares_sold * sale_price)
  - `reason` (text) - Reason for sale (e.g., 'Diversification', 'Tax Payment', 'Liquidity Need')
  - `notes` (text, optional) - Additional notes about the sale
  - `created_at` (timestamptz) - Record creation timestamp
  - `updated_at` (timestamptz) - Record last update timestamp

  ## Security
  
  - Row Level Security (RLS) enabled on stock_sales table
  - Users can only access sales for their own clients
  - All policies verify ownership through client_id chain
*/

-- Add plan_notes column to grants table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'grants' AND column_name = 'plan_notes'
  ) THEN
    ALTER TABLE grants ADD COLUMN plan_notes text;
  END IF;
END $$;

-- Create stock_sales table
CREATE TABLE IF NOT EXISTS stock_sales (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  grant_id uuid REFERENCES grants(id) ON DELETE CASCADE NOT NULL,
  client_id uuid REFERENCES clients(id) ON DELETE CASCADE NOT NULL,
  sale_date date NOT NULL,
  shares_sold numeric NOT NULL CHECK (shares_sold > 0),
  sale_price numeric NOT NULL CHECK (sale_price >= 0),
  total_proceeds numeric NOT NULL DEFAULT 0,
  reason text NOT NULL DEFAULT 'Other',
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_stock_sales_grant_id ON stock_sales(grant_id);
CREATE INDEX IF NOT EXISTS idx_stock_sales_client_id ON stock_sales(client_id);
CREATE INDEX IF NOT EXISTS idx_stock_sales_sale_date ON stock_sales(sale_date);

-- Enable Row Level Security
ALTER TABLE stock_sales ENABLE ROW LEVEL SECURITY;

-- RLS Policies for stock_sales table
CREATE POLICY "Users can view stock sales for own clients"
  ON stock_sales FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM clients
      WHERE clients.id = stock_sales.client_id
      AND clients.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert stock sales for own clients"
  ON stock_sales FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM clients
      WHERE clients.id = stock_sales.client_id
      AND clients.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update stock sales for own clients"
  ON stock_sales FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM clients
      WHERE clients.id = stock_sales.client_id
      AND clients.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM clients
      WHERE clients.id = stock_sales.client_id
      AND clients.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete stock sales for own clients"
  ON stock_sales FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM clients
      WHERE clients.id = stock_sales.client_id
      AND clients.user_id = auth.uid()
    )
  );

-- Create trigger to auto-update updated_at
CREATE TRIGGER update_stock_sales_updated_at
  BEFORE UPDATE ON stock_sales
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create trigger to automatically calculate total_proceeds
CREATE OR REPLACE FUNCTION calculate_total_proceeds()
RETURNS TRIGGER AS $$
BEGIN
  NEW.total_proceeds = NEW.shares_sold * NEW.sale_price;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER calculate_stock_sale_proceeds
  BEFORE INSERT OR UPDATE ON stock_sales
  FOR EACH ROW
  EXECUTE FUNCTION calculate_total_proceeds();
