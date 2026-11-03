import { validateHandle } from '@love-it/shared';
import { ShareCard, brandCard, renderShareCard } from '../../lib/og/card';
import { OG_SIZE } from '../../lib/og/fonts';
import { pinsFromPlaces, profileShareCopy } from '../../lib/og/share';
import { loadPublicProfile, seedHandles } from '../../lib/data';
import { isPlaceholderMode } from '../../lib/launch';

export const alt = 'Love it';
export const size = OG_SIZE;
export const contentType = 'image/png';

export default async function ProfileOgImage({ params }: { params: Promise<{ handle: string }> }) {
  const { handle } = await params;
  const key = handle.trim().replace(/^@+/, '').toLowerCase();
  const hiddenSeed = isPlaceholderMode() && seedHandles().includes(key);
  const parsed = validateHandle(key);
  const page = hiddenSeed || !parsed.ok ? null : await loadPublicProfile(parsed.handle);
  if (!page) return renderShareCard(brandCard());
  const copy = profileShareCopy(page.profile.displayName, page.loved);
  return renderShareCard(
    <ShareCard
      kicker={`@${page.profile.handle}`}
      title={page.profile.displayName}
      subtitle={copy.description}
      initials={page.profile.initials || '♥'}
      pins={pinsFromPlaces(page.places.map((item) => item.place))}
    />,
  );
}
