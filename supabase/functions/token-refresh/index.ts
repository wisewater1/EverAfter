import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { SupabaseClient } from 'jsr:@supabase/supabase-js@2';
import {
  getCorsHeaders,
  supabaseFromRequest,
  serviceSupabase,
  getProviderConfig,
  ProviderConfig,
  errorResponse,
  jsonResponse,
} from '../_shared/connectors.ts';

const corsHeaders = getCorsHeaders();

interface TokenRefreshRequest {
  provider_account_id?: string;
  provider?: string;
}

interface TokenRefreshResult {
  success: boolean;
  provider: string;
  new_expires_at?: string;
  error?: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return errorResponse('Method not allowed', 405);
  }

  try {
    const supabase = supabaseFromRequest(req);
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return errorResponse('Unauthorized', 401);
    }

    const { provider_account_id, provider }: TokenRefreshRequest = await req.json();
    const serviceClient = serviceSupabase();

    let accountsToRefresh: Record<string, unknown>[] = [];

    // Get accounts that need refreshing
    if (provider_account_id) {
      const { data, error } = await serviceClient
        .from('provider_accounts')
        .select('*')
        .eq('id', provider_account_id)
        .eq('user_id', user.id)
        .maybeSingle();

      if (error || !data) {
        return errorResponse('Provider account not found', 404);
      }
      accountsToRefresh = [data];
    } else if (provider) {
      const { data, error } = await serviceClient
        .from('provider_accounts')
        .select('*')
        .eq('provider', provider.toLowerCase())
        .eq('user_id', user.id);

      if (error || !data || data.length === 0) {
        return errorResponse('No accounts found for provider', 404);
      }
      accountsToRefresh = data;
    } else {
      // Refresh all accounts that need it
      const { data, error } = await serviceClient
        .from('provider_accounts')
        .select('*')
        .eq('user_id', user.id)
        .not('refresh_token', 'is', null)
        .or('expires_at.is.null,expires_at.lte.' + new Date(Date.now() + 10 * 60 * 1000).toISOString());

      if (error) {
        return errorResponse('Failed to fetch accounts', 500);
      }
      accountsToRefresh = data || [];
    }

    const results: TokenRefreshResult[] = [];

    for (const account of accountsToRefresh) {
      const result = await refreshProviderToken(serviceClient, account);
      results.push(result);
    }

    const successCount = results.filter(r => r.success).length;
    const failureCount = results.filter(r => !r.success).length;

    return jsonResponse({
      status: 'completed',
      total_accounts: results.length,
      successful_refreshes: successCount,
      failed_refreshes: failureCount,
      results: results,
    });

  } catch (err) {
    console.error('token-refresh error:', err);
    return errorResponse(err instanceof Error ? err.message : 'Internal server error', 500);
  }
});

async function refreshProviderToken(supabase: SupabaseClient, account: Record<string, unknown>): Promise<TokenRefreshResult> {
  const provider = (account.provider as string).toLowerCase();

  try {
    if (!account.refresh_token) {
      return {
        success: false,
        provider: account.provider as string,
        error: 'No refresh token available',
      };
    }

    const config = getProviderConfig(provider);
    if (!config) {
      return {
        success: false,
        provider: account.provider as string,
        error: 'Provider not supported',
      };
    }

    // Attempt token refresh
    const tokenData = await exchangeRefreshToken(provider, account.refresh_token as string, config);

    if (!tokenData) {
      await logTokenRefresh(supabase, account, 'failed', 'Token exchange failed');
      return {
        success: false,
        provider: account.provider as string,
        error: 'Token exchange failed',
      };
    }

    const tokenRecord = tokenData as Record<string, unknown>;
    const expiresAt = tokenRecord.expires_in
      ? new Date(Date.now() + (tokenRecord.expires_in as number) * 1000).toISOString()
      : null;

    // Update account with new tokens
    const { error: updateError } = await supabase
      .from('provider_accounts')
      .update({
        access_token: tokenRecord.access_token,
        refresh_token: tokenRecord.refresh_token || account.refresh_token,
        expires_at: expiresAt,
        token_refreshed_at: new Date().toISOString(),
        status: 'active',
        sync_error_count: 0,
      })
      .eq('id', account.id);

    if (updateError) {
      console.error('Failed to update account:', updateError);
      await logTokenRefresh(supabase, account, 'failed', updateError.message);
      return {
        success: false,
        provider: account.provider as string,
        error: updateError.message,
      };
    }

    await logTokenRefresh(supabase, account, 'success', null, expiresAt);

    return {
      success: true,
      provider: account.provider as string,
      new_expires_at: expiresAt || undefined,
    };

  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    console.error(`Token refresh failed for ${provider}:`, err);
    await logTokenRefresh(supabase, account, 'failed', errMsg);

    // Mark account as error if refresh fails
    await supabase
      .from('provider_accounts')
      .update({
        status: 'token_expired',
        last_error_at: new Date().toISOString(),
        last_error_message: errMsg,
      })
      .eq('id', account.id);

    return {
      success: false,
      provider: account.provider as string,
      error: errMsg,
    };
  }
}

async function exchangeRefreshToken(
  provider: string,
  refreshToken: string,
  config: ProviderConfig
): Promise<Record<string, unknown> | null> {
  try {
    const body = new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: config.clientId,
      client_secret: config.clientSecret,
    });

    const response = await fetch(config.tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: body.toString(),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Token refresh failed for ${provider}:`, errorText);
      return null;
    }

    const data = await response.json();
    return data;
  } catch (err) {
    console.error(`Token refresh exception for ${provider}:`, err);
    return null;
  }
}

async function logTokenRefresh(
  supabase: SupabaseClient,
  account: Record<string, unknown>,
  status: 'success' | 'failed' | 'expired',
  errorMessage: string | null,
  newExpiresAt?: string | null
): Promise<void> {
  try {
    await supabase.from('token_refresh_log').insert({
      provider_account_id: account.id,
      user_id: account.user_id,
      provider: account.provider,
      refresh_status: status,
      old_expires_at: account.expires_at,
      new_expires_at: newExpiresAt,
      error_message: errorMessage,
    });
  } catch (err) {
    console.error('Failed to log token refresh:', err);
  }
}
