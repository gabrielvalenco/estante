import { ExternalLink, ShoppingBag } from "lucide-react";

import type { BuyLink } from "@/lib/affiliate";

/**
 * "Comprar na Amazon". Link de afiliado: rel="sponsored" (diretriz do Google para links pagos) e abre
 * em outra aba. O aviso exigido pelo Associados fica no rodapé do site. Nenhum dado da pessoa vai junto.
 */
export function BuyButton({ link }: { link: BuyLink }) {
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
    </div>
  );
}
