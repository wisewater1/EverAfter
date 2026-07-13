# Connection Rotation System

## Overview

The Connection Rotation System automatically cycles through all health service connections to ensure continuous data availability, optimal sync performance, and service resilience through intelligent failover mechanisms.

## Features

### 1. Automated Rotation Scheduling
- **Configurable Intervals**: Hourly, every 6 hours, daily, weekly, or custom intervals
- **Priority-Based Ordering**: Define which providers sync first
- **Quiet Hours**: Prevent syncing during specified hours (e.g., nighttime)
- **Smart Scheduling**: Automatically schedules next rotation after completion

### 2. Health Monitoring
- **Health Scores**: 0-100 score based on sync success rate and reliability
- **Performance Tracking**: Monitors sync duration, success/failure rates
- **Uptime Percentage**: Tracks overall connection reliability
- **Real-Time Metrics**: Live updates via Supabase real-time subscriptions

### 3. Failover Protection
- **Automatic Retry**: Configurable retry attempts (1-10) with delays
- **Priority Adjustment**: Failed syncs get higher priority on retry
- **Error Tracking**: Detailed error messages and logging
- **Consecutive Failure Detection**: Identifies chronic issues

### 4. Monitoring & Alerts
- **Sync Queue Dashboard**: Real-time view of pending/running/completed syncs
- **Rotation Schedule**: Visual timeline of scheduled rotations
- **Event Log**: Comprehensive audit trail of all connection events
- **Statistics Overview**: Total syncs, success rate, failure count

## Architecture

### Database Tables

#### `connection_rotation_config`
User-specific rotation settings:
- `enabled`: Master on/off switch
- `rotation_interval`: Frequency (hourly, every_6_hours, daily, weekly, custom)
- `custom_interval_minutes`: Custom interval in minutes
- `priority_order`: Array of provider IDs in rotation order
- `failover_enabled`: Enable automatic retry on failure
- `max_retry_attempts`: Maximum retry attempts (1-10)
- `retry_delay_minutes`: Minutes to wait between retries
- `quiet_hours_start/end`: Time range to avoid syncing
- `notification_enabled`: Email/push notifications on failures

#### `connection_rotation_schedule`
Tracks scheduled rotations:
- `provider`: Provider identifier
- `status`: scheduled, running, completed, failed, skipped
- `scheduled_at`: When rotation is scheduled
- `next_scheduled_at`: Next rotation time
- `attempt_count`: Number of retry attempts
- `sync_result`: JSON result data

#### `connection_sync_queue`
Priority queue for sync operations:
- `provider`: Provider to sync
- `priority`: 1 (highest) to 10 (lowest)
- `status`: pending, processing, completed, failed, cancelled
- `sync_type`: scheduled, manual, retry, failover
- `scheduled_for`: When to execute
- `retry_count`: Current retry attempt

#### `connection_health_metrics`
Connection reliability tracking:
- `health_score`: 0-100 based on success rate
- `total_syncs/successful_syncs/failed_syncs`: Counters
- `avg_sync_duration_ms`: Performance metric
- `consecutive_failures`: Detect chronic issues
- `uptime_percentage`: Overall reliability
- `last_success_at/last_failure_at`: Timestamps

### Edge Function: `connection-rotation`

**Actions:**
- `process_queue`: Process pending syncs (called by cron)
- `schedule_rotation`: Schedule next rotation for a user
- `execute_sync`: Manually trigger sync for specific provider
- `check_health`: Get health metrics for providers

**URL**: `https://YOUR_PROJECT.supabase.co/functions/v1/connection-rotation`

## Setup Instructions

### 1. Apply Database Migration

The migration is already in your project:
```bash
supabase/migrations/20251027010000_create_connection_rotation_system.sql
```

Apply it via Supabase Dashboard → SQL Editor or CLI:
```bash
supabase db push
```

### 2. Deploy Edge Function

```bash
supabase functions deploy connection-rotation
```

### 3. Set Up Cron Job

In Supabase Dashboard → Database → Extensions, enable `pg_cron`:

```sql
-- Enable pg_cron extension
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule queue processor to run every 5 minutes
SELECT cron.schedule(
  'process-connection-queue',
  '*/5 * * * *',  -- Every 5 minutes
  $$
  SELECT net.http_post(
    url := 'https://YOUR_PROJECT.supabase.co/functions/v1/connection-rotation?action=process_queue',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer YOUR_SERVICE_ROLE_KEY"}'::jsonb
  );
  $$
);
```

### 4. Configure in UI

Navigate to: **Health Dashboard → Auto-Rotation Tab**

Configure:
1. Enable rotation
2. Set rotation interval
3. Configure failover settings (recommended: 3 attempts, 15 min delay)
4. Set quiet hours if desired
5. Save configuration

## Usage

### Automatic Mode

Once configured, the system runs automatically:
1. Cron job calls `process_queue` every 5 minutes
2. Queue processor picks up pending syncs
3. Syncs execute in priority order
4. Health metrics update after each sync
5. Failures trigger automatic retry (if enabled)
6. Next rotation schedules automatically

### Manual Sync

Trigger immediate sync for a provider:

