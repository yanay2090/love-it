import { createRequire } from 'node:module';
import path from 'node:path';
import type { NextConfig } from 'next';
import { initOpenNextCloudflareForDev } from '@opennextjs/cloudflare';
import { isPlaceholderMode } from './lib/launch';

const require = createRequire(import.meta.url);

const nextConfig: NextConfig = {
  transpilePackages: ['@love-it/shared'],
  poweredByHeader: false,
  // Turbopack's root is the monorepo. upng-js's package.json main is the
  // extensionless file "UPNG", which that resolver misses. Point each OG
  // package at the file Node already resolves.
  turbopack: {
    resolveAlias: {
      'upng-js': require.resolve('upng-js/UPNG.js'),
      pngjs: path.join(path.dirname(require.resolve('pngjs/package.json')), 'lib/png.js'),
      'bidi-js': require.resolve('bidi-js'),
      '@shuding/opentype.js': require.resolve('@shuding/opentype.js'),
    },
  },
  // Next writes an AGENTS.md on dev. Keep the repo free of that generated file.
  agentRules: false,
  async rewrites() {
    return [
      { source: '/og/profile/:handle.png', destination: '/og/profile/:handle' },
      { source: '/og/place/:id.png', destination: '/og/place/:id' },
    ];
  },
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
