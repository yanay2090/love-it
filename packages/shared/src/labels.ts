import type { Place, PlaceCategory, Rating, UserProfile, Visibility } from './domain';
import { RATING_LABEL } from './domain';

export function categoryLabel(category: PlaceCategory): string {
  switch (category) {
    case 'cafe':
      return 'Cafe';
    case 'restaurant':
      return 'Restaurant';
    case 'bar':
      return 'Bar';
    case 'bakery':
      return 'Bakery';
    case 'hotel':
      return 'Hotel';
    case 'attraction':
      return 'Attraction';
  }
}

export function placeListMeta(place: Place): string {
  const kind = place.category === 'cafe' ? 'Coffee' : (place.listKind ?? categoryLabel(place.category));
  return `${kind} · ${place.neighborhood}`;
}

export function placeDetailMeta(place: Place): string {
  const parts = [categoryLabel(place.category)];
  if (place.subtitle && place.subtitle.toLowerCase() !== categoryLabel(place.category).toLowerCase()) {
    parts.push(place.subtitle);
  }
  if (place.localName) parts.push(place.localName);
  parts.push(place.neighborhood);
  return parts.join(' · ');
}

export function priceLabel(level: Place['priceLevel']): string {
  return '₪'.repeat(level);
}

export function ratingLabel(rating: Rating): string {
  return RATING_LABEL[rating];
}

export function visibilityLabel(visibility: Visibility): string {
  switch (visibility) {
    case 'public':
      return 'Public';
    case 'friends':
      return 'Friends';
    case 'private':
      return 'Private';
  }
}

export function firstName(displayName: string): string {
  return displayName.split(' ')[0] || displayName;
}

export function formatNameList(profiles: Pick<UserProfile, 'displayName'>[]): string {
  const names = profiles.map((profile) => firstName(profile.displayName));
  if (names.length === 0) return '';
  if (names.length === 1) return names[0] ?? '';
  if (names.length === 2) return `${names[0]} & ${names[1]}`;
  return `${names.slice(0, -1).join(', ')} & ${names[names.length - 1]}`;
}

export function lovedByLine(count: number, profiles: Pick<UserProfile, 'displayName'>[]): string {
  if (count <= 0) return 'Be the first to love this';
  if (count === 1) return `Loved by ${formatNameList(profiles)}`;
  return `Loved by ${count} friend${count === 1 ? '' : 's'}`;
}

export function categoryFromApplePoi(poi: string | undefined): PlaceCategory {
  const value = (poi ?? '').toLowerCase();
  if (value.includes('bakery') || value.includes('pastry')) return 'bakery';
  if (value.includes('cafe') || value.includes('coffee') || value.includes('tea')) return 'cafe';
  if (
    value.includes('nightlife') ||
    value.includes('bar') ||
    value.includes('brewery') ||
    value.includes('winery') ||
    value.includes('wine')
  ) {
    return 'bar';
  }
  if (value.includes('hotel') || value.includes('lodging')) return 'hotel';
  if (
    value.includes('museum') ||
    value.includes('park') ||
    value.includes('attraction') ||
    value.includes('landmark') ||
    value.includes('theater') ||
    value.includes('theatre') ||
    value.includes('beach')
  ) {
    return 'attraction';
  }
  return 'restaurant';
}
