/*
  # Seed Heart Monitoring Device Catalog

  Populate the heart device catalog with recommended devices:
  - Medical-grade ECG monitors (AliveCor KardiaMobile series)
  - Hybrid smartwatches (Withings ScanWatch 2, Fitbit Sense 2)
  - Precision chest strap sensors (Polar H10, Garmin HRM 200)
  - Alternative form factors (Oura Ring 4, Frontier X2)
*/

-- Medical-Grade ECG Monitors
INSERT INTO heart_device_catalog (
  device_name, manufacturer, model_number, device_category, primary_use_case,
  description, key_features, form_factor, has_ecg, ecg_lead_count,
  has_continuous_monitoring, has_hrv, has_medical_certification, fda_cleared, ce_marked,
  accuracy_rating, battery_life_hours, connectivity_types, compatible_platforms,
  data_export_formats, price_usd, insurance_eligible, requires_subscription,
  manufacturer_url, is_available, availability_status
) VALUES
(
  'KardiaMobile Personal EKG',
  'AliveCor',
  'AC-009',
  'medical_ecg',
  'medical_diagnosis',
  'Medical-grade portable ECG monitor delivering 30-second FDA-cleared heart rhythm recordings that can be instantly shared with your physician. Detects atrial fibrillation, bradycardia, tachycardia, and normal sinus rhythm.',
  ARRAY['FDA-cleared medical device', 'Detects AFib in 30 seconds', 'Instant PDF reports for doctors', 'Unlimited recordings', 'No subscription required for basic use', 'Detects 6 arrhythmias'],
  'portable_handheld',
  true,
  1,
  false,
  false,
  true,
  true,
  true,
  4.8,
  NULL,
  ARRAY['Bluetooth'],
  ARRAY['iOS', 'Android'],
  ARRAY['pdf', 'email'],
  79.00,
  true,
  false,
  'https://www.alivecor.com/kardiamobile',
  true,
  'available'
),
(
  'KardiaMobile 6L',
  'AliveCor',
  'AC-019',
  'medical_ecg',
  'medical_diagnosis',
  'Advanced 6-lead ECG monitor providing medical-grade heart rhythm analysis comparable to leads I, II, III, aVL, aVR, and aVF from a standard 12-lead ECG. Ideal for comprehensive cardiac monitoring and detecting complex arrhythmias.',
  ARRAY['6-lead ECG recordings', 'FDA-cleared medical device', 'Detects AFib and 6+ arrhythmias', 'Advanced cardiac analysis', 'Enhanced accuracy for serious conditions', 'Cardiologist-level insights'],
  'portable_handheld',
  true,
  6,
  false,
  true,
  true,
  true,
  true,
  5.0,
  NULL,
  ARRAY['Bluetooth'],
  ARRAY['iOS', 'Android'],
  ARRAY['pdf', 'email'],
  149.00,
  true,
  false,
  'https://www.alivecor.com/kardiamobile6l',
  true,
  'available'
);

-- Hybrid Smartwatches
INSERT INTO heart_device_catalog (
  device_name, manufacturer, model_number, device_category, primary_use_case,
  description, key_features, form_factor, has_ecg, ecg_lead_count,
  has_continuous_monitoring, has_hrv, has_medical_certification, fda_cleared, ce_marked,
  accuracy_rating, battery_life_hours, connectivity_types, compatible_platforms,
  data_export_formats, price_usd, insurance_eligible, requires_subscription,
  manufacturer_url, is_available, availability_status
) VALUES
(
  'ScanWatch 2',
  'Withings',
  'HWA11',
  'hybrid_smartwatch',
  'wellness_tracking',
  'Premium hybrid smartwatch combining elegant analog design with advanced health sensors. Features medical-grade ECG, continuous heart rate, respiratory rate during sleep, and comprehensive wellness metrics for long-term health monitoring.',
  ARRAY['Medical-grade ECG', 'Continuous heart rate monitoring', '24/7 heart rhythm analysis', 'Sleep breathing disturbances', 'VO2 max estimation', 'Up to 30-day battery life', 'Classic watch design'],
  'wrist_worn',
  true,
  1,
  true,
  true,
  true,
  false,
  true,
  4.6,
  720,
  ARRAY['Bluetooth', 'Wi-Fi'],
  ARRAY['iOS', 'Android'],
  ARRAY['pdf', 'app'],
  349.95,
  false,
  false,
  'https://www.withings.com/scanwatch-2',
  true,
  'available'
),
(
  'Sense 2 Advanced Health Smartwatch',
  'Fitbit',
  'FB521',
  'hybrid_smartwatch',
  'fitness_training',
  'Comprehensive health and fitness smartwatch with advanced heart rate tracking, ECG app, stress management tools, and detailed readiness scores. Optimized for training and wellness with 6+ days battery life.',
  ARRAY['Continuous heart rate', 'ECG app for AFib detection', 'Stress Management Score', 'Daily Readiness Score', 'Sleep tracking with stages', '40+ exercise modes', '6+ days battery', 'Built-in GPS'],
  'wrist_worn',
  true,
  1,
  true,
  true,
  true,
  true,
  true,
  4.4,
  144,
  ARRAY['Bluetooth', 'Wi-Fi'],
  ARRAY['iOS', 'Android'],
  ARRAY['app'],
  249.95,
  false,
  true,
  'https://www.fitbit.com/global/us/products/smartwatches/sense2',
  true,
  'available'
);

