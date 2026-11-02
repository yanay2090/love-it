import { CURRENT_USER_ID, placeSourceForDatabase, type LoveItData, type Place } from '@love-it/shared';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { SupabaseClient } from '@supabase/supabase-js';

const DIARY_KEY = 'loveit.demo.v1';
const MIGRATED_KEY = 'loveit.account-migrated.v1';

interface Envelope {
  seedVersion: number;
  data: LoveItData;
}

/**
 * Copies this phone's own saves (the local diary user) onto the signed-in account.
 * Other people's seed rows stay on the device. Safe to run again.
 */
export async function migrateLocalDiary(supabase: SupabaseClient, userId: string): Promise<void> {
  const already = await AsyncStorage.getItem(MIGRATED_KEY);
  if (already === userId) return;

  const raw = await AsyncStorage.getItem(DIARY_KEY);
  if (!raw) {
    await AsyncStorage.setItem(MIGRATED_KEY, userId);
    return;
  }

  const parsed = JSON.parse(raw) as Envelope;
  const data = parsed.data;
  if (!data?.entries || !data.places) return;

  const mine = data.entries.filter((entry) => entry.userId === CURRENT_USER_ID);
  for (const entry of mine) {
    const place = data.places.find((item) => item.id === entry.placeId);
    if (!place) continue;
    const placeId = await ensurePlace(supabase, userId, place);
    if (!placeId) continue;
    const { data: saved, error } = await supabase
      .from('entries')
      .upsert(
        {
          user_id: userId,
          place_id: placeId,
          rating: entry.rating,
          note: entry.note.slice(0, 180),
          tags: entry.tags.slice(0, 8),
          visibility: entry.visibility,
        },
        { onConflict: 'user_id,place_id' },
      )
      .select('id')
      .maybeSingle();
    if (error || !saved?.id) continue;
    const photos = data.photos
      .filter((photo) => photo.entryId === entry.id)
      .sort((a, b) => a.position - b.position)
      .slice(0, 10);
    for (const photo of photos) {
      if (!photo.uri.startsWith('http')) continue;
      await supabase.from('place_photos').upsert(
        {
          entry_id: saved.id,
          user_id: userId,
          place_id: placeId,
          storage_path: photo.uri,
          position: photo.position,
          width: photo.width ?? null,
          height: photo.height ?? null,
        },
        { onConflict: 'entry_id,position' },
      );
    }
  }

  await AsyncStorage.setItem(MIGRATED_KEY, userId);
}

async function ensurePlace(supabase: SupabaseClient, userId: string, place: Place): Promise<string | null> {
  const source = placeSourceForDatabase(place);
  if (source.apple_place_id) {
    const { data: existing } = await supabase
      .from('places')
      .select('id')
      .eq('apple_place_id', source.apple_place_id)
      .maybeSingle();
    if (existing?.id) return existing.id as string;
  }

  const { data: inserted, error } = await supabase
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
  if (error || !inserted?.id) return null;
  return inserted.id as string;
}