```typescript
const response = await fetch(
  `${SUPABASE_URL}/functions/v1/connection-rotation?action=execute_sync`,
  {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${userToken}`,
    },
    body: JSON.stringify({
      user_id: userId,
      provider: 'fitbit',
    }),
  }
);
```

### Check Health

Get health metrics for all or specific provider:

```typescript
const response = await fetch(
  `${SUPABASE_URL}/functions/v1/connection-rotation?action=check_health`,
  {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${userToken}`,
    },
    body: JSON.stringify({
      user_id: userId,
      provider: 'dexcom', // Optional: omit for all providers
    }),
  }
);
```

## Health Score Algorithm

Health score is calculated based on:

1. **Base Score**: Success rate percentage (successful_syncs / total_syncs × 100)
2. **Penalty for Consecutive Failures**: -10 points per consecutive failure
3. **Penalty for Stale Connection**: -20 points if no success in 7 days
4. **Range**: Clamped between 0 and 100

**Example:**
- 95% success rate, 0 consecutive failures, recent success = 95 score
- 80% success rate, 2 consecutive failures, recent success = 60 score
- 90% success rate, 0 failures, 8 days since success = 70 score

## Priority System

Syncs are prioritized based on health score:

- Health ≥ 90: Priority 1 (highest)
- Health ≥ 70: Priority 3
- Health ≥ 50: Priority 5
- Health < 50: Priority 7

Lower priority number = syncs sooner.

## Failover Logic

When a sync fails:

1. Check if failover is enabled
2. Verify retry count < max_retry_attempts
3. Calculate retry delay (retry_delay_minutes × 60 × 1000 ms)
4. Create new queue item with:
   - Increased priority (original + 1, max 10)
   - Type: 'retry'
   - Scheduled for: now + retry_delay
   - Incremented retry_count

## Monitoring

### Real-Time Dashboard

The `ConnectionRotationMonitor` component shows:
- **Stats Overview**: Total syncs, success rate, failures, pending
- **Sync Queue**: Current and recent syncs with status
- **Rotation Schedule**: Upcoming scheduled rotations
- **Event Log**: Recent connection events (connected, synced, failed, etc.)

### Database Queries

**Get all pending syncs:**
```sql
SELECT * FROM connection_sync_queue
WHERE status = 'pending'
ORDER BY priority, scheduled_for;
```

**Get health metrics for user:**
```sql
SELECT * FROM connection_health_metrics
WHERE user_id = 'USER_ID'
ORDER BY health_score DESC;
```

**Get recent rotation history:**
```sql
SELECT * FROM connection_rotation_schedule
WHERE user_id = 'USER_ID'
ORDER BY scheduled_at DESC
LIMIT 20;
```

## Troubleshooting

### Rotations Not Running

1. Verify rotation is enabled in config
2. Check cron job is scheduled: `SELECT * FROM cron.job;`
3. Check cron job execution logs
4. Verify edge function is deployed
5. Check service role key is correct

### High Failure Rate

1. Review health metrics for specific providers
2. Check provider OAuth tokens are valid
3. Review error messages in sync queue
4. Verify provider API limits aren't exceeded
5. Check provider service status

### Syncs Not Appearing in Queue

1. Verify active connections exist: `SELECT * FROM provider_accounts WHERE status = 'active'`
2. Check rotation schedule: `SELECT * FROM connection_rotation_schedule`
3. Review recent events: `SELECT * FROM connection_events`
4. Ensure `schedule_next_rotation` function completed successfully

## Best Practices

1. **Start Conservative**: Begin with every 6 hours interval
2. **Enable Failover**: Always enable with 3 attempts, 15-minute delays
3. **Set Quiet Hours**: Avoid syncing 11 PM - 6 AM
4. **Monitor Health Scores**: Address scores < 70 proactively
5. **Review Events**: Check event log weekly for patterns
6. **Provider-Specific Settings**: Some providers have rate limits (check docs)

## Security

- RLS policies ensure users only access their own data
- Service role required for automated background operations
- OAuth tokens encrypted at rest in Supabase
- Comprehensive audit trail via `connection_events` table
- No sensitive data logged in error messages

## API Reference

### Schedule Next Rotation
```typescript
POST /functions/v1/connection-rotation?action=schedule_rotation
Body: { user_id: string }
Returns: { schedule_id: string }
```

### Execute Manual Sync
```typescript
POST /functions/v1/connection-rotation?action=execute_sync
Body: { user_id: string, provider: string }
Returns: { queue_id: string }
```

### Check Health
```typescript
POST /functions/v1/connection-rotation?action=check_health
Body: { user_id: string, provider?: string }
Returns: { health_metrics: Array<HealthMetric> }
```

### Process Queue (Service Role Only)
```typescript
GET /functions/v1/connection-rotation?action=process_queue
Returns: { processed: number, successful: number, failed: number }
```

## Database Functions

### `calculate_connection_health_score(user_id, provider)`
Returns health score (0-100) for a provider.

### `get_next_rotation_provider(user_id)`
Returns next provider ID in rotation sequence.

### `schedule_next_rotation(user_id)`
Creates next rotation schedule entry. Returns schedule_id.

### `update_connection_health(user_id, provider, success, duration_ms)`
Updates health metrics after sync operation.

### `enqueue_sync_with_failover(user_id, provider, sync_type)`
Adds sync to queue with priority based on health score.

## Performance Considerations

- **Queue Processing**: Processes 10 syncs per invocation (configurable)
- **Cron Frequency**: 5 minutes (adjust based on load)
- **Sync Duration**: Average 2-5 seconds per provider
- **Database Load**: Minimal - uses indexes extensively
- **Real-Time Subscriptions**: Efficient via Supabase real-time

## Future Enhancements

Potential improvements:
- **Machine Learning**: Predict optimal sync times based on data patterns
- **Adaptive Intervals**: Adjust frequency based on data change rate
- **Multi-User Load Balancing**: Distribute syncs across time to avoid spikes
- **Provider-Specific Optimization**: Custom settings per provider type
- **Advanced Alerts**: Slack/email notifications for chronic failures
- **Sync Recommendations**: AI-powered suggestions for improving reliability

## Support

For issues or questions:
1. Check troubleshooting section above
2. Review Supabase logs in Dashboard → Logs
3. Inspect edge function logs for detailed errors
4. Query database tables directly for debugging
5. Review provider-specific documentation for rate limits/requirements
