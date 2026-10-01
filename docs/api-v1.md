# API v1 (app Estante)

API JSON usada pelo app mobile (Expo). Mesmas regras do site: a lógica vem das server actions
(`app/*actions.ts`), a API só traduz para HTTP.

## Autenticação

`POST /api/v1/auth/login` ou `/api/v1/auth/signup` devolvem `{ token, account }`.
Nas outras rotas, mande o token no cabeçalho:

```
Authorization: Bearer <token>
```

- JWT HS256 com chave derivada do `AUTH_SECRET`, audiência `estante-app`, validade de 30 dias.
- O token vale só para a API: não é aceito como sessão do site, e o cookie do site não é aceito
  nas rotas de escrita da API (sem risco de CSRF).
- Guarde no app com `expo-secure-store` (Keychain / Keystore), nunca em AsyncStorage.

Erros vêm como `{ "error": "<código>" }` com o status HTTP correspondente
(`unauthenticated` 401, `invalid` 400, `invalid_credentials` 401, `locked` 429, `email_taken` 409,
`handle_taken` 409, `name_taken` 409, `not_found` 404, `blocked` 403, `too_big` 413, `unavailable` 503).

## Rotas

| Método | Rota | Token | O que faz |
|---|---|---|---|
| POST | `/auth/signup` | não | `{ name, email, password }` (senha ≥ 8) → 201 `{ token, account }` |
| POST | `/auth/login` | não | `{ email, password }` → `{ token, account }`. 5 erros seguidos bloqueiam 15 min |
| GET | `/me` | sim | Conta: `profile`, `shelf`, `following`, `requested`, `blocked`, `hasPassword`, `plan` (`{ plan, status, interval, periodEnd, canceling }`) |
| PATCH | `/me` | sim | `{ name, handle, bio, goal, tone, favorites }` e/ou `{ isPrivate }` → conta atualizada |
| POST | `/me/avatar` | sim | multipart, campo `file` (recorte quadrado; o servidor gera 256px WebP) → `{ profile }` |
| DELETE | `/me/avatar` | sim | Remove a foto → `{ profile }` |
| GET | `/retrospective?year=` | sim | Retrospectiva do ano: `basic` para todos, `full` só no Capa Dura (senão `null`) |
| GET | `/plans` | não | `{ enabled, prices, plans }`: limites de cada plano e se a assinatura já está aberta |
| GET | `/home` | não | `{ books, reviews }`: vitrine e reviews recentes |
| GET | `/books/search?q=` | não | `{ books }` (título, autor ou ISBN; 2 a 80 caracteres) |
| GET | `/books/:id` | opcional | `{ book, stats, reviews, buy, myEntry }` (`myEntry` só com token) |
| PUT | `/shelf/:bookId` | sim | `{ book, status, rating, liked, review, finishedOn, updatedAt }`; registro vazio remove |
| GET | `/users/search?q=` | não | `{ readers }` por nome ou @ |
| GET | `/users/:handle` | opcional | `{ profile, access }`; `access`: `public`, `granted`, `login`, `not_follower`, `blocked` |
| POST | `/users/:handle/follow` | sim | `{ follow: boolean }` → `{ state: "following" \| "requested" \| "none" }` |
| GET | `/feed` | sim | `{ items }`: leituras recentes de quem você segue |
| GET | `/notifications` | sim | `{ items, unread }` |
| POST | `/notifications/read` | sim | Marca todas como lidas |
| POST | `/requests/:handle` | sim | `{ accept: boolean }`: aceita ou recusa um pedido para seguir |
| GET | `/reading/:bookId` | sim | `{ progress, annotations, usage }`: marcador, citações e notas do livro |
| PUT | `/reading/:bookId` | sim | `{ page, totalPages }` salva o marcador; página 0 sem total apaga |
| GET | `/annotations?kind=` | sim | `{ annotations, usage, progress }`; `kind`: `quote` ou `note` (opcional) |
| POST | `/annotations` | sim | `{ book, kind, text, comment?, page? }` → 201; passou do limite do plano: 402 com `usage` |
| PATCH | `/annotations/:id` | sim | `{ text?, comment?, page? }` |
| DELETE | `/annotations/:id` | sim | Exclui a anotação |
| GET | `/books/:id/discussions?spoilers=1&club=` | opcional | `{ threads, viewer, usage }`; o que passa da página de quem pede vem com `spoiler: true` e sem texto |
| POST | `/books/:id/discussions` | sim | `{ bookTitle, title, body, page, clubId? }` → 201; limite do plano: 402; muitas mensagens seguidas: 429 |
| GET | `/discussions/:id?spoilers=1` | opcional | `{ thread, posts, viewer, book }` |
| DELETE | `/discussions/:id` | sim | Apaga a própria discussão |
| POST | `/discussions/:id/posts` | sim | `{ body, page }` → 201 |
| DELETE | `/posts/:id` | sim | Apaga a própria resposta |
| GET | `/clubs` | sim | `{ clubs, canCreate, owned, ownedLimit, planName }` |
| POST | `/clubs` | sim | `{ name, description?, book? }` → 201 `{ id }`; criar é do Ex Libris (402) |
| GET | `/clubs/:id` | sim | Clube com `memberList` (progresso no livro do clube); 404 para quem não é membro |
| POST | `/clubs/:id/leave` | sim | Sai do clube |
| GET | `/clubs/invite/:code` | sim | Prévia do convite |
| POST | `/clubs/join` | sim | `{ code }` → `{ id }`; cheio: 409 |
| POST | `/reports` | sim | `{ kind: "thread" | "post", id, reason? }`; 3 denúncias escondem o item |

Valores de `status`: `quero-ler`, `lendo`, `lido` ou `null`. `rating`: 0.5 a 5, de meia em meia, ou `null`.
Anotações e marcadores são privados: cada token só enxerga os da própria conta.
Limites do plano Brochura (grátis): 20 citações no total, 3 notas por livro e 3 discussões novas por mês (`lib/plans.ts`).

Discussões: cada item tem `page` (0 = sem spoiler). Quem está numa página anterior recebe `spoiler: true` com `title` e `body` nulos; quem marcou o livro como lido vê tudo.

`finishedOn`: `AAAA-MM-DD`. Capas: `https://covers.openlibrary.org/b/id/<coverId>-M.jpg` (S, M ou L).
