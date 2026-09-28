# Estante

Um diário de leitura social, no espírito do Letterboxd, só que para livros.
Marque o que você **quer ler**, o que está **lendo** e o que já **leu**, dê nota de meia em meia estrela,
escreva reviews curtas e descubra livros pelas listas de outros leitores.

> Projeto de portfólio. Leitores e reviews são fictícios; livros, capas e busca vêm da [Open Library](https://openlibrary.org).

## O que dá para fazer

- **Buscar qualquer livro** em mais de 20 milhões de títulos da Open Library.
- **Montar sua estante** sem cadastro, e entrar com link mágico para sincronizar e ganhar um perfil público.
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
- [Supabase](https://supabase.com) para contas (Auth) e banco (Postgres com Row Level Security)
- [Open Library API](https://openlibrary.org/developers/api) para busca, obras e capas

## Rodando localmente

```bash
npm install
npm run dev
```

Abra [http://localhost:3000](http://localhost:3000). Sem configurar nada, o app roda em **modo demonstração**:
tudo funciona, e a estante fica salva no navegador.

### Com contas (Supabase local)

Precisa do [Docker](https://www.docker.com/products/docker-desktop/) rodando.

```bash
npx supabase start          # sobe Postgres, Auth e o Mailpit, e aplica as migrações
cp .env.example .env.local  # cole a URL e a Publishable key que o comando acima mostrou
npm run dev
```

Os e-mails de login (link mágico) chegam no Mailpit: [http://127.0.0.1:54324](http://127.0.0.1:54324).
Depois de mudar o schema, `npm run db:types` regenera os tipos do TypeScript.

## Contas e banco

- **Login sem senha** por link mágico no e-mail, e GitHub como opção.
- **A estante migra sozinha:** o que o visitante marcou no navegador vai para a conta no primeiro login.
- **Salvar é otimista:** a tela muda na hora e volta atrás com um aviso se o banco recusar.
- **Perfis públicos** em `/u/@`, com favoritos escolhidos, meta anual, diário e reviews.
- **Row Level Security:** estantes e perfis são públicos para leitura, mas cada pessoa só
  escreve no que é seu. As regras estão em [`supabase/migrations`](supabase/migrations).
- **Sem tabela compartilhada de livros:** cada registro guarda uma cópia do livro. Assim ninguém
  consegue mudar o título ou a capa de um livro para os outros.
- **Páginas em cache (ISR):** livros, perfis e a home são estáticos e revalidados quando alguém
  salva algo, sem depender de cookies.

## Deploy (Vercel + Supabase)

1. Crie um projeto no [Supabase](https://supabase.com/dashboard) e aplique o schema:
   ```bash
   npx supabase link --project-ref SEU_PROJECT_REF
   npx supabase db push
   ```
   (ou cole o conteúdo de `supabase/migrations/*.sql` no SQL Editor)
2. Em **Authentication > URL Configuration**, coloque a URL da Vercel em *Site URL* e
   `https://SEU-APP.vercel.app/**` em *Redirect URLs*.
3. Na Vercel, importe o repositório e adicione as variáveis de `.env.example`
   (`NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`).
4. Opcional: configure o provedor GitHub em **Authentication > Providers** e defina
   `NEXT_PUBLIC_AUTH_GITHUB=true`.

Sem as variáveis, o deploy funciona do mesmo jeito, em modo demonstração.

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
  entrar/ e conta/       login e configurações do perfil
components/              BookCover, Stars, BookActions, LogDialog, ReviewCard...
lib/
  books.ts               tipo Book e base de exemplo
  openlibrary.ts         cliente da Open Library
  library.ts             estante pessoal: localStorage ou Supabase, com a mesma API
  supabase/              clientes, consultas públicas e tipos gerados
  data/                  livros gerados, curadoria e dados sociais fictícios
scripts/seed-books.mjs   gera lib/data/books.json
supabase/migrations/     schema, trigger de perfil e políticas de RLS
```

## Próximos passos

- Seguir leitores e feed de amigos
- Retrospectiva do ano com gráficos
- Modo escuro
