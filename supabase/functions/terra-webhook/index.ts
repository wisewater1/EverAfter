import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey, Terra-Signature",
};

async function verifyTerraSignature(
  payload: string,
  signature: string,
  secret: string
): Promise<boolean> {
  try {
    const encoder = new TextEncoder();
    const keyData = encoder.encode(secret);
    const messageData = encoder.encode(payload);

    const key = await crypto.subtle.importKey(
      "raw",
      keyData,
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );

    const signatureBuffer = await crypto.subtle.sign("HMAC", key, messageData);
    const computedSignature = Array.from(new Uint8Array(signatureBuffer))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    return computedSignature === signature;
  } catch (error) {
    console.error("Signature verification error:", error);
    return false;
  }
}

interface TerraWebhookPayload {
  type: string;
  user: {
    user_id: string;
    provider: string;
    reference_id?: string;
  };
  data?: unknown[];
  [key: string]: unknown;
}

async function processWebhookData(
  supabaseClient: ReturnType<typeof createClient>,
  payload: TerraWebhookPayload,
  webhookId: string
) {
  const { user, type, data } = payload;

  const { data: terraUser, error: terraUserError } = await supabaseClient
    .from("terra_users")
    .select("user_id")
    .eq("terra_user_id", user.user_id)
    .eq("provider", user.provider)
    .maybeSingle();

  if (terraUserError || !terraUser) {
    console.error("Terra user not found:", user.user_id, user.provider);
    return { success: false, error: "User not found" };
  }

  const userId = terraUser.user_id;

  const { error: rawError } = await supabaseClient
    .from("terra_metrics_raw")
    .insert({
      user_id: userId,
      provider: user.provider,
      event_type: type,
      payload: payload as unknown as Record<string, unknown>,
      webhook_id: webhookId,
      processing_status: "pending",
    });

  if (rawError) {
    console.error("Error storing raw metrics:", rawError);
    return { success: false, error: rawError.message };
  }

  await supabaseClient
    .from("terra_users")
    .update({ last_webhook_at: new Date().toISOString() })
    .eq("user_id", userId)
    .eq("provider", user.provider);

  const normalizedMetrics = await normalizeWebhookData(
    userId,
    user.provider,
    type,
    data || []
  );

  if (normalizedMetrics.length > 0) {
    const { error: normalizedError } = await supabaseClient
      .from("terra_metrics_normalized")
      .upsert(normalizedMetrics, {
        onConflict: "user_id,provider,metric_type,metric_name,timestamp",
        ignoreDuplicates: true,
      });

    if (normalizedError) {
      console.error("Error storing normalized metrics:", normalizedError);
    }
  }

  return { success: true, metricsCount: normalizedMetrics.length };
}

