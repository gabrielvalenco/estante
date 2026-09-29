import type { Metadata } from "next";

import { AnnotationsPage } from "@/components/annotations-page";

export const metadata: Metadata = { title: "Anotações", robots: { index: false } };

export default function Page() {
  return (
    <div className="container-page animate-fade-up pt-10 sm:pt-14">
      <AnnotationsPage />
    </div>
  );
}
