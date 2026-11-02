import {
  isPlaceCategory,
  isRating,
  isUuid,
  isVisibility,
  parseGeography,
  placeSourceForDatabase,
  type Entry,
  type Follow,
  type LoveItData,
  type Place,
  type PlacePhoto,
  type ReportTargetType,
  type SaveEntryInput,
  type UserProfile,
  type Visibility,
} from '@love-it/shared';
import type { SupabaseClient } from '@supabase/supabase-js';
import { uploadPlacePhoto } from './photos';

const PROFILE_COLUMNS = 'id, handle, display_name, bio, city, avatar_url';
const PLACE_VIEW_COLUMNS =
  'id, apple_place_id, is_custom_pin, name, category, subtitle, neighborhood, city, address, price_level, local_name, lat, lng';
const PLACE_TABLE_COLUMNS =
  'id, apple_place_id, is_custom_pin, name, category, subtitle, neighborhood, city, address, price_level, local_name, location';

const AVATAR_COLORS = ['#F08A3A', '#3D8BFF', '#2EAE6B', '#7C6BC4', '#E86B9A', '#E07A4A', '#2BB5AE', '#E2412B'];

export function emptyDiary(): LoveItData {
  return { profiles: [], places: [], entries: [], photos: [], follows: [], blocks: [], reports: [] };
}

export function accountToProfile(input: {
  id: string;
  handle: string;
  displayName: string;
  bio: string;
  avatarUrl?: string | null;
  city?: string;
}): UserProfile {
  return {
    id: input.id,
    handle: input.handle,
    displayName: input.displayName,
    bio: input.bio,
    initials: initialsFrom(input.displayName || input.handle),
    avatarColor: colorForId(input.id),
    avatarUrl: input.avatarUrl ?? null,
    city: input.city || 'Tel Aviv',
  };
}

export async function loadAccountDiary(supabase: SupabaseClient, userId: string): Promise<LoveItData> {
  const { data: entryRows, error: entryError } = await supabase
    .from('entries')
    .select('id, user_id, place_id, rating, note, tags, visibility, created_at')
    .order('created_at', { ascending: false })
    .limit(500);
  if (entryError) throw new Error(entryError.message);

  const entries = (entryRows ?? []).flatMap((row) => entryFromRow(row as Row));
  const { data: followRows, error: followError } = await supabase
    .from('follows')
    .select('follower_id, following_id, created_at')
    .or(`follower_id.eq.${userId},following_id.eq.${userId}`);
  if (followError) throw new Error(followError.message);
  const follows = (followRows ?? []).map((row) => followFromRow(row as Row));

  const { data: blockRows, error: blockError } = await supabase
    .from('blocks')
    .select('blocker_id, blocked_id, created_at')
    .eq('blocker_id', userId);
  if (blockError) throw new Error(blockError.message);
  const blocks = (blockRows ?? []).map((row) => ({
    blockerId: String((row as Row).blocker_id),
    blockedId: String((row as Row).blocked_id),
    createdAt: String((row as Row).created_at ?? new Date().toISOString()),
  }));

  const profileIds = new Set<string>([userId]);
  for (const entry of entries) profileIds.add(entry.userId);
  for (const follow of follows) {
    profileIds.add(follow.followerId);
    profileIds.add(follow.followingId);
  }
  for (const block of blocks) profileIds.add(block.blockedId);

  const profiles = await fetchProfiles(supabase, [...profileIds]);
  const places = await fetchPlaces(
    supabase,
    entries.map((entry) => entry.placeId),
  );
  const photos = await fetchPhotos(
    supabase,
    entries.map((entry) => entry.id),
  );

  return { profiles, places, entries, photos, follows, blocks, reports: [] };
}

export async function searchRemoteProfiles(supabase: SupabaseClient, query: string): Promise<UserProfile[]> {
  const q = query.trim().replace(/^@+/, '').replace(/[%(),]/g, '');
  if (q.length < 2) return [];
  const pattern = `%${q}%`;
  const { data, error } = await supabase
    .from('profiles')
    .select(PROFILE_COLUMNS)
    .or(`handle.ilike.${pattern},display_name.ilike.${pattern}`)
    .limit(30);
  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => profileFromRow(row as Row));
}

