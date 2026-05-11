import type { NextConfig } from 'next';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const repoDomains = resolve(__dirname, '../../domains');
const repoPackages = resolve(__dirname, '../../packages');

const nextConfig: NextConfig = {
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
