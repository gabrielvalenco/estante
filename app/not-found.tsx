import Link from "next/link";

import { Mark } from "@/components/brand";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="container-page flex flex-col items-center py-28 text-center">
      <Mark size={56} />
      <h1 className="mt-6 text-title font-semibold text-ink">Essa página saiu da estante</h1>
      <p className="mt-3 max-w-sm text-ink-3">O endereço pode estar errado, ou o livro não existe na Open Library.</p>
      <div className="mt-8 flex gap-3">
        <Button size="lg" render={<Link href="/" />} nativeButton={false}>
          Voltar ao início
        </Button>
        <Button size="lg" variant="secondary" render={<Link href="/busca" />} nativeButton={false}>
          Buscar um livro
        </Button>
      </div>
    </div>
  );
}