export async function fetchProfileByHandle(supabase: SupabaseClient, handle: string): Promise<UserProfile | null> {
  const key = handle.trim().replace(/^@+/, '').toLowerCase();
  if (!key) return null;
  const { data, error } = await supabase.from('profiles').select(PROFILE_COLUMNS).eq('handle', key).maybeSingle();
  if (error) throw new Error(error.message);
  return data ? profileFromRow(data as Row) : null;
}

export async function saveRemoteEntry(
  supabase: SupabaseClient,
  userId: string,
  input: Omit<SaveEntryInput, 'userId'>,
): Promise<Entry> {
  const placeId = await ensurePlace(supabase, userId, input.place);
  const { data: existing, error: existingError } = await supabase
    .from('entries')
    .select('id, created_at')
    .eq('user_id', userId)
    .eq('place_id', placeId)
    .maybeSingle();
  if (existingError) throw new Error(existingError.message);
  const entryId = existing?.id ? String(existing.id) : newId();
  const uploaded = await storePhotos(userId, entryId, input.photos);
  const note = input.note.trim().slice(0, 180);
  const tags = unique(input.tags).slice(0, 8);
  const payload = {
    id: entryId,
    user_id: userId,
    place_id: placeId,
    rating: input.rating,
    note,
    tags,
    visibility: input.visibility,
  };
  const write = existing
    ? supabase.from('entries').update({ rating: input.rating, note, tags, visibility: input.visibility }).eq('id', entryId)
    : supabase.from('entries').insert(payload);
  const { data: saved, error } = await write.select('id, created_at').maybeSingle();
  if (error) throw new Error(error.message);
  if (!saved?.id) throw new Error('Could not save that place.');

  await supabase.from('place_photos').delete().eq('entry_id', entryId);
  if (uploaded.length > 0) {
    const { error: photoError } = await supabase.from('place_photos').insert(
      uploaded.map((photo, index) => ({
        entry_id: entryId,
        user_id: userId,
        place_id: placeId,
        storage_path: photo.uri,
        position: index + 1,
        width: photo.width ?? null,
        height: photo.height ?? null,
      })),
    );
    if (photoError) throw new Error(photoError.message);
  }

  return {
    id: entryId,
    userId,
    placeId,
    rating: input.rating,
    note,
    tags,
    visibility: input.visibility,
    createdAt: String(saved.created_at ?? existing?.created_at ?? new Date().toISOString()),
  };
}

