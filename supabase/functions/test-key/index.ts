import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface DiagnosticResult {
  service: string;
  status: "ok" | "error" | "missing";
  message: string;
  details?: any;
}

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  const diagnostics: DiagnosticResult[] = [];

  // 1. Check Supabase configuration
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  diagnostics.push({
    service: "Supabase URL",
    status: supabaseUrl ? "ok" : "missing",
    message: supabaseUrl ? "Configured" : "Missing SUPABASE_URL environment variable",
    details: supabaseUrl ? { url: supabaseUrl } : undefined
  });

  diagnostics.push({
    service: "Supabase Anon Key",
    status: supabaseAnonKey ? "ok" : "missing",
    message: supabaseAnonKey ? "Configured" : "Missing SUPABASE_ANON_KEY environment variable",
    details: supabaseAnonKey ? { length: supabaseAnonKey.length } : undefined
  });

  diagnostics.push({
    service: "Supabase Service Key",
    status: supabaseServiceKey ? "ok" : "missing",
    message: supabaseServiceKey ? "Configured" : "Missing SUPABASE_SERVICE_ROLE_KEY environment variable",
    details: supabaseServiceKey ? { length: supabaseServiceKey.length } : undefined
  });

  // 2. Check OpenAI API key
  const openaiKey = Deno.env.get("OPENAI_API_KEY");
  
  if (!openaiKey) {
    diagnostics.push({
      service: "OpenAI API Key",
      status: "missing",
      message: "Missing OPENAI_API_KEY environment variable"
    });
  } else {
    // Test OpenAI API key with a simple request
    try {
      const testResponse = await fetch("https://api.openai.com/v1/models", {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${openaiKey}`,
        },
      });

      if (testResponse.ok) {
        const models = await testResponse.json();
        const hasGpt4Mini = models.data.some((m: any) => m.id === 'gpt-4o-mini');
        const hasEmbedding = models.data.some((m: any) => m.id.includes('embedding'));
        
        diagnostics.push({
          service: "OpenAI API Key",
          status: "ok",
          message: "Valid and working",
          details: {
            key_prefix: openaiKey.substring(0, 10) + "...",
            models_available: models.data.length,
            has_gpt4o_mini: hasGpt4Mini,
            has_embeddings: hasEmbedding
          }
        });
      } else {
        const errorText = await testResponse.text();
        diagnostics.push({
          service: "OpenAI API Key",
          status: "error",
          message: "Invalid or expired API key",
          details: {
            status: testResponse.status,
            error: errorText.substring(0, 200)
          }
        });
      }
    } catch (error: any) {
      diagnostics.push({
        service: "OpenAI API Key",
        status: "error",
        message: "Failed to validate API key",
        details: {
          error: error.message
        }
      });
    }
  }

  // 3. Test embedding generation
  if (openaiKey) {
    try {
      const embeddingResponse = await fetch("https://api.openai.com/v1/embeddings", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${openaiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "text-embedding-3-small",
          input: "test"
        }),
      });

      if (embeddingResponse.ok) {
        const data = await embeddingResponse.json();
        diagnostics.push({
          service: "OpenAI Embeddings",
          status: "ok",
          message: "Embedding generation working",
          details: {
            model: "text-embedding-3-small",
            embedding_dimension: data.data[0].embedding.length
          }
        });
      } else {
        const errorText = await embeddingResponse.text();
        diagnostics.push({
          service: "OpenAI Embeddings",
          status: "error",
          message: "Failed to generate embeddings",
          details: { error: errorText.substring(0, 200) }
        });
      }
    } catch (error: any) {
      diagnostics.push({
        service: "OpenAI Embeddings",
        status: "error",
        message: "Embedding generation failed",
        details: { error: error.message }
      });
    }
  }

  // 4. Test chat completions
  if (openaiKey) {
    try {
      const chatResponse = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${openaiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [{ role: "user", content: "Say 'test successful' if you receive this." }],
          max_tokens: 10
        }),
      });

      if (chatResponse.ok) {
        const data = await chatResponse.json();
        diagnostics.push({
          service: "OpenAI Chat Completions",
          status: "ok",
          message: "Chat API working",
          details: {
            model: "gpt-4o-mini",
            response: data.choices[0].message.content
          }
        });
      } else {
        const errorText = await chatResponse.text();
        diagnostics.push({
          service: "OpenAI Chat Completions",
          status: "error",
          message: "Chat API failed",
          details: { error: errorText.substring(0, 200) }
        });
      }
    } catch (error: any) {
      diagnostics.push({
        service: "OpenAI Chat Completions",
        status: "error",
        message: "Chat API request failed",
        details: { error: error.message }
      });
    }
  }

  // 5. Overall status
  const allOk = diagnostics.every(d => d.status === "ok");
  const hasErrors = diagnostics.some(d => d.status === "error");
  const hasMissing = diagnostics.some(d => d.status === "missing");

  let overallStatus = "ok";
  let overallMessage = "All systems operational";
  
  if (hasMissing) {
    overallStatus = "missing";
    overallMessage = "Some required configurations are missing";
  } else if (hasErrors) {
    overallStatus = "error";
    overallMessage = "Some services are experiencing errors";
  }

  return new Response(
    JSON.stringify({
      overall_status: overallStatus,
      overall_message: overallMessage,
      timestamp: new Date().toISOString(),
      diagnostics
    }, null, 2),
    {
      status: allOk ? 200 : 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    }
  );
});
