import type { NextConfig } from 'next';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const repoDomains = resolve(__dirname, '../../domains');
const repoPackages = resolve(__dirname, '../../packages');

const POSTHOG_INGEST_HOST = (
  process.env.POSTHOG_INGEST_HOST ?? 'https://us.i.posthog.com'
).replace(/\/$/, '');
const POSTHOG_ASSETS_HOST = (
  process.env.POSTHOG_ASSETS_HOST ?? 'https://us-assets.i.posthog.com'
).replace(/\/$/, '');

const nextConfig: NextConfig = {
  // PostHog ingest is proxied through a same-origin path so the browser does
  // not need to talk to a third-party host. This reduces ad-blocker friction
  // and keeps the SDK token / pageviews on the ForceWeaver domain.
  // Required to support PostHog's trailing-slash ingest endpoints.
  skipTrailingSlashRedirect: true,
  async rewrites() {
    return [
      {
        source: '/ingest/static/:path*',
        destination: `${POSTHOG_ASSETS_HOST}/static/:path*`,
      },
      {
        source: '/ingest/array/:path*',
        destination: `${POSTHOG_ASSETS_HOST}/array/:path*`,
      },
      {
        source: '/ingest/:path*',
        destination: `${POSTHOG_INGEST_HOST}/:path*`,
      },
    ];
  },
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      '@domains': repoDomains,
      '@packages': repoPackages,
    };
    return config;
  },
  turbopack: {
    resolveAlias: {
      '@domains': repoDomains,
      '@packages': repoPackages,
    },
  },
};

export default nextConfig;
