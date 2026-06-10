/*
  # Seed Data Transformation Rules for Device Integration

  This migration creates standardized transformation rules to convert vendor-specific
  data formats to unified clinical terminology with LOINC and SNOMED codes.
*/

-- =============================================
-- GLUCOSE METRICS
-- =============================================

INSERT INTO data_transformation_rules (
  provider_key, vendor_field_name, standard_metric_name,
  loinc_code, snomed_code, unit_conversion, validation_rules
) VALUES
(
  'dexcom', 'egvs.value', 'glucose',
  '2339-0', '33747003',
  '{"from_unit": "mg/dL", "to_unit": "mg/dL", "formula": "value"}'::jsonb,
  '{"min": 40, "max": 400, "critical_low": 54, "critical_high": 250}'::jsonb
),
(
  'dexcom', 'egvs.trend', 'glucose_trend',
  '2339-0', '33747003',
  '{}'::jsonb,
  '{"allowed_values": ["None", "DoubleUp", "SingleUp", "FortyFiveUp", "Flat", "FortyFiveDown", "SingleDown", "DoubleDown"]}'::jsonb
),
(
  'libre-agg', 'glucose.value', 'glucose',
  '2339-0', '33747003',
  '{"from_unit": "mg/dL", "to_unit": "mg/dL", "formula": "value"}'::jsonb,
  '{"min": 40, "max": 500, "critical_low": 54, "critical_high": 250}'::jsonb
),
(
  'manual', 'glucose', 'glucose',
  '2339-0', '33747003',
  '{"supports_mmol": true, "mmol_to_mgdl": "value * 18.0182"}'::jsonb,
  '{"min": 40, "max": 600, "critical_low": 54, "critical_high": 250}'::jsonb
);

-- =============================================
-- HEART RATE METRICS
-- =============================================

INSERT INTO data_transformation_rules (
  provider_key, vendor_field_name, standard_metric_name,
  loinc_code, snomed_code, unit_conversion, validation_rules
) VALUES
(
  'fitbit', 'heart.heartRateZones.restingHeartRate', 'resting_heart_rate',
  '8867-4', '364075005',
  '{"from_unit": "bpm", "to_unit": "bpm", "formula": "value"}'::jsonb,
  '{"min": 30, "max": 120, "typical_range": [40, 100]}'::jsonb
),
(
  'fitbit', 'heart.heartRateZones.peak', 'max_heart_rate',
  '8867-4', '364075005',
  '{"from_unit": "bpm", "to_unit": "bpm", "formula": "value"}'::jsonb,
  '{"min": 60, "max": 220, "age_adjusted": true}'::jsonb
),
(
  'oura', 'heart_rate.average', 'heart_rate',
  '8867-4', '364075005',
  '{"from_unit": "bpm", "to_unit": "bpm", "formula": "value"}'::jsonb,
  '{"min": 30, "max": 200}'::jsonb
),
(
  'terra', 'heart_rate_data.avg_hr_bpm', 'heart_rate',
  '8867-4', '364075005',
  '{"from_unit": "bpm", "to_unit": "bpm", "formula": "value"}'::jsonb,
  '{"min": 30, "max": 200}'::jsonb
),
(
  'whoop', 'heart_rate.average_heart_rate', 'heart_rate',
  '8867-4', '364075005',
  '{"from_unit": "bpm", "to_unit": "bpm", "formula": "value"}'::jsonb,
  '{"min": 30, "max": 200}'::jsonb
);

-- =============================================
-- HEART RATE VARIABILITY (HRV)
-- =============================================

INSERT INTO data_transformation_rules (
  provider_key, vendor_field_name, standard_metric_name,
  loinc_code, snomed_code, unit_conversion, validation_rules
) VALUES
(
  'oura', 'hrv.average', 'hrv_rmssd',
  '80404-7', '252076005',
  '{"from_unit": "ms", "to_unit": "ms", "formula": "value"}'::jsonb,
  '{"min": 10, "max": 200, "typical_range": [20, 100]}'::jsonb
),
(
  'whoop', 'recovery.rmssd', 'hrv_rmssd',
  '80404-7', '252076005',
  '{"from_unit": "ms", "to_unit": "ms", "formula": "value"}'::jsonb,
  '{"min": 10, "max": 200}'::jsonb
),
(
  'fitbit', 'hrv.value.rmssd', 'hrv_rmssd',
  '80404-7', '252076005',
  '{"from_unit": "ms", "to_unit": "ms", "formula": "value"}'::jsonb,
  '{"min": 10, "max": 200}'::jsonb
);

