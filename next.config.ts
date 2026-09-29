import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // O sharp (fotos de perfil, lib/avatars.ts) carrega o binário nativo por um caminho que o
  // rastreador de arquivos não segue; sem isto, o binário do Linux não vai para as funções da Vercel.
  outputFileTracingIncludes: {
    "/**": ["./node_modules/@img/sharp-linux-x64/**/*", "./node_modules/@img/sharp-libvips-linux-x64/**/*"],
  },
  // Só em desenvolvimento: a versão web do app (Expo, porta 8081) chama a API local.
  // O app no celular não precisa de CORS, então produção fica sem.
  async headers() {
    if (process.env.NODE_ENV !== "development") return [];
    return [
      {
        source: "/api/v1/:path*",
        headers: [
          { key: "Access-Control-Allow-Origin", value: "http://localhost:8081" },
          { key: "Access-Control-Allow-Methods", value: "GET, POST, PUT, PATCH, DELETE, OPTIONS" },
          { key: "Access-Control-Allow-Headers", value: "Authorization, Content-Type" },
        ],
      },
    ];
  },
};

export default nextConfig;
