/*
  # Seed Device Registry with Supported Health Devices

  This migration populates the device_registry table with all currently supported
  and planned health devices, including their specifications, capabilities, and
  integration details.
*/

-- =============================================
-- CONTINUOUS GLUCOSE MONITORS (CGM)
-- =============================================

INSERT INTO device_registry (
  device_type, manufacturer, model_name, provider_key,
  supports_realtime, supports_webhook, data_types,
  api_version, polling_interval_minutes, battery_life_hours,
  fda_cleared, metadata
) VALUES
(
  'cgm', 'Dexcom', 'G6', 'dexcom',
  true, true, ARRAY['glucose', 'glucose_trend', 'glucose_delta'],
  'v3', 5, 240,
  true, '{"frequency": "5min", "calibration_required": false, "wear_duration_days": 10}'::jsonb
),
(
  'cgm', 'Dexcom', 'G7', 'dexcom',
  true, true, ARRAY['glucose', 'glucose_trend', 'glucose_delta'],
  'v3', 5, 288,
  true, '{"frequency": "5min", "calibration_required": false, "wear_duration_days": 10, "warmup_hours": 0.5}'::jsonb
),
(
  'cgm', 'Abbott', 'FreeStyle Libre 2', 'libre-agg',
  true, true, ARRAY['glucose', 'glucose_trend'],
  'v1', 15, 336,
  true, '{"frequency": "1min", "calibration_required": false, "wear_duration_days": 14, "scan_required": false}'::jsonb
),
(
  'cgm', 'Abbott', 'FreeStyle Libre 3', 'libre-agg',
  true, true, ARRAY['glucose', 'glucose_trend'],
  'v1', 1, 336,
  true, '{"frequency": "1min", "calibration_required": false, "wear_duration_days": 14, "real_time": true}'::jsonb
);

-- =============================================
-- FITNESS TRACKERS & SMARTWATCHES
-- =============================================

INSERT INTO device_registry (
  device_type, manufacturer, model_name, provider_key,
  supports_realtime, supports_webhook, data_types,
  api_version, polling_interval_minutes, battery_life_hours,
  fda_cleared, metadata
) VALUES
(
  'fitness_tracker', 'Fitbit', 'Charge 6', 'fitbit',
  false, true, ARRAY['steps', 'heart_rate', 'calories', 'distance', 'active_minutes', 'sleep', 'spo2'],
  'v1.2', 60, 168,
  false, '{"gps": true, "water_resistant": true, "screen_type": "color"}'::jsonb
),
(
  'smartwatch', 'Fitbit', 'Sense 2', 'fitbit',
  false, true, ARRAY['steps', 'heart_rate', 'hrv', 'calories', 'stress', 'sleep', 'spo2', 'skin_temperature'],
  'v1.2', 60, 144,
  false, '{"gps": true, "ecg": true, "eda_sensor": true}'::jsonb
),
(
  'fitness_tracker', 'Garmin', 'Venu 3', 'garmin',
  false, true, ARRAY['steps', 'heart_rate', 'vo2_max', 'stress', 'sleep', 'body_battery'],
  'v2', 60, 336,
  false, '{"gps": true, "music_storage": true, "amoled_display": true}'::jsonb
),
(
  'fitness_tracker', 'Garmin', 'Forerunner 965', 'garmin',
  false, true, ARRAY['steps', 'heart_rate', 'vo2_max', 'training_load', 'recovery_time', 'running_dynamics'],
  'v2', 60, 552,
  false, '{"gps": true, "maps": true, "triathlon_mode": true}'::jsonb
);

-- =============================================
-- WEARABLE RINGS
-- =============================================

INSERT INTO device_registry (
  device_type, manufacturer, model_name, provider_key,
  supports_realtime, supports_webhook, data_types,
  api_version, polling_interval_minutes, battery_life_hours,
  fda_cleared, metadata
) VALUES
(
  'wearable_ring', 'Oura', 'Gen 3', 'oura',
  false, true, ARRAY['heart_rate', 'hrv', 'sleep', 'readiness', 'activity', 'body_temperature', 'respiratory_rate'],
  'v2', 60, 168,
  false, '{"sleep_tracking": "advanced", "temperature_sensing": true, "spo2": true}'::jsonb
),
(
  'wearable_ring', 'Ultrahuman', 'Ring AIR', 'terra',
  false, true, ARRAY['heart_rate', 'hrv', 'sleep', 'movement_index', 'skin_temperature'],
  'v1', 60, 144,
  false, '{"weight_grams": 2.4, "waterproof": true}'::jsonb
);

-- =============================================
-- PERFORMANCE WEARABLES
-- =============================================

INSERT INTO device_registry (
  device_type, manufacturer, model_name, provider_key,
  supports_realtime, supports_webhook, data_types,
  api_version, polling_interval_minutes, battery_life_hours,
  fda_cleared, metadata
) VALUES
(
  'performance_band', 'WHOOP', '4.0', 'whoop',
  false, true, ARRAY['heart_rate', 'hrv', 'strain', 'recovery', 'sleep', 'respiratory_rate', 'spo2'],
  'v1', 60, 120,
  false, '{"battery_pack": true, "continuous_monitoring": true, "no_screen": true}'::jsonb
),
(
  'chest_strap', 'Polar', 'H10', 'polar',
  true, false, ARRAY['heart_rate', 'hrv', 'running_power'],
  'v1', 5, 400,
  false, '{"bluetooth": true, "ant_plus": true, "waterproof": true}'::jsonb
);

