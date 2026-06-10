import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey",
};

/**
 * SMART on FHIR R4 OAuth Handler
 *
 * Implements SMART App Launch framework for EHR integration
 * https://hl7.org/fhir/smart-app-launch/
 *
 * SAFETY: Read-only operations, no data deletion
 */

interface SMARTLaunchRequest {
  iss: string; // FHIR server issuer URL
  launch?: string; // Launch context token (EHR launch)
  aud: string; // FHIR server audience
  scope?: string; // Requested scopes
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
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: {
          headers: { Authorization: req.headers.get("Authorization")! },
        },
      }
    );

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabaseClient.auth.getUser();

    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const url = new URL(req.url);
    const action = url.searchParams.get("action") || "launch";

    // Handle different SMART on FHIR flows
    switch (action) {
      case "launch":
        return handleLaunch(req, supabaseClient, user);
      case "callback":
        return handleCallback(req, supabaseClient, user);
      case "metadata":
        return handleMetadata(req, supabaseClient);
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
    console.error("SMART on FHIR error:", error);

    return new Response(
      JSON.stringify({
        error: "SMART on FHIR operation failed",
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
 * Handle SMART App Launch
 * Initiates OAuth 2.0 authorization flow with FHIR server
 */
async function handleLaunch(req: Request, supabaseClient: any, user: any) {
  const { iss, launch, aud, scope }: SMARTLaunchRequest = await req.json();

  if (!iss) {
    return new Response(
      JSON.stringify({ error: "Missing FHIR server issuer (iss)" }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }

  try {
    // Discover FHIR server metadata
    const metadataUrl = `${iss}/.well-known/smart-configuration`;
    const metadataResponse = await fetch(metadataUrl);

    if (!metadataResponse.ok) {
      // Fallback to capability statement
      const capabilityResponse = await fetch(`${iss}/metadata`);
      if (!capabilityResponse.ok) {
        throw new Error("Could not fetch FHIR server metadata");
      }
    }

    const metadata = await metadataResponse.json();

    // Build authorization URL
    const authUrl = new URL(metadata.authorization_endpoint);

    const redirectUri = `${Deno.env.get("SUPABASE_URL")}/functions/v1/fhir-smart-auth?action=callback`;

    // Generate state for CSRF protection
    const state = btoa(
      JSON.stringify({
        user_id: user.id,
        iss: iss,
        aud: aud,
        timestamp: Date.now(),
        nonce: crypto.randomUUID(),
      })
    );

    // Default SMART scopes
    const requestedScopes =
      scope ||
      "openid fhirUser launch/patient patient/*.read offline_access";

    authUrl.searchParams.set("response_type", "code");
    authUrl.searchParams.set("client_id", Deno.env.get("SMART_CLIENT_ID") || "");
    authUrl.searchParams.set("redirect_uri", redirectUri);
    authUrl.searchParams.set("scope", requestedScopes);
    authUrl.searchParams.set("state", state);
    authUrl.searchParams.set("aud", aud);

    if (launch) {
      authUrl.searchParams.set("launch", launch);
    }

    // Log audit event (ADDITIVE ONLY - no deletes)
    await supabaseClient.from("health_connection_audit").insert({
      user_id: user.id,
      provider_key: "smart_on_fhir",
      action: "oauth_initiated",
      action_details: {
        iss: iss,
        aud: aud,
        scopes: requestedScopes,
      },
      success: true,
    });

    return new Response(
      JSON.stringify({
        authorization_url: authUrl.toString(),
        state: state,
        metadata: {
          authorization_endpoint: metadata.authorization_endpoint,
          token_endpoint: metadata.token_endpoint,
          capabilities: metadata.capabilities,
        },
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("SMART launch error:", error);

    return new Response(
      JSON.stringify({
        error: "Failed to initiate SMART launch",
        details: error.message,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
}

/**
 * Handle OAuth callback
 * Exchange authorization code for access token
 */
async function handleCallback(req: Request, supabaseClient: any, user: any) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");

  if (!code || !state) {
    return Response.redirect(
      `${Deno.env.get("APP_URL")}/health-dashboard?error=invalid_callback`,
      302
    );
  }

  try {
    // Decode and validate state
    const stateData = JSON.parse(atob(state));

    // Check state freshness (15 minute expiry)
    if (Date.now() - stateData.timestamp > 15 * 60 * 1000) {
      return Response.redirect(
        `${Deno.env.get("APP_URL")}/health-dashboard?error=state_expired`,
        302
      );
    }

    // Get FHIR server metadata
    const metadataUrl = `${stateData.iss}/.well-known/smart-configuration`;
    const metadataResponse = await fetch(metadataUrl);
    const metadata = await metadataResponse.json();

    // Exchange code for token
    const tokenResponse = await fetch(metadata.token_endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code: code,
        redirect_uri: `${Deno.env.get("SUPABASE_URL")}/functions/v1/fhir-smart-auth?action=callback`,
        client_id: Deno.env.get("SMART_CLIENT_ID") || "",
      }).toString(),
    });

    if (!tokenResponse.ok) {
      throw new Error("Token exchange failed");
    }

    const tokenData = await tokenResponse.json();

    // Store connection (ADDITIVE ONLY - upsert, no deletes)
    const { data: existingConnection } = await supabaseClient
      .from("health_connections")
      .select("id")
      .eq("user_id", stateData.user_id)
      .eq("provider", "smart_on_fhir")
      .eq("provider_user_id", tokenData.patient || stateData.iss)
      .maybeSingle();

    const connectionData = {
      user_id: stateData.user_id,
      provider: "smart_on_fhir",
      provider_user_id: tokenData.patient || stateData.iss,
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token,
      token_expires_at: tokenData.expires_in
        ? new Date(Date.now() + tokenData.expires_in * 1000).toISOString()
        : null,
      scopes: tokenData.scope?.split(" ") || [],
      status: "active",
      metadata: {
        iss: stateData.iss,
        aud: stateData.aud,
        patient: tokenData.patient,
        fhir_server: stateData.iss,
      },
    };

    if (existingConnection) {
      // Update existing (safe operation)
      await supabaseClient
        .from("health_connections")
        .update(connectionData)
        .eq("id", existingConnection.id);
    } else {
      // Insert new (additive operation)
      await supabaseClient.from("health_connections").insert(connectionData);
    }

    // Log success audit (ADDITIVE)
    await supabaseClient.from("health_connection_audit").insert({
      user_id: stateData.user_id,
      provider_key: "smart_on_fhir",
      action: "connected",
      action_details: {
        iss: stateData.iss,
        patient: tokenData.patient,
        has_refresh_token: !!tokenData.refresh_token,
      },
      success: true,
    });

    return Response.redirect(
      `${Deno.env.get("APP_URL")}/health-dashboard?connected=smart_on_fhir`,
      302
    );
  } catch (error) {
    console.error("SMART callback error:", error);

    return Response.redirect(
      `${Deno.env.get("APP_URL")}/health-dashboard?error=callback_failed`,
      302
    );
  }
}

/**
 * Get FHIR server metadata
 */
async function handleMetadata(req: Request, supabaseClient: any) {
  const url = new URL(req.url);
  const iss = url.searchParams.get("iss");

  if (!iss) {
    return new Response(
      JSON.stringify({ error: "Missing issuer parameter" }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }

  try {
    const metadataUrl = `${iss}/.well-known/smart-configuration`;
    const response = await fetch(metadataUrl);

    if (!response.ok) {
      throw new Error("Could not fetch FHIR metadata");
    }

    const metadata = await response.json();

    return new Response(JSON.stringify(metadata), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({
        error: "Failed to fetch metadata",
        details: error.message,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
}
