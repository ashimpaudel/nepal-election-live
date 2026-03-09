import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

/**
 * Get the Supabase client. Returns null if not configured.
 */
export function getSupabase(): SupabaseClient | null {
  if (!supabaseUrl) return null;
  return createClient(supabaseUrl, supabaseAnonKey);
}

/**
 * Supabase client singleton for client-side usage.
 * Throws if NEXT_PUBLIC_SUPABASE_URL is not configured.
 */
let _client: SupabaseClient | null = null;
export function getSupabaseClient(): SupabaseClient {
  if (!_client) {
    if (!supabaseUrl) {
      throw new Error("NEXT_PUBLIC_SUPABASE_URL not configured");
    }
    _client = createClient(supabaseUrl, supabaseAnonKey);
  }
  return _client;
}

// Default export for convenience — lazily initialized
export const supabase = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    return Reflect.get(getSupabaseClient(), prop);
  },
});
