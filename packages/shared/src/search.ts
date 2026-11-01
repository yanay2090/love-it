import type { Place, PlaceCategory } from './domain';
import { TEL_AVIV, TEL_AVIV_SEARCH_REGION, distanceMeters } from './geo';
import { categoryFromApplePoi, categoryLabel } from './labels';

export type PlaceSearchSource = 'seed' | 'apple-maps-server' | 'mk-local-search';

export interface PlaceSearchHit {
  key: string;
  placeId?: string;
  applePlaceId: string | null;
  isCustomPin: boolean;
  name: string;
  category: PlaceCategory;
  subtitle: string;
  neighborhood: string;
  city: string;
  address: string;
  lat: number;
  lng: number;
  priceLevel: 1 | 2 | 3 | 4;
  distanceMeters: number;
  source: PlaceSearchSource;
}

export interface SearchResponse {
  ok: boolean;
  status: number;
  json(): Promise<unknown>;
}

export type SearchFetch = (
  url: string,
  init: { headers: Record<string, string> },
) => Promise<SearchResponse>;

/** Native MKLocalSearch hook. Return an empty list to let the next provider run. */
export type NativePlaceSearch = (
  query: string,
  bias: { lat: number; lng: number },
) => Promise<PlaceSearchHit[]>;

export interface SearchOptions {
  bias?: { lat: number; lng: number };
  limit?: number;
  /** Apple Maps Server API token. Omit it and search stays on the seed catalog. */
  token?: string;
  nativeSearch?: NativePlaceSearch;
  fetchImpl?: SearchFetch;
  signal?: AbortSignal;
}

const APPLE_SEARCH_URL = 'https://maps-api.apple.com/v1/search';

/**
 * Place search only — never people.
 * Order: MKLocalSearch (when a native module is injected), then Apple Maps
 * Server API `/v1/search` biased to Tel Aviv, then the seed catalog.
 * Seed matches are always merged in so the + Add flow works with no keys.
 */
export async function searchPlaces(
  query: string,
  places: Place[],
  options: SearchOptions = {},
): Promise<PlaceSearchHit[]> {
  const bias = options.bias ?? { lat: TEL_AVIV.lat, lng: TEL_AVIV.lng };
  const limit = options.limit ?? 8;
  const q = query.trim();
  const seedHits = q
    ? rankSeedPlaces(places, q, bias).slice(0, limit)
    : nearestPlaces(places, bias)
        .slice(0, limit)
        .map((place) => placeToHit(place, bias));

  if (!q) return seedHits;

  if (options.nativeSearch) {
    try {
      const nativeHits = (await options.nativeSearch(q, bias)).map((hit) => ({
        ...hit,
        source: 'mk-local-search' as const,
        distanceMeters: distanceMeters(bias, hit),
      }));
      if (nativeHits.length > 0) return mergeHits(nativeHits, supportingSeed(seedHits, q)).slice(0, limit);
    } catch {
      // Fall through to the server API and the catalog.
    }
  }

  if (options.token) {
    try {
      const appleHits = await searchAppleMapsServer(q, bias, options.token, options.fetchImpl, options.signal);
      if (appleHits.length > 0) return mergeHits(appleHits, supportingSeed(seedHits, q)).slice(0, limit);
    } catch {
      // A missing token, 401, or offline simulator still gets seed results.
    }
  }

  return seedHits;
}

export function placeToHit(place: Place, bias: { lat: number; lng: number }): PlaceSearchHit {
  return {
    key: place.id,
    placeId: place.id,
    applePlaceId: place.applePlaceId,
    isCustomPin: place.isCustomPin,
    name: place.name,
    category: place.category,
    subtitle: place.subtitle,
    neighborhood: place.neighborhood,
    city: place.city,
    address: place.address,
    lat: place.lat,
    lng: place.lng,
    priceLevel: place.priceLevel,
    distanceMeters: distanceMeters(bias, place),
    source: 'seed',
  };
}

