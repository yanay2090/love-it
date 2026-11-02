import { supabasePublishableKey } from '@love-it/shared';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { secureAuthStorage } from './secureStore';

let client: SupabaseClient | null | undefined;

/** Null when the URL or publishable key is missing. Secret keys are refused. */
export function getSupabase(): SupabaseClient | null {
  if (client !== undefined) return client;
  const url = process.env.EXPO_PUBLIC_SUPABASE_URL?.trim();
  const key = supabasePublishableKey(process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY);
  if (!url || !key) {
    client = null;
    return client;
  }
  client = createClient(url, key, {
    auth: {
      storage: secureAuthStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  });
  return client;
}
