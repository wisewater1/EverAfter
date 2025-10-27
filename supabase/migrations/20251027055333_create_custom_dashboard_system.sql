/*
  # Custom Health Dashboard System

  1. New Tables
    - `custom_health_dashboards`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to auth.users)
      - `name` (text) - Dashboard display name
      - `description` (text) - Dashboard description
      - `template_id` (text) - Optional template this was created from
      - `layout_config` (jsonb) - Grid layout configuration
      - `theme` (text) - Visual theme name
      - `is_favorite` (boolean) - Quick access flag
      - `is_public` (boolean) - Sharing flag
      - `view_count` (integer) - Usage tracking
      - `last_viewed_at` (timestamptz) - Last access time
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

    - `dashboard_widgets`
      - `id` (uuid, primary key)
      - `dashboard_id` (uuid, foreign key)
      - `widget_type` (text) - Type of widget (chart, metric, etc)
      - `title` (text) - Widget title
      - `position_x` (integer) - Grid X position
      - `position_y` (integer) - Grid Y position
      - `width` (integer) - Grid width units
      - `height` (integer) - Grid height units
      - `config` (jsonb) - Widget-specific configuration
      - `data_sources` (text[]) - Connected provider IDs
      - `refresh_interval` (integer) - Auto-refresh seconds
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

    - `dashboard_templates`
      - `id` (text, primary key)
      - `name` (text) - Template display name
      - `category` (text) - Template category
      - `description` (text) - Template description
      - `icon` (text) - Icon identifier
      - `color_scheme` (text) - Theme colors
      - `required_sources` (text[]) - Required data sources
      - `default_layout` (jsonb) - Default widget layout
      - `default_widgets` (jsonb) - Default widget configurations
      - `featured` (boolean) - Show in featured list
      - `created_at` (timestamptz)

    - `dashboard_auto_rotation`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key)
      - `enabled` (boolean) - Rotation active flag
      - `interval_seconds` (integer) - Time per dashboard
      - `dashboard_sequence` (uuid[]) - Ordered dashboard IDs
      - `current_index` (integer) - Current position
      - `transition_effect` (text) - Animation type
      - `pause_on_interaction` (boolean) - Auto-pause flag
      - `smart_rotation` (boolean) - Prioritize new data
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

    - `dashboard_data_cache`
      - `id` (uuid, primary key)
      - `dashboard_id` (uuid, foreign key)
      - `widget_id` (uuid, foreign key)
      - `cache_key` (text) - Unique cache identifier
      - `data` (jsonb) - Cached data
      - `expires_at` (timestamptz) - Cache expiration
      - `created_at` (timestamptz)

    - `dashboard_sharing`
      - `id` (uuid, primary key)
      - `dashboard_id` (uuid, foreign key)
      - `shared_with_user_id` (uuid, foreign key)
      - `permission_level` (text) - view, edit, admin
      - `created_by` (uuid, foreign key)
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on all tables
    - Users can only access their own dashboards
    - Shared dashboards accessible based on sharing permissions

  3. Indexes
    - Index on user_id for fast dashboard lookup
    - Index on dashboard_id for widget queries
    - Index on cache expiration for cleanup
*/

-- Custom Health Dashboards Table
CREATE TABLE IF NOT EXISTS custom_health_dashboards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  template_id text,
  layout_config jsonb DEFAULT '{"cols": 12, "rowHeight": 80, "breakpoints": {"lg": 1200, "md": 996, "sm": 768}}'::jsonb,
  theme text DEFAULT 'default',
  is_favorite boolean DEFAULT false,
  is_public boolean DEFAULT false,
  view_count integer DEFAULT 0,
  last_viewed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_custom_health_dashboards_user_id ON custom_health_dashboards(user_id);
CREATE INDEX IF NOT EXISTS idx_custom_health_dashboards_template_id ON custom_health_dashboards(template_id);
CREATE INDEX IF NOT EXISTS idx_custom_health_dashboards_favorite ON custom_health_dashboards(user_id, is_favorite) WHERE is_favorite = true;

