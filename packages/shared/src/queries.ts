import type { Entry, LoveItData, Place, PlaceCategory, PlacePhoto, UserProfile } from './domain';
import { distanceMeters } from './geo';
import { firstName } from './labels';

export interface Lover {
  profile: UserProfile;
  entry: Entry;
}

export interface FriendPhoto {
  photo: PlacePhoto;
  profile: UserProfile;
}

export interface PlaceView {
  place: Place;
  lovers: Lover[];
  friendLovers: Lover[];
  viewerEntry?: Entry;
  heroPhotos: string[];
  friendPhotos: FriendPhoto[];
  notes: Lover[];
}

export interface MapPinPerson {
  id: string;
  initials: string;
  avatarColor: string;
  displayName: string;
}

export type MapPinIcon = PlaceCategory | 'laptop';

export interface MapPin {
  placeId: string;
  lat: number;
  lng: number;
  name: string;
  kind: 'cluster' | 'avatar' | 'category';
  people: MapPinPerson[];
  icon: MapPinIcon;
  label?: string;
}

export function profileById(data: LoveItData, id: string): UserProfile | undefined {
  return data.profiles.find((profile) => profile.id === id);
}

export function placeById(data: LoveItData, id: string): Place | undefined {
  return data.places.find((place) => place.id === id);
}

export function profileByHandle(data: LoveItData, handle: string): UserProfile | undefined {
  const key = handle.trim().replace(/^@/, '').toLowerCase();
  return data.profiles.find((profile) => profile.handle === key);
}

export function isBlocked(data: LoveItData, a: string, b: string): boolean {
  if (!a || !b || a === b) return false;
  return data.blocks.some(
    (block) =>
      (block.blockerId === a && block.blockedId === b) ||
      (block.blockerId === b && block.blockedId === a),
  );
}

export function follows(data: LoveItData, followerId: string, followingId: string): boolean {
  return data.follows.some(
    (follow) => follow.followerId === followerId && follow.followingId === followingId,
  );
}

export function followerCount(data: LoveItData, userId: string): number {
  return data.follows.filter((follow) => follow.followingId === userId).length;
}

export function followingCount(data: LoveItData, userId: string): number {
  return data.follows.filter((follow) => follow.followerId === userId).length;
}

/** Public is world-readable. Friends requires a follow. Private is the author only. */
export function canViewEntry(data: LoveItData, entry: Entry, viewerId: string | null): boolean {
  if (viewerId && isBlocked(data, viewerId, entry.userId)) return false;
  if (viewerId && entry.userId === viewerId) return true;
  if (entry.visibility === 'public') return true;
  if (entry.visibility === 'friends' && viewerId && follows(data, viewerId, entry.userId)) return true;
  return false;
}

export function photosForEntry(data: LoveItData, entryId: string): PlacePhoto[] {
  return data.photos
    .filter((photo) => photo.entryId === entryId)
    .sort((a, b) => a.position - b.position);
}

export function visibleEntriesForPlace(
  data: LoveItData,
  placeId: string,
  viewerId: string | null,
): Entry[] {
  return data.entries.filter(
    (entry) => entry.placeId === placeId && canViewEntry(data, entry, viewerId),
  );
}

