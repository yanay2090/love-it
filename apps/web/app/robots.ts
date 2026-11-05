import type { MetadataRoute } from 'next';
import { isPlaceholderMode } from '../lib/launch';

export default function robots(): MetadataRoute.Robots {
  if (!isPlaceholderMode()) {
    return { rules: { userAgent: '*', allow: '/' } };
  }
  return {
    rules: {
      userAgent: '*',
      allow: '/$',
      disallow: '/',
    },
  };
}
