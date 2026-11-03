import { categoryLabel, publicSiteOrigin, type Place } from '@love-it/shared';
import type { Metadata } from 'next';

export function siteOrigin(): string {
  return publicSiteOrigin(process.env.NEXT_PUBLIC_SITE_URL);
}

export function defaultOgImage(): string {
  return `${siteOrigin()}/og-default.png`;
}

const imageSize = { width: 1200, height: 630, type: 'image/png' as const };

export function profileShareCopy(name: string, loved: number, city = 'Tel Aviv'): { title: string; description: string } {
  const first = name.trim().split(/\s+/)[0] || name;
  return {
    title: `${first}'s favorite places in ${city}`,
    description: `${loved} ${loved === 1 ? 'place' : 'places'} on Love it`,
  };
}

export function placeShareCopy(place: Place): { title: string; description: string } {
  const category = categoryLabel(place.category);
  const area = place.neighborhood || place.city || '';
  const description = category && area ? `${category} · ${area}` : category || area || 'Love it';
  return { title: place.name || 'Love it', description };
}

export function ogVersion(updatedAt?: string | null): string {
  const time = updatedAt ? Date.parse(updatedAt) : Number.NaN;
  return Number.isFinite(time) ? String(time) : '1';
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

