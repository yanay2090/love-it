export const PLACE_CATEGORIES = [
  'cafe',
  'restaurant',
  'bar',
  'bakery',
  'hotel',
  'attraction',
] as const;

export type PlaceCategory = (typeof PLACE_CATEGORIES)[number];

export const VISIBILITIES = ['public', 'friends', 'private'] as const;

export type Visibility = (typeof VISIBILITIES)[number];

export const RATINGS = [1, 2, 3, 4, 5] as const;

export type Rating = (typeof RATINGS)[number];

/** Spoken labels for the 1–5 score. 5 is the "Love it" save. */
export const RATING_LABEL: Record<Rating, string> = {
  1: 'Okay',
  2: 'Okay',
  3: 'Good',
  4: 'Great',
  5: 'Loved it',
};

export const MAX_PHOTOS_PER_ENTRY = 10;
export const MAX_NOTE_LENGTH = 180;
export const MAX_TAGS = 8;

export const SUGGESTED_TAGS = [
  'Date spot',
  'Outdoor seating',
  'Great coffee',
  'Laptop-friendly',
  'Late night',
  'Outdoor',
] as const;

export interface Place {
  id: string;
  /** Apple MKMapItem.Identifier / Maps Server API place id, when matched. */
  applePlaceId: string | null;
  /** True when the pin was dropped by a person instead of matched to Apple. */
  isCustomPin: boolean;
  name: string;
  category: PlaceCategory;
  /** Cuisine or style line, e.g. "Israeli grill". */
  subtitle: string;
  /** Short list word when it differs from the category, e.g. "Brunch". */
  listKind?: string;
  neighborhood: string;
  city: string;
  address: string;
  lat: number;
  lng: number;
  priceLevel: 1 | 2 | 3 | 4;
  localName?: string;
  /** Curated hero photos used until the viewer attaches their own. */
  covers: string[];
}

export interface UserProfile {
  id: string;
  handle: string;
  displayName: string;
  bio: string;
  initials: string;
  avatarColor: string;
  city: string;
}

/** A saved place on someone's page. One row per person per place. */
export interface Entry {
  id: string;
  userId: string;
  placeId: string;
  rating: Rating;
  note: string;
  tags: string[];
  visibility: Visibility;
  createdAt: string;
}

export interface PlacePhoto {
  id: string;
  entryId: string;
  userId: string;
  placeId: string;
  uri: string;
  /** 1 through 10, matching place_photos.position. */
  position: number;
  width?: number;
  height?: number;
}

export interface Follow {
  followerId: string;
  followingId: string;
  createdAt: string;
}

export type ReportTargetType = 'profile' | 'entry' | 'photo' | 'place';

export interface Report {
  id: string;
  reporterId: string;
  targetType: ReportTargetType;
  targetId: string;
  reason: string;
  details?: string;
  createdAt: string;
}

export interface Block {
  blockerId: string;
  blockedId: string;
  createdAt: string;
}

export interface LoveItData {
  profiles: UserProfile[];
  places: Place[];
  entries: Entry[];
  photos: PlacePhoto[];
  follows: Follow[];
  blocks: Block[];
  reports: Report[];
}

export const REPORT_REASONS = [
  'Spam',
  'Inappropriate photo',
  'Harassment',
  'Not a real place',
] as const;

export function isRating(value: number): value is Rating {
  return value === 1 || value === 2 || value === 3 || value === 4 || value === 5;
}

export function isVisibility(value: string): value is Visibility {
  return value === 'public' || value === 'friends' || value === 'private';
}

export function isPlaceCategory(value: string): value is PlaceCategory {
  return (PLACE_CATEGORIES as readonly string[]).includes(value);
}
