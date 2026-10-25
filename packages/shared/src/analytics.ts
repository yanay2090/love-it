import type { PlaceCategory, Rating, Visibility } from './domain';

/**
 * Day-one events. Both clients no-op when the PostHog key is missing,
 * and the property bags stay typed so a rename fails typecheck.
 */
export const DAY_ONE_EVENTS = [
  'app_opened',
  'signup_completed',
  'gmaps_import_started',
  'gmaps_import_completed',
  'place_saved',
  'place_viewed',
  'profile_shared',
  'public_page_viewed',
  'public_page_cta_clicked',
  'user_followed',
] as const;

export type AnalyticsEventName = (typeof DAY_ONE_EVENTS)[number];

export interface AnalyticsEventMap {
  app_opened: { source: 'cold_start' };
  signup_completed: { method: 'demo' | 'apple' | 'email' };
  gmaps_import_started: { source: 'my_page' };
  gmaps_import_completed: { imported_count: number };
  place_saved: {
    place_id: string;
    category: PlaceCategory;
    rating: Rating;
    visibility: Visibility;
    time_to_save_ms: number;
    photo_count: number;
    has_note: boolean;
  };
  place_viewed: { place_id: string; source: 'explore' | 'list' | 'profile' | 'deep_link' };
  profile_shared: { handle: string; surface: 'my_page' | 'other_page' };
  public_page_viewed: { handle: string };
  public_page_cta_clicked: { handle: string; cta: 'open_app' | 'install' };
  user_followed: { target_user_id: string; target_handle: string };
}

export type AnalyticsProperties = Record<string, string | number | boolean>;

export function analyticsProperties<K extends AnalyticsEventName>(
  props: AnalyticsEventMap[K],
): AnalyticsProperties {
  return props;
}
