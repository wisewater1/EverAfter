import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface BackfillRequest {
  user_id: string;
  provider: string;
  days?: number;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const TERRA_API_KEY = Deno.env.get("TERRA_API_KEY");
    const TERRA_DEV_ID = Deno.env.get("TERRA_DEV_ID");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    if (!TERRA_API_KEY || !TERRA_DEV_ID) {
      return new Response(
        JSON.stringify({ error: "Terra configuration missing" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const supabaseClient = createClient(
      SUPABASE_URL,
      SUPABASE_SERVICE_ROLE_KEY
    );

    const body: BackfillRequest = await req.json();
    const days = body.days || 7;

    const { data: terraUser, error: terraUserError } = await supabaseClient
      .from("terra_users")
      .select("*")
      .eq("user_id", body.user_id)
      .eq("provider", body.provider)
      .maybeSingle();

    if (terraUserError || !terraUser) {
      return new Response(
        JSON.stringify({ error: "Terra user not found" }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const windowEnd = new Date();
    const windowStart = new Date(windowEnd.getTime() - days * 24 * 60 * 60 * 1000);

    const { data: job, error: jobError } = await supabaseClient
      .from("terra_sync_jobs")
      .insert({
        user_id: body.user_id,
        provider: body.provider,
        job_type: "backfill",
        window_start: windowStart.toISOString(),
        window_end: windowEnd.toISOString(),
        status: "running",
        attempts: 1,
      })
      .select()
      .single();

    if (jobError) {
      console.error("Error creating sync job:", jobError);
      return new Response(
        JSON.stringify({ error: "Failed to create sync job" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const dataTypes = ["activity", "sleep", "body", "daily"];
    const results: Record<string, unknown> = {};

    for (const dataType of dataTypes) {
      try {
        const startDate = windowStart.toISOString().split("T")[0];
        const endDate = windowEnd.toISOString().split("T")[0];

        const response = await fetch(
          `https://api.tryterra.co/v2/${dataType}?user_id=${terraUser.terra_user_id}&start_date=${startDate}&end_date=${endDate}`,
          {
            headers: {
              "x-api-key": TERRA_API_KEY,
              "dev-id": TERRA_DEV_ID,
            },
          }
        );

        if (response.ok) {
          const data = await response.json();
          results[dataType] = data;

          if (data.data && Array.isArray(data.data)) {
            const { error: rawError } = await supabaseClient
              .from("terra_metrics_raw")
              .insert({
                user_id: body.user_id,
                provider: body.provider,
                event_type: dataType,
                payload: data as unknown as Record<string, unknown>,
                webhook_id: `backfill_${dataType}_${job.id}`,
                processing_status: "processed",
              });

            if (rawError) {
              console.error(`Error storing raw ${dataType}:`, rawError);
            }
          }
        } else {
          console.error(`Error fetching ${dataType}:`, response.status);
          results[dataType] = { error: response.status };
        }
      } catch (error) {
        console.error(`Error processing ${dataType}:`, error);
        results[dataType] = {
          error: error instanceof Error ? error.message : "Unknown error",
        };
      }
    }

    await supabaseClient
      .from("terra_sync_jobs")
      .update({
        status: "completed",
        result: results as unknown as Record<string, unknown>,
      })
      .eq("id", job.id);

    await supabaseClient
      .from("terra_connections")
      .update({
        last_sync_at: new Date().toISOString(),
        error_count: 0,
      })
      .eq("user_id", body.user_id)
      .eq("provider", body.provider);

    return new Response(
      JSON.stringify({
        success: true,
        job_id: job.id,
        window: {
          start: windowStart,
          end: windowEnd,
        },
        results,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error in terra-backfill:", error);

    return new Response(
      JSON.stringify({
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
