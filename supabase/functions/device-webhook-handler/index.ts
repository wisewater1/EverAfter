import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface WebhookPayload {
  provider: string;
  user_id: string;
  event_type: string;
  data: any;
  timestamp: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const payload: WebhookPayload = await req.json();
    const bytes = JSON.stringify(payload).length;
    const parseMs = Date.now() - startTime;

    const { provider, user_id, event_type, data, timestamp } = payload;

    const { error: logError } = await supabase
      .from('webhook_logs')
      .insert({
        user_id,
        provider,
        received_at: new Date().toISOString(),
        event_type,
        http_status: 200,
        bytes,
        parse_ms: parseMs,
        payload: data,
      });

    if (logError) {
      console.error('Error logging webhook:', logError);
    }

    const { error: updateError } = await supabase
      .from('connections')
      .update({
        last_webhook_at: new Date().toISOString(),
        status: 'connected',
      })
      .eq('user_id', user_id)
      .eq('provider', provider);

    if (updateError) {
      console.error('Error updating connection:', updateError);
    }

    if (data.metrics) {
      const metricsToInsert = data.metrics.map((metric: any) => ({
        user_id,
        provider,
        metric_type: metric.type,
        ts: metric.timestamp || timestamp,
        value: metric.value,
        unit: metric.unit,
        quality: metric.quality || 1.0,
      }));

      const { error: metricsError } = await supabase
        .from('metrics_norm')
        .insert(metricsToInsert);

      if (metricsError) {
        console.error('Error inserting metrics:', metricsError);
      }
    }

    await evaluateDeviceHealth(supabase, user_id, provider);

    return new Response(
      JSON.stringify({ success: true, message: 'Webhook processed successfully' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Webhook error:', error);

    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function evaluateDeviceHealth(supabase: any, userId: string, provider: string) {
  try {
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const { data: recentMetrics } = await supabase
      .from('metrics_norm')
      .select('ts, metric_type')
      .eq('user_id', userId)
      .eq('provider', provider)
      .gte('ts', oneDayAgo.toISOString())
      .order('ts', { ascending: false });

    const { data: weekMetrics } = await supabase
      .from('metrics_norm')
      .select('ts')
      .eq('user_id', userId)
      .eq('provider', provider)
      .gte('ts', sevenDaysAgo.toISOString());

    const dataFreshnessS = recentMetrics && recentMetrics.length > 0
      ? Math.floor((now.getTime() - new Date(recentMetrics[0].ts).getTime()) / 1000)
      : 0;

    const expectedSamples = 24 * 60;
    const actualSamples = recentMetrics?.length || 0;
    const completenessPct = Math.min(100, (actualSamples / expectedSamples) * 100);

    const uptimeDays = 7;
    const daysWithData = new Set(weekMetrics?.map(m => new Date(m.ts).toDateString())).size;
    const uptimeRatio = daysWithData / uptimeDays;

    await supabase
      .from('device_health')
      .upsert({
        user_id: userId,
        provider,
        uptime_ratio_7d: uptimeRatio,
        avg_latency_ms_24h: 0,
        data_freshness_s: dataFreshnessS,
        completeness_pct_24h: completenessPct,
        gaps: [],
        last_eval_at: now.toISOString(),
      }, { onConflict: 'user_id,provider' });

    if (dataFreshnessS > 7200) {
      await supabase.from('alerts').insert({
        user_id: userId,
        provider,
        severity: 'warn',
        code: 'STALE_DATA',
        message: `No data received from ${provider} for over 2 hours`,
      });
    }

    if (completenessPct < 70) {
      await supabase.from('alerts').insert({
        user_id: userId,
        provider,
        severity: 'warn',
        code: 'LOW_COMPLETENESS',
        message: `Data completeness for ${provider} is ${completenessPct.toFixed(0)}%`,
      });
    }
  } catch (error) {
    console.error('Error evaluating device health:', error);
  }
}
