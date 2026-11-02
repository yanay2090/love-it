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

/**
 * PostgREST returns a geography column as hex EWKB. Accept that, WKT
 * (`POINT(lng lat)`), and GeoJSON so a place is never dropped for its coordinate format.
 */
export function parseGeography(location: unknown): { lat: number; lng: number } | null {
  if (location == null) return null;
  if (typeof location === 'object') {
    const obj = location as {
      coordinates?: unknown;
      lat?: unknown;
      lng?: unknown;
    };
    if (Array.isArray(obj.coordinates) && obj.coordinates.length >= 2) {
      const lng = Number(obj.coordinates[0]);
      const lat = Number(obj.coordinates[1]);
      if (Number.isFinite(lat) && Number.isFinite(lng)) return { lat, lng };
    }
    if (obj.lat != null && obj.lng != null) {
      const lat = Number(obj.lat);
      const lng = Number(obj.lng);
      if (Number.isFinite(lat) && Number.isFinite(lng)) return { lat, lng };
    }
    return null;
  }
  if (typeof location !== 'string') return null;
  const text = location.trim();
  const wkt = text.match(/POINT\s*\(\s*([-\d.]+)\s+([-\d.]+)\s*\)/i);
  if (wkt) {
    const lng = Number(wkt[1]);
    const lat = Number(wkt[2]);
    if (Number.isFinite(lat) && Number.isFinite(lng)) return { lat, lng };
  }
  const hex = text.replace(/^\\x/i, '').replace(/^0x/i, '');
  if (/^[0-9a-fA-F]+$/.test(hex) && hex.length >= 42 && hex.length % 2 === 0) {
    return parseEwkbPoint(hex);
  }
  return null;
}

function parseEwkbPoint(hex: string): { lat: number; lng: number } | null {
  const bytes = new Uint8Array(hex.length / 2);
  for (let index = 0; index < bytes.length; index += 1) {
    bytes[index] = Number.parseInt(hex.slice(index * 2, index * 2 + 2), 16);
  }
  if (bytes.length < 21 || (bytes[0] !== 0 && bytes[0] !== 1)) return null;
  const little = bytes[0] === 1;
  const view = new DataView(bytes.buffer);
  const type = view.getUint32(1, little);
  const base = type & 0xff;
  if (base !== 1) return null;
  let offset = 5;
  if ((type & 0x20000000) !== 0) offset += 4;
  if (bytes.length < offset + 16) return null;
  const lng = view.getFloat64(offset, little);
  const lat = view.getFloat64(offset + 8, little);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return { lat, lng };
}
