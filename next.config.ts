import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Сборка в автономный сервер — для лёгкого Docker-образа
  output: "standalone",
  experimental: {
    // Сервер маленький: снижаем пик памяти webpack на next build
    webpackMemoryOptimizations: true,
  },
};

export default nextConfig;
