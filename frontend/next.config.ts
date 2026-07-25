import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Removed output: "standalone" - using default Next.js server
  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "img.clerk.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "img.vietqr.io",
        pathname: "/**",
      },
    ],
  },
  experimental: {
    optimizePackageImports: ["lucide-react", "@clerk/nextjs", "date-fns"],
  },
  // Tắt error overlay cho runtime errors đã được xử lý
  reactStrictMode: true,
};

export default nextConfig;