-- =============================================
-- HOME HEALTH DEVICES
-- =============================================

INSERT INTO device_registry (
  device_type, manufacturer, model_name, provider_key,
  supports_realtime, supports_webhook, data_types,
  api_version, polling_interval_minutes, battery_life_hours,
  fda_cleared, metadata
) VALUES
(
  'blood_pressure_monitor', 'Withings', 'BPM Connect', 'withings',
  false, true, ARRAY['blood_pressure_systolic', 'blood_pressure_diastolic', 'heart_rate'],
  'v2', NULL, 1460,
  true, '{"cuff_size": "standard", "connectivity": "wifi_bluetooth"}'::jsonb
),
(
  'smart_scale', 'Withings', 'Body Comp', 'withings',
  false, true, ARRAY['weight', 'body_fat', 'muscle_mass', 'bone_mass', 'water_percentage'],
  'v2', NULL, 4380,
  false, '{"max_users": 8, "wifi": true, "weather": true}'::jsonb
),
(
  'pulse_oximeter', 'Withings', 'ScanWatch', 'withings',
  false, true, ARRAY['spo2', 'heart_rate', 'afib_detection', 'sleep'],
  'v2', 60, 720,
  true, '{"ecg": true, "medical_grade": true}'::jsonb
),
(
  'thermometer', 'Kinsa', 'QuickCare', 'manual',
  false, false, ARRAY['body_temperature'],
  'v1', NULL, 8760,
  true, '{"measurement_time_seconds": 8, "bluetooth": true}'::jsonb
);

-- =============================================
-- AGGREGATOR PLATFORMS
-- =============================================

INSERT INTO device_registry (
  device_type, manufacturer, model_name, provider_key,
  supports_realtime, supports_webhook, data_types,
  api_version, polling_interval_minutes, battery_life_hours,
  fda_cleared, metadata
) VALUES
(
  'aggregator', 'Terra', 'API Platform', 'terra',
  false, true, ARRAY['steps', 'heart_rate', 'sleep', 'activity', 'nutrition', 'body'],
  'v2', 60, NULL,
  false, '{"supported_sources": ["fitbit", "garmin", "oura", "whoop", "apple_health", "google_fit", "freestyle_libre", "strava"], "unified_api": true}'::jsonb
),
(
  'aggregator', 'Apple', 'HealthKit', 'manual',
  false, false, ARRAY['steps', 'heart_rate', 'sleep', 'workouts', 'nutrition', 'mindfulness'],
  'v1', NULL, NULL,
  false, '{"platform": "ios", "export_format": "xml", "granular_permissions": true}'::jsonb
),
(
  'aggregator', 'Google', 'Health Connect', 'manual',
  false, false, ARRAY['steps', 'heart_rate', 'sleep', 'workouts', 'nutrition', 'blood_glucose'],
  'v1', NULL, NULL,
  false, '{"platform": "android", "cross_app_sync": true}'::jsonb
);

-- =============================================
-- MANUAL UPLOAD TYPES
-- =============================================

INSERT INTO device_registry (
  device_type, manufacturer, model_name, provider_key,
  supports_realtime, supports_webhook, data_types,
  api_version, polling_interval_minutes, battery_life_hours,
  fda_cleared, metadata
) VALUES
(
  'manual_upload', 'Generic', 'CSV Import', 'manual',
  false, false, ARRAY['glucose', 'insulin', 'carbs', 'exercise', 'medication', 'symptoms'],
  'v1', NULL, NULL,
  false, '{"accepted_formats": ["csv", "json"], "max_file_size_mb": 50, "batch_import": true}'::jsonb
),
(
  'manual_entry', 'Generic', 'Manual Entry', 'manual',
  false, false, ARRAY['glucose', 'blood_pressure', 'weight', 'temperature', 'symptoms', 'notes'],
  'v1', NULL, NULL,
  false, '{"form_based": true, "voice_input": false}'::jsonb
);

-- =============================================
-- EHR/FHIR CONNECTIONS
-- =============================================

INSERT INTO device_registry (
  device_type, manufacturer, model_name, provider_key,
  supports_realtime, supports_webhook, data_types,
  api_version, polling_interval_minutes, battery_life_hours,
  fda_cleared, metadata
) VALUES
(
  'ehr', 'Epic', 'MyChart (FHIR)', 'fhir',
  false, false, ARRAY['lab_results', 'medications', 'immunizations', 'allergies', 'conditions', 'procedures'],
  'R4', NULL, NULL,
  false, '{"fhir_version": "R4", "oauth2": true, "smart_on_fhir": true}'::jsonb
),
(
  'ehr', 'Cerner', 'HealtheLife (FHIR)', 'fhir',
  false, false, ARRAY['lab_results', 'medications', 'immunizations', 'allergies', 'conditions', 'vital_signs'],
  'R4', NULL, NULL,
  false, '{"fhir_version": "R4", "oauth2": true, "smart_on_fhir": true}'::jsonb
);
