/** Read width from a PNG or JPEG header. Unknown formats return null. */
export function imageWidth(bytes: Uint8Array): number | null {
  if (bytes.length > 24 && bytes[0] === 0x89 && bytes[1] === 0x50) {
    return (bytes[16]! << 24) | (bytes[17]! << 16) | (bytes[18]! << 8) | bytes[19]!;
  }
  if (bytes.length < 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8) return null;
  let index = 2;
  while (index + 8 < bytes.length) {
    if (bytes[index] !== 0xff) return null;
    const marker = bytes[index + 1] ?? 0;
    const length = ((bytes[index + 2] ?? 0) << 8) | (bytes[index + 3] ?? 0);
    if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
      return ((bytes[index + 7] ?? 0) << 8) | (bytes[index + 8] ?? 0);
    }
    if (length < 2) return null;
    index += 2 + length;
  }
  return null;
}

export async function fetchImage(url: string, timeoutMs: number): Promise<{ uri: string; width: number | null } | null> {
  if (!url.startsWith('https://') && !url.startsWith('http://')) return null;
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(timeoutMs) });
    if (!response.ok) return null;
    const bytes = new Uint8Array(await response.arrayBuffer());
    if (bytes.byteLength < 32) return null;
    const type = (response.headers.get('content-type') || 'image/jpeg').split(';')[0] || 'image/jpeg';
    const mime = type.startsWith('image/') ? type : 'image/jpeg';
    return { uri: `data:${mime};base64,${Buffer.from(bytes).toString('base64')}`, width: imageWidth(bytes) };
  } catch {
    return null;
  }
}

/** Clay by default. Ink when the handle hash is odd, so the colour never flips. */
export function initialsBackground(handle: string): string {
  let hash = 0;
  for (let index = 0; index < handle.length; index += 1) {
    hash = (Math.imul(31, hash) + handle.charCodeAt(index)) | 0;
  }
  return Math.abs(hash) % 2 === 1 ? '#1C1917' : '#B0714B';
}
