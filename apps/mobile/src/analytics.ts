import type { AnalyticsEventMap, AnalyticsEventName } from '@love-it/shared';
import { analyticsProperties } from '@love-it/shared';

type Client = { capture: (event: string, properties?: Record<string, string | number | boolean>) => void };

let client: Client | null = null;
let mode: 'idle' | 'loading' | 'ready' | 'off' = 'idle';
const queue: Array<{ name: string; props: Record<string, string | number | boolean> }> = [];

function key(): string | undefined {
  return process.env.EXPO_PUBLIC_POSTHOG_KEY || undefined;
}

export function analyticsEnabled(): boolean {
  return Boolean(key());
}

function ensure(): void {
  const apiKey = key();
  if (!apiKey || mode !== 'idle') return;
  mode = 'loading';
  import('posthog-react-native')
    .then((mod) => {
      const PostHog = mod.default;
      const created = new PostHog(apiKey, {
        host: process.env.EXPO_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com',
      });
      client = created;
      mode = 'ready';
      for (const event of queue) created.capture(event.name, event.props);
      queue.length = 0;
    })
    .catch(() => {
      mode = 'off';
      queue.length = 0;
    });
}

/** No-ops when EXPO_PUBLIC_POSTHOG_KEY is unset, so the simulator runs with zero keys. */
export function track<K extends AnalyticsEventName>(name: K, props: AnalyticsEventMap[K]): void {
  if (!key()) return;
  ensure();
  const properties = analyticsProperties(props);
  if (client) client.capture(name, properties);
  else if (mode === 'loading') queue.push({ name, props: properties });
}
