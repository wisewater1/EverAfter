import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';

const supa = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function verifySignature(raw: string, sig: string | null): boolean {
  const secret = process.env.TERRA_WEBHOOK_SECRET;
  if (!secret || !sig) {
    console.warn('Webhook signature verification skipped - missing secret or signature');
    return true; // Allow in development
  }

  const hmac = crypto.createHmac('sha256', secret).update(raw).digest('hex');

  try {
    return crypto.timingSafeEqual(Buffer.from(hmac), Buffer.from(sig));
  } catch {
    return false;
  }
}

async function normalizeMetrics(payload: any, userId: string, provider: string) {
  const rows: any[] = [];
  const data = payload.data || [];

  for (const item of data) {
    const metadata = item.metadata || {};
    const timestamp = metadata.start_time || new Date().toISOString();

    // Steps from distance_data
    if (item.distance_data?.steps) {
      rows.push({
        user_id: userId,
        provider,
        metric_type: 'steps',
        ts: timestamp,
        value: item.distance_data.steps,
        unit: 'count',
        quality: 'good',
      });
    }

    // Distance
    if (item.distance_data?.distance_meters) {
      rows.push({
        user_id: userId,
        provider,
        metric_type: 'distance',
        ts: timestamp,
        value: item.distance_data.distance_meters,
        unit: 'meters',
        quality: 'good',
      });
    }

    // Active minutes
    if (item.active_durations_data?.activity_seconds) {
      rows.push({
        user_id: userId,
        provider,
        metric_type: 'active_minutes',
        ts: timestamp,
        value: item.active_durations_data.activity_seconds / 60,
        unit: 'minutes',
        quality: 'good',
      });
    }

    // Heart rate
    if (item.heart_rate_data) {
      const hrData = item.heart_rate_data;
      if (hrData.avg_hr_bpm) {
        rows.push({
          user_id: userId,
          provider,
          metric_type: 'hr',
          ts: timestamp,
          value: hrData.avg_hr_bpm,
          unit: 'bpm',
          quality: 'good',
        });
      }
      if (hrData.resting_hr_bpm) {
        rows.push({
          user_id: userId,
          provider,
          metric_type: 'resting_hr',
          ts: timestamp,
          value: hrData.resting_hr_bpm,
          unit: 'bpm',
          quality: 'good',
        });
      }
      if (hrData.max_hr_bpm) {
        rows.push({
          user_id: userId,
          provider,
          metric_type: 'max_hr',
          ts: timestamp,
          value: hrData.max_hr_bpm,
          unit: 'bpm',
          quality: 'good',
        });
      }
    }

    // Sleep
    if (item.sleep_durations_data) {
      const sleepData = item.sleep_durations_data;
      if (sleepData.asleep_duration_seconds) {
        rows.push({
          user_id: userId,
          provider,
          metric_type: 'sleep',
          ts: timestamp,
          value: sleepData.asleep_duration_seconds / 60,
          unit: 'minutes',
          quality: 'good',
        });
      }
      if (sleepData.light_sleep_duration_seconds) {
        rows.push({
          user_id: userId,
          provider,
          metric_type: 'sleep_light',
          ts: timestamp,
          value: sleepData.light_sleep_duration_seconds / 60,
          unit: 'minutes',
          quality: 'good',
        });
      }
      if (sleepData.deep_sleep_duration_seconds) {
        rows.push({
          user_id: userId,
          provider,
          metric_type: 'sleep_deep',
          ts: timestamp,
          value: sleepData.deep_sleep_duration_seconds / 60,
          unit: 'minutes',
          quality: 'good',
        });
      }
      if (sleepData.rem_sleep_duration_seconds) {
        rows.push({
          user_id: userId,
          provider,
          metric_type: 'sleep_rem',
          ts: timestamp,
          value: sleepData.rem_sleep_duration_seconds / 60,
          unit: 'minutes',
          quality: 'good',
        });
      }
    }

    // Glucose
    if (item.glucose_data?.samples) {
      for (const sample of item.glucose_data.samples) {
        if (sample.glucose_mg_per_dL || sample.value) {
          rows.push({
            user_id: userId,
            provider,
            metric_type: 'glucose',
            ts: sample.timestamp || timestamp,
            value: sample.glucose_mg_per_dL || sample.value,
            unit: 'mg/dL',
            quality: 'good',
          });
        }
      }
    }
  }

  return rows;
}

export async function POST(req: Request) {
  try {
    const raw = await req.text();
    const sig = req.headers.get('terra-signature');

    if (!verifySignature(raw, sig)) {
      console.error('Invalid webhook signature');
      return new NextResponse('Invalid signature', { status: 401 });
    }

    const payload = JSON.parse(raw);
    const { user, type } = payload;
    const terraUserId = user?.user_id;
    const provider = user?.provider || 'terra';

    console.log('Webhook received:', { type, terraUserId, provider });

    // Find app user from terra_user_id
    const { data: terraUser, error: userError } = await supa
      .from('terra_users')
      .select('user_id')
      .eq('terra_user_id', terraUserId)
      .eq('provider', provider)
      .maybeSingle();

    if (userError || !terraUser) {
      console.error('Terra user not found:', terraUserId, provider, userError);
      return new NextResponse('User not found', { status: 404 });
    }

    const userId = terraUser.user_id;

    // Store raw payload
    const { error: rawError } = await supa.from('metrics_raw').insert({
      user_id: userId,
      provider,
      type,
      payload,
    });

    if (rawError) {
      console.error('Error storing raw metrics:', rawError);
    }

    // Normalize metrics
    const normalizedRows = await normalizeMetrics(payload, userId, provider);

    if (normalizedRows.length > 0) {
      const { error: normError } = await supa.from('metrics_norm').upsert(normalizedRows, {
        onConflict: 'user_id,provider,metric_type,ts',
        ignoreDuplicates: true,
      });

      if (normError) {
        console.error('Error storing normalized metrics:', normError);
      } else {
        console.log(`Stored ${normalizedRows.length} normalized metrics`);
      }
    }

    // Update last sync
    await supa
      .from('connections')
      .update({ last_sync_at: new Date().toISOString(), last_error: null })
      .eq('user_id', userId)
      .eq('provider', provider);

    return new NextResponse('ok', { status: 200 });
  } catch (error) {
    console.error('Webhook error:', error);
    return new NextResponse('Internal server error', { status: 500 });
  }
}
