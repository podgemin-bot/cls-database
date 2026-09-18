import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  cacheComponents: true,
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'www.fffuel.co' },
      { protocol: 'https', hostname: 'api.codingthailand.com' },
    ]
  }
};

export default nextConfig;
