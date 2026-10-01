import type { Metadata } from "next";

import { InvitePage } from "@/components/clubs";

export const metadata: Metadata = { title: "Convite para clube de leitura", robots: { index: false } };

export default async function Page({ params }: { params: Promise<{ code: string }> }) {
  return (
    <div className="container-page animate-fade-up pt-10 sm:pt-14">
      <InvitePage code={(await params).code} />
    </div>
  );
}
