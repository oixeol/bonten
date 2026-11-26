import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@bonten/shared'],
  output: 'standalone',
};

export default nextConfig;