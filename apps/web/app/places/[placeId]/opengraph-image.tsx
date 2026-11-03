import { categoryLabel } from '@love-it/shared';
import { ShareCard, brandCard, renderShareCard } from '../../../lib/og/card';
import { OG_SIZE } from '../../../lib/og/fonts';
import { loadPublicPlace, seedPlaceIds } from '../../../lib/data';
import { isPlaceholderMode } from '../../../lib/launch';

export const alt = 'Love it';
export const size = OG_SIZE;
export const contentType = 'image/png';

export default async function PlaceOgImage({ params }: { params: Promise<{ placeId: string }> }) {
  const { placeId } = await params;
  const loaded = await loadPublicPlace(placeId);
  if (!loaded || (isPlaceholderMode() && (loaded.source === 'seed' || seedPlaceIds().includes(placeId)))) {
    return renderShareCard(brandCard());
  }
  const { place } = loaded.view;
  const lovers = loaded.view.lovers.map((lover) => lover.profile);
  const who = lovers[0]?.displayName;
  return renderShareCard(
    <ShareCard
      kicker={[categoryLabel(place.category), place.neighborhood || 'Tel Aviv'].join(' · ').toUpperCase()}
      title={place.name}
      subtitle={who ? `Loved by ${who}` : 'On Love it'}
      pins={[{ x: 0.48, y: 0.42 }]}
    />,
  );
}
