/*
  # Seed Dashboard Templates

  Seeds the dashboard_templates table with pre-built templates for common health monitoring scenarios:
  - Metabolic Health (glucose, nutrition, exercise, sleep)
  - Cardiovascular (heart rate, HRV, blood pressure, recovery)
  - Sleep Analysis (sleep stages, quality, readiness, recovery)
  - Performance (training load, VO2 max, strain, progress)
*/

-- Insert Metabolic Health Template
INSERT INTO dashboard_templates (id, name, category, description, icon, color_scheme, required_sources, default_layout, default_widgets, featured)
VALUES (
  'metabolic-health',
  'Metabolic Health',
  'metabolic',
  'Glucose, exercise, nutrition, and sleep in one view',
  'droplet',
  'blue-cyan',
  ARRAY['dexcom', 'libre-agg', 'terra', 'fitbit'],
  '{"cols": 12, "rowHeight": 80}'::jsonb,
  '[
    {
      "type": "glucose_trend",
      "title": "Glucose Trend",
      "position": {"x": 0, "y": 0, "w": 8, "h": 4},
      "config": {"timeRange": "24h", "showTIR": true, "showTrend": true}
    },
    {
      "type": "glucose_stats",
      "title": "Glucose Statistics",
      "position": {"x": 8, "y": 0, "w": 4, "h": 2},
      "config": {"metrics": ["mean", "gmi", "cv"]}
    },
    {
      "type": "activity_summary",
      "title": "Activity Summary",
      "position": {"x": 8, "y": 2, "w": 4, "h": 2},
      "config": {"metrics": ["steps", "calories", "active_minutes"]}
    },
    {
      "type": "sleep_score",
      "title": "Sleep Quality",
      "position": {"x": 0, "y": 4, "w": 4, "h": 3},
      "config": {"showStages": true}
    },
    {
      "type": "correlation_chart",
      "title": "Glucose vs Activity",
      "position": {"x": 4, "y": 4, "w": 8, "h": 3},
      "config": {"xAxis": "glucose", "yAxis": "activity", "timeRange": "7d"}
    }
  ]'::jsonb,
  true
) ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  default_widgets = EXCLUDED.default_widgets,
  featured = EXCLUDED.featured;

-- Insert Cardiovascular Template
INSERT INTO dashboard_templates (id, name, category, description, icon, color_scheme, required_sources, default_layout, default_widgets, featured)
VALUES (
  'cardiovascular',
  'Cardiovascular',
  'heart',
  'Heart rate, HRV, blood pressure, and recovery metrics',
  'heart',
  'red-pink',
  ARRAY['fitbit', 'oura', 'whoop', 'polar', 'terra'],
  '{"cols": 12, "rowHeight": 80}'::jsonb,
  '[
    {
      "type": "heart_rate_zones",
      "title": "Heart Rate Zones",
      "position": {"x": 0, "y": 0, "w": 6, "h": 4},
      "config": {"timeRange": "24h", "showZones": true}
    },
    {
      "type": "hrv_trend",
      "title": "HRV Trend",
      "position": {"x": 6, "y": 0, "w": 6, "h": 4},
      "config": {"timeRange": "7d", "showBaseline": true}
    },
    {
      "type": "recovery_score",
      "title": "Recovery Score",
      "position": {"x": 0, "y": 4, "w": 4, "h": 3},
      "config": {"showTrend": true, "period": "7d"}
    },
    {
      "type": "resting_hr",
      "title": "Resting Heart Rate",
      "position": {"x": 4, "y": 4, "w": 4, "h": 3},
      "config": {"timeRange": "30d", "showAverage": true}
    },
    {
      "type": "cardiovascular_health",
      "title": "Cardiovascular Health Score",
      "position": {"x": 8, "y": 4, "w": 4, "h": 3},
      "config": {"metrics": ["hrv", "rhr", "bp", "recovery"]}
    }
  ]'::jsonb,
  true
) ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  default_widgets = EXCLUDED.default_widgets,
  featured = EXCLUDED.featured;

