import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {},
  output: 'standalone',
  typescript: {
    ignoreBuildErrors: true,
  },
  // Mark Prisma and Cloudflare-specific packages as external.
  serverExternalPackages: [
    "@prisma/client", 
    ".prisma/client", 
    "@prisma/adapter-pg-worker", 
    "@prisma/pg-worker",
    "cloudflare:sockets"
  ],
  experimental: {
    optimizePackageImports: ["lucide-react", "date-fns", "framer-motion"],
  },
  webpack: (config, { isServer, nextRuntime }) => {
    if (isServer) {
      config.externals.push('cloudflare:sockets');
    }
    
    if (nextRuntime === 'edge') {
      config.externals.push('node:string_decoder');
      config.externals.push('string_decoder');
    }

    // Disable minification to avoid the 'WebpackError is not a constructor' bug
    // that occurs in some Next.js 16 / Webpack 5 environments.
    config.optimization.minimize = false;
    // Disable concatenateModules to prevent the string_decoder external assignment error
    config.optimization.concatenateModules = false;
    
    return config;
  },
};

export default nextConfig;
