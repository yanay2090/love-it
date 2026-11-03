import { ImageResponse } from 'next/og';
import { instrumentSerif, interTight, rubikHebrew, rubikLatin } from './font-data';

/**
 * Fonts are inlined (latin + Hebrew) so the Cloudflare Worker does not need a
 * filesystem or a type-foundry fetch. Swap `ShareCard` in ./card when a final
 * banner arrives. Home and unknown handles use /og-default.png instead.
 */
function bytes(base64: string): ArrayBuffer {
  const buffer = Buffer.from(base64, 'base64');
  return buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
}

let pending: Promise<NonNullable<ConstructorParameters<typeof ImageResponse>[1]>['fonts']> | null = null;

export function ogFonts() {
  pending ??= Promise.resolve([
    { name: 'Instrument Serif', data: bytes(instrumentSerif), weight: 400 as const, style: 'normal' as const },
    { name: 'Inter Tight', data: bytes(interTight), weight: 500 as const, style: 'normal' as const },
    { name: 'Rubik', data: bytes(rubikLatin), weight: 600 as const, style: 'normal' as const },
    { name: 'Rubik', data: bytes(rubikHebrew), weight: 600 as const, style: 'normal' as const },
  ]);
  return pending;
}

export const OG_SIZE = { width: 1200, height: 630 };

export const OG_HEADERS = {
  'Content-Type': 'image/png',
  'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800',
};
