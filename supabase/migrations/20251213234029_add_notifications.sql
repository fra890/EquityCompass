/*
  # Email Notifications Schema

  1. New Tables
    - `notification_preferences`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `client_id` (uuid)
      - `vesting_alerts_enabled` (boolean) - Enable vesting event notifications
      - `vesting_alert_days` (integer[]) - Days before vesting to send alerts (e.g., [7, 30])
      - `iso_exercise_alerts_enabled` (boolean) - ISO exercise deadline alerts
      - `iso_exercise_alert_days` (integer) - Days before ISO expiry to alert
      - `tax_planning_alerts_enabled` (boolean) - Year-end tax planning reminders
      - `amt_exposure_alerts_enabled` (boolean) - AMT exposure warnings
      - `amt_threshold` (numeric) - AMT threshold to trigger alerts
      - `email` (text) - Email address for notifications
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

    - `notification_logs`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `client_id` (uuid)
      - `notification_type` (text) - Type of notification sent
      - `event_date` (date) - Date of the event being notified about
      - `grant_id` (uuid) - Reference to the grant
      - `sent_at` (timestamptz) - When notification was sent
      - `email_to` (text) - Email address sent to
      - `status` (text) - 'sent', 'failed', 'pending'
      - `error_message` (text) - Error details if failed

  2. Security
    - Enable RLS on both tables
    - Add policies for authenticated users to manage their own notifications
*/

CREATE TABLE IF NOT EXISTS notification_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) NOT NULL,
  client_id uuid NOT NULL,
  vesting_alerts_enabled boolean DEFAULT true,
  vesting_alert_days integer[] DEFAULT ARRAY[7, 30],
  iso_exercise_alerts_enabled boolean DEFAULT true,
  iso_exercise_alert_days integer DEFAULT 60,
  tax_planning_alerts_enabled boolean DEFAULT true,
  amt_exposure_alerts_enabled boolean DEFAULT true,
  amt_threshold numeric DEFAULT 100000,
  email text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, client_id)
);

ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notification preferences"
  ON notification_preferences FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own notification preferences"
  ON notification_preferences FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own notification preferences"
  ON notification_preferences FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own notification preferences"
  ON notification_preferences FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS notification_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) NOT NULL,
  client_id uuid NOT NULL,
  notification_type text NOT NULL,
  event_date date NOT NULL,
  grant_id uuid,
  sent_at timestamptz DEFAULT now(),
  email_to text NOT NULL,
  status text DEFAULT 'pending',
  error_message text,
  CHECK (status IN ('sent', 'failed', 'pending'))
);

ALTER TABLE notification_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notification logs"
  ON notification_logs FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own notification logs"
  ON notification_logs FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_notification_preferences_user_id ON notification_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_notification_preferences_client_id ON notification_preferences(client_id);
CREATE INDEX IF NOT EXISTS idx_notification_logs_user_id ON notification_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_notification_logs_event_date ON notification_logs(event_date);
CREATE INDEX IF NOT EXISTS idx_notification_logs_status ON notification_logs(status);
