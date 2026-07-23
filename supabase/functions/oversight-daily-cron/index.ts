import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { serviceSupabase, getCorsHeaders, jsonResponse, errorResponse } from '../_shared/connectors.ts';

const corsHeaders = getCorsHeaders();

// Daily household-oversight lifecycle pass. Runs fn_oversight_daily() with
// the service role: 30 and 7 day expiry notices, minor-to-majority notices
// to both parties, proxy review reminders, and the exploitation screen that
// alerts the subject, the grantee, and the trusted contact together.
Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  // Scheduler-only endpoint: require the service-role key (Supabase cron
  // invokes with it) or an explicit CRON_SECRET. Without this, anyone could
  // fire notice storms at every household.
  const bearer = req.headers.get('Authorization')?.replace('Bearer ', '') ?? '';
  const cronSecret = Deno.env.get('CRON_SECRET');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const authorized = (serviceKey && bearer === serviceKey) || (cronSecret && bearer === cronSecret);
  if (!authorized) {
    return errorResponse('Unauthorized: scheduler-only endpoint', 401);
  }

  try {
    const supabase = serviceSupabase();
    const { data, error } = await supabase.rpc('fn_oversight_daily');
    if (error) {
      return errorResponse(`Oversight daily pass failed: ${error.message}`, 500);
    }
    return jsonResponse({ success: true, result: data });
  } catch (err) {
    return errorResponse(
      `Oversight daily pass failed: ${err instanceof Error ? err.message : 'unknown error'}`,
      500,
    );
  }
});
