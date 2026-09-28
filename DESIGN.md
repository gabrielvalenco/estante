# Estante, Design System

> Referência de design do projeto. Leia antes de criar ou alterar qualquer componente de UI.
> Se algo não estiver definido aqui, siga os Princípios e depois registre a decisão na seção 7.

## 0. O produto em uma frase

**Estante** é um diário de leitura social, no espírito do Letterboxd: você marca o que quer ler,
o que está lendo e o que leu, dá nota de meia em meia estrela e escreve reviews curtas.

## 1. Princípios

1. **A capa é a protagonista.** A cor do app vem das capas. A interface em volta é neutra
   (off-white, cinzas quentes, estilo Apple) para as capas brilharem.
2. **Cor com função.** As cores da marca não são decoração: cada uma significa um estado.
   Se uma cor aparece, ela diz alguma coisa.
3. **Vivo, não barulhento.** Cor em blocos grandes e suaves (fundos `-soft`, faixa tingida
   na página do livro), nunca em muitos pontos pequenos competindo.
4. **Salvar é instantâneo.** Nenhuma ação de estante tem botão "salvar": clicou, está salvo,
   e um toast confirma. O único formulário é o de registrar leitura com review.
5. **Português de gente.** "Quero ler", "Lendo", "Lido". Datas relativas ("há 3 dias").
   Números no formato brasileiro ("4,5", "12 mil").

**Referências de tom:** Apple (tipografia grande e apertada, respiro, pílulas),
Letterboxd (densidade das reviews, top 4 no perfil), Apple Music (página tingida pela capa).

## 2. Identidade

- **Nome:** Estante (definido em `lib/site.ts`, trocar o nome é trocar lá).
- **Mark:** três camadas arredondadas que dividem o canto inferior direito, uma para cada
  estado de leitura, e um marcador de página âmbar no topo. Evolução do protótipo de três
  retângulos aninhados. Em `components/brand.tsx` e `app/icon.svg`.
- **Wordmark:** Inter 600, `letter-spacing: -0.035em`.

## 3. Cor

| Token | Hex | Significado |
|---|---|---|
| `--anil` | `#3A2FD6` | **Quero ler**, e a cor de ação (botão primário, links) |
| `--ameixa` | `#8E2C80` | **Lendo**, e curtidas (coração) |
| `--musgo` | `#2B784C` | **Lido**, e metas cumpridas |
| `--ambar` | `#F5A524` | **Avaliação** (estrelas, histograma) e o marcador do logo |

Cada cor tem um `-soft` para fundos grandes (cards de status, meta de leitura, avatar).

Neutros no estilo Apple: `--canvas #FBFBFD` (página), `--surface #FFF` (cards),
`--sunken #F5F5F7` (chips, controles), `--ink #1D1D1F` (texto), `--ink-3 #6E6E73` (secundário).

**Cor do livro.** Cada livro tem uma cor viva extraída da capa (`scripts/seed-books.mjs`
agrupa os pixels por matiz e escolhe o grupo mais saturado). Ela tinge o topo da página
do livro e o espaço da capa enquanto a imagem carrega. Capas preto e branco recebem
cor manual em `lib/data/curation.ts`.

### 3.1 Modo escuro

Segue o sistema por padrão, com seletor (automático, claro, escuro) no rodapé. Fundo quase preto
(`#0B0B0D`), para as capas brilharem como numa prateleira à noite.

- As cores da marca ficam **mais claras** no escuro (anil `#8F89FF`, ameixa `#E27ED4`, musgo `#5CC88A`),
  para continuarem legíveis como texto.
- Em preenchimentos (botão primário, status ativo), o texto por cima usa `--on-brand`: branco no claro,
  quase preto no escuro. Sobre `bg-ink`, use `--on-ink`. **Nunca `text-white` sobre uma cor de token.**
- Sombras mais fortes no escuro, senão a capa não descola do fundo.
- Todo par de texto e fundo foi validado em 4,5:1 nos dois modos. A validação pegou o musgo do modo claro
  sobre `--musgo-soft` (4,44:1), que foi escurecido para `#2B784C`.

## 4. Tipografia

Inter (via `next/font`), com o ar da SF Pro.

| Token | Tamanho | Tracking | Uso |
|---|---|---|---|
| `text-hero` | 40 → 72px | -0.045em | Título da home |
| `text-title` | 28 → 40px | -0.035em | Título de página |
| `text-section` | 20 → 24px | -0.022em | Título de seção |

Corpo em 15 a 17px. Números com `.tnum`.

## 5. Forma e movimento

- **Raios:** cards 16 a 24px, blocos de destaque 32px, botões e chips em pílula.
- **Capas:** raio assimétrico (`3px 6px 6px 3px`, a lombada é mais reta), sombra de duas
  camadas e um vinco de luz na lombada. Hover levanta 4px, como tirar da prateleira.
- **Motion:** `fade-up` de 480ms na entrada da página (CSS, sem esperar hidratação);
  mola no seletor de status (`layoutId`) e no coração. `prefers-reduced-motion` desliga tudo.

## 6. Componentes

| Componente | Arquivo | Nota |
|---|---|---|
| `BookCover` | `components/book-cover.tsx` | Sem capa, vira um livro de tecido na cor da marca |
| `Stars` / `StarInput` | `components/stars.tsx` | Meia estrela, teclado com setas, clicar na nota atual limpa |
| `BookActions` | `components/book-actions.tsx` | Status nas três cores, nota e curtida |
| `LogDialog` | `components/log-dialog.tsx` | Data, nota, curtida e review |
| `ReviewCard` | `components/review-card.tsx` | Spoiler fica escondido até a pessoa escolher |
| `Shelf` | `components/shelf.tsx` | Rola na horizontal no celular, vira grade no desktop |

Base: shadcn/ui (Base UI) com os tokens acima mapeados nas variáveis do shadcn em `globals.css`.

## 7. Decisões

- **Modo escuro com next-themes**, por classe no `<html>`. O seletor só marca a opção ativa depois da
  hidratação, porque o tema salvo só existe no navegador.

- **`cn` com tokens registrados.** O merge de classes descartava `text-hero` achando que era
  cor. Tamanhos e sombras novos precisam entrar em `lib/utils.ts`.
- **Capas com `<img>`, não `next/image`.** A Open Library redireciona para servidores do
  archive.org, que o otimizador não segue. Também evita gastar a cota de imagens da Vercel.
- **Estante com dois modos.** Sem login, fica no `localStorage`; com login, no Postgres (Neon) via server actions. Os componentes
  só conhecem `useLibrary`, `useEntry` e `saveEntry`. No primeiro login, o que estava no navegador sobe
  para a conta (em conflito, vale a alteração mais recente) e um toast avisa quantos livros foram.
- **Salvar otimista.** A tela muda antes da resposta do banco; se falhar, só aquele livro volta ao
  estado anterior e aparece um toast de erro. Nunca um spinner para marcar status.
- **Login com GitHub** (Auth.js). Em desenvolvimento, um login de teste só com o nome, marcado na tela como
  "só em desenvolvimento" e desligado em produção pelo `NODE_ENV`.
- **Estados de carregamento.** Antes de saber se há sessão, a estante mostra o esqueleto, nunca
  "sua estante está vazia", que seria mentira por um instante.
- **Números agregados determinísticos.** Média e total de leitores são derivados do id do livro,
  então não mudam entre renders nem geram erro de hidratação.
