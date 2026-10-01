import type { Metadata } from "next";

import { ClubsPage } from "@/components/clubs";

export const metadata: Metadata = { title: "Clubes de leitura", robots: { index: false } };

export default function Page() {
  return (
    <div className="container-page animate-fade-up pt-10 sm:pt-14">
      <ClubsPage />
    </div>
  );
}
