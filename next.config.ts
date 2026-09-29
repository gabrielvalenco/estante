import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // O sharp (fotos de perfil, lib/avatars.ts) carrega o binário nativo por um caminho que o
  // rastreador de arquivos não segue; sem isto, o binário do Linux não vai para as funções da Vercel.
  outputFileTracingIncludes: {
    "/**": ["./node_modules/@img/sharp-linux-x64/**/*", "./node_modules/@img/sharp-libvips-linux-x64/**/*"],
  },
};

export default nextConfig;
