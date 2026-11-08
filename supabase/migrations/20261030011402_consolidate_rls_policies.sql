-- First cut of RLS. Any signed-in user can read and write the shared
-- board; membership checks come in a later migration. I dropped the
-- overlapping policies so each command has exactly one.
--
-- Deleting a board stays owner-only because it cascades to every list
-- and card. (select auth.uid()) is wrapped so Postgres can cache the
-- call per statement instead of running it on every row.
--
-- anon has no table privileges. I also revoke TRUNCATE from
-- authenticated: TRUNCATE skips RLS.

alter table public.boards enable row level security;
alter table public.board_members enable row level security;
alter table public.lists enable row level security;
alter table public.cards enable row level security;

-- Drop the overlapping legacy policies
drop policy if exists "authenticated can update boards" on public.boards;
drop policy if exists "authenticated can select boards" on public.boards;
drop policy if exists "modify own memberships" on public.board_members;
drop policy if exists "select own memberships" on public.board_members;
drop policy if exists "authenticated can modify lists" on public.lists;
drop policy if exists "authenticated can select lists" on public.lists;
drop policy if exists "select board lists" on public.lists;
drop policy if exists "authenticated can modify cards" on public.cards;
drop policy if exists "authenticated can select cards" on public.cards;

-- Read and rename: any signed-in user. Insert: only as yourself, so
-- you can't create a board owned by someone else. Delete: owner only.
create policy boards_select on public.boards for select to authenticated
  using ((select auth.uid()) is not null);
create policy boards_insert on public.boards for insert to authenticated
  with check (owner_id = (select auth.uid()));
create policy boards_update on public.boards for update to authenticated
  using ((select auth.uid()) is not null) with check ((select auth.uid()) is not null);
create policy boards_delete on public.boards for delete to authenticated
  using (owner_id = (select auth.uid()));

-- lists
create policy lists_select on public.lists for select to authenticated
  using ((select auth.uid()) is not null);
create policy lists_insert on public.lists for insert to authenticated
  with check ((select auth.uid()) is not null);
create policy lists_update on public.lists for update to authenticated
  using ((select auth.uid()) is not null) with check ((select auth.uid()) is not null);
create policy lists_delete on public.lists for delete to authenticated
  using ((select auth.uid()) is not null);

-- cards
create policy cards_select on public.cards for select to authenticated
  using ((select auth.uid()) is not null);
create policy cards_insert on public.cards for insert to authenticated
  with check ((select auth.uid()) is not null);
create policy cards_update on public.cards for update to authenticated
  using ((select auth.uid()) is not null) with check ((select auth.uid()) is not null);
create policy cards_delete on public.cards for delete to authenticated
  using ((select auth.uid()) is not null);

-- Own membership rows only, for now. There is no insert policy here;
-- a later migration lets you join a board you can already access.
create policy board_members_select on public.board_members for select to authenticated
  using (user_id = (select auth.uid()));
create policy board_members_delete on public.board_members for delete to authenticated
  using (user_id = (select auth.uid()));

-- Nothing for anon. No TRUNCATE, TRIGGER, or REFERENCES for signed-in
-- users. The header says why TRUNCATE in particular has to go.
revoke all on table public.boards, public.board_members, public.lists, public.cards from anon;
revoke truncate, trigger, references on table public.boards, public.board_members, public.lists, public.cards from authenticated;
