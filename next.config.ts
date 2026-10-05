import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  trailingSlash: false,
  turbopack: {},
  output: 'standalone',
  outputFileTracingRoot: process.cwd(),
  typescript: {
    ignoreBuildErrors: true,
  },
  serverExternalPackages: [
    "@prisma/client", 
    ".prisma/client"
  ],
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.supabase.co',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '**.supabase.in',
        pathname: '/**',
      },
    ],
  },
  experimental: {
    optimizePackageImports: ["lucide-react", "date-fns", "framer-motion"],
  },
  webpack: (config, { isServer, nextRuntime }) => {
    // Disable minification to avoid the 'WebpackError is not a constructor' bug
    // that occurs in some Next.js 16 / Webpack 5 environments.
    config.optimization.minimize = false;
    // Disable concatenateModules to prevent the string_decoder external assignment error
    config.optimization.concatenateModules = false;

    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        crypto: false,
        stream: false,
        http: false,
        https: false,
        net: false,
        tls: false,
        zlib: false,
      };
    }
    
    return config;
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains; preload',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(self), microphone=(), geolocation=(), browsing-topics=()',
          },
          {
            key: 'Cross-Origin-Opener-Policy',
            value: 'same-origin',
          },
          {
            key: 'Content-Security-Policy',
            value: "default-src 'self'; base-uri 'self'; object-src 'none'; form-action 'self' https:; frame-ancestors 'none'; upgrade-insecure-requests; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://ajax.cloudflare.com https://static.cloudflareinsights.com https://*.cloudflare.com https://*.supabase.co https://*.turnstile.com https://challenges.cloudflare.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; img-src 'self' data: blob: https:; font-src 'self' data: https://fonts.gstatic.com https://fonts.googleapis.com; connect-src 'self' https://*.supabase.co https://*.supabase.in https://*.cloudflare.com https://challenges.cloudflare.com wss://*.supabase.co; frame-src 'self' https://challenges.cloudflare.com; worker-src 'self' blob:;",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
