/*
  # Optimize RLS Policies - Part 5: Health Monitoring Tables

  Optimizes RLS policies for health monitoring tables
  Covers: health_connections, health_metrics, appointments, prescriptions, 
          oauth_credentials, medication_logs, health_goals, health_reminders, emergency_contacts
*/

-- HEALTH_CONNECTIONS TABLE
DROP POLICY IF EXISTS "Users can view own health connections" ON health_connections;
DROP POLICY IF EXISTS "Users can insert own health connections" ON health_connections;
DROP POLICY IF EXISTS "Users can update own health connections" ON health_connections;
DROP POLICY IF EXISTS "Users can delete own health connections" ON health_connections;

CREATE POLICY "Users can view own health connections" ON health_connections
  FOR SELECT TO authenticated
  USING (user_id = (select auth.uid()));

CREATE POLICY "Users can insert own health connections" ON health_connections
  FOR INSERT TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can update own health connections" ON health_connections
  FOR UPDATE TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can delete own health connections" ON health_connections
  FOR DELETE TO authenticated
  USING (user_id = (select auth.uid()));

-- HEALTH_METRICS TABLE
DROP POLICY IF EXISTS "Users can view own health metrics" ON health_metrics;
DROP POLICY IF EXISTS "Users can insert own health metrics" ON health_metrics;
DROP POLICY IF EXISTS "Users can update own health metrics" ON health_metrics;
DROP POLICY IF EXISTS "Users can delete own health metrics" ON health_metrics;

CREATE POLICY "Users can view own health metrics" ON health_metrics
  FOR SELECT TO authenticated
  USING (user_id = (select auth.uid()));

CREATE POLICY "Users can insert own health metrics" ON health_metrics
  FOR INSERT TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can update own health metrics" ON health_metrics
  FOR UPDATE TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can delete own health metrics" ON health_metrics
  FOR DELETE TO authenticated
  USING (user_id = (select auth.uid()));

-- APPOINTMENTS TABLE
DROP POLICY IF EXISTS "Users can view own appointments" ON appointments;
DROP POLICY IF EXISTS "Users can insert own appointments" ON appointments;
DROP POLICY IF EXISTS "Users can update own appointments" ON appointments;
DROP POLICY IF EXISTS "Users can delete own appointments" ON appointments;

CREATE POLICY "Users can view own appointments" ON appointments
  FOR SELECT TO authenticated
  USING (user_id = (select auth.uid()));

CREATE POLICY "Users can insert own appointments" ON appointments
  FOR INSERT TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can update own appointments" ON appointments
  FOR UPDATE TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can delete own appointments" ON appointments
  FOR DELETE TO authenticated
  USING (user_id = (select auth.uid()));

-- PRESCRIPTIONS TABLE
DROP POLICY IF EXISTS "Users can view own prescriptions" ON prescriptions;
DROP POLICY IF EXISTS "Users can insert own prescriptions" ON prescriptions;
DROP POLICY IF EXISTS "Users can update own prescriptions" ON prescriptions;
DROP POLICY IF EXISTS "Users can delete own prescriptions" ON prescriptions;

CREATE POLICY "Users can view own prescriptions" ON prescriptions
  FOR SELECT TO authenticated
  USING (user_id = (select auth.uid()));

CREATE POLICY "Users can insert own prescriptions" ON prescriptions
  FOR INSERT TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can update own prescriptions" ON prescriptions
  FOR UPDATE TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can delete own prescriptions" ON prescriptions
  FOR DELETE TO authenticated
  USING (user_id = (select auth.uid()));

-- OAUTH_CREDENTIALS TABLE
DROP POLICY IF EXISTS "Users can view own OAuth credentials" ON oauth_credentials;
DROP POLICY IF EXISTS "Users can insert own OAuth credentials" ON oauth_credentials;
DROP POLICY IF EXISTS "Users can update own OAuth credentials" ON oauth_credentials;
DROP POLICY IF EXISTS "Users can delete own OAuth credentials" ON oauth_credentials;

