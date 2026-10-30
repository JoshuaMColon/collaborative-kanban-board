-- Realtime: publish board tables and send full old rows on UPDATE/DELETE,
-- so delete events carry id/board_id/list_id for every subscriber.

alter table public.boards replica identity full;
alter table public.lists  replica identity full;
alter table public.cards  replica identity full;

do $$
declare
  t text;
begin
  if not exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    create publication supabase_realtime;
  end if;
  foreach t in array array['boards', 'lists', 'cards'] loop
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end
$$;
