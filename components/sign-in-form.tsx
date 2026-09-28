"use client";

import { FlaskConical } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { useEffect, useState, type FormEvent } from "react";

import { Mark } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { useAuth, useAuthFlags } from "@/lib/auth";
import { safeNext } from "@/lib/safe-next";

export function SignInForm() {
  const params = useSearchParams();
  const router = useRouter();
  const auth = useAuth();
  const flags = useAuthFlags();
  const next = safeNext(params.get("next") ?? params.get("callbackUrl"));
  const [pending, setPending] = useState<"github" | "dev" | null>(null);
  const [devName, setDevName] = useState("");
  const failed = params.has("error");

  // Já está logado: segue para o destino.
  useEffect(() => {
    if (auth.status === "user") router.replace(next);
  }, [auth.status, next, router]);

  if (!flags.accounts) {
    return (
      <Card>
        <Mark size={44} />
        <h1 className="mt-5 text-2xl font-semibold tracking-tight text-ink">Login desativado nesta versão</h1>
        <p className="mt-2 text-ink-3">
          Esta cópia roda sem banco de dados. Sua estante continua funcionando e fica salva neste navegador.
        </p>
        <Button size="lg" className="mt-8 w-full" render={<Link href="/estante" />} nativeButton={false}>
          Ir para minha estante
        </Button>
      </Card>
    );
  }

  function github() {
    setPending("github");
    void signIn("github", { redirectTo: next });
  }

  function devLogin(e: FormEvent) {
    e.preventDefault();
    if (!devName.trim()) return;
    setPending("dev");
    void signIn("dev", { name: devName.trim(), redirectTo: next });
  }

  return (
    <Card>
      <Mark size={44} />
      <h1 className="mt-5 text-2xl font-semibold tracking-tight text-ink">Entre na Estante</h1>
      <p className="mt-2 text-ink-3">Sua estante em qualquer aparelho, com perfil público para mostrar o que você lê.</p>

      {failed && (
        <p role="alert" className="mt-6 rounded-xl bg-sunken px-4 py-3 text-sm text-ink-2">
          Não foi possível entrar. Tente de novo; se continuar, pode ser que o login esteja fora do ar agora.
        </p>
      )}

      {flags.github && (
        <Button size="lg" className="mt-8 w-full" onClick={github} disabled={pending !== null}>
          <GitHubIcon />
          {pending === "github" ? "Abrindo o GitHub..." : "Continuar com GitHub"}
        </Button>
      )}

      {flags.devLogin && (
        <form onSubmit={devLogin} className="mt-8 grid gap-3 rounded-2xl border border-dashed border-line-strong p-4">
          <p className="flex items-center gap-2 text-xs font-medium text-ink-3">
            <FlaskConical className="size-3.5" aria-hidden />
            Login de teste · só em desenvolvimento
          </p>
          <label className="grid gap-1.5">
            <span className="sr-only">Nome do leitor de teste</span>
            <input
              value={devName}
              onChange={(e) => setDevName(e.target.value)}
              placeholder="Nome do leitor de teste"
              maxLength={60}
              className="h-11 w-full rounded-xl border border-line bg-surface px-4 text-base outline-none placeholder:text-ink-4 focus:border-line-strong focus:shadow-[0_0_0_4px_var(--anil-soft)]"
            />
          </label>
          <Button type="submit" variant="secondary" disabled={pending !== null || !devName.trim()}>
            {pending === "dev" ? "Entrando..." : "Entrar como leitor de teste"}
          </Button>
        </form>
      )}

      <p className="mt-8 text-center text-[0.8125rem] text-ink-4">O que você já marcou neste navegador vai junto para a sua conta.</p>
    </Card>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return <div className="w-full max-w-sm animate-fade-up">{children}</div>;
}

function GitHubIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className="size-[18px] fill-current">
      <path d="M12 .5C5.65.5.5 5.65.5 12a11.5 11.5 0 0 0 7.86 10.92c.58.1.79-.25.79-.56v-2c-3.2.7-3.87-1.37-3.87-1.37-.52-1.33-1.28-1.69-1.28-1.69-1.04-.71.08-.7.08-.7 1.16.08 1.77 1.19 1.77 1.19 1.03 1.76 2.7 1.25 3.36.96.1-.75.4-1.25.73-1.54-2.56-.29-5.25-1.28-5.25-5.7 0-1.26.45-2.29 1.19-3.1-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.17 1.18a11 11 0 0 1 5.77 0c2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.23 2.76.11 3.05.74.81 1.19 1.84 1.19 3.1 0 4.43-2.7 5.4-5.27 5.69.41.36.78 1.06.78 2.14v3.17c0 .31.21.67.8.56A11.5 11.5 0 0 0 23.5 12C23.5 5.65 18.35.5 12 .5Z" />
    </svg>
  );
}
