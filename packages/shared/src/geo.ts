/** Apple Maps search bias for the Tel Aviv launch. */
export const TEL_AVIV = {
  name: 'Tel Aviv',
  lat: 32.0853,
  lng: 34.7818,
} as const;

/**
 * North-east / south-west box passed to the Apple Maps Server API as
 * `searchRegion=north,east,south,west`.
 */
export const TEL_AVIV_SEARCH_REGION = {
  north: 32.15,
  east: 34.85,
  south: 32.03,
  west: 34.73,
} as const;

/** Framing box for the illustrated map (web, Android, and public pages). */
export const TEL_AVIV_MAP_BOUNDS = {
  north: 32.092,
  south: 32.048,
  west: 34.755,
  east: 34.792,
} as const;

/** A Florentin-side origin so "near you" distances read like the mockups. */
export const DEMO_ORIGIN = {
  lat: 32.0605,
  lng: 34.7765,
} as const;

export const TEL_AVIV_MAP_REGION = {
  lat: 32.068,
  lng: 34.773,
  latDelta: 0.05,
  lngDelta: 0.038,
} as const;

export function distanceMeters(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const earth = 6371000;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * earth * Math.asin(Math.min(1, Math.sqrt(h)));
}

export function formatDistance(meters: number): string {
  if (!Number.isFinite(meters)) return '';
  if (meters < 950) {
    const rounded = Math.max(50, Math.round(meters / 10) * 10);
    return `${rounded} m`;
  }
  const km = meters / 1000;
  return `${km < 10 ? km.toFixed(1) : Math.round(km)} km`;
}

export function projectToPercent(
  lat: number,
  lng: number,
  bounds: { north: number; south: number; west: number; east: number } = TEL_AVIV_MAP_BOUNDS,
): { x: number; y: number } {
  const x = ((lng - bounds.west) / (bounds.east - bounds.west)) * 100;
  const y = ((bounds.north - lat) / (bounds.north - bounds.south)) * 100;
  return {
    x: clamp(x, 4, 96),
    y: clamp(y, 6, 94),
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function isInTelAvivRegion(point: { lat: number; lng: number }): boolean {
  return distanceMeters(point, TEL_AVIV) < 40_000;
}
