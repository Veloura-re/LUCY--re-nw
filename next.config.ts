import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  reactCompiler: true,
  productionBrowserSourceMaps: false,
  typescript: {
    ignoreBuildErrors: true,
  },
  serverExternalPackages: ["@prisma/client", ".prisma/client", "@prisma/adapter-pg-worker", "@prisma/pg-worker"],
  experimental: {
    optimizePackageImports: ["lucide-react", "date-fns", "framer-motion"],
  },

  // ── Image optimisation ──────────────────────────────────────────────────────
  images: {
    formats: ["image/avif", "image/webp"],   // prefer AVIF > WebP > JPEG
    minimumCacheTTL: 86400,                   // cache optimised images for 24h
    deviceSizes: [640, 750, 828, 1080, 1200], // reasonable breakpoints, skip 4K
    imageSizes: [16, 32, 48, 64, 96],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**.supabase.co",
      },
    ],
  },

  // ── HTTP response headers ───────────────────────────────────────────────────
  async headers() {
    return [
      // Static assets (JS, CSS, fonts, images) — immutable for 1 year
      {
        source: "/_next/static/:path*",
        headers: [
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
        ],
      },
      // Public API routes that serve relatively stable data — cache 30s, stale 5m
      {
        source: "/api/public/:path*",
        headers: [
          { key: "Cache-Control", value: "public, s-maxage=30, stale-while-revalidate=300" },
        ],
      },
      // Auth-gated API routes — never cache
      {
        source: "/api/:path*",
        headers: [
          { key: "Cache-Control", value: "private, no-store" },
        ],
      },
      // HTML pages — revalidate every request, fall back to stale for 1h
      {
        source: "/(.*)",
        headers: [
          { key: "Cache-Control", value: "public, max-age=0, s-maxage=60, stale-while-revalidate=3600" },
          { key: "X-DNS-Prefetch-Control", value: "on" },
          { key: "X-Content-Type-Options", value: "nosniff" },
        ],
      },
    ];
  },

  // ── Compiler-level optimisations ────────────────────────────────────────────
  compress: true,
  poweredByHeader: false,
};

export default nextConfig;