-- Precision Chest Strap Sensors
INSERT INTO heart_device_catalog (
  device_name, manufacturer, model_number, device_category, primary_use_case,
  description, key_features, form_factor, has_ecg, ecg_lead_count,
  has_continuous_monitoring, has_hrv, has_medical_certification, fda_cleared, ce_marked,
  accuracy_rating, battery_life_hours, connectivity_types, compatible_platforms,
  data_export_formats, price_usd, insurance_eligible, requires_subscription,
  manufacturer_url, is_available, availability_status
) VALUES
(
  'H10 Heart Rate Sensor',
  'Polar',
  'H10',
  'chest_strap_sensor',
  'performance_optimization',
  'The gold standard for heart rate accuracy. ECG-quality chest strap sensor delivering superior precision compared to wrist-worn monitors. Ideal for serious training, HRV analysis, and performance optimization.',
  ARRAY['ECG-accurate heart rate', 'Superior accuracy vs wrist monitors', 'HRV and R-R interval recording', 'Internal memory for swimming', 'Bluetooth and ANT+ connectivity', 'Compatible with 100+ apps', 'Rechargeable battery'],
  'chest_strap',
  false,
  NULL,
  true,
  true,
  false,
  false,
  false,
  5.0,
  400,
  ARRAY['Bluetooth', 'ANT+'],
  ARRAY['iOS', 'Android', 'Training computers'],
  ARRAY['app', 'fit'],
  89.95,
  false,
  false,
  'https://www.polar.com/us-en/sensors/h10-heart-rate-sensor',
  true,
  'available'
),
(
  'HRM-Pro Plus',
  'Garmin',
  'HRM-PROPLUS',
  'chest_strap_sensor',
  'fitness_training',
  'Premium heart rate monitor designed for serious training. Captures advanced running metrics, training effect, and recovery data. Perfect for monitoring training zones, HRV, and performance optimization.',
  ARRAY['Premium heart rate accuracy', 'Running dynamics (cadence, stride, etc)', 'Training Effect and Load', 'HRV stress tracking', 'ANT+ and Bluetooth connectivity', 'Battery-powered (user replaceable)', 'Water-resistant'],
  'chest_strap',
  false,
  NULL,
  true,
  true,
  false,
  false,
  false,
  4.9,
  12,
  ARRAY['Bluetooth', 'ANT+'],
  ARRAY['iOS', 'Android', 'Garmin devices'],
  ARRAY['app', 'fit'],
  129.99,
  false,
  false,
  'https://www.garmin.com/en-US/p/682155',
  true,
  'available'
);

-- Alternative Form Factors
INSERT INTO heart_device_catalog (
  device_name, manufacturer, model_number, device_category, primary_use_case,
  description, key_features, form_factor, has_ecg, ecg_lead_count,
  has_continuous_monitoring, has_hrv, has_medical_certification, fda_cleared, ce_marked,
  accuracy_rating, battery_life_hours, connectivity_types, compatible_platforms,
  data_export_formats, price_usd, insurance_eligible, requires_subscription,
  subscription_price_monthly, manufacturer_url, is_available, availability_status
) VALUES
(
  'Oura Ring 4',
  'Oura',
  'Gen4',
  'wearable_ring',
  'wellness_tracking',
  'Advanced wellness ring capturing continuous heart rate, HRV, temperature, and comprehensive sleep metrics. Minimalist form factor with holistic health insights and recovery tracking. Perfect for 24/7 wellness monitoring.',
  ARRAY['24/7 heart rate tracking', 'HRV and recovery metrics', 'Sleep stage analysis', 'Body temperature trends', 'Activity and readiness scores', '7-day battery life', 'Discreet ring form factor'],
  'ring',
  false,
  NULL,
  true,
  true,
  false,
  false,
  true,
  4.5,
  168,
  ARRAY['Bluetooth'],
  ARRAY['iOS', 'Android'],
  ARRAY['app'],
  349.00,
  false,
  true,
  5.99,
  'https://ouraring.com/product/oura-ring-4',
  true,
  'available'
),
(
  'Frontier X2 Smart Heart Monitor',
  'Fourth Frontier',
  'FX2',
  'continuous_ecg',
  'performance_optimization',
  'Specialized continuous ECG monitor designed specifically for exercise and training. Provides real-time cardiac strain monitoring, heart rhythm analysis during workouts, and detailed training optimization insights.',
  ARRAY['Continuous ECG during exercise', 'Real-time cardiac strain alerts', 'Training intensity optimization', 'Arrhythmia detection', 'Chest strap placement', 'Live workout feedback', 'Medical-grade monitoring'],
  'chest_strap',
  true,
  1,
  true,
  true,
  true,
  false,
  true,
  4.7,
  24,
  ARRAY['Bluetooth'],
  ARRAY['iOS', 'Android'],
  ARRAY['pdf', 'app'],
  499.00,
  true,
  false,
  'https://fourthfrontier.com/products/frontier-x2',
  true,
  'available'
);

