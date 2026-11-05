'use client';

import { useEffect } from 'react';
import { track } from '../lib/analytics';

export function TrackPublicPage({ handle }: { handle: string }) {
  useEffect(() => {
    track('public_page_viewed', { handle });
  }, [handle]);
  return null;
}
