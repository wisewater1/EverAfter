import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import {
  getCorsHeaders,
  serviceSupabase,
  verifyTerraSignature,
  generateDedupKey,
  ingestMetric,
  getUserIdFromExternalId,
  errorResponse,
  jsonResponse,
} from '../_shared/connectors.ts';

const corsHeaders = getCorsHeaders();

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return errorResponse('Method not allowed', 405);
  }

  try {
    const body = await req.text();

    const isValid = await verifyTerraSignature(req, body);
    if (!isValid) {
      console.warn('Invalid Terra signature');
      return errorResponse('Invalid signature', 401);
    }

    const payload = JSON.parse(body);
    const supabase = serviceSupabase();

    const eventId = payload.user?.user_id || payload.reference_id || 'unknown';
    const dedupKey = generateDedupKey('terra', eventId, new Date().toISOString());

    const { data: existing } = await supabase
      .from('webhook_events')
      .select('id')
      .eq('dedup_key', dedupKey)
      .maybeSingle();

    if (existing) {
      console.log('Duplicate Terra webhook ignored:', dedupKey);
      return jsonResponse({ status: 'duplicate' });
    }

    const externalUserId = payload.user?.user_id || payload.reference_id;
    const userId = await getUserIdFromExternalId(supabase, 'terra', externalUserId);

    if (!userId) {
      console.error('User not found for Terra user:', externalUserId);
      await supabase.from('webhook_events').insert({
        provider: 'terra',
        event_id: eventId,
        payload,
        dedup_key: dedupKey,
        processed: false,
        error: 'User not found',
      });
      return jsonResponse({ status: 'user_not_found' }, 404);
    }

    let metricsInserted = 0;

    if (payload.type === 'daily' && payload.data) {
      const data = payload.data[0];
      const timestamp = data.metadata?.end_time || new Date().toISOString();

      if (data.distance_data?.steps) {
        await ingestMetric(supabase, {
          user_id: userId,
          source: 'terra',
          metric: 'steps',
          value: data.distance_data.steps,
          unit: 'count',
          ts: timestamp,
          raw: { steps: data.distance_data.steps },
        });
        metricsInserted++;
      }

      if (data.heart_rate_data?.summary?.avg_hr_bpm) {
        await ingestMetric(supabase, {
          user_id: userId,
          source: 'terra',
          metric: 'resting_hr',
          value: data.heart_rate_data.summary.avg_hr_bpm,
          unit: 'bpm',
          ts: timestamp,
          raw: data.heart_rate_data.summary,
        });
        metricsInserted++;
      }

      if (data.heart_rate_data?.summary?.rmssd) {
        await ingestMetric(supabase, {
          user_id: userId,
          source: 'terra',
          metric: 'hrv',
          value: data.heart_rate_data.summary.rmssd,
          unit: 'ms',
          ts: timestamp,
          raw: { rmssd: data.heart_rate_data.summary.rmssd },
        });
        metricsInserted++;
      }

      if (data.sleep_data?.sleep_efficiency) {
        await ingestMetric(supabase, {
          user_id: userId,
          source: 'terra',
          metric: 'sleep_efficiency',
          value: data.sleep_data.sleep_efficiency * 100,
          unit: '%',
          ts: timestamp,
          raw: data.sleep_data,
        });
        metricsInserted++;
      }
    }

    await supabase.from('webhook_events').insert({
      provider: 'terra',
      event_id: eventId,
      payload,
      signature: req.headers.get('terra-signature'),
      dedup_key: dedupKey,
      processed: true,
      user_id: userId,
      metrics_inserted: metricsInserted,
    });

    console.log(`Terra webhook processed: ${metricsInserted} metrics ingested`);
    return jsonResponse({ status: 'success', metrics_inserted: metricsInserted });

  } catch (err: any) {
    console.error('Terra webhook error:', err);
    return errorResponse(err.message || 'Internal server error', 500);
  }
});
