import { validateHandle } from '@love-it/shared';
import { loadPublicProfile, seedHandles } from '../../../../lib/data';
import { isPlaceholderMode } from '../../../../lib/launch';
import { fetchImage, initialsBackground } from '../../../../lib/og/images';
import { defaultOgResponse, pngResponse, profileCard, renderCard } from '../../../../lib/og/layout';

export const dynamic = 'force-dynamic';

function firstName(name: string): string {
  return name.trim().split(/\s+/)[0] || name;
}

export async function GET(_request: Request, context: { params: Promise<{ handle: string }> }) {
  const { handle } = await context.params;
  const key = handle.trim().replace(/^@+/, '').replace(/\.png$/, '').toLowerCase();
  const parsed = validateHandle(key);
  const hidden = isPlaceholderMode() && seedHandles().includes(key);
  if (!parsed.ok || hidden) return defaultOgResponse();
  const page = await loadPublicProfile(parsed.handle);
  if (!page) return defaultOgResponse();
  const name = page.profile.displayName.trim() || `@${page.profile.handle}`;
  const avatar = page.profile.avatarUrl ? await fetchImage(page.profile.avatarUrl, 500) : null;
  const bytes = await renderCard(
    profileCard({
      name,
      first: firstName(name),
      count: page.loved,
      avatarSrc: avatar?.uri ?? null,
      avatarBg: initialsBackground(page.profile.handle),
    }),
  );
  return pngResponse(bytes);
}
