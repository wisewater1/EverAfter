# Device Integration System - Testing Guide

## 🧪 Testing Overview

This guide provides step-by-step instructions for testing all components of the device integration system.

## Prerequisites

- ✅ All migrations applied to database
- ✅ Edge functions deployed to Supabase
- ✅ OPENAI_API_KEY configured in Supabase
- ✅ Frontend built and running

## Test Suite

### Test 1: Database Schema Verification

**Purpose**: Verify all tables and functions are created

```sql
-- Test 1.1: Check tables exist
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN (
  'device_registry',
  'device_connections',
  'data_quality_logs',
  'realtime_data_streams',
  'device_alerts',
  'data_transformation_rules'
);
-- Expected: 6 rows

-- Test 1.2: Check device registry populated
SELECT
  device_type,
  COUNT(*) as count,
  string_agg(DISTINCT manufacturer, ', ') as manufacturers
FROM device_registry
GROUP BY device_type
ORDER BY count DESC;
-- Expected: Multiple device types with various manufacturers

-- Test 1.3: Check transformation rules
SELECT
  provider_key,
  COUNT(*) as rules_count
FROM data_transformation_rules
WHERE active = true
GROUP BY provider_key
ORDER BY rules_count DESC;
-- Expected: Multiple providers with 5-15 rules each

-- Test 1.4: Test helper function
SELECT calculate_device_health_score('00000000-0000-0000-0000-000000000000');
-- Expected: 0 (for non-existent device)
```

**Expected Results**: All queries return data, functions execute without errors

---

### Test 2: Device Registration Flow

**Purpose**: Test adding a new device connection

```sql
-- Test 2.1: Get a device from registry
SELECT id, manufacturer, model_name, device_type
FROM device_registry
WHERE device_type = 'cgm'
LIMIT 1;
-- Save the ID for next step

-- Test 2.2: Create provider account (if needed)
INSERT INTO provider_accounts (
  user_id,
  provider,
  external_user_id,
  status
) VALUES (
  auth.uid(),
  'dexcom',
  'test-user-123',
  'active'
) RETURNING id;
-- Save this ID

-- Test 2.3: Create device connection
INSERT INTO device_connections (
  user_id,
  provider_account_id,
  device_registry_id,
  friendly_name,
  connection_status,
  battery_level,
  signal_quality
) VALUES (
  auth.uid(),
  '< provider_account_id >',
  '< device_registry_id >',
  'My Dexcom G7',
  'active',
  85,
  'excellent'
) RETURNING *;
-- Expected: New device connection created

-- Test 2.4: Verify device health score
SELECT
  dc.friendly_name,
  calculate_device_health_score(dc.id) as health_score
FROM device_connections dc
WHERE dc.user_id = auth.uid();
-- Expected: Score between 70-100 for active device
```

**Expected Results**: Device successfully registered, health score calculated

---

### Test 3: Real-time Data Ingestion

**Purpose**: Test the device-stream-handler edge function

```bash
# Test 3.1: Initialize stream (GET request)
curl -X GET "https://YOUR_PROJECT.supabase.co/functions/v1/device-stream-handler?deviceConnectionId=YOUR_DEVICE_ID" \
  -H "Authorization: Bearer YOUR_USER_TOKEN"

# Expected Response:
# {
#   "success": true,
#   "streamExists": false,
#   "stream": {...},
#   "connectionId": "...",
#   "message": "New stream initialized"
# }

# Test 3.2: Send data point (POST request)
curl -X POST "https://YOUR_PROJECT.supabase.co/functions/v1/device-stream-handler" \
  -H "Authorization: Bearer YOUR_USER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "deviceConnectionId": "YOUR_DEVICE_ID",
    "metricType": "glucose",
    "value": 120,
    "unit": "mg/dL",
    "timestamp": "2025-10-27T10:00:00Z",
    "metadata": {
      "trend": "stable"
    }
  }'

# Expected Response:
# {
#   "success": true,
#   "dataPoint": {...},
#   "quality": {
#     "score": 100,
#     "anomalyDetected": false,
#     "anomalyType": null
#   },
#   "message": "Data point processed successfully"
# }
```

**Expected Results**: Data points stored in health_metrics, quality logs created

---

### Test 4: Data Quality Validation

**Purpose**: Test anomaly detection and validation

