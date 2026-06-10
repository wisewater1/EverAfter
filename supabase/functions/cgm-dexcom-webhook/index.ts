import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { getCorsHeaders, serviceSupabase, errorResponse, jsonResponse } from '../_shared/connectors.ts';
import { verifyDexcomSignature, upsertGlucoseReading, getOrCreateRaphaelEngram, logJobAudit } from '../_shared/glucose.ts';

const corsHeaders = getCorsHeaders();

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return errorResponse('Method not allowed', 405);
  }

  const startTime = Date.now();

  try {
    const body = await req.text();

    const isValid = await verifyDexcomSignature(req, body);
    if (!isValid) {
      console.warn('Invalid Dexcom signature');
      return errorResponse('Invalid signature', 401);
    }

    const payload = JSON.parse(body);
    const supabase = serviceSupabase();

    await logJobAudit(supabase, 'dexcom-webhook', 'running', { startedAt: new Date(startTime).toISOString() });

    const { data: token } = await supabase
      .from('connector_tokens')
      .select('user_id')
      .eq('connector_id', 'dexcom')
      .maybeSingle();

    if (!token) {
      console.error('No Dexcom connection found for webhook');
      await logJobAudit(supabase, 'dexcom-webhook', 'failed', {
        durationMs: Date.now() - startTime,
        error: 'No connection found',
      });
      return errorResponse('Connection not found', 404);
    }

    const userId = token.user_id;
    const engramId = await getOrCreateRaphaelEngram(supabase, userId);

    if (!engramId) {
      await logJobAudit(supabase, 'dexcom-webhook', 'failed', {
        durationMs: Date.now() - startTime,
        error: 'Failed to get engram',
      });
      return errorResponse('Failed to process webhook', 500);
    }

    let insertedCount = 0;

    if (payload.egvs && Array.isArray(payload.egvs)) {
      for (const egv of payload.egvs) {
        if (!egv.systemTime || !egv.value) continue;

        const result = await upsertGlucoseReading(
          supabase,
          userId,
          engramId,
          {
            ts: new Date(egv.systemTime).toISOString(),
            value: egv.value,
            unit: egv.unit || 'mg/dL',
            trend: egv.trend || null,
            quality: egv.status || null,
            raw: egv,
          },
          'dexcom'
        );

        if (result.success) {
          insertedCount++;
        }
      }
    }

    await logJobAudit(supabase, 'dexcom-webhook', 'success', {
      rowsWritten: insertedCount,
      durationMs: Date.now() - startTime,
    });

    console.log(`Dexcom webhook processed: ${insertedCount} readings inserted`);
    return jsonResponse({ status: 'success', readings_inserted: insertedCount });

  } catch (err: any) {
    const supabase = serviceSupabase();
    await logJobAudit(supabase, 'dexcom-webhook', 'failed', {
      durationMs: Date.now() - startTime,
      error: err.message,
    });

    console.error('Dexcom webhook error:', err);
    return errorResponse(err.message || 'Internal server error', 500);
  }
});
