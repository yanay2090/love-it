import { categoryLabel, formatNameList, publicSiteOrigin, type Place, type UserProfile } from '@love-it/shared';
import type { Metadata } from 'next';
import type { SharePin } from './card';

export function siteOrigin(): string {
  return publicSiteOrigin(process.env.NEXT_PUBLIC_SITE_URL);
}

export function defaultOgImage(): string {
  return `${siteOrigin()}/og-default.png`;
}

const imageSize = { width: 1200, height: 630, type: 'image/png' as const };

export function profileShareCopy(name: string, loved: number): { title: string; description: string } {
  const title = `${name}'s favorite places in Tel Aviv`;
  const description =
    loved === 1 ? '1 cafe and restaurant on Love it' : `${loved} cafes and restaurants on Love it`;
  return { title, description };
}

export function placeShareCopy(place: Place, lovers: Pick<UserProfile, 'displayName'>[]): { title: string; description: string } {
  const where = [categoryLabel(place.category), place.neighborhood || place.city || 'Tel Aviv'].join(' · ');
  const who = lovers.length > 0 ? `Loved by ${formatNameList(lovers)}` : 'On Love it';
  return { title: place.name, description: `${where}. ${who}.` };
}

export function shareMetadata(input: {
  title: string;
  description: string;
  url: string;
  image: string;
  robots?: Metadata['robots'];
}): Metadata {
  const image = {
    url: input.image,
    ...imageSize,
    alt: input.title,
  };
  return {
    title: input.title,
    description: input.description,
    robots: input.robots,
    openGraph: {
      title: input.title,
      description: input.description,
      url: input.url,
      siteName: 'Love it',
      type: 'website',
      images: [image],
    },
    twitter: {
      card: 'summary_large_image',
      title: input.title,
      description: input.description,
      images: [input.image],
    },
  };
}

export function fallbackShareMetadata(robots?: Metadata['robots']): Metadata {
  const origin = siteOrigin();
  return shareMetadata({
    title: 'Love it',
    description: 'A map of the cafes and restaurants you actually love. Tel Aviv first.',
    url: origin,
    image: defaultOgImage(),
    robots,
  });
}

/** Spread real coordinates across the map panel. One pin sits in the middle. */
export function pinsFromPlaces(places: { lat: number; lng: number }[]): SharePin[] {
  if (places.length === 0) return [];
  if (places.length === 1) return [{ x: 0.48, y: 0.42 }];
  const lats = places.map((place) => place.lat);
  const lngs = places.map((place) => place.lng);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);
  const latSpan = Math.max(maxLat - minLat, 0.004);
  const lngSpan = Math.max(maxLng - minLng, 0.004);
  return places.slice(0, 8).map((place) => ({
    x: 0.12 + ((place.lng - minLng) / lngSpan) * 0.72,
    y: 0.12 + ((maxLat - place.lat) / latSpan) * 0.7,
  }));
}
