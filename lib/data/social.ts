/**
 * Dados de demonstração: leitores, reviews, listas e leituras.
 * Tudo fictício. É o que deixa o app "vivo" para quem abre o link do portfólio.
 */

export type User = {
  handle: string;
  name: string;
  bio: string;
  /** Uma das cores da marca, usada no avatar. */
  tone: "anil" | "ameixa" | "musgo" | "ambar";
  favorites: [string, string, string, string];
  goal: number;
};

export type Review = {
  id: string;
  user: string;
  bookId: string;
  /** 0,5 a 5, de meia em meia estrela. */
  rating: number;
  text: string;
  date: string;
  likes: number;
  liked?: boolean;
  reread?: boolean;
  spoiler?: boolean;
};

/** Leitura registrada sem review. */
export type Log = { user: string; bookId: string; rating: number | null; date: string; liked?: boolean };

export type List = {
  slug: string;
  user: string;
  title: string;
  description: string;
  books: string[];
  likes: number;
};

export const USERS: User[] = [
  {
    handle: "marina",
    name: "Marina Alves",
    bio: "Professora de literatura. Releio Machado todo ano e não peço desculpas.",
    tone: "ameixa",
    favorites: ["OL1003040W", "OL1756937W", "OL1002120W", "OL274505W"],
    goal: 40,
  },
  {
    handle: "theo",
    name: "Theo Nakamura",
    bio: "Livros curtos, cafés longos. Se passou de 400 páginas, tem que me convencer.",
    tone: "anil",
    favorites: ["OL2625457W", "OL24823017W", "OL10263W", "OL468431W"],
    goal: 30,
  },
  {
    handle: "bia",
    name: "Bia Rocha",
    bio: "Choro em livro e recomendo mesmo assim. Clube do livro às quintas.",
    tone: "musgo",
    favorites: ["OL18203673W", "OL24141556W", "OL3140822W", "OL20965973W"],
    goal: 52,
  },
  {
    handle: "caio",
    name: "Caio Mendes",
    bio: "Engenheiro de dia, ficção científica de noite. Andy Weir me deve horas de sono.",
    tone: "ambar",
    favorites: ["OL21745884W", "OL893414W", "OL64365W", "OL1168083W"],
    goal: 25,
  },
  {
    handle: "luiza",
    name: "Luíza Prado",
    bio: "Fantasia, mapas no começo do livro e sagas que não terminam nunca.",
    tone: "anil",
    favorites: ["OL8479867W", "OL27482W", "OL82563W", "OL450063W"],
    goal: 35,
  },
  {
    handle: "rafa",
    name: "Rafa Oliveira",
    bio: "Lendo os clássicos que a escola me obrigou, agora por vontade própria.",
    tone: "musgo",
    favorites: ["OL32525579W", "OL2900596W", "OL1003017W", "OL66554W"],
    goal: 20,
  },
];

