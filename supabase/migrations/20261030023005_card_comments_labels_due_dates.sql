-- Card details: due dates, comments, and per-board labels. Every new table
-- carries board_id (filled by trigger) so RLS and realtime filters are cheap.

alter table public.cards add column if not exists due_date date;

-- Comments ---------------------------------------------------------------
create table if not exists public.card_comments (
  id uuid primary key default gen_random_uuid(),
  card_id uuid not null references public.cards (id) on delete cascade,
  board_id uuid not null references public.boards (id) on delete cascade,
  -- null = seeded demo comment or a deleted account
  author_id uuid default auth.uid() references auth.users (id) on delete set null,
  body text not null
    constraint card_comments_body_length check (char_length(btrim(body)) between 1 and 2000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists card_comments_card_id_created_idx on public.card_comments (card_id, created_at);
create index if not exists card_comments_board_id_idx on public.card_comments (board_id);
create index if not exists card_comments_author_id_idx on public.card_comments (author_id);

-- Labels -----------------------------------------------------------------
create table if not exists public.board_labels (
  id uuid primary key default gen_random_uuid(),
  board_id uuid not null references public.boards (id) on delete cascade,
  name text not null
    constraint board_labels_name_length check (char_length(btrim(name)) between 1 and 24),
  color text not null default 'terracotta'
    constraint board_labels_color check (color in ('terracotta','amber','sage','teal','sky','plum','rose','slate')),
  created_at timestamptz not null default now()
);
create unique index if not exists board_labels_board_name_key on public.board_labels (board_id, lower(btrim(name)));

create table if not exists public.card_labels (
  card_id uuid not null references public.cards (id) on delete cascade,
  label_id uuid not null references public.board_labels (id) on delete cascade,
  board_id uuid not null references public.boards (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (card_id, label_id)
);
create index if not exists card_labels_label_id_idx on public.card_labels (label_id);
create index if not exists card_labels_board_id_idx on public.card_labels (board_id);

-- board_id is always derived from the card (never trusted from the client),
-- and a card can only carry labels from its own board.
create or replace function private.comment_set_board()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  select c.board_id into new.board_id from public.cards c where c.id = new.card_id;
  if new.board_id is null then
    raise exception 'card % not found', new.card_id using errcode = 'foreign_key_violation';
  end if;
  return new;
end;
$$;

create or replace function private.card_label_set_board()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  label_board uuid;
begin
  select c.board_id into new.board_id from public.cards c where c.id = new.card_id;
  select l.board_id into label_board from public.board_labels l where l.id = new.label_id;
  if new.board_id is null or label_board is distinct from new.board_id then
    raise exception 'label and card must belong to the same board' using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

-- Abuse limits for public demo boards (no-ops on real boards).
create or replace function private.enforce_demo_limits()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  n integer;
  cap integer;
begin
  if not private.is_demo_board(new.board_id) then
    return new;
  end if;

  if tg_table_name = 'cards' then
    select count(*) into n from public.cards where board_id = new.board_id; cap := 60;
  elsif tg_table_name = 'lists' then
    select count(*) into n from public.lists where board_id = new.board_id; cap := 10;
  elsif tg_table_name = 'board_labels' then
    select count(*) into n from public.board_labels where board_id = new.board_id; cap := 16;
  elsif tg_table_name = 'card_comments' then
    select count(*) into n from public.card_comments where board_id = new.board_id; cap := 200;
  else
    return new;
  end if;

  if n >= cap then
    raise exception 'The demo board is full (% max). It resets every hour.', cap
      using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

revoke all on function private.comment_set_board() from public, anon;
revoke all on function private.card_label_set_board() from public, anon;
revoke all on function private.enforce_demo_limits() from public, anon, authenticated;
grant execute on function private.comment_set_board() to authenticated;
grant execute on function private.card_label_set_board() to authenticated;

create trigger card_comments_set_board
  before insert or update of card_id on public.card_comments
  for each row execute function private.comment_set_board();
create trigger card_labels_set_board
  before insert or update on public.card_labels
  for each row execute function private.card_label_set_board();
create trigger card_comments_touch_updated_at
  before update on public.card_comments
  for each row execute function public.touch_updated_at();

-- Limits fire after board_id is set (trigger names sort alphabetically).
create trigger zz_demo_limits before insert on public.cards
  for each row execute function private.enforce_demo_limits();
create trigger zz_demo_limits before insert on public.lists
  for each row execute function private.enforce_demo_limits();
create trigger zz_demo_limits before insert on public.board_labels
  for each row execute function private.enforce_demo_limits();
create trigger zz_demo_limits before insert on public.card_comments
  for each row execute function private.enforce_demo_limits();

-- RLS ------------------------------------------------------------------
alter table public.card_comments enable row level security;
alter table public.board_labels enable row level security;
alter table public.card_labels enable row level security;
revoke all on public.card_comments, public.board_labels, public.card_labels from anon;
revoke truncate, references, trigger on public.card_comments, public.board_labels, public.card_labels from authenticated;

create policy card_comments_select on public.card_comments for select to authenticated
  using (private.can_access_board(board_id));
create policy card_comments_insert on public.card_comments for insert to authenticated
  with check (author_id = (select auth.uid()) and private.can_access_board(board_id));
create policy card_comments_update on public.card_comments for update to authenticated
  using (author_id = (select auth.uid()))
  with check (author_id = (select auth.uid()) and private.can_access_board(board_id));
create policy card_comments_delete on public.card_comments for delete to authenticated
  using (author_id = (select auth.uid()));
-- Only the text of a comment can be edited.
revoke update on public.card_comments from authenticated;
grant update (body) on public.card_comments to authenticated;

create policy board_labels_select on public.board_labels for select to authenticated
  using (private.can_access_board(board_id));
create policy board_labels_insert on public.board_labels for insert to authenticated
  with check (private.can_access_board(board_id));
create policy board_labels_update on public.board_labels for update to authenticated
  using (private.can_access_board(board_id))
  with check (private.can_access_board(board_id));
create policy board_labels_delete on public.board_labels for delete to authenticated
  using (private.can_access_board(board_id));
revoke update on public.board_labels from authenticated;
grant update (name, color) on public.board_labels to authenticated;

create policy card_labels_select on public.card_labels for select to authenticated
  using (private.can_access_board(board_id));
create policy card_labels_insert on public.card_labels for insert to authenticated
  with check (private.can_access_board(board_id));
create policy card_labels_delete on public.card_labels for delete to authenticated
  using (private.can_access_board(board_id));
revoke update on public.card_labels from authenticated;

-- Realtime -------------------------------------------------------------
alter table public.card_comments replica identity full;
alter table public.board_labels replica identity full;
alter table public.card_labels replica identity full;
alter publication supabase_realtime add table public.card_comments;
alter publication supabase_realtime add table public.board_labels;
alter publication supabase_realtime add table public.card_labels;
