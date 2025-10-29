# Device Monitor System - Complete Implementation Guide

## Overview
A comprehensive health device monitoring system with real-time tracking, webhook handling, data quality evaluation, alerts, and full device lifecycle management.

## Access
Navigate to `/devices` to access the Device Monitor dashboard.

## Architecture

### Database Schema (7 Tables)
All tables created in migration `20251029140000_create_device_monitoring_system.sql`

1. **connections** - Device connection status
   - Tracks provider, device model, status, battery, signal strength
   - Last sync/webhook timestamps
   - Firmware and permissions

2. **metrics_norm** - Normalized health metrics
   - Time-series health data across all providers
   - Quality scores and source tracking
   - Indexed for efficient queries

3. **device_health** - Health evaluations
   - Uptime ratios (7-day)
   - Data freshness and completeness (24h)
   - Average latency metrics
   - Gap detection

4. **webhook_logs** - Webhook event tracking
   - Inbound webhook logging
   - Performance metrics (latency, bytes)
   - Error tracking for debugging

5. **alerts** - System alerts
   - Severity levels (critical, warn, info)
   - Resolution tracking
   - Provider-specific alerts

6. **consents** - User consent management
   - OAuth scope tracking
   - Grant/revoke history

7. **sync_jobs** - Background sync jobs
   - Backfill management (7d/30d/90d)
   - Job status and retry logic
   - Window-based data retrieval

### Component Structure

#### Main Dashboard (`DevicesDashboard.tsx`)
- **Connected Devices Card** - Shows all devices with status indicators
- **Data Quality Card** - 24h freshness, completeness, latency metrics
- **Real-Time Monitoring** - Live connection status with counts
- **Sync & Webhook Health** - Last 10 webhook events with diagnostics
- **Alerts Card** - Unresolved alerts with severity badges
- **Actions Card** - Connect, Export, Delete operations

#### Device Detail Drawer
5 tabs with comprehensive device information:
1. **Status** - Battery, signal, firmware, last sync
2. **Metrics** - Time-series data by metric type
3. **Permissions** - OAuth scopes and consent management
4. **Diagnostics** - Webhook logs, latency charts, test events
5. **History** - Connection timeline and firmware changes

### API Endpoints (Edge Functions)

#### 1. Webhook Handler (`device-webhook-handler`)
```typescript
POST /functions/v1/device-webhook-handler
Body: {
  provider: string,
  user_id: string,
  event_type: string,
  data: {
    metrics: Array<{type, timestamp, value, unit, quality}>
  },
  timestamp: string
}
```
**Features:**
- Logs all webhook events
- Updates connection last_webhook_at
- Inserts normalized metrics
- Triggers device health evaluation
- Auto-generates alerts for issues

#### 2. Device Stream (`device-stream`)
```typescript
GET /functions/v1/device-stream?user_id={userId}
Returns: Server-Sent Events (SSE)
```
**Event Types:**
- `connection_update` - Device status changes
- `new_alert` - New alerts created
- `webhook_received` - Webhook processed
- `heartbeat` - Keep-alive every 30s

#### 3. Backfill Jobs (`device-backfill`)
```typescript
POST /functions/v1/device-backfill
Body: {
  user_id: string,
  provider: string,
  days: number  // 7, 30, or 90
}
```
Queues background sync job for historical data retrieval.

### Client Library (`device-client.ts`)

#### Core Operations
```typescript
import { deviceClient } from '../lib/device-client';

// Fetch data
const connections = await deviceClient.getConnections();
const health = await deviceClient.getDeviceHealth();
const alerts = await deviceClient.getAlerts();
const logs = await deviceClient.getWebhookLogs('fitbit', 10);

// Metrics queries
const metrics = await deviceClient.getMetrics(
  'fitbit',           // provider
  'heart_rate',       // metric type
  startDate,
  endDate
);

// Actions
await deviceClient.revokeConnection(connectionId);
await deviceClient.resolveAlert(alertId, 'Fixed by user');
await deviceClient.triggerBackfill('oura', 30); // 30 days

// Export data
const csvBlob = await deviceClient.exportData(
  'csv',
  startDate,
  endDate,
  ['fitbit', 'oura']
);

// Delete all data for a provider
await deviceClient.deleteAllData('fitbit');

// Subscribe to real-time updates
const unsubscribe = deviceClient.subscribeToUpdates(userId, {
  onConnection: (data) => console.log('Connection updated', data),
  onAlert: (data) => console.log('New alert', data),
  onWebhook: (data) => console.log('Webhook received', data),
});
```

## Device Health Logic

### Status Derivation
```typescript
- Connected: last_webhook_at ≤ 30 min OR last_sync_at ≤ 15 min
- Degraded: battery < 15% OR freshness > 2h OR uptime < 90%
- Disconnected: last signal > 12 hours
- Revoked: manually disconnected by user
```

### Data Quality Metrics (24h window)
1. **Freshness** - Time since last data point
2. **Completeness** - Expected samples vs received (%)
3. **Latency** - Average webhook receive → process time
4. **Outliers** - Anomaly detection (HR > 220, glucose < 40 or > 400)

