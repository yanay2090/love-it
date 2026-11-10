import type { NativePlaceSearch, Place, PlaceSearchHit } from '@love-it/shared';
import { DEMO_ORIGIN, categoryFromApplePoi, cloneSeed, friendlyPlaceSubtitle, searchPlaces } from '@love-it/shared';
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
    const raw = await withTimeout(native.search(query, bias.lat, bias.lng), 12_000);
    if (!Array.isArray(raw)) return [];
    return raw.flatMap((item) => hitFromNative(item));
  };
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Place search timed out.')), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error: unknown) => {
        clearTimeout(timer);
        reject(error instanceof Error ? error : new Error('Place search failed.'));
      },
    );
  });
}

const NATIVE_MODULE_NAME = 'LoveItLocalSearch';

type NativeSearchModule = {
  search: (query: string, latitude: number, longitude: number) => Promise<unknown>;
};

function expoModuleRecord(): Record<string, unknown> | null {
  const expo = (globalThis as { expo?: { modules?: Record<string, unknown> } }).expo;
  return expo?.modules ?? null;
}

/** The module object when this install registered LoveItLocalSearch, even if search() is missing. */
function registeredNativeModule(): unknown {
  const fromExpo = expoModuleRecord()?.[NATIVE_MODULE_NAME];
  if (fromExpo) return fromExpo;
  return NativeModules[NATIVE_MODULE_NAME] ?? null;
}

function readNativeSearch(): NativeSearchModule | null {
  const found = lookupNativeSearch();
  return found.module;
}

function lookupNativeSearch(): { module: NativeSearchModule | null; present: boolean } {
  let fromExpo: { search?: NativeSearchModule['search'] } | null = null;
  try {
    fromExpo = getLoveItLocalSearch();
  } catch (error) {
    console.error(`[${NATIVE_MODULE_NAME}] requireOptionalNativeModule threw`, error);
    const missing = error instanceof Error && /cannot find native module/i.test(error.message);
    if (!missing) return { module: null, present: true };
  }
  if (fromExpo?.search) return { module: fromExpo as NativeSearchModule, present: true };

  const registered = registeredNativeModule() as { search?: NativeSearchModule['search'] } | null;
  const candidate = fromExpo ?? registered;
  if (candidate?.search) {
    return { module: { search: candidate.search.bind(candidate) }, present: true };
  }
  if (candidate) {
    console.error(`[${NATIVE_MODULE_NAME}] is registered but has no search function.`, candidate);
    return { module: null, present: true };
  }

  const names = [...Object.keys(expoModuleRecord() ?? {}), ...Object.keys(NativeModules)];
  console.error(
    `[${NATIVE_MODULE_NAME}] is not registered in this install. Nearby native modules:`,
    names.filter((name) => /love|search|map/i.test(name)).join(', ') || '(none)',
  );
  return { module: null, present: false };
}

/** Tel Aviv seed, plus any places already on this phone, so a signed-in diary is not the whole catalog. */
function searchCatalog(extra: Place[]): Place[] {
  const byId = new Map<string, Place>();
  for (const place of cloneSeed().places) byId.set(place.id, place);
  for (const place of extra) byId.set(place.id, place);
  return [...byId.values()];
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
      subtitle: friendlyPlaceSubtitle(
        typeof row.subtitle === 'string' && row.subtitle.length > 0 ? row.subtitle : category,
        category,
      ),
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
  const found = lookupNativeSearch();
  const nativeSearch = found.module
    ? async (queryText: string, point: { lat: number; lng: number }) => {
        const raw = await withTimeout(found.module!.search(queryText, point.lat, point.lng), 12_000);
        if (!Array.isArray(raw)) return [];
        return raw.flatMap((item) => hitFromNative(item));
      }
    : undefined;
  return searchPlaces(query, searchCatalog(places), {
    bias,
    token: process.env.EXPO_PUBLIC_APPLE_MAPS_TOKEN || undefined,
    nativeSearch,
    limit: 30,
  }).then((hits) => {
    if (!nativeSearch && query.trim() && hits.length === 0) {
      throw new Error(
        found.present
          ? 'Apple Maps search is linked, but it has no search function.'
          : 'Apple Maps search is not linked in this install.',
      );
    }
    return hits;
  });
}
