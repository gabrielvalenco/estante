import type { Metadata } from "next";

import { MyShelf } from "@/components/my-shelf";

export const metadata: Metadata = { title: "Minha estante" };

export default function ShelfPage() {
  return (
    <div className="container-page animate-fade-up pt-10 sm:pt-14">
      <MyShelf />
    </div>
  );
}
