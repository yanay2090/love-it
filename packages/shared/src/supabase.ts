/**
 * Key the phone app and the public site are allowed to hold.
 * Format is `sb_publishable_...`.
 * `sb_secret_` keys must never ship in client code; this returns null if one is passed.
 */
export function supabasePublishableKey(value: string | null | undefined): string | null {
  const key = value?.trim() ?? '';
  if (!key || key.startsWith('sb_secret_')) return null;
  return key;
}
