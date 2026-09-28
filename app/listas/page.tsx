import type { Metadata } from "next";

import { ListCard } from "@/components/list-card";
import { LISTS } from "@/lib/data/social";

export const metadata: Metadata = { title: "Listas" };

export default function ListsPage() {
  const lists = [...LISTS].sort((a, b) => b.likes - a.likes);
  return (
    <div className="container-page animate-fade-up pt-10 sm:pt-14">
      <h1 className="text-title font-semibold text-ink">Listas</h1>
      <p className="mt-2 max-w-lg text-ink-3">
        Curadoria de quem lê: temas, ordens de leitura e indicações que não cabem num algoritmo.
      </p>
      <div className="mt-10 grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
        {lists.map((l) => (
          <ListCard key={l.slug} list={l} />
        ))}
      </div>
    </div>
  );
}
