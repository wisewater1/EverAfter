import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface SyncJob {
  id: string;
  user_id: string;
  connection_id: string;
  provider_key: string;
  sync_type: string;
  sync_window_start?: string;
  sync_window_end?: string;
  metric_types?: string[];
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Get pending sync jobs
    const { data: jobs, error: jobsError } = await supabaseClient
      .from("health_sync_jobs")
      .select("*")
      .eq("status", "pending")
      .lt("created_at", new Date(Date.now() - 5000).toISOString()) // 5 second delay
      .order("created_at", { ascending: true })
      .limit(10);

    if (jobsError) throw jobsError;

    if (!jobs || jobs.length === 0) {
      return new Response(
        JSON.stringify({ message: "No pending jobs", processed: 0 }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const results = [];

    for (const job of jobs) {
      try {
        // Mark job as running
        await supabaseClient
          .from("health_sync_jobs")
          .update({
            status: "running",
            started_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq("id", job.id);

        // Get connection details
        const { data: connection, error: connError } = await supabaseClient
          .from("health_connections")
          .select("*")
          .eq("id", job.connection_id)
          .single();

        if (connError || !connection) {
          throw new Error("Connection not found");
        }

        // Get provider configuration
        const { data: provider, error: provError } = await supabaseClient
          .from("health_providers_registry")
          .select("*")
          .eq("provider_key", job.provider_key)
          .single();

        if (provError || !provider) {
          throw new Error("Provider not found");
        }

        // Fetch data from provider (simplified - would need full implementation per provider)
        const providerData = await fetchProviderData(
          provider,
          connection,
          job
        );

        if (providerData && providerData.length > 0) {
          // Map and store metrics
          const { HealthDataMapper } = await import(
            "../_shared/data-transform.ts"
          );
          const metrics = HealthDataMapper.mapProviderData(
            job.provider_key,
            providerData
          );

          // Insert metrics (idempotent with unique index)
          for (const metric of metrics) {
            await supabaseClient.from("health_unified_metrics").insert({
              user_id: job.user_id,
              connection_id: job.connection_id,
              provider_key: job.provider_key,
              source_record_id: metric.source_record_id,
              ...metric,
            });
          }

          // Update job as completed
          await supabaseClient
            .from("health_sync_jobs")
            .update({
              status: "completed",
              completed_at: new Date().toISOString(),
              processed_records: metrics.length,
              data_points_synced: metrics.length,
              progress_percentage: 100,
              updated_at: new Date().toISOString(),
            })
            .eq("id", job.id);

          // Update connection last_synced_at
          await supabaseClient
            .from("health_connections")
            .update({
              last_synced_at: new Date().toISOString(),
              error_count: 0,
            })
            .eq("id", job.connection_id);

          results.push({
            job_id: job.id,
            success: true,
            metrics_synced: metrics.length,
          });
        } else {
          // No data but successful
          await supabaseClient
            .from("health_sync_jobs")
            .update({
              status: "completed",
              completed_at: new Date().toISOString(),
              processed_records: 0,
              progress_percentage: 100,
              updated_at: new Date().toISOString(),
            })
            .eq("id", job.id);

          results.push({
            job_id: job.id,
            success: true,
            metrics_synced: 0,
          });
        }
      } catch (error) {
        console.error(`Error processing job ${job.id}:`, error);

        // Update job as failed with retry logic
        const retryCount = (job.retry_count || 0) + 1;
        const maxRetries = job.max_retries || 3;

        if (retryCount < maxRetries) {
          // Schedule retry with exponential backoff
          const backoffMinutes = Math.pow(2, retryCount) * 5; // 5, 10, 20 minutes
          await supabaseClient
            .from("health_sync_jobs")
            .update({
              status: "failed",
              error_message: error.message,
              retry_count: retryCount,
              next_retry_at: new Date(
                Date.now() + backoffMinutes * 60 * 1000
              ).toISOString(),
              updated_at: new Date().toISOString(),
            })
            .eq("id", job.id);
        } else {
          // Max retries exceeded
          await supabaseClient
            .from("health_sync_jobs")
            .update({
              status: "failed",
              error_message: `Max retries exceeded: ${error.message}`,
              retry_count: retryCount,
              updated_at: new Date().toISOString(),
            })
            .eq("id", job.id);

          // Increment connection error count
          await supabaseClient.rpc("increment_connection_errors", {
            p_connection_id: job.connection_id,
          });
        }

        results.push({
          job_id: job.id,
          success: false,
          error: error.message,
        });
      }
    }

    return new Response(
      JSON.stringify({
        message: "Sync jobs processed",
        processed: results.length,
        results: results,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Sync processor error:", error);

    return new Response(
      JSON.stringify({
        error: "Failed to process sync jobs",
        details: error.message,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

/**
 * Fetch data from provider API
 * This is a simplified version - each provider would need full implementation
 */
async function fetchProviderData(
  provider: any,
  connection: any,
  job: SyncJob
): Promise<any[]> {
  // Check if token needs refresh
  if (
    connection.token_expires_at &&
    new Date(connection.token_expires_at) < new Date()
  ) {
    // Token expired - would need to refresh
    throw new Error("Token expired - refresh needed");
  }

  // Build API request based on provider
  const headers = {
    Authorization: `Bearer ${connection.access_token}`,
    "Content-Type": "application/json",
  };

  // Default date range (last 7 days if not specified)
  const endDate =
    job.sync_window_end || new Date().toISOString().split("T")[0];
  const startDate =
    job.sync_window_start ||
    new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[
      0
    ];

  let apiUrl = provider.api_base_url;

  // Provider-specific URL building (simplified)
  switch (provider.provider_key) {
    case "garmin":
      apiUrl += `/wellness-api/rest/dailies?uploadStartTimeInSeconds=${Math.floor(
        new Date(startDate).getTime() / 1000
      )}&uploadEndTimeInSeconds=${Math.floor(
        new Date(endDate).getTime() / 1000
      )}`;
      break;
    case "fitbit":
      apiUrl += `/1/user/-/activities/date/${startDate}/${endDate}.json`;
      break;
    case "oura":
      apiUrl += `/v2/usercollection/sleep?start_date=${startDate}&end_date=${endDate}`;
      break;
    case "whoop":
      apiUrl += `/v1/recovery?start=${startDate}&end=${endDate}`;
      break;
    case "dexcom_cgm":
      apiUrl += `/v2/users/self/egvs?startDate=${startDate}&endDate=${endDate}`;
      break;
    case "withings":
      apiUrl += `/measure?action=getmeas&startdate=${Math.floor(
        new Date(startDate).getTime() / 1000
      )}&enddate=${Math.floor(new Date(endDate).getTime() / 1000)}`;
      break;
    default:
      throw new Error(`Provider ${provider.provider_key} not implemented`);
  }

  try {
    const response = await fetch(apiUrl, {
      method: "GET",
      headers: headers,
    });

    if (!response.ok) {
      throw new Error(
        `Provider API error: ${response.status} ${response.statusText}`
      );
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Provider API error:", error);
    throw error;
  }
}
