import type { Metadata } from "next";

import { ClubPage } from "@/components/clubs";

// Clube é privado: nada do conteúdo vai para o HTML, a página monta tudo no navegador para membros.
export const metadata: Metadata = { title: "Clube de leitura", robots: { index: false } };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  return (
    <div className="container-page animate-fade-up pt-8 sm:pt-12">
      <ClubPage clubId={(await params).id} />
    </div>
  );
}
