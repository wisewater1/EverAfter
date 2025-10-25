import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { getCorsHeaders, supabaseFromRequest, serviceSupabase, errorResponse, jsonResponse } from '../_shared/connectors.ts';

const corsHeaders = getCorsHeaders();

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const action = url.searchParams.get('action') || 'init';

    if (action === 'init') {
      const supabase = supabaseFromRequest(req);
      const { data: { user }, error: authError } = await supabase.auth.getUser();

      if (authError || !user) {
        return errorResponse('Unauthorized', 401);
      }

      const clientId = Deno.env.get('DEXCOM_CLIENT_ID');
      const redirectUrl = Deno.env.get('DEXCOM_REDIRECT_URL') || `${Deno.env.get('APP_BASE_URL')}/api/cgm-callback`;

      if (!clientId) {
        return errorResponse('Dexcom not configured', 500);
      }

      const state = btoa(JSON.stringify({
        user_id: user.id,
        connector: 'dexcom',
        timestamp: Date.now(),
      }));

      const isSandbox = Deno.env.get('DEXCOM_ENVIRONMENT') === 'sandbox';
      const authUrl = isSandbox
        ? 'https://sandbox-api.dexcom.com/v2/oauth2/login'
        : 'https://api.dexcom.com/v2/oauth2/login';

      const params = new URLSearchParams({
        client_id: clientId,
        redirect_uri: redirectUrl,
        response_type: 'code',
        scope: 'offline_access',
        state,
      });

      return new Response(null, {
        status: 302,
        headers: {
          ...corsHeaders,
          'Location': `${authUrl}?${params.toString()}`,
        },
      });
    }

    if (action === 'callback') {
      const code = url.searchParams.get('code');
      const state = url.searchParams.get('state');
      const error = url.searchParams.get('error');

      if (error) {
        return new Response(`
          <!DOCTYPE html>
          <html>
            <head><title>Dexcom Connection Failed</title></head>
            <body style="font-family: sans-serif; padding: 40px; text-align: center;">
              <h1>❌ Connection Failed</h1>
              <p>Unable to connect to Dexcom: ${error}</p>
              <p><a href="/health-dashboard">Return to Dashboard</a></p>
            </body>
          </html>
        `, {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'text/html' },
        });
      }

      if (!code || !state) {
        return errorResponse('Missing code or state');
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

      const clientId = Deno.env.get('DEXCOM_CLIENT_ID');
      const clientSecret = Deno.env.get('DEXCOM_CLIENT_SECRET');
      const redirectUrl = Deno.env.get('DEXCOM_REDIRECT_URL') || `${Deno.env.get('APP_BASE_URL')}/api/cgm-callback`;
      const isSandbox = Deno.env.get('DEXCOM_ENVIRONMENT') === 'sandbox';

      if (!clientId || !clientSecret) {
        return errorResponse('Dexcom credentials not configured', 500);
      }

      const tokenUrl = isSandbox
        ? 'https://sandbox-api.dexcom.com/v2/oauth2/token'
        : 'https://api.dexcom.com/v2/oauth2/token';

      const tokenParams = new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUrl,
      });

      const authHeader = btoa(`${clientId}:${clientSecret}`);

      const tokenResponse = await fetch(tokenUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': `Basic ${authHeader}`,
        },
        body: tokenParams.toString(),
      });

      if (!tokenResponse.ok) {
        const errorText = await tokenResponse.text();
        console.error('Dexcom token exchange failed:', errorText);
        return errorResponse('Token exchange failed');
      }

      const tokenData = await tokenResponse.json();

      const supabase = serviceSupabase();

      await supabase.from('connector_consent_ledger').insert({
        user_id: userId,
        connector_id: 'dexcom',
        action: 'grant',
        scopes: ['offline_access'],
      });

      const expiresAt = new Date();
      expiresAt.setSeconds(expiresAt.getSeconds() + (tokenData.expires_in || 7200));

      const { error: upsertError } = await supabase
        .from('connector_tokens')
        .upsert({
          user_id: userId,
          connector_id: 'dexcom',
          access_token: tokenData.access_token,
          refresh_token: tokenData.refresh_token || null,
          expires_at: expiresAt.toISOString(),
          scopes: ['offline_access'],
          meta: { environment: isSandbox ? 'sandbox' : 'production' },
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'user_id,connector_id',
        });

      if (upsertError) {
        console.error('Token storage error:', upsertError);
        return errorResponse('Failed to save connection');
      }

      const appBaseUrl = Deno.env.get('APP_BASE_URL') || 'http://localhost:5173';

      return new Response(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Dexcom Connected</title>
            <meta http-equiv="refresh" content="3;url=${appBaseUrl}/health-dashboard">
          </head>
          <body style="font-family: sans-serif; padding: 40px; text-align: center;">
            <h1>✅ Dexcom Connected!</h1>
            <p>Your Dexcom CGM has been successfully connected.</p>
            <p>Redirecting you back to the dashboard...</p>
            <p><a href="${appBaseUrl}/health-dashboard">Click here if not redirected</a></p>
          </body>
        </html>
      `, {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'text/html' },
      });
    }

    return errorResponse('Invalid action parameter');

  } catch (err: any) {
    console.error('Dexcom OAuth error:', err);
    return errorResponse(err.message || 'Internal server error', 500);
  }
});