-- Dashboard Widgets Table
CREATE TABLE IF NOT EXISTS dashboard_widgets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dashboard_id uuid NOT NULL REFERENCES custom_health_dashboards(id) ON DELETE CASCADE,
  widget_type text NOT NULL,
  title text NOT NULL,
  position_x integer NOT NULL DEFAULT 0,
  position_y integer NOT NULL DEFAULT 0,
  width integer NOT NULL DEFAULT 4,
  height integer NOT NULL DEFAULT 4,
  config jsonb DEFAULT '{}'::jsonb,
  data_sources text[] DEFAULT ARRAY[]::text[],
  refresh_interval integer DEFAULT 300,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_dashboard_widgets_dashboard_id ON dashboard_widgets(dashboard_id);
CREATE INDEX IF NOT EXISTS idx_dashboard_widgets_type ON dashboard_widgets(widget_type);

-- Dashboard Templates Table
CREATE TABLE IF NOT EXISTS dashboard_templates (
  id text PRIMARY KEY,
  name text NOT NULL,
  category text NOT NULL,
  description text NOT NULL,
  icon text NOT NULL,
  color_scheme text NOT NULL,
  required_sources text[] DEFAULT ARRAY[]::text[],
  default_layout jsonb DEFAULT '{}'::jsonb,
  default_widgets jsonb DEFAULT '[]'::jsonb,
  featured boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_dashboard_templates_category ON dashboard_templates(category);
CREATE INDEX IF NOT EXISTS idx_dashboard_templates_featured ON dashboard_templates(featured) WHERE featured = true;

-- Dashboard Auto Rotation Table
CREATE TABLE IF NOT EXISTS dashboard_auto_rotation (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  enabled boolean DEFAULT false,
  interval_seconds integer DEFAULT 30,
  dashboard_sequence uuid[] DEFAULT ARRAY[]::uuid[],
  current_index integer DEFAULT 0,
  transition_effect text DEFAULT 'fade',
  pause_on_interaction boolean DEFAULT true,
  smart_rotation boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_dashboard_auto_rotation_user_id ON dashboard_auto_rotation(user_id);

-- Dashboard Data Cache Table
CREATE TABLE IF NOT EXISTS dashboard_data_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dashboard_id uuid NOT NULL REFERENCES custom_health_dashboards(id) ON DELETE CASCADE,
  widget_id uuid REFERENCES dashboard_widgets(id) ON DELETE CASCADE,
  cache_key text NOT NULL,
  data jsonb NOT NULL,
  expires_at timestamptz NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(dashboard_id, widget_id, cache_key)
);

CREATE INDEX IF NOT EXISTS idx_dashboard_data_cache_expires ON dashboard_data_cache(expires_at);
CREATE INDEX IF NOT EXISTS idx_dashboard_data_cache_dashboard_widget ON dashboard_data_cache(dashboard_id, widget_id);

-- Dashboard Sharing Table
CREATE TABLE IF NOT EXISTS dashboard_sharing (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dashboard_id uuid NOT NULL REFERENCES custom_health_dashboards(id) ON DELETE CASCADE,
  shared_with_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  permission_level text NOT NULL DEFAULT 'view',
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT dashboard_sharing_permission_check CHECK (permission_level IN ('view', 'edit', 'admin')),
  UNIQUE(dashboard_id, shared_with_user_id)
);

CREATE INDEX IF NOT EXISTS idx_dashboard_sharing_dashboard_id ON dashboard_sharing(dashboard_id);
CREATE INDEX IF NOT EXISTS idx_dashboard_sharing_shared_with ON dashboard_sharing(shared_with_user_id);

-- Enable Row Level Security
ALTER TABLE custom_health_dashboards ENABLE ROW LEVEL SECURITY;
ALTER TABLE dashboard_widgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE dashboard_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE dashboard_auto_rotation ENABLE ROW LEVEL SECURITY;
ALTER TABLE dashboard_data_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE dashboard_sharing ENABLE ROW LEVEL SECURITY;

-- RLS Policies for custom_health_dashboards
CREATE POLICY "Users can view own dashboards"
  ON custom_health_dashboards FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid() OR
    id IN (SELECT dashboard_id FROM dashboard_sharing WHERE shared_with_user_id = auth.uid())
  );

CREATE POLICY "Users can insert own dashboards"
  ON custom_health_dashboards FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own dashboards"
  ON custom_health_dashboards FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete own dashboards"
  ON custom_health_dashboards FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- RLS Policies for dashboard_widgets