export async function quickSaveRemote(
  supabase: SupabaseClient,
  userId: string,
  place: Place,
): Promise<{ saved: boolean; entry?: Entry }> {
  const placeId = isUuid(place.id) ? place.id : await ensurePlace(supabase, userId, place);
  const { data: existing, error } = await supabase
    .from('entries')
    .select('id')
    .eq('user_id', userId)
    .eq('place_id', placeId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (existing?.id) {
    const { error: deleteError } = await supabase.from('entries').delete().eq('id', existing.id);
    if (deleteError) throw new Error(deleteError.message);
    return { saved: false };
  }
  const resolved = isUuid(place.id) && place.id === placeId ? place : { ...place, id: placeId };
  const entry = await saveRemoteEntry(supabase, userId, {
    place: resolved,
    rating: 5,
    note: '',
    tags: [],
    visibility: 'public',
    photos: [],
  });
  return { saved: true, entry };
}

export async function removeRemoteEntry(supabase: SupabaseClient, entryId: string): Promise<void> {
  const { error } = await supabase.from('entries').delete().eq('id', entryId);
  if (error) throw new Error(error.message);
}

export async function toggleRemoteFollow(
  supabase: SupabaseClient,
  userId: string,
  followingId: string,
): Promise<boolean> {
  if (!isUuid(followingId) || followingId === userId) return false;
  const { data: existing, error } = await supabase
    .from('follows')
    .select('follower_id')
    .eq('follower_id', userId)
    .eq('following_id', followingId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (existing) {
    const { error: deleteError } = await supabase
      .from('follows')
      .delete()
      .eq('follower_id', userId)
      .eq('following_id', followingId);
    if (deleteError) throw new Error(deleteError.message);
    return false;
  }
  const { error: insertError } = await supabase.from('follows').insert({ follower_id: userId, following_id: followingId });
  if (insertError) throw new Error(insertError.message);
  return true;
}

export async function blockRemote(supabase: SupabaseClient, userId: string, blockedId: string): Promise<void> {
  if (!isUuid(blockedId) || blockedId === userId) throw new Error('That profile can’t be blocked.');
  const { error } = await supabase.from('blocks').insert({ blocker_id: userId, blocked_id: blockedId });
  if (error && error.code !== '23505') throw new Error(error.message);
  await supabase.from('follows').delete().eq('follower_id', userId).eq('following_id', blockedId);
}

export async function unblockRemote(supabase: SupabaseClient, userId: string, blockedId: string): Promise<void> {
  const { error } = await supabase.from('blocks').delete().eq('blocker_id', userId).eq('blocked_id', blockedId);
  if (error) throw new Error(error.message);
}

export async function reportRemote(
  supabase: SupabaseClient,
  userId: string,
  input: { targetType: ReportTargetType; targetId: string; reason: string; details?: string },
): Promise<string | null> {
  if (!isUuid(input.targetId)) return 'Demo pages can’t be reported. Sign in and report a real profile.';
  const reason = input.reason.trim().slice(0, 80);
  if (!reason) return 'Pick a reason.';
  const { error } = await supabase.from('reports').insert({
    reporter_id: userId,
    target_type: input.targetType,
    target_id: input.targetId,
    reason,
    details: input.details?.trim() || null,
  });
  if (error) return error.message;
  return null;
}

export async function updateRemoteProfile(
  supabase: SupabaseClient,
  userId: string,
  patch: { displayName?: string; handle?: string; bio?: string },
): Promise<string | null> {
  const { validateHandle } = await import('@love-it/shared');
  const update: { display_name?: string; handle?: string; bio?: string } = {};
  if (patch.handle !== undefined) {
    const parsed = validateHandle(patch.handle);
    if (!parsed.ok) return parsed.message;
    update.handle = parsed.handle;
  }
  if (patch.displayName !== undefined) {
    const name = patch.displayName.trim();
    if (!name) return 'Name can’t be empty.';
    update.display_name = name;
  }
  if (patch.bio !== undefined) update.bio = patch.bio.trim().slice(0, 140);
  if (Object.keys(update).length === 0) return null;
  const { data, error } = await supabase.from('profiles').update(update).eq('id', userId).select('id').maybeSingle();
  if (error) {
    if (error.code === '23505' || /duplicate key|profiles_handle/i.test(error.message)) return 'That handle is taken.';
    return error.message;
  }
  if (!data) return 'Could not save your page.';
  if (update.handle) {
    const { error: metaError } = await supabase.auth.updateUser({ data: { handle: update.handle } });
    if (metaError) return metaError.message;
  }
  return null;
}

export function mergeProfiles(data: LoveItData, extra: UserProfile[]): LoveItData {
  const byId = new Map(data.profiles.map((profile) => [profile.id, profile]));
  for (const profile of extra) byId.set(profile.id, { ...byId.get(profile.id), ...profile });
  return { ...data, profiles: [...byId.values()] };
}

async function ensurePlace(supabase: SupabaseClient, userId: string, place: Place): Promise<string> {
  if (place.applePlaceId) {
    const { data, error } = await supabase.from('places').select('id').eq('apple_place_id', place.applePlaceId).maybeSingle();
    if (error) throw new Error(error.message);
    if (data?.id) return String(data.id);
  }
  if (isUuid(place.id)) {
    const { data, error } = await supabase.from('places').select('id').eq('id', place.id).maybeSingle();
    if (error) throw new Error(error.message);
    if (data?.id) return String(data.id);
  }
  const named = await supabase.from('places').select('id, location').ilike('name', place.name).limit(20);
  if (!named.error) {
    for (const row of named.data ?? []) {
      const point = parseGeography((row as Row).location);
      if (!point) continue;
      const { distanceMeters } = await import('@love-it/shared');
      if (distanceMeters(point, place) < 80) return String((row as Row).id);
    }
  }
  const source = placeSourceForDatabase(place);
  const { data, error } = await supabase
    .from('places')
    .insert({
      apple_place_id: source.apple_place_id,
      is_custom_pin: source.is_custom_pin,
      name: place.name,
      category: place.category,
      subtitle: place.subtitle,
      neighborhood: place.neighborhood,
      city: place.city || 'Tel Aviv',
      address: place.address,
      price_level: place.priceLevel,
      local_name: place.localName ?? null,
      location: `SRID=4326;POINT(${place.lng} ${place.lat})`,
      created_by: userId,
    })
    .select('id')
    .maybeSingle();
  if (error) {
    if (place.applePlaceId && error.code === '23505') {
      const { data: again } = await supabase.from('places').select('id').eq('apple_place_id', place.applePlaceId).maybeSingle();
      if (again?.id) return String(again.id);
    }
    throw new Error(error.message);
  }
  if (!data?.id) throw new Error('Could not save that place.');
  return String(data.id);
}

async function storePhotos(
  userId: string,
  entryId: string,
  photos: SaveEntryInput['photos'],
): Promise<Array<{ uri: string; width?: number; height?: number }>> {
  const stored: Array<{ uri: string; width?: number; height?: number }> = [];
  for (let index = 0; index < photos.slice(0, 10).length; index += 1) {
    const photo = photos[index];
    if (!photo) continue;
    const uri = photo.uri.startsWith('http://') || photo.uri.startsWith('https://')
      ? photo.uri
      : await uploadPlacePhoto(photo.uri, `${userId}/${entryId}/${index + 1}.jpg`);
    stored.push({ uri, width: photo.width, height: photo.height });
  }
  return stored;
}

async function fetchProfiles(supabase: SupabaseClient, ids: string[]): Promise<UserProfile[]> {
  const rows = await selectIn(ids, async (slice) => {
    const { data, error } = await supabase.from('profiles').select(PROFILE_COLUMNS).in('id', slice);
    return { data: (data ?? []) as Row[], error };
  });
  return rows.map(profileFromRow);
}

async function fetchPlaces(supabase: SupabaseClient, ids: string[]): Promise<Place[]> {
  if (ids.length === 0) return [];
  const fromView = await selectIn(ids, async (slice) => {
    const { data, error } = await supabase.from('places_public').select(PLACE_VIEW_COLUMNS).in('id', slice);
    return { data: (data ?? []) as Row[], error };
  }).catch(() => null);
  if (fromView && fromView.length > 0) {
    return fromView.flatMap((row) => {
      const place = placeFromRow(row);
      return place ? [place] : [];
    });
  }
  const fromTable = await selectIn(ids, async (slice) => {
    const { data, error } = await supabase.from('places').select(PLACE_TABLE_COLUMNS).in('id', slice);
    return { data: (data ?? []) as Row[], error };
  });
  return fromTable.flatMap((row) => {
    const place = placeFromRow(row);
    return place ? [place] : [];
  });
}

async function fetchPhotos(supabase: SupabaseClient, entryIds: string[]): Promise<PlacePhoto[]> {
  const rows = await selectIn(entryIds, async (slice) => {
    const { data, error } = await supabase
      .from('place_photos')
      .select('id, entry_id, user_id, place_id, storage_path, position, width, height')
      .in('entry_id', slice);
    return { data: (data ?? []) as Row[], error };
  });
  return rows.flatMap((row) => {
    const position = Number(row.position);
    if (!Number.isFinite(position)) return [];
    return [
      {
        id: String(row.id),
        entryId: String(row.entry_id),
        userId: String(row.user_id),
        placeId: String(row.place_id),
        uri: photoUri(supabase, String(row.storage_path ?? '')),
        position,
        width: row.width == null ? undefined : Number(row.width),
        height: row.height == null ? undefined : Number(row.height),
      },
    ];
  });
}

export function photoUri(supabase: SupabaseClient, storagePath: string): string {
  if (storagePath.startsWith('http://') || storagePath.startsWith('https://')) return storagePath;
  const { data } = supabase.storage.from('place-photos').getPublicUrl(storagePath);
  return data.publicUrl || storagePath;
}

type Row = Record<string, unknown>;

function profileFromRow(row: Row): UserProfile {
  const displayName = String(row.display_name ?? '');
  const id = String(row.id);
  return {
    id,
    handle: String(row.handle ?? ''),
    displayName,
    bio: String(row.bio ?? ''),
    initials: initialsFrom(displayName || String(row.handle ?? '')),
    avatarColor: colorForId(id),
    avatarUrl: (row.avatar_url as string | null) ?? null,
    city: String(row.city ?? 'Tel Aviv'),
  };
}

function entryFromRow(row: Row): Entry[] {
  const rating = Number(row.rating);
  const visibility = String(row.visibility ?? '');
  if (!isRating(rating) || !isVisibility(visibility)) return [];
  return [
    {
      id: String(row.id),
      userId: String(row.user_id),
      placeId: String(row.place_id),
      rating,
      note: String(row.note ?? ''),
      tags: Array.isArray(row.tags) ? row.tags.map(String) : [],
      visibility: visibility as Visibility,
      createdAt: String(row.created_at ?? new Date().toISOString()),
    },
  ];
}

function followFromRow(row: Row): Follow {
  return {
    followerId: String(row.follower_id),
    followingId: String(row.following_id),
    createdAt: String(row.created_at ?? new Date().toISOString()),
  };
}

function placeFromRow(row: Row): Place | null {
  const lat = Number(row.lat);
  const lng = Number(row.lng);
  const point = Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : parseGeography(row.location);
  if (!point) return null;
  const category = String(row.category ?? '');
  if (!isPlaceCategory(category)) return null;
  const price = Number(row.price_level ?? 2);
  return {
    id: String(row.id),
    applePlaceId: (row.apple_place_id as string | null) ?? null,
    isCustomPin: Boolean(row.is_custom_pin),
    name: String(row.name ?? ''),
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

async function selectIn(ids: string[], run: (slice: string[]) => Promise<{ data: Row[]; error: { message: string } | null }>): Promise<Row[]> {
  const unique = [...new Set(ids.filter(Boolean))];
  const rows: Row[] = [];
  for (let index = 0; index < unique.length; index += 80) {
    const slice = unique.slice(index, index + 80);
    const { data, error } = await run(slice);
    if (error) throw new Error(error.message);
    rows.push(...data);
  }
  return rows;
}

function initialsFrom(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const letters = (parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '');
  return (letters || name.slice(0, 2) || '•').toUpperCase();
}

function colorForId(id: string): string {
  let hash = 0;
  for (const char of id) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return AVATAR_COLORS[hash % AVATAR_COLORS.length] ?? AVATAR_COLORS[0]!;
}

function unique(values: string[]): string[] {
  const seen = new Set<string>();
  const next: string[] = [];
  for (const value of values) {
    const tag = value.trim();
    const key = tag.toLowerCase();
    if (!tag || seen.has(key)) continue;
    seen.add(key);
    next.push(tag);
  }
  return next;
}

function newId(): string {
  const cryptoObj = globalThis.crypto;
  if (cryptoObj?.randomUUID) return cryptoObj.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (char) => {
    const random = Math.floor(Math.random() * 16);
    const value = char === 'x' ? random : (random & 0x3) | 0x8;
    return value.toString(16);
  });
}
