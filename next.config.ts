import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return {
      // Use fallback so local mock APIs take precedence during migration,
      // and missing ones are proxied to the NestJS backend.
      fallback: [
        {
          source: "/api/v1/:path*",
          destination: process.env.BACKEND_API_URL 
            ? `${process.env.BACKEND_API_URL}/:path*` 
            : "http://127.0.0.1:4000/api/v1/:path*",
        },
      ],
    };
  },
};

export default nextConfig;