-- =============================================
-- ACTIVITY & STEPS
-- =============================================

INSERT INTO data_transformation_rules (
  provider_key, vendor_field_name, standard_metric_name,
  loinc_code, snomed_code, unit_conversion, validation_rules
) VALUES
(
  'fitbit', 'activities.summary.steps', 'steps',
  '55423-8', '228300002',
  '{"from_unit": "steps", "to_unit": "steps", "formula": "value"}'::jsonb,
  '{"min": 0, "max": 100000, "typical_daily": [2000, 20000]}'::jsonb
),
(
  'terra', 'activity.steps', 'steps',
  '55423-8', '228300002',
  '{"from_unit": "steps", "to_unit": "steps", "formula": "value"}'::jsonb,
  '{"min": 0, "max": 100000}'::jsonb
),
(
  'oura', 'activity.steps', 'steps',
  '55423-8', '228300002',
  '{"from_unit": "steps", "to_unit": "steps", "formula": "value"}'::jsonb,
  '{"min": 0, "max": 100000}'::jsonb
),
(
  'fitbit', 'activities.summary.activeMinutes', 'active_minutes',
  '82290-8', '68130003',
  '{"from_unit": "minutes", "to_unit": "minutes", "formula": "value"}'::jsonb,
  '{"min": 0, "max": 1440, "recommended_daily": 30}'::jsonb
);

-- =============================================
-- SLEEP METRICS
-- =============================================

INSERT INTO data_transformation_rules (
  provider_key, vendor_field_name, standard_metric_name,
  loinc_code, snomed_code, unit_conversion, validation_rules
) VALUES
(
  'fitbit', 'sleep.summary.totalMinutesAsleep', 'sleep_duration',
  '93832-4', '258158006',
  '{"from_unit": "minutes", "to_unit": "hours", "formula": "value / 60"}'::jsonb,
  '{"min": 0, "max": 24, "typical_range": [4, 12]}'::jsonb
),
(
  'oura', 'sleep.total_sleep_duration', 'sleep_duration',
  '93832-4', '258158006',
  '{"from_unit": "seconds", "to_unit": "hours", "formula": "value / 3600"}'::jsonb,
  '{"min": 0, "max": 24}'::jsonb
),
(
  'whoop', 'sleep.total_sleep_minutes', 'sleep_duration',
  '93832-4', '258158006',
  '{"from_unit": "minutes", "to_unit": "hours", "formula": "value / 60"}'::jsonb,
  '{"min": 0, "max": 24}'::jsonb
),
(
  'fitbit', 'sleep.levels.summary.deep.minutes', 'deep_sleep',
  '93831-6', '258158006',
  '{"from_unit": "minutes", "to_unit": "minutes", "formula": "value"}'::jsonb,
  '{"min": 0, "max": 300, "typical_percentage": [15, 25]}'::jsonb
),
(
  'oura', 'sleep.deep_sleep_duration', 'deep_sleep',
  '93831-6', '258158006',
  '{"from_unit": "seconds", "to_unit": "minutes", "formula": "value / 60"}'::jsonb,
  '{"min": 0, "max": 300}'::jsonb
),
(
  'fitbit', 'sleep.levels.summary.rem.minutes', 'rem_sleep',
  '93830-8', '248218005',
  '{"from_unit": "minutes", "to_unit": "minutes", "formula": "value"}'::jsonb,
  '{"min": 0, "max": 300, "typical_percentage": [20, 25]}'::jsonb
),
(
  'oura', 'sleep.rem_sleep_duration', 'rem_sleep',
  '93830-8', '248218005',
  '{"from_unit": "seconds", "to_unit": "minutes", "formula": "value / 60"}'::jsonb,
  '{"min": 0, "max": 300}'::jsonb
);

-- =============================================
-- BLOOD PRESSURE
-- =============================================

