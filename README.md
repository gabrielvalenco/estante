# Estante

Um diário de leitura social, no espírito do Letterboxd, só que para livros.
Marque o que você **quer ler**, o que está **lendo** e o que já **leu**, dê nota de meia em meia estrela,
escreva reviews curtas e descubra livros pelas listas de outros leitores.

> Projeto de portfólio. Leitores e reviews são fictícios; livros, capas e busca vêm da [Open Library](https://openlibrary.org).

## O que dá para fazer

- **Buscar qualquer livro** em mais de 20 milhões de títulos da Open Library.
- **Montar sua estante** sem cadastro, e criar conta (Google, GitHub ou e-mail e senha) para sincronizar e ganhar um perfil público.
- **Página de cada livro tingida com a cor da capa**, com média, distribuição das notas e reviews.
- **Perfis** com os 4 favoritos, meta de leitura do ano e diário mês a mês.
- **Modo escuro** que segue o sistema, com seletor no rodapé.
- **Rede social de leitura:** seguir leitores, feed de quem você segue, curtir ou não curtir reviews,
  notificações (novos seguidores, pedidos, curtidas e quando alguém que você segue termina um livro da sua lista),
  sugestões de leitores por gosto em comum e amigos de amigos, busca por @ ou nome.
- **Privacidade:** perfil privado com pedidos para seguir, bloqueio, e direitos da LGPD dentro do app
  (baixar os dados em JSON e excluir a conta). Política de privacidade e termos de uso em [/privacidade](app/privacidade/page.tsx).
- **Perfil:** nome e @ únicos, até 3 redes sociais montadas pelo app (sem link livre) com selo de verificado no
  GitHub e no Bluesky quando o perfil aponta de volta para a Estante.
- **Comprar o livro:** botão com link de afiliado da Amazon (busca pelo título, em Livros), com `rel="sponsored"` e o aviso do Associados. Liga com a variável `AMAZON_ASSOCIATE_TAG`.
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
- [Neon](https://neon.tech) (Postgres) com [Drizzle ORM](https://orm.drizzle.team)
- [Auth.js](https://authjs.dev) para login com Google, GitHub e e-mail e senha
- [zod](https://zod.dev) para validar tudo o que chega nas server actions
- [Open Library API](https://openlibrary.org/developers/api) para busca, obras e capas

## Rodando localmente

```bash
npm install
npm run dev
```

Abra [http://localhost:3000](http://localhost:3000). Sem configurar nada, o app roda em **modo demonstração**:
tudo funciona, e a estante fica salva no navegador.

### Com contas (Postgres local)

Precisa do [Docker](https://www.docker.com/products/docker-desktop/) rodando.

```bash
docker run -d --name estante-pg -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=estante -p 54330:5432 postgres:17-alpine
cp .env.example .env.local   # preencha AUTH_SECRET (npx auth secret) e ENABLE_DEV_LOGIN=true
npm run db:migrate
npm run dev
```

Em desenvolvimento, a tela de login tem um **login de teste** (só um nome, sem senha) para não precisar
de um app OAuth. Ele não existe em produção. Depois de mudar `lib/db/schema.ts`, rode `npm run db:generate`
e `npm run db:migrate`; `npm run db:studio` abre o Drizzle Studio.

## Contas e banco

- **Três formas de entrar** pelo [Auth.js](https://authjs.dev), com sessão em JWT: Google, GitHub e e-mail e senha.
- **Senhas com cuidado:** hash `scrypt` com salt, numa tabela separada dos perfis (que são públicos); bloqueio de
  15 minutos depois de 5 tentativas erradas; e a mesma mensagem e o mesmo tempo de resposta para "e-mail não
  cadastrado" e "senha errada", para ninguém descobrir quem tem conta. Sem domínio próprio não há envio de e-mail,
  então ainda não existe "esqueci minha senha".
- **Nada interno em página pública:** as consultas públicas listam as colunas uma a uma; o `provider_id` e o
  e-mail nunca saem do servidor.
- **A estante migra sozinha:** o que o visitante marcou no navegador vai para a conta no primeiro login.
- **Salvar é otimista:** a tela muda na hora e volta atrás com um aviso se o servidor recusar.
- **Perfis públicos** em `/u/@`, com favoritos escolhidos, meta anual, diário e reviews.
- **Cada um só escreve no que é seu:** toda escrita passa por server actions que pegam o id da sessão
  (nunca do navegador) e validam a entrada com zod. As mesmas regras existem como constraints no
  Postgres, como segunda linha de defesa. Testado reenviando chamadas adulteradas.
- **Sem tabela compartilhada de livros:** cada registro guarda uma cópia do livro. Assim ninguém
  consegue mudar o título ou a capa de um livro para os outros.
- **Páginas em cache (ISR):** livros, perfis e a home são estáticos e revalidados quando alguém
  salva algo, sem depender de cookies.

## Deploy (Vercel + Neon)

1. Na Vercel, importe o repositório.
2. Em **Storage**, crie um banco **Neon** (plano grátis) e conecte ao projeto. A Vercel adiciona o
   `DATABASE_URL` sozinha. Aplique o schema uma vez, da sua máquina:
   ```bash
   DATABASE_URL="<connection string do Neon>" npm run db:migrate
   ```
3. Crie um **GitHub OAuth App** em [github.com/settings/developers](https://github.com/settings/developers)
   com a callback `https://SEU-APP.vercel.app/api/auth/callback/github`.
4. Opcional, para o Google: crie um OAuth Client (tipo *Aplicativo da Web*) em
   [console.cloud.google.com](https://console.cloud.google.com/apis/credentials) com a URI de redirecionamento
   `https://SEU-APP.vercel.app/api/auth/callback/google`.
5. Adicione na Vercel: `AUTH_SECRET` (gere com `npx auth secret`), `AUTH_GITHUB_ID`, `AUTH_GITHUB_SECRET` e,
   se configurou o Google, `AUTH_GOOGLE_ID` e `AUTH_GOOGLE_SECRET`. E-mail e senha não precisam de nada.
6. Faça um novo deploy.

Sem essas variáveis, o deploy funciona do mesmo jeito, em modo demonstração.

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
  library.ts             estante pessoal: localStorage ou banco, com a mesma API
  db/                    schema (Drizzle), conexão e consultas públicas
  data/                  livros gerados, curadoria e dados sociais fictícios
scripts/seed-books.mjs   gera lib/data/books.json
drizzle/                 migrações SQL geradas a partir do schema
auth.ts                  configuração do Auth.js
app/actions.ts           server actions: toda escrita passa por aqui
```

## Próximos passos

- Seguir leitores e feed de amigos
- Retrospectiva do ano com gráficos
