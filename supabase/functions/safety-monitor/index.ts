import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey",
};

/**
 * Safety Monitor - Negative Delta Detector
 *
 * Monitors all critical tables for data loss
 * CRITICAL: This function protects against unauthorized deletes
 *
 * Monitors:
 * - health_connections (user device connections)
 * - health_unified_metrics (health data points)
 * - health_clinical_records (clinical data)
 * - health_providers_registry (provider configs)
 */

interface TableCount {
  table_name: string;
  count: bigint;
}

interface IntegrityCheck {
  table_name: string;
  count_before: bigint;
  count_after: bigint;
  delta: bigint;
  status: 'safe' | 'warning' | 'critical';
  message: string;
}

const MONITORED_TABLES = [
  'health_connections',
  'health_unified_metrics',
  'health_clinical_records',
  'health_providers_registry',
  'health_sync_jobs',
  'health_webhooks',
  'health_ble_devices',
  'health_file_imports',
];

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

    const url = new URL(req.url);
    const action = url.searchParams.get("action") || "check";

    switch (action) {
      case "check":
        return await performIntegrityCheck(supabaseClient);
      case "snapshot":
        return await createSnapshot(supabaseClient);
      case "compare":
        return await compareWithSnapshot(supabaseClient);
      default:
        return new Response(
          JSON.stringify({ error: "Invalid action" }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
    }
  } catch (error) {
    console.error("Safety monitor error:", error);

    return new Response(
      JSON.stringify({
        error: "Safety monitor operation failed",
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
 * Perform integrity check
 * Compares current counts with last snapshot
 */
async function performIntegrityCheck(supabaseClient: any) {
  const checks: IntegrityCheck[] = [];
  let criticalIssues = 0;
  let warnings = 0;

  for (const tableName of MONITORED_TABLES) {
    try {
      // Get current count
      const { count: currentCount, error: countError } = await supabaseClient
        .from(tableName)
        .select("*", { count: "exact", head: true });

      if (countError) {
        console.error(`Error counting ${tableName}:`, countError);
        continue;
      }

      // Get last recorded count from integrity log
      const { data: lastLog, error: logError } = await supabaseClient
        .from("health_data_integrity_log")
        .select("count_after")
        .eq("table_name", tableName)
        .order("performed_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (logError) {
        console.error(`Error fetching log for ${tableName}:`, logError);
      }

      const previousCount = lastLog?.count_after || 0;
      const delta = (currentCount || 0) - previousCount;

      let status: 'safe' | 'warning' | 'critical' = 'safe';
      let message = 'No data loss detected';

      // Check for negative delta (data loss)
      if (delta < 0) {
        status = 'critical';
        message = `DATA LOSS DETECTED: ${Math.abs(delta)} rows deleted from ${tableName}`;
        criticalIssues++;

        // Send alert
        await sendAlert(supabaseClient, {
          severity: 'critical',
          message: message,
          table: tableName,
          delta: delta,
        });
      } else if (delta === 0 && previousCount > 0) {
        // No growth over time might indicate an issue
        status = 'warning';
        message = 'No new data added since last check';
        warnings++;
      } else {
        message = `${delta} rows added since last check`;
      }

      checks.push({
        table_name: tableName,
        count_before: previousCount,
        count_after: currentCount || 0,
        delta: delta,
        status: status,
        message: message,
      });

      // Record this check (ADDITIVE ONLY)
      await supabaseClient.from("health_data_integrity_log").insert({
        operation_type: "integrity_check",
        operation_name: "automated_safety_monitor",
        table_name: tableName,
        count_before: previousCount,
        count_after: currentCount || 0,
        expected_delta: null,
        alert_triggered: delta < 0,
        alert_message: delta < 0 ? message : null,
        performed_by: "safety_monitor",
      });
    } catch (error) {
      console.error(`Error checking ${tableName}:`, error);
    }
  }

  return new Response(
    JSON.stringify({
      status: criticalIssues > 0 ? 'critical' : warnings > 0 ? 'warning' : 'safe',
      timestamp: new Date().toISOString(),
      critical_issues: criticalIssues,
      warnings: warnings,
      checks: checks,
    }),
    {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    }
  );
}

/**
 * Create a snapshot of current table counts
 */
async function createSnapshot(supabaseClient: any) {
  const snapshot: Record<string, number> = {};
  const snapshotId = `snapshot_${Date.now()}`;

  for (const tableName of MONITORED_TABLES) {
    const { count, error } = await supabaseClient
      .from(tableName)
      .select("*", { count: "exact", head: true });

    if (!error) {
      snapshot[tableName] = count || 0;

      // Record snapshot (ADDITIVE)
      await supabaseClient.from("health_data_integrity_log").insert({
        operation_type: "snapshot",
        operation_name: "manual_snapshot",
        table_name: tableName,
        count_before: count || 0,
        count_after: count || 0,
        snapshot_id: snapshotId,
        performed_by: "admin",
      });
    }
  }

  return new Response(
    JSON.stringify({
      snapshot_id: snapshotId,
      timestamp: new Date().toISOString(),
      tables: snapshot,
      total_records: Object.values(snapshot).reduce((a, b) => a + b, 0),
    }),
    {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    }
  );
}

/**
 * Compare current state with a specific snapshot
 */
async function compareWithSnapshot(supabaseClient: any) {
  const url = new URL(Deno.env.get("SUPABASE_URL") || "");
  const snapshotId = url.searchParams.get("snapshot_id");

  if (!snapshotId) {
    return new Response(
      JSON.stringify({ error: "Missing snapshot_id parameter" }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }

  // Get snapshot data
  const { data: snapshotLogs, error: snapshotError } = await supabaseClient
    .from("health_data_integrity_log")
    .select("*")
    .eq("snapshot_id", snapshotId);

  if (snapshotError || !snapshotLogs || snapshotLogs.length === 0) {
    return new Response(
      JSON.stringify({ error: "Snapshot not found" }),
      {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }

  const comparisons: IntegrityCheck[] = [];
  let hasDataLoss = false;

  for (const log of snapshotLogs) {
    const { count: currentCount } = await supabaseClient
      .from(log.table_name)
      .select("*", { count: "exact", head: true });

    const delta = (currentCount || 0) - log.count_after;

    if (delta < 0) {
      hasDataLoss = true;
    }

    comparisons.push({
      table_name: log.table_name,
      count_before: log.count_after,
      count_after: currentCount || 0,
      delta: delta,
      status: delta < 0 ? 'critical' : delta === 0 ? 'warning' : 'safe',
      message:
        delta < 0
          ? `DATA LOSS: ${Math.abs(delta)} rows deleted`
          : delta === 0
          ? 'No change'
          : `${delta} rows added`,
    });
  }

  return new Response(
    JSON.stringify({
      snapshot_id: snapshotId,
      snapshot_timestamp: snapshotLogs[0].performed_at,
      comparison_timestamp: new Date().toISOString(),
      has_data_loss: hasDataLoss,
      comparisons: comparisons,
    }),
    {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    }
  );
}

/**
 * Send critical alert
 */
async function sendAlert(supabaseClient: any, alert: any) {
  try {
    // Log to audit table (ADDITIVE)
    await supabaseClient.from("health_connection_audit").insert({
      user_id: "00000000-0000-0000-0000-000000000000", // System user
      provider_key: "system",
      action: "data_integrity_alert",
      action_details: alert,
      success: false,
    });

    // Could also send email, Slack notification, etc.
    console.error("CRITICAL ALERT:", alert);
  } catch (error) {
    console.error("Failed to send alert:", error);
  }
}
