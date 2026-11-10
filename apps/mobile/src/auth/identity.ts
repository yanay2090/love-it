import type { User } from '@supabase/supabase-js';
import { validateHandle } from '@love-it/shared';

export interface GoogleIdentity {
  displayName: string;
  avatarUrl: string;
  email: string;
  suggestedHandle: string;
}

function metaString(metadata: Record<string, unknown> | undefined, key: string): string {
  const value = metadata?.[key];
  return typeof value === 'string' ? value.trim() : '';
}

/** Name, photo, and email Google (or Apple) stored on the Supabase user. */
export function identityFromUser(user: Pick<User, 'email' | 'user_metadata'> | null | undefined): GoogleIdentity {
  const metadata = user?.user_metadata as Record<string, unknown> | undefined;
  const displayName = metaString(metadata, 'full_name') || metaString(metadata, 'name');
  const avatarUrl = metaString(metadata, 'avatar_url') || metaString(metadata, 'picture');
  const email = (user?.email ?? metaString(metadata, 'email')).trim();
  return {
    displayName,
    avatarUrl,
    email,
    suggestedHandle: suggestHandle(displayName, email),
  };
}

export function isPlaceholderName(name: string | null | undefined): boolean {
  const trimmed = name?.trim() ?? '';
  return trimmed.length === 0 || trimmed === 'New on Love it';
}

function suggestHandle(displayName: string, email: string): string {
  const source = displayName || email.split('@')[0] || '';
  const slug = source
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9._]+/g, '.')
    .replace(/\.{2,}/g, '.')
    .replace(/^\.+|\.+$/g, '')
    .slice(0, 30);
  const parsed = validateHandle(slug);
  return parsed.ok ? parsed.handle : '';
}
