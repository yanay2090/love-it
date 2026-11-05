import {
  buildPlaceView,
  entriesForProfile,
  followerCount,
  followingCount,
  isPlaceCategory,
  isRating,
  isUuid,
  parseGeography,
  photosForEntry,
  placeById,
  profileByHandle,
  seedData,
  supabasePublishableKey,
  validateHandle,
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
  /** Newest public save. Used to bust the share-image cache. */
  updatedAt: string;
}

export async function loadPublicProfile(handle: string): Promise<PublicProfilePage | null> {
  const parsed = validateHandle(handle);
  if (!parsed.ok) return null;
  const remote = await loadRemoteProfile(parsed.handle);
  if (remote) return remote;
  return seedProfile(parsed.handle);
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
    updatedAt: entries.reduce((latest, entry) => (entry.createdAt > latest ? entry.createdAt : latest), ''),
  };
}

function supabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  // sb_publishable_... only. sb_secret_ keys must never ship in client code.
  const key = supabasePublishableKey(process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY);
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

async function loadRemoteProfile(handle: string): Promise<PublicProfilePage | null> {
  const client = supabase();
  if (!client) return null;
  const key = handle.trim().replace(/^@/, '').toLowerCase();
  const { data: profileRow, error } = await client
    .from('profiles')
    .select('id, handle, display_name, bio, city, avatar_url')
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
  const placeRows = await loadPlaceRows(client, placeIds);

  const placesById = new Map((placeRows ?? []).map((row) => [row.id as string, row]));
  const profile: UserProfile = {
    id: profileRow.id as string,
    handle: profileRow.handle as string,
    displayName: profileRow.display_name as string,
    bio: (profileRow.bio as string) ?? '',
    initials: initialsFrom(profileRow.display_name as string),
    avatarColor: '#F08A3A',
    avatarUrl: (profileRow.avatar_url as string | null) ?? null,
    city: (profileRow.city as string) ?? 'Tel Aviv',
  };

  const places: PublicPlaceCard[] = [];
  for (const entry of entryRows ?? []) {
    const row = placesById.get(entry.place_id as string);
    if (!row) continue;
    const place = placeFromRow(row);
    if (!place) continue;
    const { data: photoRows } = await client
      .from('place_photos')
      .select('storage_path')
      .eq('entry_id', entry.id as string)
      .order('position', { ascending: true });
    const covers = (photoRows ?? []).map((photo) => publicPhotoUrl(String(photo.storage_path ?? ''))).filter(Boolean);
    const rating = Number(entry.rating);
    places.push({
      place: { ...place, covers },
      rating: isRating(rating) ? rating : 5,
      note: (entry.note as string) ?? '',
      tags: (entry.tags as string[]) ?? [],
      photoCount: covers.length,
      cover: covers[0],
    });
  }

  return {
    profile,
    loved: places.length,
    followers: followers ?? 0,
    following: following ?? 0,
    places,
    source: 'supabase',
    updatedAt: (entryRows ?? []).reduce((latest, entry) => {
      const created = String(entry.created_at ?? '');
      return created > latest ? created : latest;
    }, ''),
  };
}

async function loadRemotePlace(placeId: string): Promise<PlaceView | null> {
  const client = supabase();
  if (!client) return null;
  const row = await loadPlaceRow(client, placeId);
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

  const entryIds = lovers.map((lover) => lover.entry.id);
  const { data: photoRows } = entryIds.length
    ? await client.from('place_photos').select('id, entry_id, user_id, storage_path, position').in('entry_id', entryIds)
    : { data: [] };
  const heroPhotos = (photoRows ?? [])
    .slice()
    .sort((a, b) => Number(a.position) - Number(b.position))
    .map((photo) => publicPhotoUrl(String(photo.storage_path ?? '')))
    .filter(Boolean);
  const notes = lovers.filter((lover) => lover.entry.note.trim() || lover.entry.tags.length > 0);
  return {
    place: { ...place, covers: heroPhotos },
    lovers,
    friendLovers: lovers,
    heroPhotos: heroPhotos.length > 0 ? heroPhotos : place.covers,
    friendPhotos: [],
    notes,
  };
}

const PLACE_VIEW =
  'id, apple_place_id, is_custom_pin, name, category, subtitle, neighborhood, city, address, price_level, local_name, lat, lng';
const PLACE_TABLE =
  'id, apple_place_id, is_custom_pin, name, category, subtitle, neighborhood, city, address, price_level, local_name, location';

async function loadPlaceRows(client: NonNullable<ReturnType<typeof supabase>>, ids: string[]): Promise<Record<string, unknown>[]> {
  if (ids.length === 0) return [];
  const view = await client.from('places_public').select(PLACE_VIEW).in('id', ids);
  if (!view.error && view.data) return view.data as Record<string, unknown>[];
  const table = await client.from('places').select(PLACE_TABLE).in('id', ids);
  return (table.data ?? []) as Record<string, unknown>[];
}

async function loadPlaceRow(client: NonNullable<ReturnType<typeof supabase>>, placeId: string): Promise<Record<string, unknown> | null> {
  const column = isUuid(placeId) ? 'id' : 'apple_place_id';
  const view = await client.from('places_public').select(PLACE_VIEW).eq(column, placeId).maybeSingle();
  if (!view.error && view.data) return view.data as Record<string, unknown>;
  const table = await client.from('places').select(PLACE_TABLE).eq(column, placeId).maybeSingle();
  return (table.data as Record<string, unknown> | null) ?? null;
}

function publicPhotoUrl(storagePath: string): string {
  if (!storagePath) return '';
  if (storagePath.startsWith('http://') || storagePath.startsWith('https://')) return storagePath;
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, '');
  if (!base) return storagePath;
  const path = storagePath.split('/').map((part) => encodeURIComponent(part)).join('/');
  return `${base}/storage/v1/object/public/place-photos/${path}`;
}

function placeFromRow(row: Record<string, unknown>): Place | null {
  const lat = Number(row.lat);
  const lng = Number(row.lng);
  const point = Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : parseGeography(row.location);
  if (!point) return null;
  const category = row.category;
  if (!isPlaceCategory(String(category))) return null;
  const price = Number(row.price_level ?? 2);
  return {
    id: String(row.id),
    applePlaceId: (row.apple_place_id as string | null) ?? null,
    isCustomPin: Boolean(row.is_custom_pin),
    name: String(row.name),
    category: category as Place['category'],
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

function initialsFrom(name: string): string {
  const parts = name.split(' ').filter(Boolean);
  return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase() || '♡';
}
