/*
  # Seed Troubleshooting Guides for All Devices

  Comprehensive troubleshooting guides for:
  - Abbott devices (FreeStyle Libre, CardioMEMS)
  - Dexcom CGM
  - Fitbit devices
  - Oura Ring
  - Apple Health
  - Google Fit
  - Garmin devices
  - WHOOP
  - Withings devices
  - Polar devices
  - Terra API integrations
*/

-- Abbott FreeStyle Libre Troubleshooting
INSERT INTO device_troubleshooting_guides (device_type, device_name, manufacturer, issue_category, issue_title, severity, guide_content, success_rate, tags)
VALUES
(
  'cgm',
  'FreeStyle Libre',
  'Abbott',
  'connectivity',
  'Cannot Connect to FreeStyle Libre Sensor',
  'high',
  '{
    "overview": "This guide helps resolve connection issues between your FreeStyle Libre sensor and the mobile app",
    "estimated_time": "10-15 minutes",
    "difficulty": "easy",
    "prerequisites": ["Active sensor", "Charged phone", "LibreLink app installed"]
  }'::jsonb,
  87.5,
  ARRAY['bluetooth', 'nfc', 'sensor', 'abbott']
),
(
  'cgm',
  'FreeStyle Libre',
  'Abbott',
  'data_sync',
  'Glucose Readings Not Syncing',
  'high',
  '{
    "overview": "Resolve issues with glucose data not uploading to LibreView or third-party apps",
    "estimated_time": "5-10 minutes",
    "difficulty": "easy",
    "prerequisites": ["Internet connection", "Valid Abbott account"]
  }'::jsonb,
  92.3,
  ARRAY['sync', 'cloud', 'data', 'abbott']
);

-- Insert steps for FreeStyle Libre connection issue
INSERT INTO troubleshooting_steps (guide_id, step_number, step_title, step_description, step_type, action_required, expected_result, troubleshooting_tips, success_rate)
SELECT
  id,
  1,
  'Verify Sensor is Active',
  'Check that your FreeStyle Libre sensor is properly attached and activated. The sensor should have a small light indicator.',
  'diagnostic',
  'Visually inspect the sensor on your arm. Look for the LED indicator.',
  'Sensor is firmly attached with no visible damage or lifting edges',
  ARRAY[
    'Sensor lasts 14 days from activation',
    'Check activation date in LibreLink app',
    'Ensure sensor is not expired'
  ],
  95.0
FROM device_troubleshooting_guides
WHERE device_name = 'FreeStyle Libre' AND issue_category = 'connectivity'
LIMIT 1;

INSERT INTO troubleshooting_steps (guide_id, step_number, step_title, step_description, step_type, action_required, expected_result, troubleshooting_tips, warning_message, success_rate, requires_app_restart)
SELECT
  id,
  2,
  'Enable NFC on Your Phone',
  'FreeStyle Libre uses NFC (Near Field Communication) to scan the sensor. Ensure NFC is enabled in your phone settings.',
  'configuration',
  'Go to Settings > Connected devices > Connection preferences > NFC and ensure it is ON',
  'NFC toggle is enabled and working',
  ARRAY[
    'On iPhone: NFC is always on, no setting needed',
    'On Android: NFC must be manually enabled',
    'Some phone cases can interfere with NFC'
  ],
  'Remove thick phone cases or metal accessories that may block NFC signal',
  89.5,
  false
FROM device_troubleshooting_guides
WHERE device_name = 'FreeStyle Libre' AND issue_category = 'connectivity'
LIMIT 1;

INSERT INTO troubleshooting_steps (guide_id, step_number, step_title, step_description, step_type, action_required, expected_result, troubleshooting_tips, success_rate)
SELECT
  id,
  3,
  'Scan Sensor with LibreLink App',
  'Open the LibreLink app and hold the top of your phone near the sensor for 1-3 seconds.',
  'action',
  'Hold phone steady near sensor until you hear a beep or see scan complete message',
  'App displays current glucose reading',
  ARRAY[
    'Hold phone within 1-4 cm of sensor',
    'Keep phone steady during scan',
    'Scan can work through light clothing'
  ],
  91.2
FROM device_troubleshooting_guides
WHERE device_name = 'FreeStyle Libre' AND issue_category = 'connectivity'
LIMIT 1;

INSERT INTO troubleshooting_steps (guide_id, step_number, step_title, step_description, step_type, action_required, expected_result, troubleshooting_tips, success_rate, requires_app_restart)
SELECT
  id,
  4,
  'Clear App Cache and Restart',
  'If scanning fails, clear the LibreLink app cache and restart the app.',
  'technical',
  'Go to Settings > Apps > LibreLink > Storage > Clear Cache. Then force stop and restart the app.',
  'App restarts cleanly and sensor scan works',
  ARRAY[
    'Clearing cache does not delete your glucose data',
    'Data is stored in Abbott cloud',
    'Try airplane mode toggle if still failing'
  ],
  85.7,
  true
