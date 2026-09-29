import type { Metadata } from "next";

import { ImportPage } from "@/components/import-page";

export const metadata: Metadata = { title: "Importar", robots: { index: false } };

export default function Page() {
  return (
    <div className="container-page animate-fade-up pt-10 sm:pt-14">
      <ImportPage />
    </div>
  );
}
