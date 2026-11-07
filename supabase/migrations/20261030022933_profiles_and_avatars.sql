-- A profile row per auth user, plus the avatars bucket.
--
-- I create the row from an auth.users trigger so sign-up and anonymous
-- demo sign-in both get a display name without the client doing it.
-- The client may insert its own row later only as a self-heal.
--
-- Reads: a normal account can see every profile (this app is still one
-- shared board). A demo guest only sees themselves and people they
-- share a board with. Writes are own-row only, and only the name and
-- avatar URL columns are grantable.

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null
    constraint profiles_display_name_length check (char_length(btrim(display_name)) between 1 and 50),
  -- Must point at this user's own folder in the avatars bucket.
  -- The client checks the same prefix before rendering an <img>.
  avatar_url text
    constraint profiles_avatar_url_format check (
      avatar_url is null
      or (char_length(avatar_url) <= 500
          and avatar_url ~ '^https://'
          and position(('/storage/v1/object/public/avatars/' || id::text || '/') in avatar_url) > 0)
    ),
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
revoke all on public.profiles from anon;
revoke truncate, references, trigger on public.profiles from authenticated;

-- Does the current user share a board with p_user_id?
-- SECURITY DEFINER, empty search_path, and it lives in private so a
-- demo guest's policy can see the other membership without opening
-- board_members to a broad select. The API roles cannot call it.
create or replace function private.shares_board_with(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.board_members mine
    join public.board_members theirs on theirs.board_id = mine.board_id
    where mine.user_id = (select auth.uid()) and theirs.user_id = p_user_id
  );
$$;
revoke all on function private.shares_board_with(uuid) from public, anon;
grant execute on function private.shares_board_with(uuid) to authenticated;

-- Permanent users can read every profile (shared-board model). Anonymous demo
-- guests only see themselves and people on boards they have joined.
create policy profiles_select on public.profiles
  for select to authenticated
  using (
    not (select private.is_anonymous())
    or id = (select auth.uid())
    or private.shares_board_with(id)
  );

-- Own row only. The trigger normally inserts first; this policy exists
-- so the app can self-heal if that row is missing.
create policy profiles_insert on public.profiles
  for insert to authenticated
  with check (id = (select auth.uid()));

create policy profiles_update on public.profiles
  for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

revoke insert, update, delete on public.profiles from authenticated;
grant insert (id, display_name, avatar_url) on public.profiles to authenticated;
grant update (display_name, avatar_url) on public.profiles to authenticated;

-- Metadata display_name, else the email local-part ("jane.doe@x" ->
-- "Jane Doe"), else a guest name hashed from the user id. Anonymous
-- users have no email, so they land on the guest name. Not granted
-- to the API; only the trigger runs it.
create or replace function private.default_display_name(
  p_email text, p_meta jsonb, p_id uuid
)
returns text
language sql
immutable
security invoker
set search_path = ''
as $$
  select left(btrim(coalesce(
    nullif(btrim(p_meta ->> 'display_name'), ''),
    nullif(initcap(regexp_replace(split_part(coalesce(p_email, ''), '@', 1), '[._+-]+', ' ', 'g')), ''),
    'Guest ' || (array['Otter','Fox','Heron','Maple','Willow','Robin','Fern','Badger','Juniper','Wren'])
      [1 + (abs(hashtext(p_id::text)) % 10)]
  )), 50);
$$;
revoke all on function private.default_display_name(text, jsonb, uuid) from public, anon, authenticated;

create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, private.default_display_name(new.email, new.raw_user_meta_data, new.id))
  on conflict (id) do nothing;
  return new;
end;
$$;
revoke all on function private.handle_new_user() from public, anon, authenticated;

drop trigger if exists on_auth_user_created_profile on auth.users;
create trigger on_auth_user_created_profile
  after insert on auth.users
  for each row execute function private.handle_new_user();

-- Backfill profiles for existing users (inserts only; nothing is modified).
insert into public.profiles (id, display_name)
select u.id, private.default_display_name(u.email, u.raw_user_meta_data, u.id)
from auth.users u
on conflict (id) do nothing;

-- Realtime: name/avatar changes show up live.
alter publication supabase_realtime add table public.profiles;
alter publication supabase_realtime add table public.board_members;
alter table public.board_members replica identity full;

-- Public bucket so <img> tags work without a signed URL. 1 MB, and
-- only the image types the profile dialog accepts. The folder check
-- below is what keeps people out of each other's files.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 1048576,
        array['image/png', 'image/jpeg', 'image/webp', 'image/gif'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Objects live at avatars/<uid>/... I check the first folder against
-- auth.uid() so a user can't write into someone else's prefix.
-- Anonymous guests fail the insert and update checks; the dialog
-- hides the control for them. Public URLs are served by the bucket
-- being public. The select policy is for listing your own folder.
create policy avatars_select_own on storage.objects
  for select to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy avatars_insert_own on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and not (select private.is_anonymous())
  );

create policy avatars_update_own on storage.objects
  for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and not (select private.is_anonymous())
  );

create policy avatars_delete_own on storage.objects
  for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