FROM device_troubleshooting_guides
WHERE device_name = 'FreeStyle Libre' AND issue_category = 'connectivity'
LIMIT 1;

INSERT INTO troubleshooting_steps (guide_id, step_number, step_title, step_description, step_type, action_required, expected_result, troubleshooting_tips, success_rate, requires_app_restart)
SELECT
  id,
  5,
  'Reinstall LibreLink App',
  'As a last resort, uninstall and reinstall the LibreLink app.',
  'technical',
  'Uninstall LibreLink from your phone. Download fresh copy from App Store/Play Store. Log back in with your Abbott account.',
  'App reinstalls successfully and can scan sensor',
  ARRAY[
    'Make sure you know your Abbott account credentials',
    'All historical data is preserved in cloud',
    'Sensor remains active during reinstall'
  ],
  78.3,
  true
FROM device_troubleshooting_guides
WHERE device_name = 'FreeStyle Libre' AND issue_category = 'connectivity'
LIMIT 1;

-- Dexcom CGM Troubleshooting
INSERT INTO device_troubleshooting_guides (device_type, device_name, manufacturer, issue_category, issue_title, severity, guide_content, success_rate, tags)
VALUES
(
  'cgm',
  'Dexcom G6/G7',
  'Dexcom',
  'connectivity',
  'Dexcom Transmitter Not Connecting',
  'high',
  '{
    "overview": "Resolve Bluetooth connectivity issues between Dexcom transmitter and receiver/phone",
    "estimated_time": "10-20 minutes",
    "difficulty": "medium",
    "prerequisites": ["Active transmitter", "Charged receiver or phone", "Bluetooth enabled"]
  }'::jsonb,
  84.2,
  ARRAY['bluetooth', 'transmitter', 'dexcom', 'cgm']
),
(
  'cgm',
  'Dexcom G6/G7',
  'Dexcom',
  'data_accuracy',
  'Inaccurate or Missing Glucose Readings',
  'high',
  '{
    "overview": "Troubleshoot issues with glucose readings showing ??? or appearing inaccurate",
    "estimated_time": "15-30 minutes",
    "difficulty": "medium",
    "prerequisites": ["Valid sensor session", "Proper sensor placement"]
  }'::jsonb,
  79.8,
  ARRAY['accuracy', 'calibration', 'sensor', 'dexcom']
);

-- Fitbit Troubleshooting
INSERT INTO device_troubleshooting_guides (device_type, device_name, manufacturer, issue_category, issue_title, severity, guide_content, success_rate, tags)
VALUES
(
  'fitness_tracker',
  'Fitbit Devices',
  'Fitbit',
  'sync',
  'Fitbit Not Syncing with App',
  'medium',
  '{
    "overview": "Fix sync issues between Fitbit device and mobile app",
    "estimated_time": "5-10 minutes",
    "difficulty": "easy",
    "prerequisites": ["Charged Fitbit", "Fitbit app installed", "Bluetooth enabled"]
  }'::jsonb,
  91.5,
  ARRAY['bluetooth', 'sync', 'fitbit', 'wearable']
),
(
  'fitness_tracker',
  'Fitbit Devices',
  'Fitbit',
  'connectivity',
  'Cannot Find Fitbit Device',
  'medium',
  '{
    "overview": "Resolve issues with Fitbit app not detecting your device",
    "estimated_time": "10-15 minutes",
    "difficulty": "easy",
    "prerequisites": ["Charged Fitbit", "Bluetooth enabled"]
  }'::jsonb,
  88.7,
  ARRAY['bluetooth', 'pairing', 'fitbit', 'discovery']
);

-- Oura Ring Troubleshooting
INSERT INTO device_troubleshooting_guides (device_type, device_name, manufacturer, issue_category, issue_title, severity, guide_content, success_rate, tags)
VALUES
(
  'sleep_tracker',
  'Oura Ring',
  'Oura',
  'sync',
  'Oura Ring Not Syncing Sleep Data',
  'medium',
  '{
    "overview": "Resolve sync issues with Oura Ring sleep and readiness data",
    "estimated_time": "5-10 minutes",
    "difficulty": "easy",
    "prerequisites": ["Charged Oura Ring", "Oura app installed", "Bluetooth enabled"]
  }'::jsonb,
  89.3,
  ARRAY['bluetooth', 'sync', 'oura', 'sleep']
),
(
  'sleep_tracker',
  'Oura Ring',
  'Oura',
  'battery',
  'Oura Ring Battery Draining Quickly',
  'low',
  '{
    "overview": "Troubleshoot rapid battery drain on Oura Ring",
    "estimated_time": "10-15 minutes",
    "difficulty": "easy",
    "prerequisites": ["Oura Ring charger", "Oura app access"]
  }'::jsonb,
  75.2,
  ARRAY['battery', 'power', 'oura', 'hardware']
);

