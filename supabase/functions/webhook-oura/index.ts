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
    const payload = await req.json();

    console.log('Oura webhook received (stub):', payload);

    return jsonResponse({ status: 'stub_acknowledged', message: 'Oura webhook handler not fully implemented' });

  } catch (err: any) {
    console.error('Oura webhook error:', err);
    return errorResponse(err.message || 'Internal server error', 500);
  }
});
