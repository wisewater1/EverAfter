import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import {
  getCorsHeaders,
  serviceSupabase,
  verifyFitbitSignature,
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

  if (req.method === 'GET') {
    const url = new URL(req.url);
    const verify = url.searchParams.get('verify');
    if (verify) {
      return new Response(verify, {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'text/plain' },
      });
    }
    return errorResponse('Missing verify parameter');
  }

  if (req.method !== 'POST') {
    return errorResponse('Method not allowed', 405);
  }

  try {
    const body = await req.text();

    const isValid = await verifyFitbitSignature(req, body);
    if (!isValid) {
      console.warn('Invalid Fitbit signature');
      return errorResponse('Invalid signature', 401);
    }

    const payload = JSON.parse(body);
    const supabase = serviceSupabase();

    if (!Array.isArray(payload)) {
      return errorResponse('Invalid payload format');
    }

    let totalMetrics = 0;

    for (const notification of payload) {
      const { ownerId, subscriptionId, date, collectionType } = notification;

      const dedupKey = generateDedupKey('fitbit', `${ownerId}-${collectionType}-${date}`, date);

      const { data: existing } = await supabase
        .from('webhook_events')
        .select('id')
        .eq('dedup_key', dedupKey)
        .maybeSingle();

      if (existing) {
        console.log('Duplicate Fitbit webhook ignored:', dedupKey);
        continue;
      }

      const userId = await getUserIdFromExternalId(supabase, 'fitbit', ownerId);

      if (!userId) {
        console.error('User not found for Fitbit owner:', ownerId);
        await supabase.from('webhook_events').insert({
          provider: 'fitbit',
          event_id: `${ownerId}-${collectionType}-${date}`,
          payload: notification,
          dedup_key: dedupKey,
          processed: false,
          error: 'User not found',
        });
        continue;
      }

      const { data: account } = await supabase
        .from('provider_accounts')
        .select('access_token')
        .eq('user_id', userId)
        .eq('provider', 'fitbit')
        .maybeSingle();

      if (!account?.access_token) {
        console.error('No access token for Fitbit user:', ownerId);
        continue;
      }

      let metricsInserted = 0;

      try {
        if (collectionType === 'activities') {
          const response = await fetch(
            `https://api.fitbit.com/1/user/${ownerId}/activities/date/${date}.json`,
            {
              headers: {
                Authorization: `Bearer ${account.access_token}`,
              },
            }
          );

          if (response.ok) {
            const data = await response.json();

            if (data.summary?.steps) {
              await ingestMetric(supabase, {
                user_id: userId,
                source: 'fitbit',
                metric: 'steps',
                value: data.summary.steps,
                unit: 'count',
                ts: `${date}T23:59:59Z`,
                raw: { steps: data.summary.steps },
              });
              metricsInserted++;
            }

            if (data.summary?.restingHeartRate) {
              await ingestMetric(supabase, {
                user_id: userId,
                source: 'fitbit',
                metric: 'resting_hr',
                value: data.summary.restingHeartRate,
                unit: 'bpm',
                ts: `${date}T23:59:59Z`,
                raw: { resting_hr: data.summary.restingHeartRate },
              });
              metricsInserted++;
            }
          }
        }

        if (collectionType === 'sleep') {
          const response = await fetch(
            `https://api.fitbit.com/1.2/user/${ownerId}/sleep/date/${date}.json`,
            {
              headers: {
                Authorization: `Bearer ${account.access_token}`,
              },
            }
          );

          if (response.ok) {
            const data = await response.json();

            if (data.sleep && data.sleep.length > 0) {
              const mainSleep = data.sleep[0];
              if (mainSleep.efficiency) {
                await ingestMetric(supabase, {
                  user_id: userId,
                  source: 'fitbit',
                  metric: 'sleep_efficiency',
                  value: mainSleep.efficiency,
                  unit: '%',
                  ts: mainSleep.endTime,
                  raw: { efficiency: mainSleep.efficiency, duration: mainSleep.duration },
                });
                metricsInserted++;
              }
            }
          }
        }

        totalMetrics += metricsInserted;

        await supabase.from('webhook_events').insert({
          provider: 'fitbit',
          event_id: `${ownerId}-${collectionType}-${date}`,
          payload: notification,
          signature: req.headers.get('x-fitbit-signature'),
          dedup_key: dedupKey,
          processed: true,
          user_id: userId,
          metrics_inserted: metricsInserted,
        });

      } catch (fetchErr: any) {
        console.error('Fitbit data fetch error:', fetchErr);
        await supabase.from('webhook_events').insert({
          provider: 'fitbit',
          event_id: `${ownerId}-${collectionType}-${date}`,
          payload: notification,
          dedup_key: dedupKey,
          processed: false,
          error: fetchErr.message,
          user_id: userId,
        });
      }
    }

    console.log(`Fitbit webhook processed: ${totalMetrics} metrics ingested`);
    return jsonResponse({ status: 'success', metrics_inserted: totalMetrics });

  } catch (err: any) {
    console.error('Fitbit webhook error:', err);
    return errorResponse(err.message || 'Internal server error', 500);
  }
});
