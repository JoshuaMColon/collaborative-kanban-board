-- Demo mode foundation: a private helper schema, an is_demo flag on boards,
-- anonymous-aware RLS (anonymous visitors can only reach demo boards), board
-- membership joins, and length limits. Additive and compatible with the
-- existing single-board app: permanent signed-in users keep the same access.

create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated;

-- True for Supabase anonymous sign-ins (JWT claim is_anonymous).
create or replace function private.is_anonymous()
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  select coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false);
$$;

alter table public.boards add column if not exists is_demo boolean not null default false;

-- Demo boards belong to nobody, so no client can ever delete them.
alter table public.boards alter column owner_id drop not null;
alter table public.boards
  add constraint boards_owner_required check (is_demo or owner_id is not null);

create index if not exists boards_is_demo_idx on public.boards (is_demo) where is_demo;

-- SECURITY DEFINER so it can read boards from inside boards' own policies
-- without recursing into RLS. Lives in the unexposed private schema.
create or replace function private.is_demo_board(p_board_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.boards b where b.id = p_board_id and b.is_demo);
$$;

-- Permanent users: every board (the app's current shared-board model).
-- Anonymous users: demo boards only.
create or replace function private.can_access_board(p_board_id uuid)
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  select (not private.is_anonymous()) or private.is_demo_board(p_board_id);
$$;

create or replace function private.is_board_member(p_board_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.board_members m
    where m.board_id = p_board_id and m.user_id = (select auth.uid())
  );
$$;

revoke all on function private.is_anonymous() from public, anon;
revoke all on function private.is_demo_board(uuid) from public, anon;
revoke all on function private.can_access_board(uuid) from public, anon;
revoke all on function private.is_board_member(uuid) from public, anon;
grant execute on function private.is_anonymous() to authenticated;
grant execute on function private.is_demo_board(uuid) to authenticated;
grant execute on function private.can_access_board(uuid) to authenticated;
grant execute on function private.is_board_member(uuid) to authenticated;

-- boards ---------------------------------------------------------------
drop policy if exists boards_select on public.boards;
create policy boards_select on public.boards
  for select to authenticated
  using (private.can_access_board(id));

drop policy if exists boards_insert on public.boards;
create policy boards_insert on public.boards
  for insert to authenticated
  with check (owner_id = (select auth.uid()) and not (select private.is_anonymous()));

drop policy if exists boards_update on public.boards;
create policy boards_update on public.boards
  for update to authenticated
  using (private.can_access_board(id))
  with check (private.can_access_board(id));
-- boards_delete (owner-only) is unchanged.

-- Clients may only write a board's title (plus id/owner on create), never
-- the is_demo flag.
revoke insert, update on public.boards from authenticated;
grant insert (id, title, owner_id) on public.boards to authenticated;
grant update (title) on public.boards to authenticated;

-- lists / cards: same rule for every command --------------------------------
drop policy if exists lists_select on public.lists;
drop policy if exists lists_insert on public.lists;
drop policy if exists lists_update on public.lists;
drop policy if exists lists_delete on public.lists;
create policy lists_select on public.lists for select to authenticated
  using (private.can_access_board(board_id));
create policy lists_insert on public.lists for insert to authenticated
  with check (private.can_access_board(board_id));
create policy lists_update on public.lists for update to authenticated
  using (private.can_access_board(board_id))
  with check (private.can_access_board(board_id));
create policy lists_delete on public.lists for delete to authenticated
  using (private.can_access_board(board_id));

drop policy if exists cards_select on public.cards;
drop policy if exists cards_insert on public.cards;
drop policy if exists cards_update on public.cards;
drop policy if exists cards_delete on public.cards;
create policy cards_select on public.cards for select to authenticated
  using (private.can_access_board(board_id));
create policy cards_insert on public.cards for insert to authenticated
  with check (private.can_access_board(board_id));
create policy cards_update on public.cards for update to authenticated
  using (private.can_access_board(board_id))
  with check (private.can_access_board(board_id));
create policy cards_delete on public.cards for delete to authenticated
  using (private.can_access_board(board_id));

-- board_members: see everyone on boards you belong to; join a board you can
-- access as a plain member (the app does this on first visit).
drop policy if exists board_members_select on public.board_members;
create policy board_members_select on public.board_members
  for select to authenticated
  using (user_id = (select auth.uid()) or private.is_board_member(board_id));

drop policy if exists board_members_insert on public.board_members;
create policy board_members_insert on public.board_members
  for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and coalesce(role, 'member') = 'member'
    and private.can_access_board(board_id)
  );
-- board_members_delete (own row) is unchanged; there is no update policy.
revoke update on public.board_members from authenticated;

-- Deleting a user (e.g. expired demo guests) unassigns their cards instead
-- of failing on the foreign key.
alter table public.cards drop constraint if exists cards_assignee_id_fkey;
alter table public.cards
  add constraint cards_assignee_id_fkey
  foreign key (assignee_id) references auth.users (id) on delete set null;

-- Length limits (generous; existing rows already satisfy them).
alter table public.boards add constraint boards_title_length check (char_length(title) <= 120);
alter table public.lists add constraint lists_title_length check (char_length(title) <= 80);
alter table public.cards add constraint cards_title_length check (char_length(title) <= 200);
alter table public.cards add constraint cards_description_length check (description is null or char_length(description) <= 5000);
