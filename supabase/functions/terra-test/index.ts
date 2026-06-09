import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const MOCK_PAYLOADS = {
  activity: {
    type: "activity",
    user: {
      user_id: "mock_user_123",
      provider: "FITBIT"
    },
    data: [{
      metadata: {
        start_time: new Date().toISOString(),
        end_time: new Date(Date.now() + 3600000).toISOString()
      },
      active_durations_data: {
        activity_seconds: 2400
      },
      distance_data: {
        distance_meters: 5000,
        steps: 7500
      }
    }]
  },
  sleep: {
    type: "sleep",
    user: {
      user_id: "mock_user_123",
      provider: "OURA"
    },
    data: [{
      metadata: {
        start_time: new Date(Date.now() - 28800000).toISOString(),
        end_time: new Date().toISOString()
      },
      sleep_durations_data: {
        asleep_duration_seconds: 25200,
        awake_duration_seconds: 1200,
        light_sleep_duration_seconds: 14400,
        deep_sleep_duration_seconds: 7200,
        rem_sleep_duration_seconds: 3600
      }
    }]
  },
  heart_rate: {
    type: "body",
    user: {
      user_id: "mock_user_123",
      provider: "POLAR"
    },
    data: [{
      metadata: {
        start_time: new Date().toISOString()
      },
      heart_rate_data: {
        avg_hr_bpm: 72,
        resting_hr_bpm: 58,
        max_hr_bpm: 165,
        min_hr_bpm: 52
      }
    }]
  },
  glucose: {
    type: "body",
    user: {
      user_id: "mock_user_123",
      provider: "DEXCOM"
    },
    data: [{
      metadata: {
        start_time: new Date().toISOString()
      },
      glucose_data: {
        samples: Array.from({ length: 12 }, (_, i) => ({
          timestamp: new Date(Date.now() - i * 300000).toISOString(),
          glucose_mg_per_dL: 95 + Math.floor(Math.random() * 20),
          blood_glucose_sample_type: "continuous_monitoring"
        }))
      }
    }]
  },
  daily: {
    type: "daily",
    user: {
      user_id: "mock_user_123",
      provider: "FITBIT"
    },
    data: [{
      metadata: {
        start_time: new Date(new Date().setHours(0, 0, 0, 0)).toISOString(),
        end_time: new Date(new Date().setHours(23, 59, 59, 999)).toISOString()
      },
      heart_rate_data: {
        avg_hr_bpm: 68,
        resting_hr_bpm: 56
      },
      distance_data: {
        steps: 8432,
        distance_meters: 6500
      }
    }]
  }
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabaseClient = createClient(
      SUPABASE_URL,
      SUPABASE_SERVICE_ROLE_KEY
    );

    const { type, user_id } = await req.json();

    if (!type || !MOCK_PAYLOADS[type as keyof typeof MOCK_PAYLOADS]) {
      return new Response(
        JSON.stringify({
          error: "Invalid type",
          available: Object.keys(MOCK_PAYLOADS)
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const mockPayload = MOCK_PAYLOADS[type as keyof typeof MOCK_PAYLOADS];

    if (user_id) {
      const { data: terraUser } = await supabaseClient
        .from("terra_users")
        .select("terra_user_id")
        .eq("user_id", user_id)
        .maybeSingle();

      if (terraUser) {
        mockPayload.user.user_id = terraUser.terra_user_id;
      }
    }

    const webhookId = `test_${type}_${Date.now()}`;

    const response = await fetch(`${SUPABASE_URL}/functions/v1/terra-webhook`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      },
      body: JSON.stringify(mockPayload),
    });

    const result = await response.json();

    return new Response(
      JSON.stringify({
        success: true,
        test_type: type,
        mock_payload: mockPayload,
        webhook_response: result,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error in terra-test:", error);

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
