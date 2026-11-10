const LOCAL_ORIGIN = /^https?:\/\/(localhost|127\.0\.0\.1|0\.0\.0\.0|\[::1\])(?::\d+)?$/i;

/** Public site. Share links never fall back to a developer machine. */
export const PUBLIC_SITE_ORIGIN = 'https://loveitapp.com';

export function publicSiteOrigin(configured?: string | null): string {
  const raw = (configured ?? '').trim().replace(/\/+$/, '');
  if (!raw || LOCAL_ORIGIN.test(raw)) return PUBLIC_SITE_ORIGIN;
  return raw;
}

export function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export function profileUrl(handle: string, configured?: string | null): string {
  const clean = handle.trim().replace(/^@+/, '');
  return `${publicSiteOrigin(configured)}/${clean}`;
}

/** Prefer the Supabase place id. Otherwise the Apple place id the web can look up. */
export function placeShareId(place: { id: string; applePlaceId?: string | null }): string {
  if (isUuid(place.id)) return place.id;
  if (place.applePlaceId) return place.applePlaceId;
  return place.id;
}

export function placeUrl(
  place: { id: string; applePlaceId?: string | null },
  configured?: string | null,
): string {
  return `${publicSiteOrigin(configured)}/places/${encodeURIComponent(placeShareId(place))}`;
}
