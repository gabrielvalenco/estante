# Estante

Um diário de leitura social, no espírito do Letterboxd, só que para livros.
Marque o que você **quer ler**, o que está **lendo** e o que já **leu**, dê nota de meia em meia estrela,
escreva reviews curtas e descubra livros pelas listas de outros leitores.

> Projeto de portfólio. Leitores e reviews são fictícios; livros, capas e busca vêm da [Open Library](https://openlibrary.org).

## O que dá para fazer

- **Buscar qualquer livro** em mais de 20 milhões de títulos da Open Library.
- **Montar sua estante** sem cadastro: status, nota, curtida e review ficam salvos no navegador.
- **Página de cada livro tingida com a cor da capa**, com média, distribuição das notas e reviews.
- **Perfis** com os 4 favoritos, meta de leitura do ano e diário mês a mês.
- **Listas** curadas e página de explorar com filtro por gênero e ordenação.

## Três cores, uma estante

O logo são três camadas que dividem o mesmo canto. Cada uma é um estado de leitura, e essas cores
são usadas no app inteiro com esse significado:

| | Cor | Estado |
|---|---|---|
| 🟦 | Anil `#3A2FD6` | Quero ler |
| 🟪 | Ameixa `#8E2C80` | Lendo |
| 🟩 | Musgo `#2E7D4F` | Lido |
| 🟨 | Âmbar `#F5A524` | Avaliação (o marcador do logo) |

O sistema completo está em [DESIGN.md](DESIGN.md).

## Stack

- [Next.js 15](https://nextjs.org) (App Router, Server Components) + TypeScript
- [Tailwind CSS v4](https://tailwindcss.com) com tokens próprios
- [shadcn/ui](https://ui.shadcn.com) sobre Base UI
- [Motion](https://motion.dev) para as microinterações
- [Open Library API](https://openlibrary.org/developers/api) para busca, obras e capas

## Rodando localmente

```bash
npm install
npm run dev
```

Abra [http://localhost:3000](http://localhost:3000).

Para regenerar a base de livros de exemplo (metadados, capas e cor de cada capa):

```bash
node scripts/seed-books.mjs
```

## Estrutura

```
app/
  page.tsx               home
  livro/[id]/            página do livro (base de exemplo ou qualquer obra da Open Library)
  livros/                explorar, com gênero e ordenação
  busca/                 busca na Open Library
  u/[handle]/            perfil do leitor
  listas/ e listas/[slug]
  leitores/
  estante/               a estante de quem está usando
components/              BookCover, Stars, BookActions, LogDialog, ReviewCard...
lib/
  books.ts               tipo Book e base de exemplo
  openlibrary.ts         cliente da Open Library
  library.ts             estante pessoal (localStorage)
  data/                  livros gerados, curadoria e dados sociais fictícios
scripts/seed-books.mjs   gera lib/data/books.json
```

## Próximos passos

- Contas e banco (Supabase) para a estante sincronizar entre aparelhos
- Seguir leitores e feed de amigos
- Retrospectiva do ano com gráficos
- Modo escuro
