import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface OAuthInitRequest {
  provider_key: string;
  redirect_uri?: string;
  state?: string;
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
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const { provider_key, redirect_uri, state }: OAuthInitRequest =
      await req.json();

    // Get provider configuration
    const { data: provider, error: providerError } = await supabaseClient
      .from("health_providers_registry")
      .select("*")
      .eq("provider_key", provider_key)
      .eq("is_enabled", true)
      .single();

    if (providerError || !provider) {
      return new Response(
        JSON.stringify({ error: "Provider not found or not enabled" }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (!provider.oauth_enabled) {
      return new Response(
        JSON.stringify({ error: "OAuth not enabled for this provider" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Check feature flag access
    const { data: hasAccess } = await supabaseClient
      .rpc("user_has_provider_access", {
        p_user_id: user.id,
        p_provider_key: provider_key,
      });

    if (!hasAccess) {
      return new Response(
        JSON.stringify({
          error: "Provider not available for your account",
        }),
        {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Generate secure state parameter
    const stateData = {
      user_id: user.id,
      provider_key: provider_key,
      timestamp: Date.now(),
      nonce: crypto.randomUUID(),
      custom_state: state,
    };

    const stateToken = btoa(JSON.stringify(stateData));

    // Get OAuth client ID from environment
    const clientId = Deno.env.get(provider.oauth_client_id_env_key || "");

    if (!clientId) {
      return new Response(
        JSON.stringify({ error: "OAuth client not configured" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Build authorization URL
    const authUrl = new URL(provider.oauth_authorize_url);
    authUrl.searchParams.set("client_id", clientId);
    authUrl.searchParams.set("response_type", "code");
    authUrl.searchParams.set("state", stateToken);
    authUrl.searchParams.set(
      "redirect_uri",
      redirect_uri ||
        `${Deno.env.get("SUPABASE_URL")}/functions/v1/health-oauth-callback`
    );

    if (provider.oauth_scopes && provider.oauth_scopes.length > 0) {
      authUrl.searchParams.set("scope", provider.oauth_scopes.join(" "));
    }

    // Log audit event
    await supabaseClient.from("health_connection_audit").insert({
      user_id: user.id,
      provider_key: provider_key,
      action: "oauth_initiated",
      action_details: { provider: provider.display_name },
      success: true,
    });

    return new Response(
      JSON.stringify({
        authorization_url: authUrl.toString(),
        state: stateToken,
        provider: {
          key: provider.provider_key,
          name: provider.display_name,
        },
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("OAuth initiation error:", error);

    return new Response(
      JSON.stringify({
        error: "Failed to initiate OAuth flow",
        details: error.message,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
