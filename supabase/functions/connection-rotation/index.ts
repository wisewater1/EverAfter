import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface RotationConfig {
  enabled: boolean;
  rotation_interval: string;
  priority_order: string[];
  failover_enabled: boolean;
  max_retry_attempts: number;
  retry_delay_minutes: number;
}

interface SyncResult {
  success: boolean;
  metrics_synced?: number;
  error?: string;
  duration_ms: number;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      {
        auth: {
          persistSession: false,
        },
      }
    );

    const url = new URL(req.url);
    const action = url.searchParams.get("action") || "process_queue";

    switch (action) {
      case "process_queue":
        return await processQueue(supabase);
      case "schedule_rotation":
        return await scheduleRotation(supabase, req);
      case "execute_sync":
        return await executeSync(supabase, req);
      case "check_health":
        return await checkHealth(supabase, req);
      default:
        return new Response(
          JSON.stringify({ error: "Invalid action" }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
    }
  } catch (error: any) {
    console.error("Connection rotation error:", error);
    return new Response(
      JSON.stringify({
        error: error.message,
        code: "ROTATION_ERROR",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

async function processQueue(supabase: any) {
  const startTime = Date.now();
  let processed = 0;
  let successful = 0;
  let failed = 0;

  try {
    // Get pending sync jobs, ordered by priority and scheduled time
    const { data: queueItems, error: queueError } = await supabase
      .from("connection_sync_queue")
      .select("*")
      .eq("status", "pending")
      .lte("scheduled_for", new Date().toISOString())
      .order("priority", { ascending: true })
      .order("scheduled_for", { ascending: true })
      .limit(10);

    if (queueError) throw queueError;

    if (!queueItems || queueItems.length === 0) {
      return new Response(
        JSON.stringify({
          message: "No pending syncs in queue",
          processed: 0,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Process each queue item
    for (const item of queueItems) {
      processed++;

      // Mark as processing
      await supabase
        .from("connection_sync_queue")
        .update({
          status: "processing",
          started_at: new Date().toISOString(),
        })
        .eq("id", item.id);

      // Execute sync
      const syncResult = await syncProvider(
        supabase,
        item.user_id,
        item.provider
      );

      // Update queue status
      const finalStatus = syncResult.success ? "completed" : "failed";
      await supabase
        .from("connection_sync_queue")
        .update({
          status: finalStatus,
          completed_at: new Date().toISOString(),
          error_message: syncResult.error || null,
          result: syncResult,
        })
        .eq("id", item.id);

      // Update health metrics
      await supabase.rpc("update_connection_health", {
        p_user_id: item.user_id,
        p_provider: item.provider,
        p_success: syncResult.success,
        p_duration_ms: syncResult.duration_ms,
      });

      if (syncResult.success) {
        successful++;

        // Update last_sync_at on provider_accounts
        await supabase
          .from("provider_accounts")
          .update({ last_sync_at: new Date().toISOString() })
          .eq("user_id", item.user_id)
          .eq("provider", item.provider);
      } else {
        failed++;

        // Check if we should retry or failover
        const config = await getRotationConfig(supabase, item.user_id);
        if (config && config.failover_enabled && item.retry_count < config.max_retry_attempts) {
          // Schedule retry
          const retryDelay = config.retry_delay_minutes * 60 * 1000;
          const retryTime = new Date(Date.now() + retryDelay);

          await supabase.from("connection_sync_queue").insert({
            user_id: item.user_id,
            provider: item.provider,
            priority: Math.min(item.priority + 1, 10),
            sync_type: "retry",
            scheduled_for: retryTime.toISOString(),
            retry_count: item.retry_count + 1,
          });
        }
      }
    }

    const duration = Date.now() - startTime;

    return new Response(
      JSON.stringify({
        message: "Queue processed successfully",
        processed,
        successful,
        failed,
        duration_ms: duration,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Queue processing error:", error);
    return new Response(
      JSON.stringify({
        error: error.message,
        processed,
        successful,
        failed,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
}

async function scheduleRotation(supabase: any, req: Request) {
  try {
    const { user_id } = await req.json();

    if (!user_id) {
      return new Response(
        JSON.stringify({ error: "user_id required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Call the schedule_next_rotation function
    const { data, error } = await supabase.rpc("schedule_next_rotation", {
      p_user_id: user_id,
    });

    if (error) throw error;

    if (!data) {
      return new Response(
        JSON.stringify({
          message: "No rotation scheduled (rotation may be disabled or no providers available)",
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    return new Response(
      JSON.stringify({
        message: "Rotation scheduled successfully",
        schedule_id: data,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Schedule rotation error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
}

async function executeSync(supabase: any, req: Request) {
  try {
    const { user_id, provider } = await req.json();

    if (!user_id || !provider) {
      return new Response(
        JSON.stringify({ error: "user_id and provider required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Enqueue sync with failover support
    const { data: queueId, error } = await supabase.rpc(
      "enqueue_sync_with_failover",
      {
        p_user_id: user_id,
        p_provider: provider,
        p_sync_type: "manual",
      }
    );

    if (error) throw error;

    return new Response(
      JSON.stringify({
        message: "Sync queued successfully",
        queue_id: queueId,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Execute sync error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
}

async function checkHealth(supabase: any, req: Request) {
  try {
    const { user_id, provider } = await req.json();

    if (!user_id) {
      return new Response(
        JSON.stringify({ error: "user_id required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    let query = supabase
      .from("connection_health_metrics")
      .select("*")
      .eq("user_id", user_id);

    if (provider) {
      query = query.eq("provider", provider);
    }

    const { data, error } = await query;

    if (error) throw error;

    return new Response(
      JSON.stringify({
        health_metrics: data || [],
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Check health error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
}

async function syncProvider(
  supabase: any,
  userId: string,
  provider: string
): Promise<SyncResult> {
  const startTime = Date.now();

  try {
    // Get provider account
    const { data: account, error: accountError } = await supabase
      .from("provider_accounts")
      .select("*")
      .eq("user_id", userId)
      .eq("provider", provider)
      .eq("status", "active")
      .maybeSingle();

    if (accountError) throw accountError;

    if (!account) {
      return {
        success: false,
        error: "Provider account not found or inactive",
        duration_ms: Date.now() - startTime,
      };
    }

    // Call the actual sync function for this provider
    const syncFunctionUrl = `${Deno.env.get("SUPABASE_URL")}/functions/v1/sync-health-now`;

    const response = await fetch(syncFunctionUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
      },
      body: JSON.stringify({
        provider,
        user_id: userId,
        days: 1, // Sync last 1 day by default for rotation
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Sync failed with status ${response.status}`);
    }

    const result = await response.json();

    return {
      success: true,
      metrics_synced: result.metrics_ingested || 0,
      duration_ms: Date.now() - startTime,
    };
  } catch (error: any) {
    console.error(`Sync error for ${provider}:`, error);
    return {
      success: false,
      error: error.message,
      duration_ms: Date.now() - startTime,
    };
  }
}

async function getRotationConfig(
  supabase: any,
  userId: string
): Promise<RotationConfig | null> {
  try {
    const { data, error } = await supabase
      .from("connection_rotation_config")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error("Error getting rotation config:", error);
    return null;
  }
}
