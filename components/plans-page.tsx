"use client";

import { Check, Sparkles } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { getPlanStatus, openPortalAction, startCheckoutAction, syncCheckoutAction, syncPortalAction, type BillingError } from "@/app/billing-actions";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/lib/auth";
import type { PlanStatus } from "@/lib/billing";
import { cn } from "@/lib/utils";

const PRICES = {
  "capa-dura": { month: { value: "R$ 6,90", per: "/mês" }, year: { value: "R$ 59", per: "/ano" }, note: { year: "Equivale a R$ 4,92 por mês.", month: "Ou R$ 59 no plano anual." } },
  "ex-libris": { month: { value: "R$ 14,90", per: "/mês" }, year: { value: "R$ 119", per: "/ano" }, note: { year: "Equivale a R$ 9,92 por mês.", month: "Ou R$ 119 no plano anual." } },
} as const;
type Paid = keyof typeof PRICES;

const BROCHURA = [
  "Reviews, notas e estante sem limite",
  "Seguir leitores, feed e notificações",
  "Marcador de página em todos os livros",
  "20 citações e 3 notas por livro",
  "3 discussões novas por mês (responder é livre)",
  "Importar a estante do Goodreads",
  "Retrospectiva do ano (básica)",
];
const CAPA_DURA = ["Tudo do Brochura", "Citações ilimitadas", "Notas ilimitadas em cada livro", "Discussões novas sem limite", "Importar destaques do Kindle", "Exportar citações e notas (Markdown)", "Retrospectiva do ano completa", "Citação por foto da página (10 por mês)"];
const CAPA_DURA_SOON: string[] = [];
const EX_LIBRIS = ["Tudo do Capa Dura", "Clubes de leitura privados: até 5, com 30 pessoas cada", "Quem você convida participa de graça", "Citação por foto da página, sem limite"];

const ERRORS: Record<BillingError, string> = {
  unauthenticated: "Entre na sua conta para assinar.",
  unavailable: "Não foi possível abrir o pagamento agora. Tente de novo em instantes.",
  already_subscribed: "Você já tem uma assinatura ativa.",
  not_found: "Não encontramos uma assinatura nesta conta.",
};

function formatDate(ts: number) {
  return new Date(ts).toLocaleDateString("pt-BR", { day: "numeric", month: "long", year: "numeric" });
}

