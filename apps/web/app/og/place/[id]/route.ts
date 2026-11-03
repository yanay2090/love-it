import { categoryLabel } from '@love-it/shared';
import { loadPublicPlace, seedPlaceIds } from '../../../../lib/data';
import { isPlaceholderMode } from '../../../../lib/launch';
import { fetchImage } from '../../../../lib/og/images';
import { defaultOgResponse, placeCard, pngResponse, renderCard } from '../../../../lib/og/layout';

export const dynamic = 'force-dynamic';

const TOO_BIG = 280 * 1024;

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const placeId = decodeURIComponent(id).replace(/\.png$/, '');
  const loaded = await loadPublicPlace(placeId);
  if (!loaded || (isPlaceholderMode() && (loaded.source === 'seed' || seedPlaceIds().includes(placeId)))) {
    return defaultOgResponse();
  }
  const { place } = loaded.view;
  const photoUrl = loaded.view.heroPhotos[0] || place.covers[0] || '';
  const photo = photoUrl ? await fetchImage(photoUrl, 4000) : null;
  const usable = photo && (photo.width === null || photo.width >= 600) ? photo.uri : null;
  const input = {
    name: place.name || 'Love it',
    category: categoryLabel(place.category),
    area: place.neighborhood || place.city || '',
    photoSrc: usable,
  };
  let bytes = await renderCard(placeCard(input));
  if (usable && bytes.byteLength > TOO_BIG) {
    bytes = await renderCard(placeCard({ ...input, photoSrc: null }));
  }
  return pngResponse(bytes);
}