```sql
-- Test 4.1: Insert out-of-range glucose value
-- This should trigger anomaly detection
SELECT 1; -- Use the edge function POST endpoint with value: 450

-- Test 4.2: Check data quality log
SELECT
  metric_type,
  quality_score,
  anomaly_detected,
  anomaly_type,
  raw_value
FROM data_quality_logs
WHERE user_id = auth.uid()
ORDER BY processed_at DESC
LIMIT 5;
-- Expected: Low quality score for out-of-range value

-- Test 4.3: Check if alert was created
SELECT
  alert_type,
  severity,
  metric_type,
  value_at_trigger
FROM device_alerts
WHERE user_id = auth.uid()
AND severity = 'emergency'
ORDER BY triggered_at DESC;
-- Expected: Alert for critical high glucose
```

**Expected Results**: Anomalies detected, alerts triggered for critical values

---

### Test 5: Predictive Analytics

**Purpose**: Test AI-powered trend analysis

```sql
-- Test 5.1: Insert historical data (30 days)
-- Create test data with trend
DO $$
DECLARE
  i INTEGER;
  base_date TIMESTAMP;
BEGIN
  base_date := NOW() - INTERVAL '30 days';

  FOR i IN 0..29 LOOP
    INSERT INTO health_metrics (
      user_id,
      source,
      metric,
      value,
      unit,
      ts
    ) VALUES (
      auth.uid(),
      'test',
      'glucose',
      100 + (i * 2), -- Increasing trend
      'mg/dL',
      base_date + (i || ' days')::INTERVAL
    );
  END LOOP;
END $$;

-- Test 5.2: Call predictive analytics
curl -X GET "https://YOUR_PROJECT.supabase.co/functions/v1/predictive-health-analytics?lookbackDays=30" \
  -H "Authorization: Bearer YOUR_USER_TOKEN"

# Expected Response:
# {
#   "success": true,
#   "analysis": {
#     "period_analyzed": "30 days",
#     "total_data_points": 30,
#     "metrics_analyzed": 1
#   },
#   "patterns": [{
#     "metric": "glucose",
#     "trend": "declining" or "improving",
#     "confidence": 85,
#     "prediction_next_7_days": {...}
#   }],
#   "insights": [...],
#   "recommendations": [...]
# }
```

**Expected Results**: Trends detected, predictions generated, recommendations provided

---

### Test 6: Frontend Integration

**Purpose**: Test UI components

#### Test 6.1: Device Monitor Dashboard

1. Navigate to `/health-dashboard`
2. Click "Devices" tab
3. Verify display shows:
   - Total devices count
   - Active/disconnected/error counts
   - Device health score
   - Empty state if no devices

**Expected**: Dashboard loads without errors, shows correct device status

#### Test 6.2: Predictive Insights

1. Navigate to `/health-dashboard`
2. Click "Predictions" tab
3. Verify display shows:
   - Analysis period selector
   - Metric trends with confidence scores
   - Health insights
   - Personalized recommendations

**Expected**: Analytics load, trends displayed correctly

#### Test 6.3: Real-time Updates

1. Keep Device Monitor Dashboard open
2. Insert new data via SQL or API
3. Wait 30 seconds for auto-refresh

**Expected**: Dashboard updates automatically with new data

---

### Test 7: Alert System

**Purpose**: Test alert generation and notification

```sql
-- Test 7.1: Trigger critical alert
-- Insert critically low glucose via edge function
-- POST with value: 45 mg/dL

-- Test 7.2: Verify alert created
SELECT
  alert_type,
  severity,
  metric_type,
  value_at_trigger,
  triggered_at,
  acknowledged_at
FROM device_alerts
WHERE user_id = auth.uid()
ORDER BY triggered_at DESC
LIMIT 1;
-- Expected: Emergency alert with value 45

-- Test 7.3: Acknowledge alert via UI
-- Click "Acknowledge" button in dashboard

-- Test 7.4: Verify acknowledgment
SELECT acknowledged_at IS NOT NULL as is_acknowledged
FROM device_alerts
WHERE user_id = auth.uid()
ORDER BY triggered_at DESC
LIMIT 1;
-- Expected: true
```

**Expected Results**: Alerts created for critical values, can be acknowledged

---

### Test 8: Multi-Metric Correlation

**Purpose**: Test correlation analysis between metrics

