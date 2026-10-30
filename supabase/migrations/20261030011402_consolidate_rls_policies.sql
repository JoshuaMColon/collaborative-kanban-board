-- RLS: signed-in users only, one policy per table/command, no anon access.
-- Single shared board model (no membership checks yet); board_members is kept
-- for the future multi-board feature but limited to a user's own rows.

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

-- boards: read/rename by any signed-in user; create only as yourself;
-- deleting a board stays owner-only (it cascades to every list and card).
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

-- board_members: a user can see and leave their own memberships. Adding
-- members is left to a future invite flow (server-side).
create policy board_members_select on public.board_members for select to authenticated
  using (user_id = (select auth.uid()));
create policy board_members_delete on public.board_members for delete to authenticated
  using (user_id = (select auth.uid()));

-- Table privileges: nothing for anon; no TRUNCATE/TRIGGER/REFERENCES for
-- authenticated (TRUNCATE bypasses RLS).
revoke all on table public.boards, public.board_members, public.lists, public.cards from anon;
revoke truncate, trigger, references on table public.boards, public.board_members, public.lists, public.cards from authenticated;
