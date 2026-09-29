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
| GET | `/me` | sim | Conta: `profile`, `shelf`, `following`, `requested`, `blocked`, `hasPassword` |
| PATCH | `/me` | sim | `{ name, handle, bio, goal, tone, favorites }` e/ou `{ isPrivate }` → conta atualizada |
| POST | `/me/avatar` | sim | multipart, campo `file` (recorte quadrado; o servidor gera 256px WebP) → `{ profile }` |
| DELETE | `/me/avatar` | sim | Remove a foto → `{ profile }` |
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

Valores de `status`: `quero-ler`, `lendo`, `lido` ou `null`. `rating`: 0.5 a 5, de meia em meia, ou `null`.
`finishedOn`: `AAAA-MM-DD`. Capas: `https://covers.openlibrary.org/b/id/<coverId>-M.jpg` (S, M ou L).
