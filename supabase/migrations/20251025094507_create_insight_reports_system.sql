/*
  # Insight Reports System for St. Raphael
  
  ## Overview
  Creates an immutable reports table that stores computed insights from user health data.
  Reports aggregate KPIs, findings, and optional AI-generated narratives over time periods.
  
  ## New Tables
  
  ### `insight_reports`
  Stores computed health insights and analytics reports
  - `id` (uuid, primary key) - Unique report identifier
  - `user_id` (uuid, foreign key) - Owner of the report
  - `engram_id` (uuid, foreign key) - Associated AI engram (St. Raphael)
  - `period` (text) - Time period: 7d, 30d, or custom
  - `start_at` (date) - Period start date
  - `end_at` (date) - Period end date
  - `kpis` (jsonb) - Key performance indicators (steps_avg, sleep_efficiency, etc.)
  - `findings` (jsonb) - Array of structured findings with type and text
  - `narrative` (text) - Optional AI-generated summary
  - `created_at` (timestamptz) - When report was generated
  
  ## Security
  RLS enabled with policies ensuring users can only access their own reports.
  Reports are immutable by default (no update/delete policies exposed).
  
  ## Usage
  Reports are generated on-demand via the insights-report edge function.
  KPIs are computed from available data sources (tasks, check-ins, health metrics).
  Gracefully handles missing tables and incomplete data.
*/

-- Create insight_reports table
CREATE TABLE IF NOT EXISTS insight_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  engram_id uuid NOT NULL REFERENCES engrams(id) ON DELETE CASCADE,
  period text NOT NULL CHECK (period IN ('7d', '30d', 'custom')),
  start_at date NOT NULL,
  end_at date NOT NULL,
  kpis jsonb NOT NULL DEFAULT '{}'::jsonb,
  findings jsonb NOT NULL DEFAULT '[]'::jsonb,
  narrative text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE insight_reports ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Users can only select and insert their own reports
CREATE POLICY "insight_select_own" 
  ON insight_reports FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "insight_insert_own" 
  ON insight_reports FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_insight_reports_user_id ON insight_reports(user_id);
CREATE INDEX IF NOT EXISTS idx_insight_reports_engram_id ON insight_reports(engram_id);
CREATE INDEX IF NOT EXISTS idx_insight_reports_created_at ON insight_reports(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_insight_reports_period ON insight_reports(user_id, period, created_at DESC);

-- Function: Get latest report for a user and period
CREATE OR REPLACE FUNCTION get_latest_insight_report(
  target_user_id uuid,
  target_engram_id uuid,
  report_period text DEFAULT '7d'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result jsonb;
BEGIN
  SELECT to_jsonb(r.*) INTO result
  FROM insight_reports r
  WHERE r.user_id = target_user_id
    AND r.engram_id = target_engram_id
    AND r.period = report_period
  ORDER BY r.created_at DESC
  LIMIT 1;
  
  RETURN COALESCE(result, '{}'::jsonb);
END;
$$;

-- Function: Get report statistics
CREATE OR REPLACE FUNCTION get_insight_report_stats(target_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result jsonb;
BEGIN
  SELECT jsonb_build_object(
    'total_reports', COUNT(*),
    'by_period', (
      SELECT jsonb_object_agg(period, cnt)
      FROM (
        SELECT period, COUNT(*) as cnt
        FROM insight_reports
        WHERE user_id = target_user_id
        GROUP BY period
      ) t
    ),
    'latest_report_date', MAX(created_at),
    'total_findings', (
      SELECT SUM(jsonb_array_length(findings))
      FROM insight_reports
      WHERE user_id = target_user_id
    )
  )
  INTO result
  FROM insight_reports
  WHERE user_id = target_user_id;
  
  RETURN COALESCE(result, '{}'::jsonb);
END;
$$;