export const REVIEWS: Review[] = [
  { id: "r1", user: "marina", bookId: "OL1003040W", rating: 5, date: "2026-09-27", likes: 214, reread: true, text: "Quinta releitura e continuo mudando de opinião sobre Capitu. Bentinho é o narrador menos confiável da literatura brasileira e isso é o livro inteiro." },
  { id: "r2", user: "theo", bookId: "OL24823017W", rating: 4.5, date: "2026-09-26", likes: 98, text: "Acordar virado inseto e se preocupar em perder o trem das cinco. Kafka escreveu minha segunda-feira em 1915." },
  { id: "r3", user: "bia", bookId: "OL18203673W", rating: 5, date: "2026-09-26", likes: 341, liked: true, text: "Li em dois dias, chorei em três momentos diferentes e agora preciso falar sobre isso com alguém. Qualquer pessoa." },
  { id: "r4", user: "caio", bookId: "OL21745884W", rating: 5, date: "2026-09-25", likes: 276, text: "Rocky. É só isso que eu tenho a dizer. Rocky." },
  { id: "r5", user: "luiza", bookId: "OL8479867W", rating: 4.5, date: "2026-09-24", likes: 187, text: "A prosa mais bonita da fantasia moderna. E eu continuo esperando o terceiro livro como quem espera ônibus em dia de chuva." },
  { id: "r6", user: "rafa", bookId: "OL32525579W", rating: 4, date: "2026-09-23", likes: 73, text: "Precisei de três tentativas e uma lista com os nomes russos colada no marcador. Valeu cada página da culpa do Raskólnikov." },
  { id: "r7", user: "marina", bookId: "OL1756937W", rating: 5, date: "2026-09-21", likes: 156, text: "Nonada. As primeiras cinquenta páginas são difíceis, depois a língua do Rosa entra no ouvido e não sai mais." },
  { id: "r8", user: "theo", bookId: "OL1002120W", rating: 4.5, date: "2026-09-20", likes: 112, text: "Oitenta páginas que pesam mais do que muito tijolo de 600. Macabéa mora na minha cabeça agora." },
  { id: "r9", user: "bia", bookId: "OL24141556W", rating: 5, date: "2026-09-18", likes: 203, text: "Leitura obrigatória. A voz da Belonísia no segundo terço do livro é das coisas mais fortes que li nos últimos anos." },
  { id: "r10", user: "caio", bookId: "OL893414W", rating: 4, date: "2026-09-17", likes: 89, text: "O glossário no fim do livro virou meu melhor amigo. Worldbuilding absurdo, ritmo às vezes de deserto mesmo." },
  { id: "r11", user: "luiza", bookId: "OL27482W", rating: 4, date: "2026-09-15", likes: 64, reread: true, text: "Releitura de conforto. Bilbo é o patrono de todo introvertido que foi arrastado para um rolê." },
  { id: "r12", user: "rafa", bookId: "OL2900596W", rating: 5, date: "2026-09-14", likes: 142, text: "Na escola achei chato. Hoje, adulto, o capítulo da Baleia me destruiu no metrô." },
  { id: "r13", user: "marina", bookId: "OL274505W", rating: 4.5, date: "2026-09-12", likes: 97, text: "Todo mundo se chama Aureliano e mesmo assim é perfeito. Faça a árvore genealógica, confie em mim." },
  { id: "r14", user: "theo", bookId: "OL468431W", rating: 4, date: "2026-09-10", likes: 58, text: "Cento e poucas páginas de festas incríveis e gente profundamente triste. A luz verde no fim do cais vive de aluguel na minha cabeça." },
  { id: "r15", user: "bia", bookId: "OL20965973W", rating: 3.5, date: "2026-09-08", likes: 71, text: "A premissa é maravilhosa, a execução é um abraço um pouco óbvio. Mas às vezes a gente precisa de um abraço óbvio." },
  { id: "r16", user: "caio", bookId: "OL1168083W", rating: 5, date: "2026-09-06", likes: 188, text: "Lido pela primeira vez no ensino médio, relido agora. Assustador como ficou mais atual, não menos." },
  { id: "r17", user: "luiza", bookId: "OL82563W", rating: 4, date: "2026-09-04", likes: 52, reread: true, text: "Releitura anual de setembro. Ainda espero a carta de Hogwarts, só que agora com 29 anos." },
  { id: "r18", user: "rafa", bookId: "OL66554W", rating: 4.5, date: "2026-09-02", likes: 84, text: "Eu não esperava rir tanto com um livro de 1813. Jane Austen tinha timing de stand-up." },
  { id: "r19", user: "marina", bookId: "OL1003017W", rating: 5, date: "2026-08-30", likes: 133, text: "O defunto autor é mais vivo que muito narrador por aí. Capítulo das negativas, fecha o livro e vai pensar na vida." },
  { id: "r20", user: "theo", bookId: "OL10263W", rating: 5, date: "2026-08-28", likes: 120, reread: true, text: "Li criança, li adolescente, li agora. A raposa ganha uma camada nova a cada vez." },
  { id: "r21", user: "bia", bookId: "OL3140822W", rating: 5, date: "2026-08-25", likes: 164, text: "Atticus Finch é o pai que todo mundo merecia. A cena da varanda no final me pegou desprevenida." },
  { id: "r22", user: "caio", bookId: "OL64365W", rating: 4, date: "2026-08-22", likes: 61, text: "Mais assustador que 1984 porque aqui ninguém precisa ser obrigado a nada. Todo mundo está feliz, e esse é o problema." },
  { id: "r23", user: "luiza", bookId: "OL450063W", rating: 4.5, date: "2026-08-19", likes: 77, text: "O monstro é o personagem mais humano do livro e o Victor é um estagiário que abandonou o projeto." },
  { id: "r24", user: "rafa", bookId: "OL1003040W", rating: 4, date: "2026-08-16", likes: 45, text: "Traiu. Não traiu. Traiu? Fechei o livro e mandei mensagem para três amigos às duas da manhã." },
  { id: "r25", user: "theo", bookId: "OL2625457W", rating: 4.5, date: "2026-08-12", likes: 93, text: "Melancolia com trilha sonora. Coloquei o disco dos Beatles para tocar e li o último capítulo duas vezes." },
  { id: "r26", user: "bia", bookId: "OL796465W", rating: 2.5, date: "2026-08-08", likes: 39, text: "Entendo por que tanta gente ama, mas o universo conspirou para eu achar um pouco repetitivo." },
  { id: "r27", user: "caio", bookId: "OL17075811W", rating: 4, date: "2026-08-03", likes: 110, text: "Me fez olhar para o trigo com desconfiança. Ótimo para puxar assunto em qualquer mesa de bar." },
  { id: "r28", user: "marina", bookId: "OL27420W", rating: 5, date: "2026-07-29", likes: 149, spoiler: true, text: "Sem travessão, sem nome próprio e sem piedade. A cena do manicômio é das mais difíceis e necessárias que já li." },
  { id: "r29", user: "luiza", bookId: "OL893414W", rating: 5, date: "2026-07-24", likes: 101, text: "Os mapas, as casas, o deserto. Fiquei com areia no sapato por uma semana." },
  { id: "r30", user: "rafa", bookId: "OL1248157W", rating: 4.5, date: "2026-07-20", likes: 66, text: "Jorge Amado escrevendo sobre meninos que ninguém queria ver. Pedro Bala virou gente da família." },
];

