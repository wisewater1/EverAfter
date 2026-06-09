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
  status?: number;
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function errorResponse(code: string, message: string, status = 500, hint?: string): Response {
  const body: ErrorResponse = { code, message, status };
  if (hint) body.hint = hint;
  return jsonResponse(body, status);
}

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return errorResponse("METHOD_NOT_ALLOWED", "Only POST requests are allowed", 405);
  }

  try {
    // 1. Extract and validate Authorization header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return errorResponse("AUTH_MISSING", "Missing Authorization header", 401, "Client must send JWT in Authorization: Bearer <token> header");
    }

    // 2. Create Supabase client that forwards the JWT
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");

    if (!supabaseUrl || !supabaseAnonKey) {
      return errorResponse("CONFIG_MISSING", "Supabase configuration missing", 500);
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // 3. Verify user authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return errorResponse("AUTH_FAILED", "Invalid or expired session", 401, "User must be authenticated");
    }

    // 4. Parse and validate request body
    const body = await req.json().catch(() => null);
    if (!body) {
      return errorResponse("INVALID_JSON", "Request body must be valid JSON", 400);
    }

    const { input, engramId, system } = body;

    if (!input || typeof input !== "string") {
      return errorResponse("INVALID_INPUT", "Missing or invalid 'input' field", 400, "'input' must be a non-empty string");
    }

    // 5. Verify engram ownership (if provided)
    if (engramId) {
      const { data: engram, error: engramError } = await supabase
        .from("engrams")
        .select("id, name")
        .eq("id", engramId)
        .single();

      if (engramError || !engram) {
        return errorResponse("ENGRAM_NOT_FOUND", "Engram not found or not owned by user", 404);
      }
    }

    // 6. Get OpenAI API key
    const openaiKey = Deno.env.get("OPENAI_API_KEY");
    if (!openaiKey) {
      return errorResponse("CONFIG_MISSING", "OPENAI_API_KEY not configured in Supabase Functions secrets", 500);
    }

    // 7. Build system prompt (St. Raphael persona)
    const systemPrompt = system || `You are St. Raphael, a kind and supportive health companion.

IMPORTANT SAFETY RULES:
- You provide information and emotional support ONLY
- You NEVER diagnose medical conditions
- You NEVER prescribe treatments or medications
- You ALWAYS encourage users to consult licensed healthcare professionals
- In emergencies, you direct users to call local emergency services (911 in US)

Your role is to listen, encourage healthy habits, help track health goals, and provide general wellness information. Be warm, clear, and always emphasize professional medical care when appropriate.`;

    // 8. Call OpenAI Chat Completions API
    const openaiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${openaiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: input },
        ],
        temperature: 0.7,
        max_tokens: 600,
      }),
    });

    if (!openaiResponse.ok) {
      const errorText = await openaiResponse.text();
      console.error("OpenAI API error:", errorText);
      return errorResponse(
        "OPENAI_ERROR",
        "Failed to generate AI response",
        openaiResponse.status,
        errorText.substring(0, 200)
      );
    }

    const openaiData = await openaiResponse.json();
    const reply = openaiData?.choices?.[0]?.message?.content;

    if (!reply) {
      return errorResponse("OPENAI_INVALID_RESPONSE", "OpenAI returned no content", 500);
    }

    // 9. Track daily progress
    try {
      await supabase.rpc("get_or_create_user_progress");
    } catch (progressError) {
      // Log but don't fail the request
      console.warn("Failed to update daily progress:", progressError);
    }

    // 10. Return success response
    return jsonResponse({ reply, user_id: user.id });

  } catch (error) {
    console.error("Unhandled error in raphael-chat:", error);
    const message = error instanceof Error ? error.message : String(error);
    return errorResponse("SERVER_ERROR", message, 500, "Check function logs for details");
  }
});
