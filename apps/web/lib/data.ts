import {
  buildPlaceView,
  entriesForProfile,
  followerCount,
  followingCount,
  isRating,
  photosForEntry,
  placeById,
  profileByHandle,
  seedData,
  type LoveItData,
  type Place,
  type PlaceView,
  type Rating,
  type UserProfile,
} from '@love-it/shared';
import { createClient } from '@supabase/supabase-js';

export interface PublicPlaceCard {
  place: Place;
  rating: Rating;
  note: string;
  tags: string[];
  photoCount: number;
  cover?: string;
}

export interface PublicProfilePage {
  profile: UserProfile;
  loved: number;
  followers: number;
  following: number;
  places: PublicPlaceCard[];
  source: 'seed' | 'supabase';
}

export async function loadPublicProfile(handle: string): Promise<PublicProfilePage | null> {
  const remote = await loadRemoteProfile(handle);
  if (remote) return remote;
  return seedProfile(handle);
}

export async function loadPublicPlace(placeId: string): Promise<{ view: PlaceView; source: 'seed' | 'supabase' } | null> {
  const remote = await loadRemotePlace(placeId);
  if (remote) return { view: remote, source: 'supabase' };
  const view = buildPlaceView(seedData, placeId, null);
  return view ? { view, source: 'seed' } : null;
}

export function seedHandles(): string[] {
  return seedData.profiles.map((profile) => profile.handle);
}

export function seedPlaceIds(): string[] {
  return seedData.places.map((place) => place.id);
}

function seedProfile(handle: string): PublicProfilePage | null {
  const profile = profileByHandle(seedData, handle);
  if (!profile) return null;
  return pageFromData(seedData, profile, 'seed');
}

function pageFromData(data: LoveItData, profile: UserProfile, source: PublicProfilePage['source']): PublicProfilePage {
  const entries = entriesForProfile(data, profile.id, null);
  const places = entries.flatMap((entry) => {
    const place = placeById(data, entry.placeId);
    if (!place) return [];
    const photos = photosForEntry(data, entry.id);
    return [
      {
        place,
        rating: entry.rating,
        note: entry.note,
        tags: entry.tags,
        photoCount: photos.length,
        cover: photos[0]?.uri ?? place.covers[0],
      },
    ];
  });
  return {
    profile,
    loved: places.length,
    followers: followerCount(data, profile.id),
    following: followingCount(data, profile.id),
    places,
    source,
  };
}

function supabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

async function loadRemoteProfile(handle: string): Promise<PublicProfilePage | null> {
  const client = supabase();
  if (!client) return null;
  const key = handle.trim().replace(/^@/, '').toLowerCase();
  const { data: profileRow, error } = await client
    .from('profiles')
    .select('id, handle, display_name, bio, city')
    .eq('handle', key)
    .maybeSingle();
  if (error || !profileRow) return null;

  const [{ data: entryRows }, { count: followers }, { count: following }] = await Promise.all([
    client
      .from('entries')
      .select('id, place_id, rating, note, tags, visibility, created_at')
      .eq('user_id', profileRow.id)
      .eq('visibility', 'public')
      .order('created_at', { ascending: false }),
    client.from('follows').select('follower_id', { count: 'exact', head: true }).eq('following_id', profileRow.id),
    client.from('follows').select('following_id', { count: 'exact', head: true }).eq('follower_id', profileRow.id),
  ]);

  const placeIds = [...new Set((entryRows ?? []).map((entry) => entry.place_id as string))];
  const { data: placeRows } = placeIds.length
    ? await client.from('places').select('id, apple_place_id, is_custom_pin, name, category, subtitle, neighborhood, city, address, price_level, local_name, location').in('id', placeIds)
    : { data: [] };

  const placesById = new Map((placeRows ?? []).map((row) => [row.id as string, row]));
  const profile: UserProfile = {
    id: profileRow.id as string,
    handle: profileRow.handle as string,
    displayName: profileRow.display_name as string,
    bio: (profileRow.bio as string) ?? '',
    initials: initialsFrom(profileRow.display_name as string),
    avatarColor: '#F08A3A',
    city: (profileRow.city as string) ?? 'Tel Aviv',
  };

  const places: PublicPlaceCard[] = [];
  for (const entry of entryRows ?? []) {
    const row = placesById.get(entry.place_id as string);
    if (!row) continue;
    const place = placeFromRow(row);
    if (!place) continue;
    const { count } = await client
      .from('place_photos')
      .select('id', { count: 'exact', head: true })
      .eq('entry_id', entry.id as string);
    const rating = Number(entry.rating);
    places.push({
      place,
      rating: isRating(rating) ? rating : 5,
      note: (entry.note as string) ?? '',
      tags: (entry.tags as string[]) ?? [],
      photoCount: count ?? 0,
    });
  }

  return {
    profile,
    loved: places.length,
    followers: followers ?? 0,
    following: following ?? 0,
    places,
    source: 'supabase',
  };
}

