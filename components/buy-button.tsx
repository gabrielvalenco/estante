import { ExternalLink, ShoppingBag } from "lucide-react";

import type { BuyLink } from "@/lib/affiliate";

/**
 * "Comprar na Amazon". Link de afiliado: rel="sponsored" (diretriz do Google para links pagos),
 * abre em outra aba e mostra o aviso do Associados logo abaixo. Nenhum dado da pessoa vai junto.
 */
export function BuyButton({ link, disclosure }: { link: BuyLink; disclosure: string }) {
  return (
    <div className="mt-3">
      <a
        href={link.href}
        target="_blank"
        rel="sponsored nofollow noopener noreferrer"
        className="flex h-11 w-full items-center justify-center gap-2 rounded-full border border-line bg-surface px-4 text-sm font-medium text-ink transition-colors hover:border-line-strong hover:bg-sunken active:scale-[0.98]"
      >
        <ShoppingBag className="size-4 text-ambar-ink" aria-hidden />
        Comprar na {link.store}
        <ExternalLink className="size-3.5 text-ink-4" aria-hidden />
        <span className="sr-only">(abre em outra aba, link de afiliado)</span>
      </a>
      <p className="mt-2 px-2 text-center text-[0.6875rem] leading-snug text-ink-4">{disclosure}</p>
    </div>
  );
}
