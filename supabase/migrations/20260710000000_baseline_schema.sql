-- Baseline: documents the schema that already existed in the hosted project
-- before migrations were tracked (created via the dashboard). Idempotent, so it
-- is safe on the existing database and recreates the schema on a fresh one.
-- NOT applied via MCP (the objects already exist).

create table if not exists public.boards (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  owner_id uuid not null references auth.users (id),
  created_at timestamptz default now()
);

create table if not exists public.board_members (
  board_id uuid not null references public.boards (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text default 'member',
  primary key (board_id, user_id)
);

create table if not exists public.lists (
  id uuid primary key default gen_random_uuid(),
  board_id uuid not null references public.boards (id) on delete cascade,
  title text not null,
  "order" integer not null
);

create table if not exists public.cards (
  id uuid primary key default gen_random_uuid(),
  code text not null,
  title text not null,
  description text,
  priority text default 'standard',
  assignee_id uuid references auth.users (id),
  list_id uuid not null references public.lists (id) on delete cascade,
  board_id uuid not null references public.boards (id) on delete cascade,
  "order" integer not null,
  updated_at timestamptz default now()
);

alter table public.boards enable row level security;
alter table public.board_members enable row level security;
alter table public.lists enable row level security;
alter table public.cards enable row level security;
