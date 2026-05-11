import type { NextConfig } from "next";
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const nextConfig: NextConfig = {
  /* config options here */
  webpack: (config) => {
    // Add aliases for monorepo paths
    // During build, domains and packages are copied to apps/web directory
    config.resolve.alias = {
      ...config.resolve.alias,
      '@domains': resolve(__dirname, './domains'),
      '@packages': resolve(__dirname, './packages'),
    };
    return config;
  },
};

export default nextConfig;
