import { cloneSeed, isOwnLocalSave, type LoveItData, type Place } from '@love-it/shared';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { SupabaseClient } from '@supabase/supabase-js';
import { saveRemoteEntry } from '../remoteDiary';

const DIARY_KEY = 'loveit.demo.v1';
/** v2 skips the seed diary. v1 had already copied Yael's saves, so it must not count. */
const MIGRATED_KEY = 'loveit.account-migrated.v2';
const LEGACY_MIGRATED_KEY = 'loveit.account-migrated.v1';

interface Envelope {
  seedVersion: number;
  data: LoveItData;
}

/**
 * Copies saves this phone created locally onto the signed-in account.
 * Yael's seed diary is never copied. The flag is set only after every row succeeds.
 */
export async function migrateLocalDiary(supabase: SupabaseClient, userId: string): Promise<void> {
  const already = await AsyncStorage.getItem(MIGRATED_KEY);
  if (already === userId) return;

  const raw = await AsyncStorage.getItem(DIARY_KEY);
  if (!raw) {
    await AsyncStorage.setItem(MIGRATED_KEY, userId);
    return;
  }

  let data: LoveItData;
  try {
    const parsed = JSON.parse(raw) as Envelope;
    data = parsed.data;
  } catch {
    return;
  }
  if (!data?.entries || !data.places) return;

  const seed = cloneSeed();
  const mine = data.entries.flatMap((entry) => {
    const place = data.places.find((item) => item.id === entry.placeId);
    if (!isOwnLocalSave(entry, place, seed) || !place) return [];
    return [{ entry, place }];
  });

  for (const item of mine) {
    const photos = data.photos
      .filter((photo) => photo.entryId === item.entry.id)
      .sort((a, b) => a.position - b.position)
      .filter((photo) => !photo.uri.includes('images.unsplash.com'))
      .slice(0, 10)
      .map((photo) => ({ uri: photo.uri, width: photo.width, height: photo.height }));
    await saveRemoteEntry(supabase, userId, {
      place: item.place as Place,
      rating: item.entry.rating,
      note: item.entry.note,
      tags: item.entry.tags,
      visibility: item.entry.visibility,
      photos: photos.filter((photo) => photo.uri.startsWith('https://') || photo.uri.startsWith('http://')),
    });
  }

  await AsyncStorage.setItem(MIGRATED_KEY, userId);
}

export async function clearLocalDiary(): Promise<void> {
  await AsyncStorage.multiRemove([DIARY_KEY, MIGRATED_KEY, LEGACY_MIGRATED_KEY]);
}
