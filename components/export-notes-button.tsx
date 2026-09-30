"use client";

import { Download, Lock } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

/**
 * Baixa as anotações em Markdown (todas, ou de um livro). No Brochura, abre o convite ao Capa Dura
 * lembrando que os dados completos da conta continuam grátis (LGPD).
 */
export function ExportNotesButton({ bookId, compact = false, className }: { bookId?: string; compact?: boolean; className?: string }) {
  const [busy, setBusy] = useState(false);
  const [upsell, setUpsell] = useState(false);

  async function run() {
    setBusy(true);
    try {
      const res = await fetch(`/api/conta/anotacoes${bookId ? `?livro=${bookId}` : ""}`);
      if (res.status === 402) return setUpsell(true);
      if (res.status === 404) return toast("Nada para exportar ainda", { description: "Guarde uma citação ou uma nota primeiro." });
      if (!res.ok) throw new Error();
      const name = res.headers.get("content-disposition")?.match(/filename="([^"]+)"/)?.[1] ?? "anotacoes.md";
      const url = URL.createObjectURL(await res.blob());
      const a = Object.assign(document.createElement("a"), { href: url, download: name });
      a.click();
      URL.revokeObjectURL(url);
      toast("Anotações exportadas", { description: `${name}: abre no Notion, no Obsidian ou em qualquer editor.` });
    } catch {
      toast.error("Não foi possível exportar agora");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      {compact ? (
        <button type="button" onClick={run} disabled={busy} className={cn("font-medium text-ink-3 hover:text-ink hover:underline disabled:opacity-50", className)}>
          {busy ? "Exportando..." : "Exportar notas deste livro"}
        </button>
      ) : (
        <Button variant="secondary" size="sm" onClick={run} disabled={busy} className={className}>
          <Download data-icon="inline-start" /> {busy ? "Exportando..." : "Exportar em Markdown"}
        </Button>
      )}

      <Dialog open={upsell} onOpenChange={setUpsell}>
        <DialogContent className="rounded-3xl p-6 sm:max-w-md">
          <Lock className="size-6 text-anil" aria-hidden />
          <DialogTitle className="text-lg font-semibold tracking-tight">Exportar faz parte do Capa Dura</DialogTitle>
          <DialogDescription className="text-ink-3">
            No Capa Dura, suas citações e notas saem num arquivo Markdown organizado por livro, pronto para o Notion, o Obsidian ou qualquer editor.
          </DialogDescription>
          <p className="text-sm text-ink-3">
            Seus dados completos continuam grátis para baixar em{" "}
            <Link href="/conta#dados" className="font-medium text-ink-2 hover:underline">
              Configurações
            </Link>
            , como garante a LGPD.
          </p>
          <div className="mt-2 flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setUpsell(false)}>
              Agora não
            </Button>
            <Button nativeButton={false} render={<Link href="/planos" />}>
              Conhecer o Capa Dura
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
