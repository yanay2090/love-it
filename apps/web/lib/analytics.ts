'use client';

import type { AnalyticsEventMap, AnalyticsEventName } from '@love-it/shared';
import { analyticsProperties } from '@love-it/shared';

let started = false;

export function track<K extends AnalyticsEventName>(name: K, props: AnalyticsEventMap[K]): void {
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  if (!key) return;
  void import('posthog-js')
    .then(({ default: posthog }) => {
      if (!started) {
        posthog.init(key, {
          api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com',
          capture_pageview: false,
          persistence: 'memory',
        });
        started = true;
      }
      posthog.capture(name, analyticsProperties(props));
    })
    .catch(() => {
      // Missing key path returns above. A failed script load should not break the page.
    });
}