-- Apple Health Troubleshooting
INSERT INTO device_troubleshooting_guides (device_type, device_name, manufacturer, issue_category, issue_title, severity, guide_content, success_rate, tags)
VALUES
(
  'health_platform',
  'Apple Health',
  'Apple',
  'permissions',
  'App Cannot Access Apple Health Data',
  'high',
  '{
    "overview": "Grant proper permissions for third-party apps to read Apple Health data",
    "estimated_time": "3-5 minutes",
    "difficulty": "easy",
    "prerequisites": ["iOS device", "Apple Health app"]
  }'::jsonb,
  95.8,
  ARRAY['permissions', 'ios', 'apple-health', 'integration']
),
(
  'health_platform',
  'Apple Health',
  'Apple',
  'data_sync',
  'Health Data Not Updating',
  'medium',
  '{
    "overview": "Fix issues with Apple Health data not syncing from connected apps/devices",
    "estimated_time": "5-10 minutes",
    "difficulty": "easy",
    "prerequisites": ["iOS device", "Connected health devices"]
  }'::jsonb,
  86.4,
  ARRAY['sync', 'ios', 'apple-health', 'data']
);

-- Google Fit Troubleshooting
INSERT INTO device_troubleshooting_guides (device_type, device_name, manufacturer, issue_category, issue_title, severity, guide_content, success_rate, tags)
VALUES
(
  'health_platform',
  'Google Fit',
  'Google',
  'permissions',
  'App Cannot Access Google Fit Data',
  'high',
  '{
    "overview": "Configure permissions for third-party apps to access Google Fit",
    "estimated_time": "3-5 minutes",
    "difficulty": "easy",
    "prerequisites": ["Android device", "Google Fit app"]
  }'::jsonb,
  93.2,
  ARRAY['permissions', 'android', 'google-fit', 'integration']
),
(
  'health_platform',
  'Google Fit',
  'Google',
  'sync',
  'Google Fit Not Tracking Activities',
  'medium',
  '{
    "overview": "Resolve issues with Google Fit not recording steps, activities, or workouts",
    "estimated_time": "5-10 minutes",
    "difficulty": "easy",
    "prerequisites": ["Android device", "Location permissions"]
  }'::jsonb,
  87.9,
  ARRAY['tracking', 'sync', 'google-fit', 'activities']
);

-- Garmin Troubleshooting
INSERT INTO device_troubleshooting_guides (device_type, device_name, manufacturer, issue_category, issue_title, severity, guide_content, success_rate, tags)
VALUES
(
  'fitness_tracker',
  'Garmin Devices',
  'Garmin',
  'connectivity',
  'Garmin Device Not Pairing',
  'high',
  '{
    "overview": "Troubleshoot Bluetooth pairing issues with Garmin Connect app",
    "estimated_time": "10-15 minutes",
    "difficulty": "medium",
    "prerequisites": ["Charged Garmin device", "Garmin Connect app", "Bluetooth"]
  }'::jsonb,
  85.6,
  ARRAY['bluetooth', 'pairing', 'garmin', 'connectivity']
),
(
  'fitness_tracker',
  'Garmin Devices',
  'Garmin',
  'sync',
  'Activities Not Syncing to Garmin Connect',
  'medium',
  '{
    "overview": "Fix sync issues for workouts and activities",
    "estimated_time": "5-10 minutes",
    "difficulty": "easy",
    "prerequisites": ["Internet connection", "Garmin Connect account"]
  }'::jsonb,
  90.1,
  ARRAY['sync', 'activities', 'garmin', 'cloud']
);

-- WHOOP Troubleshooting
INSERT INTO device_troubleshooting_guides (device_type, device_name, manufacturer, issue_category, issue_title, severity, guide_content, success_rate, tags)
VALUES
(
  'fitness_tracker',
  'WHOOP Strap',
  'WHOOP',
  'connectivity',
  'WHOOP Strap Not Connecting to App',
  'high',
  '{
    "overview": "Resolve Bluetooth connectivity issues between WHOOP strap and mobile app",
    "estimated_time": "10-15 minutes",
    "difficulty": "medium",
    "prerequisites": ["Charged WHOOP strap", "WHOOP app", "Bluetooth enabled"]
  }'::jsonb,
  83.7,
  ARRAY['bluetooth', 'connectivity', 'whoop', 'strap']
),
(
  'fitness_tracker',
  'WHOOP Strap',
  'WHOOP',
  'data_accuracy',
  'Inaccurate Heart Rate or Strain Data',
  'medium',
  '{
    "overview": "Troubleshoot issues with WHOOP sensor accuracy",
    "estimated_time": "10-20 minutes",
    "difficulty": "medium",
    "prerequisites": ["Properly fitted WHOOP strap"]
  }'::jsonb,
  77.4,
  ARRAY['accuracy', 'sensors', 'whoop', 'heart-rate']
);

