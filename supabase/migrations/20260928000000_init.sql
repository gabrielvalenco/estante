-- Estante: perfis e registros de leitura.
--
-- Decisão: não existe tabela compartilhada de livros. Cada registro guarda uma cópia
-- dos dados do livro (título, autor, capa, cor). Assim nenhum usuário consegue alterar
-- como um livro aparece para os outros: cada um só escreve nas próprias linhas.

-- ------------------------------------------------------------
-- Perfis
-- ------------------------------------------------------------

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  handle text not null unique
    check (handle ~ '^[a-z0-9_]{3,20}$')
    -- Handles dos leitores de demonstração (lib/data/social.ts).
    check (handle not in ('marina', 'theo', 'bia', 'caio', 'luiza', 'rafa')),
  name text not null check (char_length(name) between 1 and 60),
  bio text not null default '' check (char_length(bio) <= 200),
  tone text not null default 'anil' check (tone in ('anil', 'ameixa', 'musgo', 'ambar')),
  goal integer not null default 24 check (goal between 1 and 365),
  favorites text[] not null default '{}' check (cardinality(favorites) <= 4),
  created_at timestamptz not null default now()
);

comment on table public.profiles is 'Perfil público de cada leitor.';

-- ------------------------------------------------------------
-- Registros de leitura (a estante)
-- ------------------------------------------------------------

create table public.entries (
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  book_id text not null check (book_id ~ '^OL[0-9]+W$'),

  -- Cópia do livro no momento do registro.
  book_title text not null check (char_length(book_title) between 1 and 300),
  book_author text not null check (char_length(book_author) <= 200),
  book_cover_id integer,
  book_color text not null check (book_color ~ '^#[0-9a-f]{6}$'),
  book_year integer,
  book_pages integer check (book_pages > 0),

  status text check (status in ('quero-ler', 'lendo', 'lido')),
  rating numeric(2, 1) check (rating between 0.5 and 5 and rating * 2 = floor(rating * 2)),
  liked boolean not null default false,
  review text not null default '' check (char_length(review) <= 600),
  finished_on date,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, book_id)
);

comment on table public.entries is 'Um livro na estante de um leitor: status, nota, curtida e review.';

create index entries_user_updated_idx on public.entries (user_id, updated_at desc);
create index entries_book_reviews_idx on public.entries (book_id, updated_at desc) where review <> '';

-- updated_at sempre do servidor.
create function public.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger entries_touch_updated_at
before update on public.entries
for each row execute function public.touch_updated_at();

-- ------------------------------------------------------------
-- Perfil criado junto com a conta
-- ------------------------------------------------------------

create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  display_name text;
  base text;
  candidate text;
  tones text[] := array['anil', 'ameixa', 'musgo', 'ambar'];
begin
  display_name := coalesce(
    nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''),
    nullif(trim(new.raw_user_meta_data ->> 'name'), ''),
    split_part(new.email, '@', 1),
    'Leitor'
  );

  -- Handle a partir do nome de usuário do GitHub ou do e-mail, só [a-z0-9_].
  base := lower(coalesce(new.raw_user_meta_data ->> 'user_name', split_part(new.email, '@', 1), 'leitor'));
  base := left(regexp_replace(base, '[^a-z0-9_]', '', 'g'), 14);
  if char_length(base) < 3 then
    base := 'leitor';
  end if;

  candidate := base;
  while exists (select 1 from public.profiles where handle = candidate)
     or candidate in ('marina', 'theo', 'bia', 'caio', 'luiza', 'rafa') loop
    candidate := base || floor(random() * 9000 + 1000)::int;
  end loop;

  insert into public.profiles (id, handle, name, tone)
  values (new.id, candidate, left(display_name, 60), tones[1 + floor(random() * 4)::int]);
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- ------------------------------------------------------------
-- Row Level Security
-- Estantes e perfis são públicos (é uma rede social de leitura),
-- mas cada pessoa só escreve no que é seu.
-- ------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.entries enable row level security;

create policy "Perfis são públicos"
on public.profiles for select
to anon, authenticated
using (true);

create policy "Cada um edita o próprio perfil"
on public.profiles for update
to authenticated
using ((select auth.uid()) = id)
with check ((select auth.uid()) = id);

create policy "Estantes são públicas"
on public.entries for select
to anon, authenticated
using (true);

create policy "Cada um adiciona na própria estante"
on public.entries for insert
to authenticated
with check ((select auth.uid()) = user_id);

create policy "Cada um altera a própria estante"
on public.entries for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "Cada um remove da própria estante"
on public.entries for delete
to authenticated
using ((select auth.uid()) = user_id);

-- Só o necessário: o perfil nasce pelo trigger, então ninguém insere direto.
revoke insert, delete on public.profiles from anon, authenticated;
revoke insert, update, delete on public.entries from anon;
