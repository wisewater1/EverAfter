import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return jsonResponse({ error: "Missing Authorization header" }, 401);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");

    if (!supabaseUrl || !supabaseAnonKey) {
      return jsonResponse({ error: "Supabase configuration missing" }, 500);
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return jsonResponse({ error: "Invalid or expired session" }, 401);
    }

    const body = await req.json().catch(() => null);
    if (!body) {
      return jsonResponse({ error: "Invalid JSON body" }, 400);
    }

    const { template_id, instance_id, input, conversation_history = [], run_type = "chat" } = body;

    if (!template_id || !input) {
      return jsonResponse({ error: "Missing required fields: template_id, input" }, 400);
    }

    const startTime = Date.now();

    // 1. Check if template exists and is approved
    const { data: template, error: templateError } = await supabase
      .from("marketplace_templates")
      .select("*, manifest:marketplace_template_manifests(*)")
      .eq("id", template_id)
      .eq("is_active", true)
      .eq("approval_status", "approved")
      .single();

    if (templateError || !template) {
      return jsonResponse({ error: "Template not found or not available" }, 404);
    }

    // 2. Check purchase or demo mode
    const isDemoMode = run_type === "demo";

    if (!isDemoMode) {
      const { data: purchase, error: purchaseError } = await supabase
        .from("marketplace_purchases")
        .select("id")
        .eq("user_id", user.id)
        .eq("template_id", template_id)
        .maybeSingle();

      if (purchaseError || !purchase) {
        return jsonResponse({
          error: "Template not purchased. Please purchase this template to use it.",
          demo_available: true
        }, 403);
      }
    }

    // 3. Get manifest
    const manifest = template.manifest?.[0];
    if (!manifest) {
      return jsonResponse({ error: "Template manifest not found" }, 500);
    }

    // 4. Apply demo mode limits
    const maxTokens = isDemoMode ? Math.min(manifest.max_tokens || 500, 500) : (manifest.max_tokens || 1000);
    const systemPrompt = manifest.system_prompt;

    // 5. Call OpenAI with manifest configuration
    const openaiKey = Deno.env.get("OPENAI_API_KEY");
    if (!openaiKey) {
      return jsonResponse({ error: "OpenAI API key not configured" }, 500);
    }

    const messages = [
      { role: "system", content: systemPrompt },
      ...conversation_history.slice(-10),
      { role: "user", content: input }
    ];

    const openaiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${openaiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: manifest.model || "gpt-4o-mini",
        messages,
        temperature: manifest.temperature || 0.7,
        max_tokens: maxTokens,
      }),
    });

    if (!openaiResponse.ok) {
      const errorText = await openaiResponse.text();
      console.error("OpenAI API error:", errorText);
      return jsonResponse({ error: "Failed to generate AI response" }, openaiResponse.status);
    }

    const openaiData = await openaiResponse.json();
    const assistantMessage = openaiData?.choices?.[0]?.message;
    const reply = assistantMessage?.content;

    if (!reply) {
      return jsonResponse({ error: "OpenAI returned no content" }, 500);
    }

    const endTime = Date.now();
    const runtimeSeconds = Math.floor((endTime - startTime) / 1000);

    // 6. Log the run
    try {
      await supabase.from("marketplace_template_runs").insert({
        template_id,
        user_id: user.id,
        instance_id: instance_id || null,
        run_type: isDemoMode ? "demo" : run_type,
        status: "completed",
        input_tokens: openaiData.usage?.prompt_tokens || 0,
        output_tokens: openaiData.usage?.completion_tokens || 0,
        runtime_seconds: runtimeSeconds,
        completed_at: new Date().toISOString(),
      });

      if (!isDemoMode) {
        await supabase
          .from("marketplace_templates")
          .update({ total_runs: template.total_runs + 1 })
          .eq("id", template_id);
      }
    } catch (logError) {
      console.warn("Failed to log template run:", logError);
    }

    return jsonResponse({
      reply,
      template_id,
      template_name: template.title,
      is_demo: isDemoMode,
      runtime_seconds: runtimeSeconds,
      tokens_used: openaiData.usage?.total_tokens || 0,
    });

  } catch (error: any) {
    console.error("Unhandled error in marketplace-template-run:", error);
    const message = error instanceof Error ? error.message : String(error);
    return jsonResponse({ error: message }, 500);
  }
});
