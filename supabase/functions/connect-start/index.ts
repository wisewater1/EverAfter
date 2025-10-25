import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { getCorsHeaders, getProviderConfig, supabaseFromRequest, errorResponse } from '../_shared/connectors.ts';

const corsHeaders = getCorsHeaders();

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabase = supabaseFromRequest(req);

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return errorResponse('Unauthorized', 401);
    }

    const url = new URL(req.url);
    const provider = url.searchParams.get('provider');

    if (!provider) {
      return errorResponse('Provider parameter required');
    }

    const config = getProviderConfig(provider);
    if (!config) {
      return errorResponse(`Provider ${provider} not supported`);
    }

    if (!config.clientId) {
      return errorResponse(`Provider ${provider} not configured. Please add client credentials.`);
    }

    const state = btoa(JSON.stringify({
      user_id: user.id,
      provider,
      timestamp: Date.now(),
    }));

    let authUrl: string;

    switch (provider.toLowerCase()) {
      case 'terra': {
        const terraParams = new URLSearchParams({
          resource: 'FITBIT',
          auth_success_redirect_url: `${config.redirectUri}?provider=terra&state=${state}`,
          auth_failure_redirect_url: `${config.redirectUri}?provider=terra&state=${state}&error=access_denied`,
          reference_id: user.id,
        });
        authUrl = `${config.authUrl}?${terraParams.toString()}`;
        break;
      }

      case 'fitbit': {
        const fitbitParams = new URLSearchParams({
          response_type: 'code',
          client_id: config.clientId,
          redirect_uri: config.redirectUri,
          scope: config.scopes.join(' '),
          state: state,
        });
        authUrl = `${config.authUrl}?${fitbitParams.toString()}`;
        break;
      }

      case 'oura': {
        const ouraParams = new URLSearchParams({
          response_type: 'code',
          client_id: config.clientId,
          redirect_uri: config.redirectUri,
          scope: config.scopes.join(' '),
          state: state,
        });
        authUrl = `${config.authUrl}?${ouraParams.toString()}`;
        break;
      }

      case 'dexcom': {
        const dexcomParams = new URLSearchParams({
          response_type: 'code',
          client_id: config.clientId,
          redirect_uri: config.redirectUri,
          scope: config.scopes.join(' '),
          state: state,
        });
        authUrl = `${config.authUrl}?${dexcomParams.toString()}`;
        break;
      }

      default:
        return errorResponse(`Provider ${provider} OAuth flow not implemented`);
    }

    return new Response(null, {
      status: 302,
      headers: {
        ...corsHeaders,
        'Location': authUrl,
      },
    });

  } catch (err: any) {
    console.error('connect-start error:', err);
    return errorResponse(err.message || 'Internal server error', 500);
  }
});
