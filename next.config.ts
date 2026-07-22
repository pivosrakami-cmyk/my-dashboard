import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Сборка в автономный сервер — для лёгкого Docker-образа
  output: "standalone",
};

export default nextConfig;
