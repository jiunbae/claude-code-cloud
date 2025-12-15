import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,

  // Server external packages that should not be bundled
  serverExternalPackages: ['better-sqlite3', 'node-pty'],

  // Production optimizations
  compiler: {
    // Remove console.log in production (keep error, warn)
    removeConsole: process.env.NODE_ENV === 'production' ? {
      exclude: ['error', 'warn'],
    } : false,
  },

  // Optimize specific package imports
  experimental: {
    optimizePackageImports: ['@xterm/xterm', '@xterm/addon-fit', '@xterm/addon-web-links'],
  },

  // Image optimization
  images: {
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 31536000, // 1 year
  },
};

export default nextConfig;
