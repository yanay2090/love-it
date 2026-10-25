import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: ['@love-it/shared'],
  poweredByHeader: false,
  // Next writes an AGENTS.md on dev. Keep the repo free of that generated file.
  agentRules: false,
};

export default nextConfig;
