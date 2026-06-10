import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface WidgetRequest {
  reference_id: string;
  providers?: string[];
  auth_success_redirect_url?: string;
  auth_failure_redirect_url?: string;
  language?: string;
}

interface TerraWidgetResponse {
  status: string;
  session_id: string;
  url: string;
  expires_in: number;
  user_id?: string;
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
    const BASE_URL = Deno.env.get("BASE_URL") || Deno.env.get("SUPABASE_URL");

    if (!TERRA_API_KEY || !TERRA_DEV_ID) {
      return new Response(
        JSON.stringify({
          error: "Terra configuration missing",
          message: "TERRA_API_KEY and TERRA_DEV_ID must be configured",
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const body: WidgetRequest = await req.json();

    const widgetPayload = {
      reference_id: body.reference_id,
      providers: body.providers || [
        "FITBIT",
        "OURA",
        "GARMIN",
        "DEXCOM",
        "FREESTYLELIBRE",
        "WITHINGS",
        "POLAR",
      ],
      auth_success_redirect_url:
        body.auth_success_redirect_url || `${BASE_URL}/terra/return?status=success`,
      auth_failure_redirect_url:
        body.auth_failure_redirect_url || `${BASE_URL}/terra/return?status=failure`,
      language: body.language || "en",
    };

    const response = await fetch(
      "https://api.tryterra.co/v2/auth/generateWidgetSession",
      {
        method: "POST",
        headers: {
          "x-api-key": TERRA_API_KEY,
          "dev-id": TERRA_DEV_ID,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(widgetPayload),
      }
    );

    if (!response.ok) {
      const errorData = await response.text();
      console.error("Terra API error:", response.status, errorData);

      return new Response(
        JSON.stringify({
          error: "Terra API error",
          status: response.status,
          message: errorData,
        }),
        {
          status: response.status,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const data: TerraWidgetResponse = await response.json();

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in terra-widget:", error);

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