-- Add detailed specifications for KardiaMobile
INSERT INTO heart_device_specifications (device_id, spec_category, spec_name, spec_value, spec_unit, display_order)
SELECT id, 'Accuracy', 'Clinical Validation', '98.7% sensitivity for AFib detection', NULL, 1
FROM heart_device_catalog WHERE device_name = 'KardiaMobile Personal EKG'
UNION ALL
SELECT id, 'Accuracy', 'Specificity', '97.5% for normal sinus rhythm', NULL, 2
FROM heart_device_catalog WHERE device_name = 'KardiaMobile Personal EKG'
UNION ALL
SELECT id, 'Recording', 'Recording Duration', '30', 'seconds', 3
FROM heart_device_catalog WHERE device_name = 'KardiaMobile Personal EKG'
UNION ALL
SELECT id, 'Recording', 'Sample Rate', '300', 'Hz', 4
FROM heart_device_catalog WHERE device_name = 'KardiaMobile Personal EKG'
UNION ALL
SELECT id, 'Certifications', 'FDA Class', 'Class II Medical Device', NULL, 5
FROM heart_device_catalog WHERE device_name = 'KardiaMobile Personal EKG'
UNION ALL
SELECT id, 'Dimensions', 'Size', '3.23 x 1.27 x 0.2 inches', NULL, 6
FROM heart_device_catalog WHERE device_name = 'KardiaMobile Personal EKG';

-- Add detailed specifications for Polar H10
INSERT INTO heart_device_specifications (device_id, spec_category, spec_name, spec_value, spec_unit, display_order)
SELECT id, 'Accuracy', 'Error Rate', '±1 BPM compared to ECG', NULL, 1
FROM heart_device_catalog WHERE device_name = 'H10 Heart Rate Sensor'
UNION ALL
SELECT id, 'Recording', 'R-R Interval', 'High precision 1ms resolution', NULL, 2
FROM heart_device_catalog WHERE device_name = 'H10 Heart Rate Sensor'
UNION ALL
SELECT id, 'Memory', 'Internal Storage', '4 MB for 600 hours of training', NULL, 3
FROM heart_device_catalog WHERE device_name = 'H10 Heart Rate Sensor'
UNION ALL
SELECT id, 'Battery', 'Battery Life', '400', 'hours', 4
FROM heart_device_catalog WHERE device_name = 'H10 Heart Rate Sensor'
UNION ALL
SELECT id, 'Range', 'Transmission Range', '10', 'meters', 5
FROM heart_device_catalog WHERE device_name = 'H10 Heart Rate Sensor';

-- Add detailed specifications for Withings ScanWatch 2
INSERT INTO heart_device_specifications (device_id, spec_category, spec_name, spec_value, spec_unit, display_order)
SELECT id, 'Display', 'Screen Type', 'OLED + Analog hands', NULL, 1
FROM heart_device_catalog WHERE device_name = 'ScanWatch 2'
UNION ALL
SELECT id, 'Sensors', 'PPG Sensor', 'Multi-wavelength continuous monitoring', NULL, 2
FROM heart_device_catalog WHERE device_name = 'ScanWatch 2'
UNION ALL
SELECT id, 'Battery', 'Battery Life', '30', 'days', 3
FROM heart_device_catalog WHERE device_name = 'ScanWatch 2'
UNION ALL
SELECT id, 'Water Resistance', 'Rating', '5 ATM (50 meters)', NULL, 4
FROM heart_device_catalog WHERE device_name = 'ScanWatch 2'
UNION ALL
SELECT id, 'Accuracy', 'ECG Validation', 'CE marked medical device', NULL, 5
FROM heart_device_catalog WHERE device_name = 'ScanWatch 2';
