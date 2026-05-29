import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  env: {
    DATABASE_URL: "file:./prisma/dev.db",
  },
};

export default nextConfig;
