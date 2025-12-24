import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Empty turbopack config to silence the warning
  turbopack: {},
  // Keep webpack config for PDF.js compatibility
  webpack: (config, { isServer }) => {
    // Handle react-pdf
    config.resolve.alias = {
      ...config.resolve.alias,
      canvas: false,
      encoding: false,
    };

    // Ignore fs module for client-side
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        dns: false,
        child_process: false,
        tls: false,
      };
    }

    return config;
  },
};

export default nextConfig;
