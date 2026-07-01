import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // Allow larger uploads (e.g. sponsor logos) through Server Actions.
      // Default is 1 MB; the sponsor-logos bucket caps files at 10 MB.
      bodySizeLimit: "12mb",
    },
  },
};

export default nextConfig;
