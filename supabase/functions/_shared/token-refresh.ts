import { SupabaseClient } from 'jsr:@supabase/supabase-js@2';
import { getProviderConfig } from './connectors.ts';

export interface TokenData {
  access_token: string;
  refresh_token: string;
  expires_at: string;
}

export async function getValidToken(
  supabase: SupabaseClient,
  userId: string,
  provider: string
): Promise<string | null> {
  try {
    const { data: account, error } = await supabase
      .from('provider_accounts')
      .select('*')
      .eq('user_id', userId)
      .eq('provider', provider)
      .single();

    if (error || !account) {
      console.error('No provider account found:', error);
      return null;
    }

    if (!account.access_token_encrypted) {
      console.error('No access token found');
      return null;
    }

    const now = new Date();
    const expiresAt = account.token_expires_at ? new Date(account.token_expires_at) : null;

    const fiveMinutes = 5 * 60 * 1000;
    const needsRefresh = !expiresAt || (expiresAt.getTime() - now.getTime()) < fiveMinutes;

    if (needsRefresh && account.refresh_token_encrypted) {
      const newToken = await refreshToken(supabase, provider, account.id, account.refresh_token_encrypted);
      if (newToken) {
        return newToken;
      }
    }

    return account.access_token_encrypted;
  } catch (err: any) {
    console.error('getValidToken error:', err);
    return null;
  }
}

async function refreshToken(
  supabase: SupabaseClient,
  provider: string,
  accountId: string,
  refreshToken: string
): Promise<string | null> {
  try {
    const config = getProviderConfig(provider);
    if (!config) {
      console.error(`No config found for provider: ${provider}`);
      return null;
    }

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

      await supabase
        .from('provider_accounts')
        .update({ status: 'error' })
        .eq('id', accountId);

      return null;
    }

    const data = await response.json();

    const expiresAt = new Date();
    expiresAt.setSeconds(expiresAt.getSeconds() + (data.expires_in || 3600));

    const { error: updateError } = await supabase
      .from('provider_accounts')
      .update({
        access_token_encrypted: data.access_token,
        refresh_token_encrypted: data.refresh_token || refreshToken,
        token_expires_at: expiresAt.toISOString(),
        updated_at: new Date().toISOString(),
        status: 'active',
      })
      .eq('id', accountId);

    if (updateError) {
      console.error('Failed to update tokens:', updateError);
      return null;
    }

    console.log(`✓ Token refreshed successfully for ${provider}`);
    return data.access_token;
  } catch (err: any) {
    console.error(`Token refresh error for ${provider}:`, err);
    return null;
  }
}

export async function storeTokens(
  supabase: SupabaseClient,
  userId: string,
  provider: string,
  accessToken: string,
  refreshToken: string | undefined,
  externalUserId: string,
  expiresIn: number = 3600
): Promise<{ success: boolean; error?: string }> {
  try {
    const expiresAt = new Date();
    expiresAt.setSeconds(expiresAt.getSeconds() + expiresIn);

    const { error } = await supabase
      .from('provider_accounts')
      .upsert({
        user_id: userId,
        provider,
        access_token_encrypted: accessToken,
        refresh_token_encrypted: refreshToken || null,
        token_expires_at: expiresAt.toISOString(),
        external_user_id: externalUserId,
        status: 'active',
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id,provider',
      });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}
