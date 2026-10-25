import type { NativePlaceSearch, Place, PlaceSearchHit } from '@love-it/shared';
import { DEMO_ORIGIN, categoryFromApplePoi, searchPlaces } from '@love-it/shared';
import { NativeModules } from 'react-native';

/**
 * react-native-maps draws Apple MapKit on iOS, but it does not ship MKLocalSearch.
 * When a dev client exposes NativeModules.LoveItLocalSearch.search(query, lat, lng),
 * that bridge is used first. Otherwise we call the Apple Maps Server API if
 * EXPO_PUBLIC_APPLE_MAPS_TOKEN is set, and always keep the Tel Aviv seed catalog.
 */
export function getMkLocalSearch(): NativePlaceSearch | null {
  const native = NativeModules.LoveItLocalSearch as
    | { search?: (query: string, latitude: number, longitude: number) => Promise<unknown> }
    | undefined;
  if (!native?.search) return null;
  return async (query, bias) => {
    const raw = await native.search!(query, bias.lat, bias.lng);
    if (!Array.isArray(raw)) return [];
    return raw.flatMap((item) => {
      const row = item as Record<string, unknown>;
      const lat = Number(row.latitude ?? row.lat);
      const lng = Number(row.longitude ?? row.lng);
      const name = typeof row.name === 'string' ? row.name : '';
      if (!name || Number.isNaN(lat) || Number.isNaN(lng)) return [];
      const applePlaceId = typeof row.id === 'string' ? row.id : typeof row.applePlaceId === 'string' ? row.applePlaceId : null;
      const category = categoryFromApplePoi(typeof row.category === 'string' ? row.category : undefined);
      const hit: PlaceSearchHit = {
        key: applePlaceId ?? `${name}:${lat.toFixed(5)}`,
        applePlaceId,
        isCustomPin: false,
        name,
        category,
        subtitle: typeof row.subtitle === 'string' ? row.subtitle : category,
        neighborhood: typeof row.neighborhood === 'string' ? row.neighborhood : 'Tel Aviv',
        city: 'Tel Aviv',
        address: typeof row.address === 'string' ? row.address : '',
        lat,
        lng,
        priceLevel: 2,
        distanceMeters: 0,
        source: 'mk-local-search',
      };
      return [hit];
    });
  };
}

export function searchTelAvivPlaces(query: string, places: Place[]): Promise<PlaceSearchHit[]> {
  const nativeSearch = getMkLocalSearch() ?? undefined;
  return searchPlaces(query, places, {
    bias: DEMO_ORIGIN,
    token: process.env.EXPO_PUBLIC_APPLE_MAPS_TOKEN || undefined,
    nativeSearch,
    limit: 8,
  });
}
