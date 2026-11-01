import type { NativePlaceSearch, Place, PlaceSearchHit } from '@love-it/shared';
import { DEMO_ORIGIN, categoryFromApplePoi, searchPlaces } from '@love-it/shared';
import { NativeModules } from 'react-native';
import { getLoveItLocalSearch, type LocalSearchRow } from '../modules/love-it-local-search/src';

/**
 * Place search for + Add.
 * MKLocalSearch runs through the local Expo module (no Apple Developer paid
 * program and no Maps Server token). The seed catalog fills gaps when the
 * name actually matches, and it is the whole list when the native module
 * is missing (Android, web, or a dev client that has not been rebuilt).
 */
export function getMkLocalSearch(): NativePlaceSearch | null {
  const native = readNativeSearch();
  if (!native) return null;
  return async (query, bias) => {
    const raw = await native.search(query, bias.lat, bias.lng);
    if (!Array.isArray(raw)) return [];
    return raw.flatMap((item) => hitFromNative(item));
  };
}

function readNativeSearch(): { search: (query: string, latitude: number, longitude: number) => Promise<unknown> } | null {
  const fromExpo = getLoveItLocalSearch();
  if (fromExpo?.search) return fromExpo;
  const legacy = NativeModules.LoveItLocalSearch as
    | { search?: (query: string, latitude: number, longitude: number) => Promise<unknown> }
    | undefined;
  if (!legacy?.search) return null;
  return { search: legacy.search.bind(legacy) };
}

function hitFromNative(item: unknown): PlaceSearchHit[] {
  const row = item as LocalSearchRow;
  const lat = Number(row.latitude);
  const lng = Number(row.longitude);
  const name = typeof row.name === 'string' ? row.name : '';
  if (!name || Number.isNaN(lat) || Number.isNaN(lng)) return [];
  const applePlaceId = typeof row.id === 'string' && row.id.length > 0 ? row.id : null;
  const category = categoryFromApplePoi(typeof row.category === 'string' ? row.category : undefined);
  return [
    {
      key: applePlaceId ?? `${name}:${lat.toFixed(5)}:${lng.toFixed(5)}`,
      applePlaceId,
      isCustomPin: false,
      name,
      category,
      subtitle: typeof row.subtitle === 'string' && row.subtitle.length > 0 ? row.subtitle : category,
      neighborhood: typeof row.neighborhood === 'string' && row.neighborhood.length > 0 ? row.neighborhood : 'Tel Aviv',
      city: 'Tel Aviv',
      address: typeof row.address === 'string' ? row.address : '',
      lat,
      lng,
      priceLevel: 2,
      distanceMeters: 0,
      source: 'mk-local-search',
    },
  ];
}

export function searchTelAvivPlaces(
  query: string,
  places: Place[],
  bias: { lat: number; lng: number } = DEMO_ORIGIN,
): Promise<PlaceSearchHit[]> {
  const nativeSearch = getMkLocalSearch() ?? undefined;
  return searchPlaces(query, places, {
    bias,
    token: process.env.EXPO_PUBLIC_APPLE_MAPS_TOKEN || undefined,
    nativeSearch,
    limit: 12,
  });
}