CREATE POLICY "Users can view widgets of accessible dashboards"
  ON dashboard_widgets FOR SELECT
  TO authenticated
  USING (
    dashboard_id IN (
      SELECT id FROM custom_health_dashboards
      WHERE user_id = auth.uid() OR
      id IN (SELECT dashboard_id FROM dashboard_sharing WHERE shared_with_user_id = auth.uid())
    )
  );

CREATE POLICY "Users can insert widgets to own dashboards"
  ON dashboard_widgets FOR INSERT
  TO authenticated
  WITH CHECK (
    dashboard_id IN (SELECT id FROM custom_health_dashboards WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can update widgets of own dashboards"
  ON dashboard_widgets FOR UPDATE
  TO authenticated
  USING (
    dashboard_id IN (SELECT id FROM custom_health_dashboards WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can delete widgets of own dashboards"
  ON dashboard_widgets FOR DELETE
  TO authenticated
  USING (
    dashboard_id IN (SELECT id FROM custom_health_dashboards WHERE user_id = auth.uid())
  );

-- RLS Policies for dashboard_templates (public read)
CREATE POLICY "Anyone can view templates"
  ON dashboard_templates FOR SELECT
  TO authenticated
  USING (true);

-- RLS Policies for dashboard_auto_rotation
CREATE POLICY "Users can view own rotation config"
  ON dashboard_auto_rotation FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own rotation config"
  ON dashboard_auto_rotation FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own rotation config"
  ON dashboard_auto_rotation FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete own rotation config"
  ON dashboard_auto_rotation FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- RLS Policies for dashboard_data_cache
CREATE POLICY "Users can view cache for accessible dashboards"
  ON dashboard_data_cache FOR SELECT
  TO authenticated
  USING (
    dashboard_id IN (
      SELECT id FROM custom_health_dashboards WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert cache for own dashboards"
  ON dashboard_data_cache FOR INSERT
  TO authenticated
  WITH CHECK (
    dashboard_id IN (SELECT id FROM custom_health_dashboards WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can update cache for own dashboards"
  ON dashboard_data_cache FOR UPDATE
  TO authenticated
  USING (
    dashboard_id IN (SELECT id FROM custom_health_dashboards WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can delete cache for own dashboards"
  ON dashboard_data_cache FOR DELETE
  TO authenticated
  USING (
    dashboard_id IN (SELECT id FROM custom_health_dashboards WHERE user_id = auth.uid())
  );

-- RLS Policies for dashboard_sharing
CREATE POLICY "Users can view sharing of own dashboards"
  ON dashboard_sharing FOR SELECT
  TO authenticated
  USING (
    created_by = auth.uid() OR shared_with_user_id = auth.uid()
  );

CREATE POLICY "Users can create sharing for own dashboards"
  ON dashboard_sharing FOR INSERT
  TO authenticated
  WITH CHECK (
    dashboard_id IN (SELECT id FROM custom_health_dashboards WHERE user_id = auth.uid()) AND
    created_by = auth.uid()
  );

CREATE POLICY "Users can delete sharing of own dashboards"
  ON dashboard_sharing FOR DELETE
  TO authenticated
  USING (
    dashboard_id IN (SELECT id FROM custom_health_dashboards WHERE user_id = auth.uid())
  );

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_dashboard_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_custom_health_dashboards_updated_at
  BEFORE UPDATE ON custom_health_dashboards
  FOR EACH ROW EXECUTE FUNCTION update_dashboard_updated_at();

CREATE TRIGGER update_dashboard_widgets_updated_at
  BEFORE UPDATE ON dashboard_widgets
  FOR EACH ROW EXECUTE FUNCTION update_dashboard_updated_at();

CREATE TRIGGER update_dashboard_auto_rotation_updated_at
  BEFORE UPDATE ON dashboard_auto_rotation
  FOR EACH ROW EXECUTE FUNCTION update_dashboard_updated_at();

-- Function to clean expired cache
CREATE OR REPLACE FUNCTION clean_expired_dashboard_cache()
RETURNS void AS $$
BEGIN
  DELETE FROM dashboard_data_cache WHERE expires_at < now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
