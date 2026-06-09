import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { serviceSupabase, getCorsHeaders, jsonResponse, errorResponse } from '../_shared/connectors.ts';
import { computeTIR, computeGlucoseStats, logJobAudit, GlucosePoint } from '../_shared/glucose.ts';

const corsHeaders = getCorsHeaders();

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    const supabase = serviceSupabase();

    await logJobAudit(supabase, 'glucose-aggregate-cron', 'running', {
      startedAt: new Date(startTime).toISOString(),
    });

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(0, 0, 0, 0);

    const endOfYesterday = new Date(yesterday);
    endOfYesterday.setHours(23, 59, 59, 999);

    const dayStr = yesterday.toISOString().split('T')[0];

    const { data: users, error: userError } = await supabase
      .from('glucose_readings')
      .select('user_id, engram_id')
      .gte('ts', yesterday.toISOString())
      .lte('ts', endOfYesterday.toISOString())
      .neq('src', 'manual')
      .order('user_id');

    if (userError) {
      throw new Error(`Failed to fetch users: ${userError.message}`);
    }

    if (!users || users.length === 0) {
      await logJobAudit(supabase, 'glucose-aggregate-cron', 'success', {
        rowsWritten: 0,
        durationMs: Date.now() - startTime,
      });
      return jsonResponse({ status: 'success', message: 'No data to aggregate' });
    }

    const uniquePairs = Array.from(
      new Set(users.map(u => `${u.user_id}:${u.engram_id}`))
    ).map(pair => {
      const [userId, engramId] = pair.split(':');
      return { userId, engramId };
    });

    let aggregatesWritten = 0;

    for (const { userId, engramId } of uniquePairs) {
      const { data: readings, error: readingsError } = await supabase
        .from('glucose_readings')
        .select('ts, value, unit, trend, quality')
        .eq('user_id', userId)
        .eq('engram_id', engramId)
        .gte('ts', yesterday.toISOString())
        .lte('ts', endOfYesterday.toISOString())
        .order('ts');

      if (readingsError || !readings || readings.length === 0) {
        console.warn(`No readings for user ${userId}, engram ${engramId}`);
        continue;
      }

      const points: GlucosePoint[] = readings.map(r => ({
        ts: r.ts,
        value: r.value,
        unit: (r.unit as 'mg/dL' | 'mmol/L') || 'mg/dL',
        trend: r.trend || undefined,
        quality: r.quality || undefined,
      }));

      const tir = computeTIR(points, 70, 180);
      const stats = computeGlucoseStats(points);

      const hypoEvents = points.filter(p => p.value < 70).length > 0 ? 1 : 0;
      const hyperEvents = points.filter(p => p.value > 180).length > 0 ? 1 : 0;

      const { error: upsertError } = await supabase
        .from('glucose_daily_agg')
        .upsert({
          day: dayStr,
          user_id: userId,
          engram_id: engramId,
          tir_70_180_pct: tir.tir_pct,
          hypo_events: hypoEvents,
          hyper_events: hyperEvents,
          mean_glucose: stats.mean,
          gmi: stats.gmi,
          sd_glucose: stats.sd,
          readings_count: readings.length,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'day,user_id,engram_id',
        });

      if (upsertError) {
        console.error(`Failed to upsert aggregate for ${userId}:`, upsertError);
        continue;
      }

      aggregatesWritten++;

      if (tir.tir_pct < 70) {
        console.warn(`Low TIR alert: User ${userId} has ${tir.tir_pct}% TIR on ${dayStr}`);
      }

      if (tir.below_pct > 4) {
        console.warn(`Hypo alert: User ${userId} has ${tir.below_pct}% below range on ${dayStr}`);
      }
    }

    await logJobAudit(supabase, 'glucose-aggregate-cron', 'success', {
      rowsWritten: aggregatesWritten,
      durationMs: Date.now() - startTime,
    });

    console.log(`Glucose aggregation completed: ${aggregatesWritten} daily aggregates`);
    return jsonResponse({
      status: 'success',
      aggregates_written: aggregatesWritten,
      day: dayStr,
    });

  } catch (err: any) {
    const supabase = serviceSupabase();
    await logJobAudit(supabase, 'glucose-aggregate-cron', 'failed', {
      durationMs: Date.now() - startTime,
      error: err.message,
    });

    console.error('Glucose aggregation error:', err);
    return errorResponse(err.message || 'Internal server error', 500);
  }
});