CREATE POLICY "Users can view own OAuth credentials" ON oauth_credentials
  FOR SELECT TO authenticated
  USING (user_id = (select auth.uid()));

CREATE POLICY "Users can insert own OAuth credentials" ON oauth_credentials
  FOR INSERT TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can update own OAuth credentials" ON oauth_credentials
  FOR UPDATE TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can delete own OAuth credentials" ON oauth_credentials
  FOR DELETE TO authenticated
  USING (user_id = (select auth.uid()));

-- MEDICATION_LOGS TABLE
DROP POLICY IF EXISTS "Users can view own medication logs" ON medication_logs;
DROP POLICY IF EXISTS "Users can insert own medication logs" ON medication_logs;
DROP POLICY IF EXISTS "Users can update own medication logs" ON medication_logs;
DROP POLICY IF EXISTS "Users can delete own medication logs" ON medication_logs;

CREATE POLICY "Users can view own medication logs" ON medication_logs
  FOR SELECT TO authenticated
  USING (user_id = (select auth.uid()));

CREATE POLICY "Users can insert own medication logs" ON medication_logs
  FOR INSERT TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can update own medication logs" ON medication_logs
  FOR UPDATE TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can delete own medication logs" ON medication_logs
  FOR DELETE TO authenticated
  USING (user_id = (select auth.uid()));

-- HEALTH_GOALS TABLE
DROP POLICY IF EXISTS "Users can view own health goals" ON health_goals;
DROP POLICY IF EXISTS "Users can insert own health goals" ON health_goals;
DROP POLICY IF EXISTS "Users can update own health goals" ON health_goals;
DROP POLICY IF EXISTS "Users can delete own health goals" ON health_goals;

CREATE POLICY "Users can view own health goals" ON health_goals
  FOR SELECT TO authenticated
  USING (user_id = (select auth.uid()));

CREATE POLICY "Users can insert own health goals" ON health_goals
  FOR INSERT TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can update own health goals" ON health_goals
  FOR UPDATE TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can delete own health goals" ON health_goals
  FOR DELETE TO authenticated
  USING (user_id = (select auth.uid()));

-- HEALTH_REMINDERS TABLE
DROP POLICY IF EXISTS "Users can view own health reminders" ON health_reminders;
DROP POLICY IF EXISTS "Users can insert own health reminders" ON health_reminders;
DROP POLICY IF EXISTS "Users can update own health reminders" ON health_reminders;
DROP POLICY IF EXISTS "Users can delete own health reminders" ON health_reminders;

CREATE POLICY "Users can view own health reminders" ON health_reminders
  FOR SELECT TO authenticated
  USING (user_id = (select auth.uid()));

CREATE POLICY "Users can insert own health reminders" ON health_reminders
  FOR INSERT TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can update own health reminders" ON health_reminders
  FOR UPDATE TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can delete own health reminders" ON health_reminders
  FOR DELETE TO authenticated
  USING (user_id = (select auth.uid()));

-- EMERGENCY_CONTACTS TABLE
DROP POLICY IF EXISTS "Users can view own emergency contacts" ON emergency_contacts;
DROP POLICY IF EXISTS "Users can insert own emergency contacts" ON emergency_contacts;
DROP POLICY IF EXISTS "Users can update own emergency contacts" ON emergency_contacts;
DROP POLICY IF EXISTS "Users can delete own emergency contacts" ON emergency_contacts;

CREATE POLICY "Users can view own emergency contacts" ON emergency_contacts
  FOR SELECT TO authenticated
  USING (user_id = (select auth.uid()));

CREATE POLICY "Users can insert own emergency contacts" ON emergency_contacts
  FOR INSERT TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can update own emergency contacts" ON emergency_contacts
  FOR UPDATE TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can delete own emergency contacts" ON emergency_contacts
  FOR DELETE TO authenticated
  USING (user_id = (select auth.uid()));