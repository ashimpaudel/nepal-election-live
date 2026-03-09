import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Remove static export to enable API routes, Edge Runtime, and dynamic pages.
  // For GitHub Pages fallback, use `next export` manually.
  images: {
    unoptimized: true,
  },
};

export default nextConfig;