import "server-only";

import { getSeedBook, type Book } from "@/lib/books";

/**
 * Links de afiliado para comprar livros.
 *
 * Usamos a busca da Amazon (título + autor, só em Livros) em vez do link de uma edição específica:
 * edição por ISBN costuma estar esgotada ou ser a de outro idioma, e a busca cai nas edições em
 * português que estão à venda. O Associados comissiona o que for comprado a partir do link.
 *
 * Sem AMAZON_ASSOCIATE_TAG, não há botão: nada de mandar tráfego sem comissão.
 */

// Tags do Associados Brasil terminam em "-20" (ex.: "estante-20").
const TAG = process.env.AMAZON_ASSOCIATE_TAG?.trim();
const VALID_TAG = TAG && /^[a-z0-9][a-z0-9-]{1,60}-2[0-9]$/i.test(TAG) ? TAG : null;

export const affiliateEnabled = Boolean(VALID_TAG);

export type BuyLink = { store: "Amazon"; href: string };

/**
 * Título principal, sem subtítulo nem observações: "O Homem Mais Rico da Babilônia. Sete Chaves... (tradução)"
 * vira "O Homem Mais Rico da Babilônia". Busca curta acha mais edições.
 */
export function mainTitle(title: string) {
  // Dois-pontos, parênteses, colchetes e travessão sempre separam o subtítulo.
  let cut = title.split(/\s*[:([]|\s[-–—]\s/)[0].trim();
  // Ponto só separa se já houver 3+ palavras antes: "O Sr. Mercedes" e "A.B.C." ficam inteiros.
  const period = cut.match(/^((?:\S+\s+){2,}\S+?)\.\s/);
  if (period) cut = period[1];
  return cut.length >= 2 ? cut : title.trim();
}

export function buyLink(book: Pick<Book, "id" | "title" | "author">): BuyLink | null {
  if (!VALID_TAG) return null;
  // Autor só nos livros da base curada: na Open Library o "autor" às vezes é o tradutor ou a editora,
  // e um nome errado na busca esconde o livro certo.
  const author = getSeedBook(book.id) ? ` ${book.author}` : "";
  const params = new URLSearchParams({ k: `${mainTitle(book.title)}${author}`, i: "stripbooks", tag: VALID_TAG });
  return { store: "Amazon", href: `https://www.amazon.com.br/s?${params}` };
}

/** Texto exigido pelo contrato do Associados Amazon, exibido perto do botão e no rodapé. */
export const AFFILIATE_DISCLOSURE = "Como Associado da Amazon, a Estante ganha com compras qualificadas.";