export function entriesForProfile(
  data: LoveItData,
  ownerId: string,
  viewerId: string | null,
): Entry[] {
  return data.entries
    .filter((entry) => entry.userId === ownerId && canViewEntry(data, entry, viewerId))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

function toLover(data: LoveItData, entry: Entry): Lover | null {
  const profile = profileById(data, entry.userId);
  if (!profile) return null;
  return { profile, entry };
}

export function friendLovers(data: LoveItData, placeId: string, viewerId: string): Lover[] {
  return visibleEntriesForPlace(data, placeId, viewerId)
    .filter((entry) => entry.userId !== viewerId && follows(data, viewerId, entry.userId))
    .map((entry) => toLover(data, entry))
    .filter((lover): lover is Lover => lover !== null);
}

export function friendLovedPlaces(data: LoveItData, viewerId: string): Place[] {
  const ids = new Set<string>();
  for (const entry of data.entries) {
    if (entry.userId === viewerId) continue;
    if (!follows(data, viewerId, entry.userId)) continue;
    if (!canViewEntry(data, entry, viewerId)) continue;
    ids.add(entry.placeId);
  }
  return data.places.filter((place) => ids.has(place.id));
}

export type ExploreChip =
  | 'all'
  | 'friends'
  | 'cafe'
  | 'restaurant'
  | 'bar'
  | 'bakery'
  | 'hotel'
  | 'attraction';

export function filterExplorePlaces(
  data: LoveItData,
  viewerId: string,
  chip: ExploreChip,
  query: string,
): Place[] {
  let places = data.places;
  if (chip === 'friends') {
    const ids = new Set(friendLovedPlaces(data, viewerId).map((place) => place.id));
    places = places.filter((place) => ids.has(place.id));
  } else if (chip !== 'all') {
    places = places.filter((place) => place.category === chip);
  }
  const q = query.trim().toLowerCase();
  if (!q) return places;
  return places.filter((place) => {
    const haystack = [place.name, place.neighborhood, place.subtitle, place.listKind ?? '', place.address]
      .join(' ')
      .toLowerCase();
    return haystack.includes(q) || (place.localName?.includes(query.trim()) ?? false);
  });
}

/**
 * Same order for the Explore list, the map pins, and the preview card.
 * Nearest first when we have a location; otherwise most loved, then newest save.
 */
export function sortExplorePlaces(
  data: LoveItData,
  places: Place[],
  viewerId: string | null,
  origin: { lat: number; lng: number } | null,
): Place[] {
  const loved = (place: Place) => visibleEntriesForPlace(data, place.id, viewerId).length;
  const newest = (place: Place) =>
    visibleEntriesForPlace(data, place.id, viewerId).reduce(
      (latest, entry) => (entry.createdAt > latest ? entry.createdAt : latest),
      '',
    );
  return [...places].sort((a, b) => {
    if (origin) {
      const delta = distanceMeters(origin, a) - distanceMeters(origin, b);
      if (delta !== 0) return delta;
    } else {
      const byLoved = loved(b) - loved(a);
      if (byLoved !== 0) return byLoved;
    }
    return newest(b).localeCompare(newest(a));
  });
}

export function buildPlaceView(
  data: LoveItData,
  placeId: string,
  viewerId: string | null,
): PlaceView | null {
  const place = placeById(data, placeId);
  if (!place) return null;
  const visible = visibleEntriesForPlace(data, placeId, viewerId)
    .map((entry) => toLover(data, entry))
    .filter((lover): lover is Lover => lover !== null)
    .sort((a, b) => b.entry.rating - a.entry.rating || b.entry.createdAt.localeCompare(a.entry.createdAt));

  const viewerEntry = viewerId ? visible.find((lover) => lover.profile.id === viewerId)?.entry : undefined;
  const friendLoversList = viewerId
    ? visible.filter((lover) => lover.profile.id !== viewerId && follows(data, viewerId, lover.profile.id))
    : visible.filter((lover) => lover.entry.visibility === 'public');

  const friendPhotos: FriendPhoto[] = [];
  for (const lover of visible) {
    if (viewerId && lover.profile.id === viewerId) continue;
    for (const photo of photosForEntry(data, lover.entry.id)) {
      friendPhotos.push({ photo, profile: lover.profile });
    }
  }

  const mine = viewerEntry ? photosForEntry(data, viewerEntry.id).map((photo) => photo.uri) : [];
  const heroPhotos =
    mine.length > 0 ? mine : place.covers.length > 0 ? place.covers : friendPhotos.map((item) => item.photo.uri);

  const notes = visible.filter(
    (lover) => lover.profile.id !== viewerId && (lover.entry.note.trim().length > 0 || lover.entry.tags.length > 0),
  );

  return {
    place,
    lovers: visible,
    friendLovers: friendLoversList,
    viewerEntry,
    heroPhotos,
    friendPhotos,
    notes,
  };
}

function personOf(profile: UserProfile): MapPinPerson {
  return {
    id: profile.id,
    initials: profile.initials,
    avatarColor: profile.avatarColor,
    displayName: profile.displayName,
  };
}

export function explorePins(data: LoveItData, viewerId: string, places: Place[]): MapPin[] {
  return places.map((place) => {
    const friends = friendLovers(data, place.id, viewerId);
    const people = friends.slice(0, 3).map((lover) => personOf(lover.profile));
    if (friends.length >= 2) {
      return {
        placeId: place.id,
        lat: place.lat,
        lng: place.lng,
        name: place.name,
        kind: 'cluster',
        people,
        icon: place.category,
        label: `${friends.length} friends`,
      };
    }
    if (friends.length === 1 && people[0]) {
      return {
        placeId: place.id,
        lat: place.lat,
        lng: place.lng,
        name: place.name,
        kind: 'avatar',
        people,
        icon: place.category,
        label: firstName(people[0].displayName),
      };
    }
    return {
      placeId: place.id,
      lat: place.lat,
      lng: place.lng,
      name: place.name,
      kind: 'category',
      people: [],
      icon: place.category,
    };
  });
}

export function diaryPins(data: LoveItData, userId: string): MapPin[] {
  return entriesForProfile(data, userId, userId).flatMap((entry) => {
    const place = placeById(data, entry.placeId);
    if (!place) return [];
    const icon: MapPinIcon = entry.tags.includes('Laptop-friendly') ? 'laptop' : place.category;
    return [
      {
        placeId: place.id,
        lat: place.lat,
        lng: place.lng,
        name: place.name,
        kind: 'category' as const,
        people: [],
        icon,
      },
    ];
  });
}

export function searchProfiles(data: LoveItData, viewerId: string, query: string): UserProfile[] {
  const q = query.trim().toLowerCase().replace(/^@/, '');
  return data.profiles
    .filter((profile) => profile.id !== viewerId)
    .filter((profile) => {
      if (!q) return true;
      return (
        profile.handle.includes(q) ||
        profile.displayName.toLowerCase().includes(q) ||
        profile.bio.toLowerCase().includes(q)
      );
    })
    .sort((a, b) => followerCount(data, b.id) - followerCount(data, a.id));
}

export function viewerEntryFor(data: LoveItData, viewerId: string, placeId: string): Entry | undefined {
  return data.entries.find((entry) => entry.userId === viewerId && entry.placeId === placeId);
}