async function loadRemotePlace(placeId: string): Promise<PlaceView | null> {
  const client = supabase();
  if (!client) return null;
  const { data: row } = await client
    .from('places')
    .select('id, apple_place_id, is_custom_pin, name, category, subtitle, neighborhood, city, address, price_level, local_name, location')
    .eq('id', placeId)
    .maybeSingle();
  if (!row) return null;
  const place = placeFromRow(row);
  if (!place) return null;

  const { data: entryRows } = await client
    .from('entries')
    .select('id, user_id, rating, note, tags, visibility, created_at')
    .eq('place_id', placeId)
    .eq('visibility', 'public');

  const userIds = [...new Set((entryRows ?? []).map((entry) => entry.user_id as string))];
  const { data: profileRows } = userIds.length
    ? await client.from('profiles').select('id, handle, display_name, bio, city').in('id', userIds)
    : { data: [] };
  const profiles = new Map(
    (profileRows ?? []).map((profile) => [
      profile.id as string,
      {
        id: profile.id as string,
        handle: profile.handle as string,
        displayName: profile.display_name as string,
        bio: (profile.bio as string) ?? '',
        initials: initialsFrom(profile.display_name as string),
        avatarColor: '#3D8BFF',
        city: (profile.city as string) ?? 'Tel Aviv',
      } satisfies UserProfile,
    ]),
  );

  const lovers = (entryRows ?? []).flatMap((entry) => {
    const profile = profiles.get(entry.user_id as string);
    if (!profile) return [];
    return [
      {
        profile,
        entry: {
          id: entry.id as string,
          userId: entry.user_id as string,
          placeId,
          rating: isRating(Number(entry.rating)) ? (Number(entry.rating) as Rating) : 5,
          note: (entry.note as string) ?? '',
          tags: (entry.tags as string[]) ?? [],
          visibility: 'public' as const,
          createdAt: entry.created_at as string,
        },
      },
    ];
  });

  const notes = lovers.filter((lover) => lover.entry.note.trim() || lover.entry.tags.length > 0);
  return {
    place,
    lovers,
    friendLovers: lovers,
    heroPhotos: place.covers,
    friendPhotos: [],
    notes,
  };
}

function placeFromRow(row: Record<string, unknown>): Place | null {
  const point = parsePoint(row.location);
  if (!point) return null;
  const category = row.category;
  if (
    category !== 'cafe' &&
    category !== 'restaurant' &&
    category !== 'bar' &&
    category !== 'bakery' &&
    category !== 'hotel' &&
    category !== 'attraction'
  ) {
    return null;
  }
  const price = Number(row.price_level ?? 2);
  return {
    id: String(row.id),
    applePlaceId: (row.apple_place_id as string | null) ?? null,
    isCustomPin: Boolean(row.is_custom_pin),
    name: String(row.name),
    category,
    subtitle: String(row.subtitle ?? ''),
    neighborhood: String(row.neighborhood ?? ''),
    city: String(row.city ?? 'Tel Aviv'),
    address: String(row.address ?? ''),
    lat: point.lat,
    lng: point.lng,
    priceLevel: price >= 1 && price <= 4 ? (price as Place['priceLevel']) : 2,
    localName: (row.local_name as string | null) ?? undefined,
    covers: [],
  };
}

function parsePoint(location: unknown): { lat: number; lng: number } | null {
  if (!location) return null;
  if (typeof location === 'string') {
    const match = location.match(/POINT\(([-\d.]+)\s+([-\d.]+)\)/i);
    if (!match) return null;
    return { lng: Number(match[1]), lat: Number(match[2]) };
  }
  if (typeof location === 'object' && location && 'coordinates' in location) {
    const coordinates = (location as { coordinates?: number[] }).coordinates;
    if (!coordinates || coordinates.length < 2) return null;
    return { lng: coordinates[0] ?? 0, lat: coordinates[1] ?? 0 };
  }
  return null;
}

function initialsFrom(name: string): string {
  const parts = name.split(' ').filter(Boolean);
  return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase() || '♡';
}
