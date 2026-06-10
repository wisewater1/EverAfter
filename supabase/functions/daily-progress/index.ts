import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function errorResponse(code: string, message: string, status = 500) {
  return jsonResponse({ code, message }, status);
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return errorResponse("AUTH_MISSING", "Missing Authorization header", 401);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");

    if (!supabaseUrl || !supabaseAnonKey) {
      return errorResponse("CONFIG_MISSING", "Supabase configuration missing", 500);
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return errorResponse("AUTH_FAILED", "Invalid or expired session", 401);
    }

    // Call the RPC function
    const { data: progressId, error: rpcError } = await supabase
      .rpc("get_or_create_user_progress");

    if (rpcError) {
      console.error("RPC error:", rpcError);
      return errorResponse("RPC_ERROR", rpcError.message, 500);
    }

    return jsonResponse({ progress_id: progressId, user_id: user.id });

  } catch (error) {
    console.error("Unhandled error in daily-progress:", error);
    const message = error instanceof Error ? error.message : String(error);
    return errorResponse("SERVER_ERROR", message, 500);
  }
});