export function rankSeedPlaces(places: Place[], query: string, bias: { lat: number; lng: number }): PlaceSearchHit[] {
  const q = query.trim().toLowerCase();
  return places
    .map((place) => ({ place, score: scorePlace(place, q) }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score || distanceMeters(bias, a.place) - distanceMeters(bias, b.place))
    .map((item) => placeToHit(item.place, bias));
}

function scorePlace(place: Place, query: string): number {
  const name = place.name.toLowerCase();
  if (name.startsWith(query)) return 100;
  if (name.includes(query)) return 80;
  const compact = query.replace(/\s+/g, '');
  if (compact.length >= 3 && name.replace(/\s+/g, '').includes(compact)) return 75;
  if (place.neighborhood.toLowerCase().includes(query)) return 40;
  if (place.subtitle.toLowerCase().includes(query)) return 30;
  if (place.listKind?.toLowerCase().includes(query)) return 30;
  if (categoryLabel(place.category).toLowerCase().includes(query)) return 20;
  if (place.category === 'cafe' && (query === 'coffee' || query === 'cafe')) return 25;
  return 0;
}

function nearestPlaces(places: Place[], bias: { lat: number; lng: number }): Place[] {
  return [...places].sort((a, b) => distanceMeters(bias, a) - distanceMeters(bias, b));
}

export async function searchAppleMapsServer(
  query: string,
  bias: { lat: number; lng: number },
  token: string,
  fetchImpl: SearchFetch = defaultFetch,
  signal?: AbortSignal,
): Promise<PlaceSearchHit[]> {
  const params = new URLSearchParams({
    q: query,
    lang: 'en-US',
    searchLocation: `${TEL_AVIV.lat},${TEL_AVIV.lng}`,
    userLocation: `${bias.lat},${bias.lng}`,
    searchRegion: [
      TEL_AVIV_SEARCH_REGION.north,
      TEL_AVIV_SEARCH_REGION.east,
      TEL_AVIV_SEARCH_REGION.south,
      TEL_AVIV_SEARCH_REGION.west,
    ].join(','),
    limitToCountries: 'IL',
    resultTypeFilter: 'Poi',
  });
  if (signal?.aborted) return [];
  const response = await fetchImpl(`${APPLE_SEARCH_URL}?${params.toString()}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) return [];
  const body = (await response.json()) as { results?: ApplePlace[] };
  return (body.results ?? [])
    .map((result) => appleResultToHit(result, bias))
    .filter((hit): hit is PlaceSearchHit => hit !== null);
}

interface ApplePlace {
  id?: string;
  name?: string;
  coordinate?: { latitude?: number; longitude?: number };
  formattedAddressLines?: string[];
  poiCategory?: string;
  structuredAddress?: {
    locality?: string;
    subLocality?: string;
    fullThoroughfare?: string;
    thoroughfare?: string;
  };
}

function appleResultToHit(result: ApplePlace, bias: { lat: number; lng: number }): PlaceSearchHit | null {
  const lat = result.coordinate?.latitude;
  const lng = result.coordinate?.longitude;
  if (!result.name || lat === undefined || lng === undefined) return null;
  const category = categoryFromApplePoi(result.poiCategory);
  const neighborhood = result.structuredAddress?.subLocality || result.structuredAddress?.locality || 'Tel Aviv';
  return {
    key: result.id || `${result.name}:${lat.toFixed(5)}:${lng.toFixed(5)}`,
    applePlaceId: result.id ?? null,
    isCustomPin: false,
    name: result.name,
    category,
    subtitle: categoryLabel(category),
    neighborhood,
    city: 'Tel Aviv',
    address: result.formattedAddressLines?.join(', ') || result.structuredAddress?.fullThoroughfare || '',
    lat,
    lng,
    priceLevel: 2,
    distanceMeters: distanceMeters(bias, { lat, lng }),
    source: 'apple-maps-server',
  };
}

/** Seed rows that share the typed name. Category-only hits stay out so they don't crowd Apple results. */
function supportingSeed(hits: PlaceSearchHit[], query: string): PlaceSearchHit[] {
  const q = query.trim().toLowerCase();
  const compact = q.replace(/\s+/g, '');
  return hits.filter((hit) => {
    const name = hit.name.toLowerCase();
    if (name.includes(q)) return true;
    return compact.length >= 3 && name.replace(/\s+/g, '').includes(compact);
  });
}

export function mergeHits(primary: PlaceSearchHit[], extra: PlaceSearchHit[]): PlaceSearchHit[] {
  const merged: PlaceSearchHit[] = [];
  const seen = new Set<string>();
  for (const hit of [...primary, ...extra]) {
    const key = identityKey(hit);
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push(hit);
  }
  return merged;
}

function identityKey(hit: PlaceSearchHit): string {
  if (hit.applePlaceId) return `apple:${hit.applePlaceId}`;
  if (hit.placeId) return `place:${hit.placeId}`;
  return `name:${hit.name.trim().toLowerCase()}:${hit.lat.toFixed(3)}:${hit.lng.toFixed(3)}`;
}

const defaultFetch: SearchFetch = async (url, init) => {
  const response = await fetch(url, init);
  return {
    ok: response.ok,
    status: response.status,
    json: () => response.json() as Promise<unknown>,
  };
};
