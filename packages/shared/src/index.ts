export * from './domain';
export * from './handles';
export * from './supabase';
export * from './geo';
export * from './labels';
export * from './analytics';
export * from './seed';
export * from './queries';
export * from './mutate';
export * from './search';

import type { Place, PlaceCategory } from './domain';
import type { PlaceSearchHit } from './search';
import { createId } from './mutate';

/** Database rows require an Apple place id or a custom pin. Seed rows can be either. */
export function placeSourceForDatabase(place: Place): {
  apple_place_id: string | null;
  is_custom_pin: boolean;
} {
  if (place.applePlaceId) return { apple_place_id: place.applePlaceId, is_custom_pin: false };
  return { apple_place_id: null, is_custom_pin: true };
}

export function placeFromHit(hit: PlaceSearchHit, id = hit.placeId ?? createId('place')): Place {
  return {
    id,
    applePlaceId: hit.applePlaceId,
    isCustomPin: hit.isCustomPin,
    name: hit.name,
    category: hit.category,
    subtitle: hit.subtitle,
    neighborhood: hit.neighborhood,
    city: hit.city || 'Tel Aviv',
    address: hit.address,
    lat: hit.lat,
    lng: hit.lng,
    priceLevel: hit.priceLevel,
    covers: [],
  };
}

export function customPinPlace(input: {
  name: string;
  category: PlaceCategory;
  lat: number;
  lng: number;
  neighborhood?: string;
}): Place {
  return {
    id: createId('place'),
    applePlaceId: null,
    isCustomPin: true,
    name: input.name.trim(),
    category: input.category,
    subtitle: input.category === 'cafe' ? 'Coffee' : 'Custom pin',
    neighborhood: input.neighborhood ?? 'Tel Aviv',
    city: 'Tel Aviv',
    address: '',
    lat: input.lat,
    lng: input.lng,
    priceLevel: 2,
    covers: [],
  };
}
