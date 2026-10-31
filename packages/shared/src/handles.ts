/** Public handles are 3–30 characters: a–z, 0–9, dot, underscore. Stored lowercase. */
export const HANDLE_PATTERN = /^[a-z0-9._]{3,30}$/;

/**
 * Names that must not be claimed as a profile.
 * Keep this list in sync with supabase/migrations/0002_handle_rules.sql.
 * Static Next.js routes (for example `app/places`) win over `/[handle]`;
 * these names are also rejected so they cannot become a profile if no page exists yet.
 */
export const RESERVED_HANDLES = [
  'login',
  'signup',
  'signin',
  'logout',
  'privacy',
  'terms',
  'about',
  'help',
  'support',
  'settings',
  'api',
  'admin',
  'app',
  'explore',
  'search',
  'place',
  'places',
  'u',
  'www',
  'static',
  'assets',
  '_next',
  'favicon.ico',
  'robots.txt',
  'sitemap.xml',
  'blog',
  'press',
  'download',
  'invite',
] as const;

export type ReservedHandle = (typeof RESERVED_HANDLES)[number];

const RESERVED = new Set<string>(RESERVED_HANDLES);

export type HandleValidation = { ok: true; handle: string } | { ok: false; message: string };

/** Strip a leading @ and lowercase. Does not check the format. */
export function normalizeHandle(raw: string): string {
  return raw.trim().replace(/^@+/, '').toLowerCase();
}

export function isReservedHandle(raw: string): boolean {
  return RESERVED.has(normalizeHandle(raw));
}

/**
 * Shared handle check for signup and profile edits.
 * Mobile signup calls this before a handle is written.
 */
export function validateHandle(raw: string): HandleValidation {
  const handle = normalizeHandle(raw);
  if (!HANDLE_PATTERN.test(handle)) {
    return {
      ok: false,
      message: 'Handles are 3–30 characters: letters, numbers, dots, or underscores.',
    };
  }
  if (RESERVED.has(handle)) {
    return { ok: false, message: 'That handle is reserved.' };
  }
  return { ok: true, handle };
}
