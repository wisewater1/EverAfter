import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { getCorsHeaders, errorResponse, jsonResponse } from '../_shared/connectors.ts';

const corsHeaders = getCorsHeaders();

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return errorResponse('Method not allowed', 405);
  }

  try {
    // Not implemented: acknowledge nothing, store nothing, and do NOT log
    // the payload (potential PHI in logs on an unauthenticated endpoint).
    // The live Oura flow is handled elsewhere (via the Terra aggregator).
    await req.text().catch(() => '');

    return jsonResponse({ status: 'not_implemented', message: 'Oura direct webhook is not implemented; no data was stored.' }, 501);

  } catch (err: any) {
    console.error('Oura webhook error:', err);
    return errorResponse(err.message || 'Internal server error', 500);
  }
});