-- Insert Sleep Analysis Template
INSERT INTO dashboard_templates (id, name, category, description, icon, color_scheme, required_sources, default_layout, default_widgets, featured)
VALUES (
  'sleep-analysis',
  'Sleep Analysis',
  'sleep',
  'Sleep stages, quality, readiness, and recovery',
  'moon',
  'indigo-blue',
  ARRAY['oura', 'fitbit', 'whoop', 'terra'],
  '{"cols": 12, "rowHeight": 80}'::jsonb,
  '[
    {
      "type": "sleep_stages",
      "title": "Sleep Stages",
      "position": {"x": 0, "y": 0, "w": 8, "h": 4},
      "config": {"showStages": ["awake", "light", "deep", "rem"], "timeRange": "1d"}
    },
    {
      "type": "sleep_score",
      "title": "Sleep Score",
      "position": {"x": 8, "y": 0, "w": 4, "h": 2},
      "config": {"period": "today"}
    },
    {
      "type": "readiness_score",
      "title": "Readiness Score",
      "position": {"x": 8, "y": 2, "w": 4, "h": 2},
      "config": {"period": "today"}
    },
    {
      "type": "sleep_efficiency",
      "title": "Sleep Efficiency Trend",
      "position": {"x": 0, "y": 4, "w": 6, "h": 3},
      "config": {"timeRange": "7d", "showGoal": true}
    },
    {
      "type": "sleep_duration",
      "title": "Sleep Duration",
      "position": {"x": 6, "y": 4, "w": 6, "h": 3},
      "config": {"timeRange": "7d", "showRecommended": true}
    }
  ]'::jsonb,
  true
) ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  default_widgets = EXCLUDED.default_widgets,
  featured = EXCLUDED.featured;

-- Insert Performance Template
INSERT INTO dashboard_templates (id, name, category, description, icon, color_scheme, required_sources, default_layout, default_widgets, featured)
VALUES (
  'performance',
  'Performance',
  'fitness',
  'Training load, VO2 max, strain, and progress tracking',
  'trending-up',
  'green-emerald',
  ARRAY['garmin', 'polar', 'whoop', 'fitbit', 'terra'],
  '{"cols": 12, "rowHeight": 80}'::jsonb,
  '[
    {
      "type": "training_load",
      "title": "Training Load",
      "position": {"x": 0, "y": 0, "w": 6, "h": 4},
      "config": {"timeRange": "7d", "showZones": ["base", "tempo", "threshold", "vo2max"]}
    },
    {
      "type": "vo2_max_trend",
      "title": "VO2 Max Trend",
      "position": {"x": 6, "y": 0, "w": 6, "h": 4},
      "config": {"timeRange": "90d", "showEstimate": true}
    },
    {
      "type": "strain_recovery",
      "title": "Strain vs Recovery",
      "position": {"x": 0, "y": 4, "w": 8, "h": 3},
      "config": {"timeRange": "14d", "showBalance": true}
    },
    {
      "type": "performance_summary",
      "title": "Performance Summary",
      "position": {"x": 8, "y": 4, "w": 4, "h": 3},
      "config": {"metrics": ["fitness", "fatigue", "form"]}
    }
  ]'::jsonb,
  true
) ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  default_widgets = EXCLUDED.default_widgets,
  featured = EXCLUDED.featured;

-- Insert Comprehensive Overview Template
INSERT INTO dashboard_templates (id, name, category, description, icon, color_scheme, required_sources, default_layout, default_widgets, featured)
VALUES (
  'comprehensive',
  'Comprehensive Health',
  'overview',
  'All-in-one dashboard with key metrics from all sources',
  'layout-dashboard',
  'slate-gray',
  ARRAY['dexcom', 'fitbit', 'oura', 'terra'],
  '{"cols": 12, "rowHeight": 80}'::jsonb,
  '[
    {
      "type": "health_summary",
      "title": "Health Summary",
      "position": {"x": 0, "y": 0, "w": 12, "h": 2},
      "config": {"showAll": true}
    },
    {
      "type": "glucose_compact",
      "title": "Glucose",
      "position": {"x": 0, "y": 2, "w": 3, "h": 2},
      "config": {"metric": "current", "showTrend": true}
    },
    {
      "type": "heart_rate_compact",
      "title": "Heart Rate",
      "position": {"x": 3, "y": 2, "w": 3, "h": 2},
      "config": {"metric": "current", "showZone": true}
    },
    {
      "type": "activity_compact",
      "title": "Activity",
      "position": {"x": 6, "y": 2, "w": 3, "h": 2},
      "config": {"metric": "steps", "showGoal": true}
    },
    {
      "type": "sleep_compact",
      "title": "Sleep",
      "position": {"x": 9, "y": 2, "w": 3, "h": 2},
      "config": {"metric": "score", "showDuration": true}
    },
    {
      "type": "multi_metric_timeline",
      "title": "Health Timeline",
      "position": {"x": 0, "y": 4, "w": 12, "h": 4},
      "config": {"metrics": ["glucose", "heart_rate", "steps", "sleep"], "timeRange": "24h"}
    }
  ]'::jsonb,
  true
) ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  default_widgets = EXCLUDED.default_widgets,
  featured = EXCLUDED.featured;