INSERT INTO data_transformation_rules (
  provider_key, vendor_field_name, standard_metric_name,
  loinc_code, snomed_code, unit_conversion, validation_rules
) VALUES
(
  'withings', 'blood_pressure.systolic', 'blood_pressure_systolic',
  '8480-6', '271649006',
  '{"from_unit": "mmHg", "to_unit": "mmHg", "formula": "value"}'::jsonb,
  '{"min": 70, "max": 250, "normal_range": [90, 120], "critical_high": 180}'::jsonb
),
(
  'withings', 'blood_pressure.diastolic', 'blood_pressure_diastolic',
  '8462-4', '271650006',
  '{"from_unit": "mmHg", "to_unit": "mmHg", "formula": "value"}'::jsonb,
  '{"min": 40, "max": 150, "normal_range": [60, 80], "critical_high": 120}'::jsonb
),
(
  'manual', 'bp_systolic', 'blood_pressure_systolic',
  '8480-6', '271649006',
  '{"from_unit": "mmHg", "to_unit": "mmHg", "formula": "value"}'::jsonb,
  '{"min": 70, "max": 250, "critical_high": 180}'::jsonb
),
(
  'manual', 'bp_diastolic', 'blood_pressure_diastolic',
  '8462-4', '271650006',
  '{"from_unit": "mmHg", "to_unit": "mmHg", "formula": "value"}'::jsonb,
  '{"min": 40, "max": 150, "critical_high": 120}'::jsonb
);

-- =============================================
-- BODY COMPOSITION
-- =============================================

INSERT INTO data_transformation_rules (
  provider_key, vendor_field_name, standard_metric_name,
  loinc_code, snomed_code, unit_conversion, validation_rules
) VALUES
(
  'withings', 'weight.value', 'body_weight',
  '29463-7', '27113001',
  '{"from_unit": "kg", "to_unit": "kg", "supports_lbs": true, "lbs_to_kg": "value / 2.20462"}'::jsonb,
  '{"min": 20, "max": 300}'::jsonb
),
(
  'withings', 'body_composition.fat_mass_weight', 'body_fat_mass',
  '73708-0', '248300009',
  '{"from_unit": "kg", "to_unit": "kg", "formula": "value"}'::jsonb,
  '{"min": 0, "max": 200}'::jsonb
),
(
  'withings', 'body_composition.fat_ratio', 'body_fat_percentage',
  '41982-0', '248300009',
  '{"from_unit": "percentage", "to_unit": "percentage", "formula": "value * 100"}'::jsonb,
  '{"min": 3, "max": 60, "gender_specific": true}'::jsonb
),
(
  'withings', 'body_composition.muscle_mass', 'muscle_mass',
  '73964-9', '91727004',
  '{"from_unit": "kg", "to_unit": "kg", "formula": "value"}'::jsonb,
  '{"min": 10, "max": 150}'::jsonb
),
(
  'manual', 'weight', 'body_weight',
  '29463-7', '27113001',
  '{"from_unit": "kg", "to_unit": "kg", "supports_lbs": true, "lbs_to_kg": "value / 2.20462"}'::jsonb,
  '{"min": 20, "max": 300}'::jsonb
);

-- =============================================
-- OXYGEN SATURATION
-- =============================================

INSERT INTO data_transformation_rules (
  provider_key, vendor_field_name, standard_metric_name,
  loinc_code, snomed_code, unit_conversion, validation_rules
) VALUES
(
  'fitbit', 'spo2.value', 'oxygen_saturation',
  '59408-5', '431314004',
  '{"from_unit": "percentage", "to_unit": "percentage", "formula": "value"}'::jsonb,
  '{"min": 70, "max": 100, "critical_low": 88, "normal_range": [95, 100]}'::jsonb
),
(
  'withings', 'spo2.value', 'oxygen_saturation',
  '59408-5', '431314004',
  '{"from_unit": "percentage", "to_unit": "percentage", "formula": "value"}'::jsonb,
  '{"min": 70, "max": 100, "critical_low": 88}'::jsonb
),
(
  'oura', 'spo2.average', 'oxygen_saturation',
  '59408-5', '431314004',
  '{"from_unit": "percentage", "to_unit": "percentage", "formula": "value"}'::jsonb,
  '{"min": 70, "max": 100, "critical_low": 88}'::jsonb
),
(
  'whoop', 'spo2.percentage', 'oxygen_saturation',
  '59408-5', '431314004',
  '{"from_unit": "percentage", "to_unit": "percentage", "formula": "value"}'::jsonb,
  '{"min": 70, "max": 100, "critical_low": 88}'::jsonb
);

-- =============================================
-- TEMPERATURE
-- =============================================

