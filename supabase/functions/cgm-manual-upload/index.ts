import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { getCorsHeaders, supabaseFromRequest, errorResponse, jsonResponse } from '../_shared/connectors.ts';
import { parseDexcomCsv, upsertGlucoseReading, getOrCreateRaphaelEngram, logJobAudit } from '../_shared/glucose.ts';

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
    const supabase = supabaseFromRequest(req);
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return errorResponse('Unauthorized', 401);
    }

    const contentType = req.headers.get('content-type') || '';

    let fileContent: string;
    let fileName: string = 'upload.csv';

    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData();
      const file = formData.get('file');

      if (!file || typeof file === 'string') {
        return errorResponse('No file uploaded');
      }

      fileName = (file as File).name;
      fileContent = await (file as File).text();
    } else if (contentType.includes('application/json')) {
      const json = await req.json();
      fileContent = json.content || '';
      fileName = json.fileName || 'upload.csv';
    } else {
      fileContent = await req.text();
    }

    if (!fileContent || fileContent.trim() === '') {
      return errorResponse('Empty file content');
    }

    await logJobAudit(supabase, 'manual-upload', 'running', { startedAt: new Date(startTime).toISOString() });

    const engramId = await getOrCreateRaphaelEngram(supabase, user.id);
    if (!engramId) {
      await logJobAudit(supabase, 'manual-upload', 'failed', {
        durationMs: Date.now() - startTime,
        error: 'Failed to get engram',
      });
      return errorResponse('Failed to process upload', 500);
    }

    let points: any[] = [];
    let events: any[] = [];

    if (fileName.endsWith('.csv')) {
      const parsed = parseDexcomCsv(fileContent);
      points = parsed.points;
      events = parsed.events;
    } else if (fileName.endsWith('.json')) {
      try {
        const json = JSON.parse(fileContent);
        points = json.readings || json.points || [];
        events = json.events || [];
      } catch {
        return errorResponse('Invalid JSON format');
      }
    } else {
      return errorResponse('Unsupported file type. Use CSV or JSON.');
    }

    let insertedCount = 0;

    for (const point of points) {
      if (!point.ts || point.value === undefined) continue;

      const result = await upsertGlucoseReading(
        supabase,
        user.id,
        engramId,
        {
          ts: new Date(point.ts).toISOString(),
          value: point.value,
          unit: point.unit || 'mg/dL',
          trend: point.trend || null,
          quality: point.quality || null,
          raw: point,
        },
        'manual'
      );

      if (result.success) {
        insertedCount++;
      }
    }

    await logJobAudit(supabase, 'manual-upload', 'success', {
      rowsWritten: insertedCount,
      durationMs: Date.now() - startTime,
    });

    await supabase.from('connector_consent_ledger').insert({
      user_id: user.id,
      connector_id: 'manual',
      action: 'grant',
      scopes: ['upload'],
    });

    console.log(`Manual upload processed: ${insertedCount} readings from ${fileName}`);
    return jsonResponse({
      status: 'success',
      readings_inserted: insertedCount,
      file_name: fileName,
    });

  } catch (err: any) {
    const supabase = supabaseFromRequest(req);
    await logJobAudit(supabase, 'manual-upload', 'failed', {
      durationMs: Date.now() - startTime,
      error: err.message,
    });

    console.error('Manual upload error:', err);
    return errorResponse(err.message || 'Internal server error', 500);
  }
});