export const LOGS: Log[] = [
  { user: "marina", bookId: "OL24141556W", rating: 4.5, date: "2026-09-05" },
  { user: "marina", bookId: "OL1002120W", rating: 5, date: "2026-08-20", liked: true },
  { user: "marina", bookId: "OL2900596W", rating: 4.5, date: "2026-08-02" },
  { user: "marina", bookId: "OL66554W", rating: 4, date: "2026-07-15" },
  { user: "theo", bookId: "OL796465W", rating: 3, date: "2026-09-01" },
  { user: "theo", bookId: "OL20965973W", rating: 3.5, date: "2026-08-18" },
  { user: "bia", bookId: "OL82563W", rating: 4.5, date: "2026-09-12", liked: true },
  { user: "bia", bookId: "OL2625457W", rating: 4, date: "2026-08-30" },
  { user: "caio", bookId: "OL450063W", rating: 4, date: "2026-09-10" },
  { user: "caio", bookId: "OL27482W", rating: 4, date: "2026-08-14" },
  { user: "luiza", bookId: "OL21745884W", rating: 5, date: "2026-09-19", liked: true },
  { user: "luiza", bookId: "OL274505W", rating: 4, date: "2026-08-26" },
  { user: "rafa", bookId: "OL1168083W", rating: 4.5, date: "2026-09-08" },
  { user: "rafa", bookId: "OL24823017W", rating: 4, date: "2026-08-24" },
];