INSERT INTO data_transformation_rules (
  provider_key, vendor_field_name, standard_metric_name,
  loinc_code, snomed_code, unit_conversion, validation_rules
) VALUES
(
  'oura', 'temperature.temperature_delta', 'body_temperature_delta',
  '8310-5', '386725007',
  '{"from_unit": "celsius", "to_unit": "celsius", "formula": "value"}'::jsonb,
  '{"min": -5, "max": 5}'::jsonb
),
(
  'fitbit', 'temperature.core', 'body_temperature',
  '8310-5', '386725007',
  '{"from_unit": "celsius", "to_unit": "celsius", "supports_fahrenheit": true, "f_to_c": "(value - 32) * 5/9"}'::jsonb,
  '{"min": 35, "max": 42, "normal_range": [36.1, 37.2], "fever": 38}'::jsonb
),
(
  'manual', 'temperature', 'body_temperature',
  '8310-5', '386725007',
  '{"from_unit": "celsius", "to_unit": "celsius", "supports_fahrenheit": true, "f_to_c": "(value - 32) * 5/9"}'::jsonb,
  '{"min": 35, "max": 42, "fever": 38}'::jsonb
);

-- =============================================
-- RESPIRATORY RATE
-- =============================================

INSERT INTO data_transformation_rules (
  provider_key, vendor_field_name, standard_metric_name,
  loinc_code, snomed_code, unit_conversion, validation_rules
) VALUES
(
  'oura', 'respiratory_rate.average', 'respiratory_rate',
  '9279-1', '86290005',
  '{"from_unit": "breaths/min", "to_unit": "breaths/min", "formula": "value"}'::jsonb,
  '{"min": 8, "max": 40, "normal_range": [12, 20]}'::jsonb
),
(
  'whoop', 'respiratory_rate.average', 'respiratory_rate',
  '9279-1', '86290005',
  '{"from_unit": "breaths/min", "to_unit": "breaths/min", "formula": "value"}'::jsonb,
  '{"min": 8, "max": 40}'::jsonb
),
(
  'withings', 'respiratory_rate.value', 'respiratory_rate',
  '9279-1', '86290005',
  '{"from_unit": "breaths/min", "to_unit": "breaths/min", "formula": "value"}'::jsonb,
  '{"min": 8, "max": 40}'::jsonb
);

-- =============================================
-- CALORIES & ENERGY
-- =============================================

INSERT INTO data_transformation_rules (
  provider_key, vendor_field_name, standard_metric_name,
  loinc_code, snomed_code, unit_conversion, validation_rules
) VALUES
(
  'fitbit', 'activities.summary.caloriesOut', 'calories_burned',
  '41981-2', '80259003',
  '{"from_unit": "kcal", "to_unit": "kcal", "formula": "value"}'::jsonb,
  '{"min": 0, "max": 10000, "typical_daily": [1200, 4000]}'::jsonb
),
(
  'terra', 'activity.calories_data.total_burned_calories', 'calories_burned',
  '41981-2', '80259003',
  '{"from_unit": "kcal", "to_unit": "kcal", "formula": "value"}'::jsonb,
  '{"min": 0, "max": 10000}'::jsonb
),
(
  'oura', 'activity.total_calories', 'calories_burned',
  '41981-2', '80259003',
  '{"from_unit": "kcal", "to_unit": "kcal", "formula": "value"}'::jsonb,
  '{"min": 0, "max": 10000}'::jsonb
);

-- =============================================
-- VO2 MAX
-- =============================================

INSERT INTO data_transformation_rules (
  provider_key, vendor_field_name, standard_metric_name,
  loinc_code, snomed_code, unit_conversion, validation_rules
) VALUES
(
  'garmin', 'vo2_max', 'vo2_max',
  '99780-5', '250834007',
  '{"from_unit": "mL/kg/min", "to_unit": "mL/kg/min", "formula": "value"}'::jsonb,
  '{"min": 20, "max": 90, "fitness_categories": {"poor": 35, "fair": 42, "good": 51, "excellent": 56}}'::jsonb
),
(
  'terra', 'daily.vo2_max', 'vo2_max',
  '99780-5', '250834007',
  '{"from_unit": "mL/kg/min", "to_unit": "mL/kg/min", "formula": "value"}'::jsonb,
  '{"min": 20, "max": 90}'::jsonb
);
