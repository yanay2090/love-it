/**
 * `placeholder` is the public coming-soon site (loveitapp.com).
 * `live` is the full diary, including seed profiles and place pages.
 *
 * Unset in production means placeholder. Unset in `next dev` means live,
 * so the local diary stays clickable. Set NEXT_PUBLIC_LAUNCH_MODE to override.
 */
export type LaunchMode = 'placeholder' | 'live';

export function launchMode(): LaunchMode {
  const raw = process.env.NEXT_PUBLIC_LAUNCH_MODE?.trim().toLowerCase();
  if (raw === 'live') return 'live';
  if (raw === 'placeholder') return 'placeholder';
  return process.env.NODE_ENV === 'production' ? 'placeholder' : 'live';
}

export function isPlaceholderMode(): boolean {
  return launchMode() === 'placeholder';
}
