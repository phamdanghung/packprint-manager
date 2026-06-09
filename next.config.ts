import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow local IP testing
  devIndicators: false as any,
  // @ts-ignore
  allowedDevOrigins: ['192.168.1.147'],
};

export default nextConfig;
