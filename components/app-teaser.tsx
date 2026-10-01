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
  { icon: Bookmark, title: "Marcador de página", ink: "text-anil" },
  { icon: Camera, title: "Citação por foto", ink: "text-ameixa" },
  { icon: MessagesSquare, title: "Discussões sem spoiler", ink: "text-musgo" },
  { icon: Users, title: "Clubes de leitura", ink: "text-ambar-ink" },
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
      <div className="relative grid grid-cols-1 items-center gap-12 overflow-hidden rounded-[2rem] border border-line bg-surface px-6 pt-12 sm:px-12 lg:grid-cols-[1.1fr_1fr] lg:gap-8 lg:py-16">
        <div className="relative z-10 max-w-lg min-w-0">
          <p className="flex items-center gap-1.5 text-sm font-medium text-anil">
            <Smartphone className="size-4" aria-hidden />
            {release
              ? "App para Android · beta"
              : "App para Android · em breve"}
          </p>
          <h2
            id="app-teaser-title"
            className="mt-3 text-title font-semibold text-ink"
          >
            A Estante no seu bolso.
          </h2>
          <p className="mt-3 text-[1.0625rem] leading-relaxed text-ink-3">
            Sua estante vai para onde o livro vai. Mesma conta do site: o que
            você marca num aparece no outro.
          </p>

          <ul className="scroller -mx-6 mt-6 flex gap-2 overflow-x-auto px-6 pb-1 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0 sm:pb-0" aria-label="No app">
            {FEATURES.map((f) => (
              <li
                key={f.title}
                className="inline-flex h-9 shrink-0 items-center gap-2 rounded-full border border-line bg-canvas px-3.5 text-sm font-medium whitespace-nowrap text-ink-2"
              >
                <f.icon className={`size-4 ${f.ink}`} aria-hidden />
                {f.title}
              </li>
            ))}
          </ul>

          {release && (
            <>
              <div className="mt-8 flex items-center gap-5 rounded-2xl border border-line bg-canvas p-4 sm:p-5">
                <div className="min-w-0 flex-1">
                  <Button
                    size="lg"
                    nativeButton={false}
                    render={<a href={APP_DOWNLOAD_URL} />}
                    className="w-full sm:w-auto"
                  >
                    <Download data-icon="inline-start" />
                    Baixar para Android
                  </Button>
                  <p className="tnum mt-2.5 text-sm text-ink-3">
                    Versão {release.version} ·{" "}
                    {release.sizeMb.toLocaleString("pt-BR", {
                      maximumFractionDigits: 0,
                    })}{" "}
                    MB
                  </p>
                </div>
                <div className="hidden shrink-0 items-center gap-3 border-l border-line pl-5 lg:flex">
                  {/* eslint-disable-next-line @next/next/no-img-element -- SVG estático pequeno */}
                  <img
                    src="/app/baixar-qr.svg"
                    alt=""
                    width={72}
                    height={72}
                    className="rounded-lg bg-white p-1"
                  />
                  <p className="w-20 text-xs leading-snug text-ink-3">
                    Ou aponte a câmera do celular
                  </p>
                </div>
              </div>
              <p className="mt-3 text-xs text-ink-4">
                Fora da Play Store por enquanto: o Android pede sua autorização
                para instalar.
              </p>
            </>
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