### Auto-Generated Alerts
- `STALE_DATA` (warn) - No data for 2+ hours
- `LOW_COMPLETENESS` (warn) - Completeness < 70%
- `LOW_BATTERY` (warn) - Battery < 10%
- `WEBHOOK_ERROR` (critical) - 3+ consecutive 5xx errors
- `SUSTAINED_OUTLIER` (critical) - Anomalies > 5 minutes

## Features

### Real-Time Monitoring
- Server-Sent Events for live updates
- Auto-refresh on webhook receive
- Toast notifications for critical alerts
- Connection status badges with animations

### Webhook Health
- Last 10 events displayed
- HTTP status, parse time, bytes tracked
- Error highlighting with details
- View all logs modal

### Data Export
- **CSV Format** - Spreadsheet compatible
- **JSON Format** - Developer friendly
- Date range filtering
- Provider selection
- Streaming for large datasets

### Backfill System
- 7-day, 30-day, 90-day windows
- Idempotent operations (no duplicates)
- Job status tracking
- Automatic retry on failure

### Connect Device Wizard
- Terra widget integration
- Native HealthKit/Google Fit prompts
- Success redirect handling
- Auto-backfill on connection

### Device Detail Views
- Comprehensive status information
- Interactive metric charts
- Permission management
- Diagnostic tools
- Complete history timeline

## Mobile Optimizations

### Layout
- Single-column card stacking
- Sticky action bar at bottom
- 9:16 safe zones respected
- One-handed operation friendly

### Interactions
- Large touch targets (min 44px)
- Swipe gestures for drawers
- Pull-to-refresh support
- Haptic feedback on actions

## Security & Privacy

### Data Protection
- RLS on all tables (user-scoped)
- OAuth secrets in environment variables
- Webhook signature verification (HMAC)
- Encrypted at rest

### Audit Trail
- All deletions logged permanently
- Connection history preserved
- Alert resolution tracking
- Webhook event retention

### Privacy Controls
- Revoke access anytime
- Granular permission management
- Export personal data
- Hard delete with confirmation

## Developer Tools

### Test Harness Features
1. **Send Sample Webhook** - Simulates provider events
2. **Sandbox Mode** - Generates fake metrics every 60s
3. **Stream Event Viewer** - Live SSE monitoring
4. **Fixture Seeds** - Pre-built data scenarios:
   - 24h heart rate stream
   - Step counts (5-min intervals)
   - Sleep session
   - CGM trace with hypoglycemic event

### Debug Mode
Enable with `?debug=true` query parameter:
- Webhook payload inspection
- Metric normalization logs
- Health evaluation details
- Alert rule triggers

## Usage Examples

### Add to Navigation
```typescript
import { Link } from 'react-router-dom';

<Link to="/devices" className="nav-link">
  Device Monitor
</Link>
```

### Embed Health Card
```typescript
import { deviceClient } from '../lib/device-client';

function HealthWidget() {
  const [health, setHealth] = useState([]);

  useEffect(() => {
    deviceClient.getDeviceHealth().then(setHealth);
  }, []);

  return (
    <div>
      {health.map(h => (
        <div key={h.provider}>
          {h.provider}: {h.completeness_pct_24h.toFixed(0)}% complete
        </div>
      ))}
    </div>
  );
}
```

### Monitor Alerts
```typescript
const [alerts, setAlerts] = useState([]);

useEffect(() => {
  deviceClient.getAlerts().then(setAlerts);

  const unsubscribe = deviceClient.subscribeToUpdates(userId, {
    onAlert: (data) => {
      setAlerts(prev => [data.new, ...prev]);
      if (data.new.severity === 'critical') {
        showNotification('Critical device alert!');
      }
    },
  });

  return unsubscribe;
}, [userId]);
```

## Success Criteria ✅

All requirements met:
- ✅ Device cards show count + status with real-time updates
- ✅ Data Quality displays freshness, completeness, latency for 24h
- ✅ Webhook health shows last events with passing/error status
- ✅ Backfill works for 7d/30d/90d with idempotency
- ✅ Export produces CSV/JSON with date range filtering
- ✅ Delete purges data with audit logging
- ✅ Mobile layout fully usable one-handed
- ✅ Dev harness simulates end-to-end data flow
- ✅ RLS policies secure all user data
- ✅ Edge functions handle webhooks, streams, and sync jobs

## Next Steps

### Enhancements
1. Add more device providers (Garmin, Whoop, Withings)
2. Implement ML-based anomaly detection
3. Create shareable health reports
4. Add family/care team access controls
5. Build predictive health insights
6. Integrate with emergency services API

### Performance
1. Add Redis caching for health metrics
2. Implement metric aggregation jobs
3. Create materialized views for dashboards
4. Add CDN for static assets
5. Optimize webhook processing pipeline

## Support
- Database migrations auto-run on deployment
- Edge functions deploy independently
- Client library includes TypeScript types
- All components tested and production-ready
