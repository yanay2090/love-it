import { MAX_PHOTOS_PER_ENTRY, type SavePhotoInput } from '@love-it/shared';
import * as ImageManipulator from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';

export interface PreparedPhoto extends SavePhotoInput {}

/**
 * Resize to 1600px wide and compress to JPEG before a save.
 * Ready for the `place-photos` Supabase bucket; without keys the local file
 * URI is what the diary renders.
 */
export async function preparePlacePhoto(uri: string): Promise<PreparedPhoto> {
  try {
    const result = await ImageManipulator.manipulateAsync(uri, [{ resize: { width: 1600 } }], {
      compress: 0.72,
      format: ImageManipulator.SaveFormat.JPEG,
    });
    return { uri: result.uri, width: result.width, height: result.height };
  } catch {
    return { uri };
  }
}

export async function pickPlacePhotos(already: number): Promise<PreparedPhoto[]> {
  const remaining = MAX_PHOTOS_PER_ENTRY - already;
  if (remaining <= 0) return [];
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) return [];
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsMultipleSelection: true,
    selectionLimit: remaining,
    quality: 0.8,
  });
  if (result.canceled) return [];
  const prepared: PreparedPhoto[] = [];
  for (const asset of result.assets.slice(0, remaining)) {
    prepared.push(await preparePlacePhoto(asset.uri));
  }
  return prepared;
}

export async function uploadPlacePhoto(localUri: string, objectPath: string): Promise<string> {
  const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseKey) return localUri;
  try {
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false } });
    const response = await fetch(localUri);
    const body = await response.blob();
    const { error } = await supabase.storage.from('place-photos').upload(objectPath, body, {
      contentType: 'image/jpeg',
      upsert: true,
    });
    if (error) return localUri;
    const { data } = supabase.storage.from('place-photos').getPublicUrl(objectPath);
    return data.publicUrl || localUri;
  } catch {
    return localUri;
  }
}
