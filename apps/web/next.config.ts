import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  turbopack: {
    root: require('path').resolve(__dirname, '../..'),
  },
  /* config options here */
  output: process.env.GITHUB_ACTIONS ? 'export' : undefined,
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: process.env.GITHUB_ACTIONS ? true : false,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
    ],
  },
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        async_hooks: false,
      };
    }
    return config;
  },
};

export default nextConfig;