export const LISTS: List[] = [
  {
    slug: "classicos-brasileiros-que-nao-sao-chatos",
    user: "marina",
    title: "Clássicos brasileiros que não são chatos",
    description: "Para quem ficou traumatizado com a lista do vestibular. Juro que são bons.",
    books: ["OL1003040W", "OL1003017W", "OL2900596W", "OL1002120W", "OL1248157W", "OL1756937W"],
    likes: 482,
  },
  {
    slug: "para-ler-numa-sentada",
    user: "theo",
    title: "Para ler numa sentada",
    description: "Menos de 200 páginas. Começa no café da tarde, termina antes do jantar.",
    books: ["OL24823017W", "OL1002120W", "OL10263W", "OL2900596W", "OL468431W", "OL796465W"],
    likes: 356,
  },
  {
    slug: "ficcao-cientifica-para-comecar",
    user: "caio",
    title: "Ficção científica para começar",
    description: "A porta de entrada, em ordem de dificuldade.",
    books: ["OL21745884W", "OL1168083W", "OL64365W", "OL450063W", "OL893414W"],
    likes: 291,
  },
  {
    slug: "chorei-no-onibus",
    user: "bia",
    title: "Livros que me fizeram chorar no ônibus",
    description: "Leia em casa. Ou leve lenço.",
    books: ["OL18203673W", "OL24141556W", "OL3140822W", "OL2625457W", "OL20965973W", "OL2900596W"],
    likes: 624,
  },
];

const usersByHandle = new Map(USERS.map((u) => [u.handle, u]));

export function getUser(handle: string): User | undefined {
  return usersByHandle.get(handle);
}

export function getList(slug: string): List | undefined {
  return LISTS.find((l) => l.slug === slug);
}

export function reviewsFor(bookId: string): Review[] {
  return REVIEWS.filter((r) => r.bookId === bookId).sort((a, b) => b.likes - a.likes);
}

export function reviewsBy(handle: string): Review[] {
  return REVIEWS.filter((r) => r.user === handle).sort((a, b) => b.date.localeCompare(a.date));
}

export function listsWith(bookId: string): List[] {
  return LISTS.filter((l) => l.books.includes(bookId));
}

/** Diário de um leitor: reviews e registros sem review, do mais recente para o mais antigo. */
export function diaryOf(handle: string) {
  const fromReviews = REVIEWS.filter((r) => r.user === handle).map((r) => ({
    bookId: r.bookId,
    rating: r.rating as number | null,
    date: r.date,
    liked: Boolean(r.liked),
    reread: Boolean(r.reread),
    reviewId: r.id as string | undefined,
  }));
  const fromLogs = LOGS.filter((l) => l.user === handle).map((l) => ({
    bookId: l.bookId,
    rating: l.rating,
    date: l.date,
    liked: Boolean(l.liked),
    reread: false,
    reviewId: undefined,
  }));
  return [...fromReviews, ...fromLogs].sort((a, b) => b.date.localeCompare(a.date));
}

/**
 * Números agregados de um livro. Na demonstração são derivados do id,
 * então são estáveis entre renders e servidores.
 */
export function bookStats(bookId: string) {
  let h = 2166136261;
  for (const ch of bookId) h = Math.imul(h ^ ch.charCodeAt(0), 16777619) >>> 0;
  const rand = (n: number) => ((h = Math.imul(h ^ (h >>> 15), 2246822507) >>> 0) % n) / n;

  const readers = 800 + Math.round(rand(1000) * 24000);
  const center = 3.4 + rand(100) * 1.2;
  // Histograma de 10 colunas (0,5 a 5 estrelas), curva em torno da média.
  const histogram = Array.from({ length: 10 }, (_, i) => {
    const star = (i + 1) / 2;
    return Math.max(0.01, Math.exp(-((star - center) ** 2) / 0.9));
  });
  const total = histogram.reduce((a, b) => a + b, 0);
  const avg = histogram.reduce((acc, w, i) => acc + w * ((i + 1) / 2), 0) / total;
  return {
    readers,
    avg: Math.round(avg * 10) / 10,
    histogram: histogram.map((w) => w / Math.max(...histogram)),
    reading: Math.round(readers * (0.04 + rand(100) * 0.06)),
    wantToRead: Math.round(readers * (0.6 + rand(100) * 0.9)),
  };
}
