import type { NextConfig } from 'next';
import { initOpenNextCloudflareForDev } from '@opennextjs/cloudflare';
import { isPlaceholderMode } from './lib/launch';

const nextConfig: NextConfig = {
  transpilePackages: ['@love-it/shared'],
  poweredByHeader: false,
  // Next writes an AGENTS.md on dev. Keep the repo free of that generated file.
  agentRules: false,
  async redirects() {
    return [
      {
        source: '/:path*',
        has: [{ type: 'host', value: 'www.loveitapp.com' }],
        destination: 'https://loveitapp.com/:path*',
        permanent: true,
      },
      {
        // /@yael.loves → /yael.loves. Static routes such as /places are unchanged.
        source: '/@:handle',
        destination: '/:handle',
        permanent: true,
      },
      {
        source: '/%40:handle',
        destination: '/:handle',
        permanent: true,
      },
    ];
  },
  async headers() {
    if (!isPlaceholderMode()) return [];
    return [
      {
        source: '/:path+',
        headers: [{ key: 'X-Robots-Tag', value: 'noindex, nofollow' }],
      },
    ];
  },
};

export default nextConfig;

if (process.env.NODE_ENV === 'development') {
  initOpenNextCloudflareForDev();
}