async function normalizeWebhookData(
  userId: string,
  provider: string,
  eventType: string,
  data: unknown[]
): Promise<unknown[]> {
  const normalized: unknown[] = [];

  for (const item of data) {
    const dataItem = item as Record<string, unknown>;

    switch (eventType) {
      case "activity":
        if (dataItem.active_durations_data) {
          const activityData = dataItem.active_durations_data as Record<
            string,
            unknown
          >;
          const timestamp = new Date(
            (dataItem.metadata as Record<string, string>)?.start_time ||
              new Date().toISOString()
          );

          if (activityData.activity_seconds) {
            normalized.push({
              user_id: userId,
              provider,
              source: "terra",
              metric_type: "activity",
              metric_name: "active_minutes",
              timestamp,
              value: Number(activityData.activity_seconds) / 60,
              unit: "minutes",
              quality: "good",
              metadata: dataItem,
            });
          }
        }

        if (dataItem.distance_data) {
          const distanceData = dataItem.distance_data as Record<
            string,
            unknown
          >;
          const timestamp = new Date(
            (dataItem.metadata as Record<string, string>)?.start_time ||
              new Date().toISOString()
          );

          if (distanceData.distance_meters) {
            normalized.push({
              user_id: userId,
              provider,
              source: "terra",
              metric_type: "activity",
              metric_name: "distance",
              timestamp,
              value: distanceData.distance_meters,
              unit: "meters",
              quality: "good",
              metadata: dataItem,
            });
          }

          if (distanceData.steps) {
            normalized.push({
              user_id: userId,
              provider,
              source: "terra",
              metric_type: "steps",
              metric_name: "steps",
              timestamp,
              value: distanceData.steps,
              unit: "steps",
              quality: "good",
              metadata: dataItem,
            });
          }
        }
        break;

      case "sleep":
        if (dataItem.sleep_durations_data) {
          const sleepData = dataItem.sleep_durations_data as Record<
            string,
            unknown
          >;
          const timestamp = new Date(
            (dataItem.metadata as Record<string, string>)?.start_time ||
              new Date().toISOString()
          );

          if (sleepData.asleep_duration_seconds) {
            normalized.push({
              user_id: userId,
              provider,
              source: "terra",
              metric_type: "sleep",
              metric_name: "sleep_duration",
              timestamp,
              value: Number(sleepData.asleep_duration_seconds) / 60,
              unit: "minutes",
              quality: "good",
              metadata: dataItem,
            });
          }
        }
        break;

      case "body":
        if (dataItem.heart_rate_data) {
          const hrData = dataItem.heart_rate_data as Record<string, unknown>;
          const timestamp = new Date(
            (dataItem.metadata as Record<string, string>)?.start_time ||
              new Date().toISOString()
          );

          if (hrData.avg_hr_bpm) {
            normalized.push({
              user_id: userId,
              provider,
              source: "terra",
              metric_type: "hr",
              metric_name: "avg_hr",
              timestamp,
              value: hrData.avg_hr_bpm,
              unit: "bpm",
              quality: "good",
              metadata: dataItem,
            });
          }

          if (hrData.resting_hr_bpm) {
            normalized.push({
              user_id: userId,
              provider,
              source: "terra",
              metric_type: "hr",
              metric_name: "resting_hr",
              timestamp,
              value: hrData.resting_hr_bpm,
              unit: "bpm",
              quality: "good",
              metadata: dataItem,
            });
          }
        }

        if (dataItem.glucose_data) {
          const glucoseData = dataItem.glucose_data as Record<string, unknown>;
          const samples = (glucoseData.samples || []) as Array<
            Record<string, unknown>
          >;

          for (const sample of samples) {
            if (sample.glucose_mg_per_dL && sample.timestamp) {
              normalized.push({
                user_id: userId,
                provider,
                source: "terra",
                metric_type: "glucose",
                metric_name: "glucose",
                timestamp: new Date(sample.timestamp as string),
                value: sample.glucose_mg_per_dL,
                unit: "mg/dL",
                quality: "good",
                metadata: sample,
              });
            }
          }
        }
        break;

      case "daily":
        const metadata = dataItem.metadata as Record<string, string>;
        const timestamp = new Date(metadata?.start_time || new Date().toISOString());

        if (dataItem.heart_rate_data) {
          const hrData = dataItem.heart_rate_data as Record<string, unknown>;
          if (hrData.avg_hr_bpm) {
            normalized.push({
              user_id: userId,
              provider,
              source: "terra",
              metric_type: "hr",
              metric_name: "daily_avg_hr",
              timestamp,
              value: hrData.avg_hr_bpm,
              unit: "bpm",
              quality: "good",
              metadata: dataItem,
            });
          }
        }

        if (dataItem.distance_data) {
          const distanceData = dataItem.distance_data as Record<
            string,
            unknown
          >;
          if (distanceData.steps) {
            normalized.push({
              user_id: userId,
              provider,
              source: "terra",
              metric_type: "steps",
              metric_name: "daily_steps",
              timestamp,
              value: distanceData.steps,
              unit: "steps",
              quality: "good",
              metadata: dataItem,
            });
          }
        }
        break;
    }
  }

  return normalized;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const TERRA_WEBHOOK_SECRET = Deno.env.get("TERRA_WEBHOOK_SECRET");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabaseClient = createClient(
      SUPABASE_URL,
      SUPABASE_SERVICE_ROLE_KEY
    );

    const terraSignature = req.headers.get("terra-signature");
    const payloadText = await req.text();
    const payload: TerraWebhookPayload = JSON.parse(payloadText);

    const webhookId =
      `terra_${payload.type}_${payload.user?.user_id}_${Date.now()}`;

    let signatureValid = false;
    if (TERRA_WEBHOOK_SECRET && terraSignature) {
      signatureValid = await verifyTerraSignature(
        payloadText,
        terraSignature,
        TERRA_WEBHOOK_SECRET
      );
    } else {
      console.warn("Webhook signature verification skipped");
      signatureValid = true;
    }

    const { error: eventError } = await supabaseClient
      .from("terra_webhook_events")
      .insert({
        webhook_id: webhookId,
        event_type: payload.type,
        provider: payload.user?.provider,
        terra_user_id: payload.user?.user_id,
        payload: payload as unknown as Record<string, unknown>,
        headers: {
          "terra-signature": terraSignature,
        } as unknown as Record<string, unknown>,
        signature_valid: signatureValid,
        processed: false,
      });

    if (eventError) {
      console.error("Error logging webhook event:", eventError);
    }

    if (!signatureValid) {
      return new Response(
        JSON.stringify({ error: "Invalid signature" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const result = await processWebhookData(supabaseClient, payload, webhookId);

    await supabaseClient
      .from("terra_webhook_events")
      .update({
        processed: result.success,
        error_message: result.error || null,
      })
      .eq("webhook_id", webhookId);

    return new Response(
      JSON.stringify({
        success: true,
        webhook_id: webhookId,
        ...result,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error in terra-webhook:", error);

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
