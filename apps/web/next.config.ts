import type { NextConfig } from 'next';
import withSerwistInit from '@serwist/next';

// Set ELECTRON_BUILD=1 when running `next build` for the desktop bundle.
// This enables static export and disables features incompatible with file:// serving:
//   - withSerwist (service workers require a server origin — skipped for Electron)
//   - Next.js Image Optimization (replaced with unoptimized: true for static export)
//   - Server Actions / API routes (all removed from the static bundle)
const isElectronBuild = process.env.ELECTRON_BUILD === '1';

const withSerwist = withSerwistInit({
  swSrc: 'src/app/sw.ts',
  swDest: 'public/sw.js',
  disable: process.env.NODE_ENV !== 'production',
});

const nextConfig: NextConfig = {
  // Static export for Electron — each route gets its own index.html so
  // file:// navigation works without a server.
  ...(isElectronBuild && {
    output: 'export',
    trailingSlash: true,
  }),
  turbopack: {
    root: require('path').resolve(__dirname, '../..'),
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    // Next.js image optimisation requires a server; use unoptimised for static export.
    ...(isElectronBuild && { unoptimized: true }),
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

// Serwist injects a service-worker registration script which is incompatible
// with static export / file:// origins. Skip the wrapper for Electron builds.
export default isElectronBuild ? nextConfig : withSerwist(nextConfig);
