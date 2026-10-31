import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: ['@love-it/shared'],
  poweredByHeader: false,
  // Next writes an AGENTS.md on dev. Keep the repo free of that generated file.
  agentRules: false,
  async redirects() {
    return [
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
};

export default nextConfig;
