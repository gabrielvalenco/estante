import type { Metadata } from "next";
import { Suspense } from "react";

import { RetrospectivePage } from "@/components/retrospective-page";

export const metadata: Metadata = { title: "Retrospectiva", robots: { index: false } };

export default function Page() {
  return (
    <div className="container-page animate-fade-up pt-10 sm:pt-14">
      <Suspense>
        <RetrospectivePage />
      </Suspense>
    </div>
  );
}
