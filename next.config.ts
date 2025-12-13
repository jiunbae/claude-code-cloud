import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,

  // Server external packages that should not be bundled
  serverExternalPackages: ['better-sqlite3', 'node-pty'],
};

export default nextConfig;