```sql
-- Test 8.1: Insert correlated data
DO $$
DECLARE
  i INTEGER;
  base_date TIMESTAMP;
BEGIN
  base_date := NOW() - INTERVAL '14 days';

  FOR i IN 0..13 LOOP
    -- Glucose inversely correlated with steps
    INSERT INTO health_metrics (user_id, source, metric, value, unit, ts)
    VALUES (auth.uid(), 'test', 'glucose', 150 - (i * 3), 'mg/dL', base_date + (i || ' days')::INTERVAL);

    INSERT INTO health_metrics (user_id, source, metric, value, unit, ts)
    VALUES (auth.uid(), 'test', 'steps', 5000 + (i * 500), 'steps', base_date + (i || ' days')::INTERVAL);
  END LOOP;
END $$;

-- Test 8.2: Call analytics
-- Use predictive-health-analytics endpoint

-- Test 8.3: Check correlations
-- Look for correlation between glucose and steps in response
```

**Expected Results**: Negative correlation detected between glucose and steps

---

### Test 9: Data Transformation

**Purpose**: Test metric standardization

```sql
-- Test 9.1: Check transformation rules
SELECT
  provider_key,
  vendor_field_name,
  standard_metric_name,
  loinc_code,
  unit_conversion
FROM data_transformation_rules
WHERE standard_metric_name = 'glucose'
AND active = true;
-- Expected: Multiple rules for different providers

-- Test 9.2: Test unit conversion
-- Insert glucose in mmol/L, should convert to mg/dL
-- value in mmol/L: 6.7
-- expected mg/dL: ~120 (6.7 * 18.0182)
```

**Expected Results**: Data transformed correctly according to rules

---

### Test 10: Performance & Load Testing

**Purpose**: Test system under load

```bash
# Test 10.1: Bulk data insertion
# Send 100 data points rapidly
for i in {1..100}; do
  curl -X POST "https://YOUR_PROJECT.supabase.co/functions/v1/device-stream-handler" \
    -H "Authorization: Bearer YOUR_USER_TOKEN" \
    -H "Content-Type: application/json" \
    -d "{
      \"deviceConnectionId\": \"YOUR_DEVICE_ID\",
      \"metricType\": \"heart_rate\",
      \"value\": $((60 + RANDOM % 40)),
      \"unit\": \"bpm\",
      \"timestamp\": \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\"
    }" &
done
wait

# Test 10.2: Query performance
time psql -c "SELECT * FROM health_metrics WHERE user_id = 'YOUR_USER_ID' AND ts > NOW() - INTERVAL '1 day';"
```

**Expected Results**: All requests succeed, queries return < 100ms

---

## Test Results Summary Template

```
Test Suite: Device Integration System
Date: [DATE]
Tester: [NAME]
Environment: [DEV/STAGING/PROD]

| Test # | Test Name | Status | Notes |
|--------|-----------|--------|-------|
| 1 | Database Schema | ✅ PASS | All tables created |
| 2 | Device Registration | ✅ PASS | Device added successfully |
| 3 | Data Ingestion | ✅ PASS | Data stored correctly |
| 4 | Data Quality | ✅ PASS | Anomalies detected |
| 5 | Predictive Analytics | ✅ PASS | Trends identified |
| 6 | Frontend Integration | ✅ PASS | UI displays correctly |
| 7 | Alert System | ✅ PASS | Alerts triggered |
| 8 | Correlations | ✅ PASS | Relationships found |
| 9 | Data Transformation | ✅ PASS | Rules applied |
| 10 | Performance | ✅ PASS | <100ms query time |

Overall Status: ✅ ALL TESTS PASSED
```

## Common Issues & Solutions

### Issue: Edge function returns 401 Unauthorized
**Solution**: Verify JWT token is valid and user is authenticated

### Issue: No data showing in dashboard
**Solution**: Check that health_metrics table has data for the user

### Issue: Predictions return "insufficient data"
**Solution**: Need minimum 7 data points per metric

### Issue: Alerts not triggering
**Solution**: Check device_connections.preferences has thresholds set

### Issue: Health score shows 0
**Solution**: Device may be disconnected or has no recent data

## Automated Testing

To run all tests automatically:

```bash
# Run verification script
./scripts/verify-device-integration.sh

# Run frontend tests
npm run test

# Run build verification
npm run build
```

---

**For questions or issues, refer to**: DEVICE_INTEGRATION_STATUS.md