-- Withings Troubleshooting
INSERT INTO device_troubleshooting_guides (device_type, device_name, manufacturer, issue_category, issue_title, severity, guide_content, success_rate, tags)
VALUES
(
  'scale',
  'Withings Smart Scale',
  'Withings',
  'connectivity',
  'Withings Scale Not Connecting to WiFi',
  'high',
  '{
    "overview": "Configure WiFi connection for Withings smart scale",
    "estimated_time": "10-15 minutes",
    "difficulty": "medium",
    "prerequisites": ["Withings app", "2.4GHz WiFi network", "WiFi password"]
  }'::jsonb,
  81.9,
  ARRAY['wifi', 'connectivity', 'withings', 'scale']
),
(
  'fitness_tracker',
  'Withings Devices',
  'Withings',
  'sync',
  'Withings Data Not Syncing to App',
  'medium',
  '{
    "overview": "Fix data sync issues with Withings Health Mate app",
    "estimated_time": "5-10 minutes",
    "difficulty": "easy",
    "prerequisites": ["Internet connection", "Withings account"]
  }'::jsonb,
  88.5,
  ARRAY['sync', 'cloud', 'withings', 'data']
);

-- Polar Troubleshooting
INSERT INTO device_troubleshooting_guides (device_type, device_name, manufacturer, issue_category, issue_title, severity, guide_content, success_rate, tags)
VALUES
(
  'fitness_tracker',
  'Polar Devices',
  'Polar',
  'connectivity',
  'Polar Device Not Pairing',
  'high',
  '{
    "overview": "Troubleshoot Bluetooth pairing with Polar Flow app",
    "estimated_time": "10-15 minutes",
    "difficulty": "medium",
    "prerequisites": ["Charged Polar device", "Polar Flow app", "Bluetooth"]
  }'::jsonb,
  84.3,
  ARRAY['bluetooth', 'pairing', 'polar', 'connectivity']
),
(
  'fitness_tracker',
  'Polar Devices',
  'Polar',
  'sync',
  'Training Sessions Not Syncing',
  'medium',
  '{
    "overview": "Resolve sync issues for workout data",
    "estimated_time": "5-10 minutes",
    "difficulty": "easy",
    "prerequisites": ["Internet connection", "Polar account"]
  }'::jsonb,
  89.7,
  ARRAY['sync', 'training', 'polar', 'workouts']
);

-- Terra API Troubleshooting
INSERT INTO device_troubleshooting_guides (device_type, device_name, manufacturer, issue_category, issue_title, severity, guide_content, success_rate, tags)
VALUES
(
  'api_integration',
  'Terra API',
  'Terra',
  'authentication',
  'Terra Connection Authorization Failed',
  'high',
  '{
    "overview": "Resolve OAuth authentication issues with Terra-connected devices",
    "estimated_time": "5-10 minutes",
    "difficulty": "medium",
    "prerequisites": ["Valid Terra developer account", "Correct credentials"]
  }'::jsonb,
  86.8,
  ARRAY['oauth', 'authentication', 'terra', 'api']
),
(
  'api_integration',
  'Terra API',
  'Terra',
  'webhook',
  'Terra Webhook Not Receiving Data',
  'high',
  '{
    "overview": "Troubleshoot webhook delivery issues from Terra",
    "estimated_time": "10-20 minutes",
    "difficulty": "hard",
    "prerequisites": ["Valid webhook endpoint", "Terra integration active"]
  }'::jsonb,
  76.2,
  ARRAY['webhook', 'integration', 'terra', 'api']
);

-- General Bluetooth Troubleshooting
INSERT INTO device_troubleshooting_guides (device_type, device_name, manufacturer, issue_category, issue_title, severity, guide_content, success_rate, tags)
VALUES
(
  'general',
  'All Bluetooth Devices',
  'Generic',
  'connectivity',
  'General Bluetooth Connection Issues',
  'medium',
  '{
    "overview": "Universal troubleshooting steps for any Bluetooth health device",
    "estimated_time": "10-15 minutes",
    "difficulty": "easy",
    "prerequisites": ["Bluetooth-enabled phone", "Charged device"]
  }'::jsonb,
  92.4,
  ARRAY['bluetooth', 'connectivity', 'general', 'universal']
);
