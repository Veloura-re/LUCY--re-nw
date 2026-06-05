import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {},
  output: 'standalone',
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
        hostname: 'caeeusbhwrkelnffbbub.supabase.co',
        pathname: '/storage/v1/object/public/**',
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
    
    return config;
  },
};

export default nextConfig;
