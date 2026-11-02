import { MAX_PHOTOS_PER_ENTRY, type SavePhotoInput } from '@love-it/shared';
import * as ImageManipulator from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import { getSupabase } from './auth/client';

export interface PreparedPhoto extends SavePhotoInput {}

/**
 * Resize to 1600px wide and compress to JPEG before a save.
 * The diary renders the returned URI until upload replaces it with a public URL.
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

/**
 * Uploads with the signed-in session. `objectPath` must start with the user's id
 * (`${uid}/${entryId}/${n}.jpg`) so the storage policy accepts it.
 * Throws on failure — callers show the message instead of keeping a local file URI.
 */
export async function uploadPlacePhoto(localUri: string, objectPath: string): Promise<string> {
  const supabase = getSupabase();
  if (!supabase) throw new Error('Photo upload needs the Supabase publishable key.');
  const { data: sessionData } = await supabase.auth.getSession();
  if (!sessionData.session) throw new Error('Sign in to add photos.');
  const response = await fetch(localUri);
  if (!response.ok) throw new Error('Could not read that photo on this phone.');
  const body = await response.arrayBuffer();
  const { error } = await supabase.storage.from('place-photos').upload(objectPath, body, {
    contentType: 'image/jpeg',
    upsert: true,
  });
  if (error) throw new Error(error.message || 'Could not upload that photo.');
  const { data } = supabase.storage.from('place-photos').getPublicUrl(objectPath);
  if (!data.publicUrl) throw new Error('Could not upload that photo.');
  return data.publicUrl;
}
