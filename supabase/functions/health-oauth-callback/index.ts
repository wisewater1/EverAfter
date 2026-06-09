import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const url = new URL(req.url);
    const code = url.searchParams.get("code");
    const stateToken = url.searchParams.get("state");
    const error = url.searchParams.get("error");

    if (error) {
      return Response.redirect(
        `${Deno.env.get("APP_URL")}/health-dashboard?error=${error}`,
        302
      );
    }

    if (!code || !stateToken) {
      return Response.redirect(
        `${Deno.env.get("APP_URL")}/health-dashboard?error=invalid_callback`,
        302
      );
    }

    // Decode and validate state
    let stateData;
    try {
      stateData = JSON.parse(atob(stateToken));
    } catch {
      return Response.redirect(
        `${Deno.env.get("APP_URL")}/health-dashboard?error=invalid_state`,
        302
      );
    }

    // Check state freshness (15 minute expiry)
    if (Date.now() - stateData.timestamp > 15 * 60 * 1000) {
      return Response.redirect(
        `${Deno.env.get("APP_URL")}/health-dashboard?error=state_expired`,
        302
      );
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Get provider configuration
    const { data: provider, error: providerError } = await supabaseClient
      .from("health_providers_registry")
      .select("*")
      .eq("provider_key", stateData.provider_key)
      .single();

    if (providerError || !provider) {
      return Response.redirect(
        `${Deno.env.get("APP_URL")}/health-dashboard?error=provider_not_found`,
        302
      );
    }

    // Exchange code for tokens
    const clientId = Deno.env.get(provider.oauth_client_id_env_key || "");
    const clientSecret = Deno.env.get(
      provider.oauth_client_id_env_key?.replace("_CLIENT_ID", "_CLIENT_SECRET") ||
        ""
    );

    if (!clientId || !clientSecret) {
      throw new Error("OAuth credentials not configured");
    }

    const tokenResponse = await fetch(provider.oauth_token_url, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json",
      },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code: code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: `${Deno.env.get("SUPABASE_URL")}/functions/v1/health-oauth-callback`,
      }).toString(),
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error("Token exchange failed:", errorText);
      return Response.redirect(
        `${Deno.env.get("APP_URL")}/health-dashboard?error=token_exchange_failed`,
        302
      );
    }

    const tokens = await tokenResponse.json();

    // Store or update connection
    const { data: existingConnection } = await supabaseClient
      .from("health_connections")
      .select("id")
      .eq("user_id", stateData.user_id)
      .eq("provider", stateData.provider_key)
      .maybeSingle();

    if (existingConnection) {
      // Update existing connection
      await supabaseClient
        .from("health_connections")
        .update({
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token,
          token_expires_at: tokens.expires_in
            ? new Date(Date.now() + tokens.expires_in * 1000).toISOString()
            : null,
          status: "active",
          last_synced_at: new Date().toISOString(),
          error_count: 0,
        })
        .eq("id", existingConnection.id);
    } else {
      // Create new connection
      await supabaseClient.from("health_connections").insert({
        user_id: stateData.user_id,
        provider: stateData.provider_key,
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        token_expires_at: tokens.expires_in
          ? new Date(Date.now() + tokens.expires_in * 1000).toISOString()
          : null,
        status: "active",
        last_synced_at: new Date().toISOString(),
      });
    }

    // Log audit event
    await supabaseClient.from("health_connection_audit").insert({
      user_id: stateData.user_id,
      provider_key: stateData.provider_key,
      action: "connected",
      action_details: {
        provider: provider.display_name,
        has_refresh_token: !!tokens.refresh_token,
      },
      success: true,
    });

    // Trigger initial sync job
    await supabaseClient.from("health_sync_jobs").insert({
      user_id: stateData.user_id,
      connection_id: existingConnection?.id,
      provider_key: stateData.provider_key,
      sync_type: "initial",
      status: "pending",
      triggered_by: "oauth_callback",
    });

    return Response.redirect(
      `${Deno.env.get("APP_URL")}/health-dashboard?connected=${stateData.provider_key}`,
      302
    );
  } catch (error) {
    console.error("OAuth callback error:", error);

    return Response.redirect(
      `${Deno.env.get("APP_URL")}/health-dashboard?error=callback_failed`,
      302
    );
  }
});
