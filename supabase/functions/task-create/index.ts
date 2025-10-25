import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface ErrorResponse {
  code: string;
  message: string;
  hint?: string;
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function errorResponse(code: string, message: string, status = 500, hint?: string): Response {
  const body: ErrorResponse = { code, message };
  if (hint) body.hint = hint;
  return jsonResponse(body, status);
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return errorResponse("METHOD_NOT_ALLOWED", "Only POST requests allowed", 405);
  }

  try {
    // 1. Validate Authorization
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return errorResponse("AUTH_MISSING", "Missing Authorization header", 401);
    }

    // 2. Create Supabase client with JWT
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");

    if (!supabaseUrl || !supabaseAnonKey) {
      return errorResponse("CONFIG_MISSING", "Supabase configuration missing", 500);
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // 3. Verify authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return errorResponse("AUTH_FAILED", "Invalid or expired session", 401);
    }

    // 4. Parse request
    const body = await req.json().catch(() => null);
    if (!body) {
      return errorResponse("INVALID_JSON", "Request body must be valid JSON", 400);
    }

    const { engramId, title, task_description, details } = body;

    if (!engramId || !title) {
      return errorResponse(
        "INVALID_REQUEST",
        "Missing required fields: engramId and title",
        400
      );
    }

    // 5. Verify engram ownership
    const { data: engram, error: engramError } = await supabase
      .from("engrams")
      .select("id, name")
      .eq("id", engramId)
      .single();

    if (engramError || !engram) {
      return errorResponse("ENGRAM_NOT_FOUND", "Engram not found or not owned by user", 404);
    }

    // 6. Create task
    const { data: task, error: taskError } = await supabase
      .from("engram_ai_tasks")
      .insert({
        user_id: user.id,
        engram_id: engramId,
        title,
        task_description: task_description || null,
        details: details || {},
        status: "pending",
      })
      .select()
      .single();

    if (taskError) {
      console.error("Task creation error:", taskError);
      return errorResponse("DB_ERROR", taskError.message, 400);
    }

    return jsonResponse({ task }, 201);

  } catch (error) {
    console.error("Unhandled error in task-create:", error);
    const message = error instanceof Error ? error.message : String(error);
    return errorResponse("SERVER_ERROR", message, 500);
  }
});
