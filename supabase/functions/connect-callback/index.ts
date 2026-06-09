import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { getCorsHeaders, exchangeCodeForTokens, serviceSupabase, errorResponse } from '../_shared/connectors.ts';

const corsHeaders = getCorsHeaders();

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state');
    const provider = url.searchParams.get('provider');
    const error = url.searchParams.get('error');

    if (error) {
      return new Response(`
        <!DOCTYPE html>
        <html>
          <head><title>Connection Failed</title></head>
          <body style="font-family: sans-serif; padding: 40px; text-align: center;">
            <h1>❌ Connection Failed</h1>
            <p>Unable to connect to ${provider || 'provider'}: ${error}</p>
            <p><a href="/">Return to Dashboard</a></p>
          </body>
        </html>
      `, {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'text/html' },
      });
    }

    if (!code || !state || !provider) {
      return errorResponse('Missing required parameters');
    }

    let stateData: any;
    try {
      stateData = JSON.parse(atob(state));
    } catch {
      return errorResponse('Invalid state parameter');
    }

    const userId = stateData.user_id;
    if (!userId) {
      return errorResponse('Invalid state: missing user_id');
    }

    const tokens = await exchangeCodeForTokens(provider, code);
    if (!tokens) {
      return errorResponse('Token exchange failed');
    }

    const supabase = serviceSupabase();

    const { error: upsertError } = await supabase
      .from('provider_accounts')
      .upsert({
        user_id: userId,
        provider: provider.toLowerCase(),
        external_user_id: tokens.external_user_id || 'unknown',
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token || null,
        scopes: [],
        status: 'active',
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id,provider',
      });

    if (upsertError) {
      console.error('Database upsert error:', upsertError);
      return errorResponse('Failed to save connection');
    }

    const appBaseUrl = Deno.env.get('APP_BASE_URL') || 'http://localhost:5173';

    return new Response(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Connection Successful</title>
          <meta http-equiv="refresh" content="3;url=${appBaseUrl}/health-dashboard">
        </head>
        <body style="font-family: sans-serif; padding: 40px; text-align: center;">
          <h1>✅ Successfully Connected!</h1>
          <p>Your ${provider} account has been connected.</p>
          <p>Redirecting you back to the dashboard...</p>
          <p><a href="${appBaseUrl}/health-dashboard">Click here if not redirected</a></p>
        </body>
      </html>
    `, {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'text/html' },
    });

  } catch (err: any) {
    console.error('connect-callback error:', err);
    return errorResponse(err.message || 'Internal server error', 500);
  }
});
