import type { Metadata } from "next";

import { ThreadPage } from "@/components/discussions";
import { getBook } from "@/lib/openlibrary";

type Props = { params: Promise<{ id: string; threadId: string }> };

/**
 * Página de uma discussão. O conteúdo vem do navegador (depende de até onde cada pessoa leu),
 * então o título da página é genérico: nada de spoiler na aba, nos buscadores ou na prévia do link.
 */
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const book = await getBook((await params).id);
  return { title: book ? `Discussão sobre ${book.title}` : "Discussão", robots: { index: false } };
}

export default async function Page({ params }: Props) {
  const { id, threadId } = await params;
  return (
    <div className="container-page animate-fade-up pt-8 sm:pt-12">
      <ThreadPage threadId={threadId} bookId={id} />
    </div>
  );
}
