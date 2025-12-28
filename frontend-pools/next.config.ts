import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */

  // Disable experimental features that may cause module resolution issues
  experimental: {
    // Ensure static generation doesn't cause issues with dynamic wallet imports
    serverActions: {
      bodySizeLimit: '2mb',
    },
  },

  // Enable transpilation of wallet-related packages
  transpilePackages: [
    '@stacks/connect',
    '@stacks/network',
    '@stacks/transactions',
    '@reown/appkit',
    'magic-sdk',
    '@magic-ext/oauth2',
  ],

  // Webpack configuration to handle wallet library bundling
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Ensure proper handling of wallet packages on client-side
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        crypto: false,
      };
    }
    return config;
  },
};

export default nextConfig;
