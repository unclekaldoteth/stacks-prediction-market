import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Use webpack instead of turbopack for better compatibility with wallet libraries
  // Empty turbopack config tells Next.js we intentionally want to use webpack
  turbopack: {},

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
