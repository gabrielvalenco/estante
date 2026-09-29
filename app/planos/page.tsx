import type { Metadata } from "next";
import { Suspense } from "react";

import { PlansPage } from "@/components/plans-page";

export const metadata: Metadata = {
  title: "Planos",
  description: "Brochura grátis para sempre. Capa Dura com citações, notas e discussões sem limite.",
};

export default function Page() {
  return (
    <div className="container-page animate-fade-up pt-10 sm:pt-14">
      <Suspense>
        <PlansPage />
      </Suspense>
    </div>
  );
}