export function PlansPage() {
  const auth = useAuth();
  const router = useRouter();
  const params = useSearchParams();
  const [data, setData] = useState<{ status: PlanStatus | null; enabled: boolean } | null>(null);
  const [interval, setPeriod] = useState<"month" | "year">("year");
  const [busy, setBusy] = useState(false);
  const synced = useRef(false);
  const session = params.get("sessao");
  const portal = params.get("portal") === "1";
  const userId = auth.status === "user" ? auth.profile.id : null;

  useEffect(() => {
    if (auth.status === "loading") return;
    // Volta do checkout: confirma direto no Stripe antes de mostrar o plano.
    if (session && userId && !synced.current) {
      synced.current = true;
      void syncCheckoutAction(session).then((r) => {
        if (r.ok && r.status.plan === "ex-libris") toast("Bem-vindo ao Ex Libris", { description: "Crie seu primeiro clube de leitura em Clubes." });
        else if (r.ok && r.status.plan === "capa-dura") toast("Bem-vindo ao Capa Dura", { description: "Citações, notas e discussões sem limite." });
        router.replace("/planos");
        void getPlanStatus().then(setData);
      });
      return;
    }
    // Volta do portal: a pessoa pode ter trocado de plano ou cancelado.
    if (portal && userId && !synced.current) {
      synced.current = true;
      void syncPortalAction().then((status) => {
        router.replace("/planos");
        void getPlanStatus().then((d) => setData(status ? { ...d, status } : d));
      });
      return;
    }
    void getPlanStatus().then(setData);
  }, [auth.status, userId, session, portal, router]);

  async function subscribe(plan: Paid) {
    setBusy(true);
    const r = await startCheckoutAction(plan, interval).catch(() => ({ ok: false as const, error: "unavailable" as BillingError }));
    if (r.ok) {
      window.location.href = r.url;
      return;
    }
    setBusy(false);
    toast.error(ERRORS[r.error]);
  }

  async function manage() {
    setBusy(true);
    const r = await openPortalAction().catch(() => ({ ok: false as const, error: "unavailable" as BillingError }));
    if (r.ok) {
      window.location.href = r.url;
      return;
    }
    setBusy(false);
    toast.error(ERRORS[r.error]);
  }

  const plan = data?.status?.plan ?? "brochura";
  const subscribed = plan !== "brochura";

  /** Botão de cada plano pago: assinar, ou gerenciar / mudar de plano para quem já assina. */
  function PlanCta({ target }: { target: Paid }) {
    if (!data) return <Skeleton className="h-10 rounded-full" />;
    if (plan === target) {
      return (
        <Button className="w-full" onClick={manage} disabled={busy}>
          Gerenciar assinatura
        </Button>
      );
    }
    if (subscribed) {
      return (
        <Button variant="secondary" className="w-full" onClick={manage} disabled={busy}>
          {target === "ex-libris" ? "Mudar para o Ex Libris" : "Mudar para o Capa Dura"}
        </Button>
      );
    }
    if (auth.status !== "user") {
      return (
        <Button className="w-full" variant={target === "capa-dura" ? "default" : "secondary"} nativeButton={false} render={<Link href="/entrar?next=/planos" />}>
          Entrar para assinar
        </Button>
      );
    }
    if (!data.enabled) {
      return (
        <Button className="w-full" variant={target === "capa-dura" ? "default" : "secondary"} disabled>
          Em breve
        </Button>
      );
    }
    const price = PRICES[target][interval];
    return (
      <Button className="w-full" variant={target === "capa-dura" ? "default" : "secondary"} onClick={() => subscribe(target)} disabled={busy}>
        {busy ? "Abrindo pagamento..." : `Assinar por ${price.value}${price.per}`}
      </Button>
    );
  }

  return (
    <div>
      <div className="max-w-2xl">
        <p className="text-sm font-medium text-anil">Planos</p>
        <h1 className="mt-1 text-hero font-semibold tracking-tight text-ink">Leia mais, guarde tudo.</h1>
        <p className="mt-3 text-lg text-ink-2">
          A Estante é grátis para registrar, avaliar e seguir leitores. O Capa Dura tira os limites; o Ex Libris abre clubes de leitura privados.
        </p>
      </div>

      {subscribed && data?.status && (
        <div className="mt-8 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-musgo/30 bg-musgo-soft p-5">
          <div>
            <p className="font-semibold text-musgo">
              Você assina o {plan === "ex-libris" ? "Ex Libris" : "Capa Dura"}
              {data.status.interval === "year" ? " anual" : " mensal"}
            </p>
            <p className="mt-0.5 text-sm text-ink-2">
              {data.status.canceling
                ? `Cancelado: o plano vale até ${formatDate(data.status.periodEnd!)} e não renova.`
                : data.status.status === "past_due"
                  ? "A última cobrança falhou. Atualize o cartão para não perder o plano."
                  : data.status.periodEnd
                    ? `Renova em ${formatDate(data.status.periodEnd)}.`
                    : "Assinatura ativa."}
            </p>
          </div>
          <Button variant="secondary" onClick={manage} disabled={busy}>
            Gerenciar assinatura
          </Button>
        </div>
      )}

      <div className="mt-8 flex justify-center sm:justify-start">
        <div role="tablist" aria-label="Período" className="grid grid-cols-2 rounded-full bg-sunken p-1">
          {(["month", "year"] as const).map((i) => (
            <button
              key={i}
              type="button"
              role="tab"
              aria-selected={interval === i}
              onClick={() => setPeriod(i)}
              className={cn("h-9 rounded-full px-5 text-sm font-medium transition-colors", interval === i ? "bg-surface text-ink shadow-card" : "text-ink-3 hover:text-ink")}
            >
              {i === "month" ? "Mensal" : "Anual"}
              {i === "year" && <span className="ml-1.5 text-xs text-musgo">-28%</span>}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        {/* Brochura */}
        <section className="flex flex-col rounded-3xl border border-line bg-surface p-6 shadow-card">
          <h2 className="text-lg font-semibold text-ink">Brochura</h2>
          <p className="mt-1 text-sm text-ink-3">Para todo leitor, para sempre.</p>
          <p className="mt-5 text-4xl font-semibold tracking-tight text-ink">Grátis</p>
          <Features items={BROCHURA} />
          <div className="mt-auto pt-6">
            {auth.status === "user" ? (
              <Button variant="secondary" className="w-full" disabled>
                {subscribed ? "Incluído no seu plano" : "Seu plano atual"}
              </Button>
            ) : (
              <Button variant="secondary" className="w-full" nativeButton={false} render={<Link href="/entrar?next=/planos" />}>
                Criar conta grátis
              </Button>
            )}
          </div>
        </section>

        {/* Capa Dura */}
        <section className="relative flex flex-col rounded-3xl border-2 border-anil bg-surface p-6 shadow-card">
          <span className="absolute -top-3 left-6 rounded-full bg-anil px-3 py-1 text-xs font-semibold text-on-brand">Recomendado</span>
          <h2 className="text-lg font-semibold text-ink">Capa Dura</h2>
          <p className="mt-1 text-sm text-ink-3">Para quem anota tudo e puxa conversa.</p>
          <p className="mt-5 flex items-baseline gap-1">
            <span className="text-4xl font-semibold tracking-tight text-ink">{PRICES["capa-dura"][interval].value}</span>
            <span className="text-ink-3">{PRICES["capa-dura"][interval].per}</span>
          </p>
          <p className="mt-1 text-xs text-ink-4">{PRICES["capa-dura"].note[interval]}</p>
          <Features items={CAPA_DURA} />
          {CAPA_DURA_SOON.length > 0 && (
            <>
              <p className="mt-4 text-xs font-medium tracking-wide text-ink-4 uppercase">Em breve no Capa Dura</p>
              <Features items={CAPA_DURA_SOON} soft />
            </>
          )}
          <div className="mt-auto pt-6">
            <PlanCta target="capa-dura" />
          </div>
        </section>

        {/* Ex Libris */}
        <section className="flex flex-col rounded-3xl border border-line bg-surface p-6 shadow-card">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-ink">
            Ex Libris <Sparkles className="size-4 text-ambar" aria-hidden />
          </h2>
          <p className="mt-1 text-sm text-ink-3">Para clubes e leitores de carteirinha.</p>
          <p className="mt-5 flex items-baseline gap-1">
            <span className="text-4xl font-semibold tracking-tight text-ink">{PRICES["ex-libris"][interval].value}</span>
            <span className="text-ink-3">{PRICES["ex-libris"][interval].per}</span>
          </p>
          <p className="mt-1 text-xs text-ink-4">{PRICES["ex-libris"].note[interval]}</p>
          <Features items={EX_LIBRIS} />
          <div className="mt-auto pt-6">
            <PlanCta target="ex-libris" />
          </div>
        </section>
      </div>

      <div className="mt-10 max-w-3xl space-y-2 text-sm text-ink-3">
        <p>
          A assinatura renova sozinha no fim de cada período. Você cancela quando quiser em <strong className="font-medium text-ink-2">Gerenciar assinatura</strong>, e o
          plano continua valendo até o fim do período já pago.
        </p>
        <p>
          Mudou de ideia? Em até 7 dias da contratação você pode desistir e recebe o valor de volta (Código de Defesa do Consumidor, art. 49). Veja os{" "}
          <Link href="/termos" className="font-medium text-ink-2 hover:underline">
            Termos de uso
          </Link>
          .
        </p>
        <p>O pagamento é processado pelo Stripe. A Estante não vê nem guarda os dados do seu cartão.</p>
      </div>
    </div>
  );
}

function Features({ items, soft = false }: { items: string[]; soft?: boolean }) {
  return (
    <ul className="mt-5 grid gap-2.5 text-sm">
      {items.map((f) => (
        <li key={f} className={cn("flex gap-2", soft ? "text-ink-3" : "text-ink-2")}>
          <Check className={cn("mt-0.5 size-4 shrink-0", soft ? "text-ink-4" : "text-musgo")} aria-hidden />
          {f}
        </li>
      ))}
    </ul>
  );
}
