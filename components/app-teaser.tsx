import {
  Bookmark,
  Camera,
  Download,
  MessagesSquare,
  Smartphone,
  Users,
} from "lucide-react";
import Image from "next/image";

import { Button } from "@/components/ui/button";
import { APP_DOWNLOAD_URL, latestAppRelease } from "@/lib/app-release";

const FEATURES = [
  {
    icon: Bookmark,
    title: "Marcador de página",
    text: "Anote onde parou com um toque, no ônibus ou na cama.",
    ink: "text-anil",
    bg: "bg-anil-soft",
  },
  {
    icon: Camera,
    title: "Citação por foto",
    text: "Fotografe a página e guarde o trecho sem digitar.",
    ink: "text-ameixa",
    bg: "bg-ameixa-soft",
  },
  {
    icon: MessagesSquare,
    title: "Discussões sem spoiler",
    text: "Cada um vê só o que já leu.",
    ink: "text-musgo",
    bg: "bg-musgo-soft",
  },
  {
    icon: Users,
    title: "Clubes de leitura",
    text: "O progresso do grupo e a conversa no mesmo lugar.",
    ink: "text-ambar-ink",
    bg: "bg-ambar-soft",
  },
];

/**
 * App na página inicial: texto, recursos, uma tela real do app num celular e o download do APK
 * (versão e tamanho do Release mais novo no GitHub; sem release, "em breve").
 */
export async function AppTeaser() {
  const release = await latestAppRelease();
  return (
    <section
      className="container-page mt-24 sm:mt-32"
      aria-labelledby="app-teaser-title"
    >
      <div className="relative grid items-center gap-12 overflow-hidden rounded-[2rem] border border-line bg-surface px-6 pt-12 sm:px-12 lg:grid-cols-[1.1fr_1fr] lg:gap-8 lg:py-16">
        <div className="relative z-10">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-ambar-soft px-3 py-1 text-[0.8125rem] font-semibold text-ambar-ink">
            <Smartphone className="size-3.5" aria-hidden />
            {release
              ? `Beta para Android · versão ${release.version}`
              : "Em breve para Android"}
          </span>
          <h2
            id="app-teaser-title"
            className="mt-4 text-title font-semibold text-ink"
          >
            A Estante no seu bolso.
          </h2>
          <p className="mt-3 max-w-md text-[1.0625rem] leading-relaxed text-ink-3">
            O app leva sua estante para onde o livro vai. Mesma conta do site: o
            que você marca num aparece no outro.
          </p>

          <ul className="mt-8 grid gap-4 sm:grid-cols-2">
            {FEATURES.map((f) => (
              <li key={f.title} className="flex gap-3">
                <span
                  className={`flex size-10 shrink-0 items-center justify-center rounded-xl ${f.bg}`}
                >
                  <f.icon className={`size-5 ${f.ink}`} aria-hidden />
                </span>
                <span>
                  <span className="block text-[0.9375rem] font-semibold text-ink">
                    {f.title}
                  </span>
                  <span className="block text-sm leading-snug text-ink-3">
                    {f.text}
                  </span>
                </span>
              </li>
            ))}
          </ul>

          {release && (
            <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-4">
              <div className="max-w-sm">
                <Button
                  size="lg"
                  nativeButton={false}
                  render={<a href={APP_DOWNLOAD_URL} />}
                >
                  <Download data-icon="inline-start" />
                  Baixar para Android
                </Button>
                <p className="mt-2.5 text-xs leading-relaxed text-ink-4">
                  APK · {release.sizeMb.toLocaleString("pt-BR")} MB. Como o app
                  ainda não está na Play Store, o Android pede para permitir a
                  instalação e pode mostrar um aviso do Play Protect.
                </p>
              </div>
              <div className="hidden items-center gap-3 lg:flex">
                {/* eslint-disable-next-line @next/next/no-img-element -- SVG estático pequeno */}
                <img
                  src="/app/baixar-qr.svg"
                  alt=""
                  width={88}
                  height={88}
                  className="rounded-xl border border-line bg-white p-1.5"
                />
                <p className="max-w-[9rem] text-xs text-ink-3">
                  Aponte a câmera do celular para baixar.
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="relative mx-auto w-full max-w-[17rem] self-end lg:max-w-[18.5rem] lg:self-center">
          {/* As camadas do logo atrás do celular */}
          <div
            aria-hidden
            className="absolute -inset-x-16 top-10 bottom-0 lg:-inset-y-10"
          >
            <div className="absolute top-0 left-4 size-44 rounded-[2.5rem] bg-anil/20 blur-2xl" />
            <div className="absolute top-24 right-0 size-48 rounded-[2.5rem] bg-ameixa/20 blur-2xl" />
            <div className="absolute bottom-0 left-10 size-40 rounded-[2.5rem] bg-musgo/20 blur-2xl" />
          </div>

          <div className="relative translate-y-6 rounded-[2.75rem] bg-[#141418] p-2.5 shadow-[0_30px_60px_-20px_rgb(0_0_0/0.45)] ring-1 ring-black/10 lg:translate-y-0 lg:rotate-[3deg] dark:ring-white/10">
            <div className="overflow-hidden rounded-[2.2rem] bg-[#fbfbfd] dark:bg-[#0b0b0d]">
              {/* Barra de status (a captura do app não tem): fundo na cor do app, com a câmera no meio */}
              <div
                aria-hidden
                className="relative flex h-9 items-center justify-between px-6 text-[0.6875rem] font-semibold text-[#111] dark:text-white"
              >
                <span className="tnum">9:41</span>
                <span className="absolute top-2 left-1/2 h-5 w-20 -translate-x-1/2 rounded-full bg-[#141418]" />
                <span className="flex items-center gap-1">
                  <span className="flex items-end gap-px">
                    {[4, 6, 8, 10].map((h) => (
                      <span
                        key={h}
                        className="w-[3px] rounded-[1px] bg-current"
                        style={{ height: h }}
                      />
                    ))}
                  </span>
                  <span className="ml-1 h-[10px] w-5 rounded-[3px] border border-current p-px">
                    <span className="block h-full w-3/4 rounded-[1px] bg-current" />
                  </span>
                </span>
              </div>
              <div className="relative aspect-[390/844]">
                <Image
                  src="/app/estante-claro.webp"
                  alt="Tela Minha estante do app: meta de leitura do ano e os livros lidos com as notas"
                  fill
                  sizes="300px"
                  className="object-cover object-top dark:hidden"
                />
                <Image
                  src="/app/estante-escuro.webp"
                  alt=""
                  fill
                  sizes="300px"
                  className="hidden object-cover object-top dark:block"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
