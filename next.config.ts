import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["192.168.1.116"],
  experimental: {
    workerThreads: true,
  },
};

export default nextConfig;
