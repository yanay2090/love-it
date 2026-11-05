import type { Entry, LoveItData, Place } from './domain';
import { CURRENT_USER_ID } from './seed';

function placeKey(place: Place): string {
  return `${place.name.trim().toLowerCase()}|${place.lat.toFixed(4)}|${place.lng.toFixed(4)}`;
}

/**
 * A save this phone created on top of the demo diary.
 * Seed rows (Yael's page, and any copy of a seed place) stay out of a real account.
 * A place the person matched to Apple Maps is theirs even when the name also exists in the catalog.
 */
export function isOwnLocalSave(entry: Entry, place: Place | undefined, seed: LoveItData): boolean {
  if (!place) return false;
  if (entry.userId !== CURRENT_USER_ID) return false;
  if (seed.entries.some((item) => item.id === entry.id)) return false;
  if (place.applePlaceId) return true;
  const key = placeKey(place);
  if (seed.places.some((item) => item.id === place.id || placeKey(item) === key)) return false;
  return true;
}
