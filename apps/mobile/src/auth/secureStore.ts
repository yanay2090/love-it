import * as SecureStore from 'expo-secure-store';

const CHUNK = 1800;

/**
 * Supabase sessions are larger than SecureStore's 2048-byte value limit.
 * Values are split into numbered chunks. Keys stay within SecureStore's alphabet.
 */
function chunkKey(key: string, index: number): string {
  return `${key}.${index}`;
}

export const secureAuthStorage = {
  async getItem(key: string): Promise<string | null> {
    const countRaw = await SecureStore.getItemAsync(`${key}.n`);
    if (!countRaw) return SecureStore.getItemAsync(key);
    const count = Number(countRaw);
    if (!Number.isFinite(count) || count <= 0) return null;
    const parts: string[] = [];
    for (let index = 0; index < count; index += 1) {
      const part = await SecureStore.getItemAsync(chunkKey(key, index));
      if (part == null) return null;
      parts.push(part);
    }
    return parts.join('');
  },
  async setItem(key: string, value: string): Promise<void> {
    const count = Math.max(1, Math.ceil(value.length / CHUNK));
    await SecureStore.setItemAsync(`${key}.n`, String(count));
    for (let index = 0; index < count; index += 1) {
      await SecureStore.setItemAsync(key + '.' + String(index), value.slice(index * CHUNK, (index + 1) * CHUNK));
    }
  },
  async removeItem(key: string): Promise<void> {
    const countRaw = await SecureStore.getItemAsync(`${key}.n`);
    const count = Number(countRaw ?? 0);
    await SecureStore.deleteItemAsync(`${key}.n`);
    await SecureStore.deleteItemAsync(key);
    for (let index = 0; index < count; index += 1) {
      await SecureStore.deleteItemAsync(chunkKey(key, index));
    }
  },
};
