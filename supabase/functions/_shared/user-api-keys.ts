import { SupabaseClient } from 'jsr:@supabase/supabase-js@2';

export type ByokProvider = 'openai' | 'groq';

/**
 * Resolves which API key an LLM call should use: the signed-in user's own
 * key if they've saved one, otherwise the shared server secret. Returns null
 * only when neither exists, so callers can return a clear config-missing
 * error instead of silently degrading.
 *
 * `supabase` can be a client with the caller's own JWT forwarded (RLS then
 * scopes the lookup automatically) or a service-role client - either way,
 * the explicit `.eq('user_id', userId)` filter below is what actually
 * guarantees this never reads another user's key, so pass whichever client
 * the caller already has on hand.
 */
export async function resolveApiKey(
  supabase: SupabaseClient,
  userId: string,
  provider: ByokProvider,
  sharedEnvVar: string,
): Promise<{ apiKey: string | null; source: 'user' | 'shared' | 'none' }> {
  const { data, error } = await supabase
    .from('user_provider_credentials')
    .select('api_key')
    .eq('user_id', userId)
    .eq('provider', provider)
    .maybeSingle();

  if (!error && data?.api_key) {
    return { apiKey: data.api_key, source: 'user' };
  }

  const sharedKey = Deno.env.get(sharedEnvVar);
  if (sharedKey) {
    return { apiKey: sharedKey, source: 'shared' };
  }

  return { apiKey: null, source: 'none' };
}
