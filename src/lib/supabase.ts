import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Missing Supabase environment variables. Auth-backed routes will remain unavailable until configuration is complete.');
}

// When configuration is missing this is null at runtime, and callers guard for
// that. It is declared as SupabaseClient rather than as any so that query
// results keep their types: `null as any` widened the whole client to any,
// which silently turned every .from().select() in the app into an untyped call.
export const supabase: SupabaseClient = (supabaseUrl && supabaseAnonKey)
  ? createClient(supabaseUrl, supabaseAnonKey)
  : (null as unknown as SupabaseClient);
