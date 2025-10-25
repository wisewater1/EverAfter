import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import {
  getCorsHeaders,
  supabaseFromRequest,
  serviceSupabase,
  ingestMetric,
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
    const supabase = supabaseFromRequest(req);
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return errorResponse('Unauthorized', 401);
    }

    const { provider, days = 7 } = await req.json();

    if (!provider) {
      return errorResponse('Provider parameter required');
    }

    const serviceClient = serviceSupabase();

    const { data: account, error: accountError } = await serviceClient
      .from('provider_accounts')
      .select('*')
      .eq('user_id', user.id)
      .eq('provider', provider.toLowerCase())
      .maybeSingle();

    if (accountError || !account) {
      return errorResponse('Provider not connected', 404);
    }

    if (!account.access_token) {
      return errorResponse('No access token available', 400);
    }

    let metricsIngested = 0;

    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    switch (provider.toLowerCase()) {
      case 'fitbit': {
        const dateStr = endDate.toISOString().split('T')[0];

        const activitiesRes = await fetch(
          `https://api.fitbit.com/1/user/-/activities/date/${dateStr}.json`,
          {
            headers: { Authorization: `Bearer ${account.access_token}` },
          }
        );

        if (activitiesRes.ok) {
          const data = await activitiesRes.json();

          if (data.summary?.steps) {
            await ingestMetric(serviceClient, {
              user_id: user.id,
              source: 'fitbit',
              metric: 'steps',
              value: data.summary.steps,
              unit: 'count',
              ts: `${dateStr}T23:59:59Z`,
              raw: data.summary,
            });
            metricsIngested++;
          }

          if (data.summary?.restingHeartRate) {
            await ingestMetric(serviceClient, {
              user_id: user.id,
              source: 'fitbit',
              metric: 'resting_hr',
              value: data.summary.restingHeartRate,
              unit: 'bpm',
              ts: `${dateStr}T23:59:59Z`,
              raw: { resting_hr: data.summary.restingHeartRate },
            });
            metricsIngested++;
          }
        }

        await serviceClient
          .from('provider_accounts')
          .update({ last_sync_at: new Date().toISOString() })
          .eq('id', account.id);

        break;
      }

      case 'terra': {
        console.log('Terra sync requires API call to Terra backfill endpoint');
        break;
      }

      case 'oura': {
        const dateStr = endDate.toISOString().split('T')[0];
        const startDateStr = startDate.toISOString().split('T')[0];

        const dailyRes = await fetch(
          `https://api.ouraring.com/v2/usercollection/daily_activity?start_date=${startDateStr}&end_date=${dateStr}`,
          {
            headers: { Authorization: `Bearer ${account.access_token}` },
          }
        );

        if (dailyRes.ok) {
          const data = await dailyRes.json();

          if (data.data && Array.isArray(data.data)) {
            for (const day of data.data) {
              if (day.steps) {
                await ingestMetric(serviceClient, {
                  user_id: user.id,
                  source: 'oura',
                  metric: 'steps',
                  value: day.steps,
                  unit: 'count',
                  ts: `${day.day}T23:59:59Z`,
                  raw: day,
                });
                metricsIngested++;
              }
            }
          }
        }

        await serviceClient
          .from('provider_accounts')
          .update({ last_sync_at: new Date().toISOString() })
          .eq('id', account.id);

        break;
      }

      default:
        return errorResponse(`Sync not implemented for provider: ${provider}`);
    }

    console.log(`Sync completed for ${provider}: ${metricsIngested} metrics ingested`);

    return jsonResponse({
      status: 'success',
      provider,
      metrics_ingested: metricsIngested,
      days_synced: days,
    });

  } catch (err: any) {
    console.error('sync-health-now error:', err);
    return errorResponse(err.message || 'Internal server error', 500);
  }
});
