-- Server-side MAN-### card codes. The trigger only fills `code` when the
-- client leaves it null/blank, so today's client (which still sends a code)
-- keeps working. Client-supplied MAN-n codes advance the sequence so the two
-- sources never hand out the same number. Unique per board.

create sequence if not exists public.card_code_seq as bigint start with 1;

-- Start after the highest existing MAN-n code (if any)
select setval(
  'public.card_code_seq',
  greatest(coalesce((select max(substring(code from 5)::bigint) from public.cards where code ~ '^MAN-[0-9]+$'), 0), 1),
  exists (select 1 from public.cards where code ~ '^MAN-[0-9]+$')
);

grant usage, select, update on sequence public.card_code_seq to authenticated;

create or replace function public.assign_card_code()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  n bigint;
  last_used bigint;
begin
  if new.code is null or btrim(new.code) = '' then
    new.code := 'MAN-' || lpad(nextval('public.card_code_seq')::text, 3, '0');
  elsif new.code ~ '^MAN-[0-9]+$' then
    n := substring(new.code from 5)::bigint;
    select case when is_called then last_value else last_value - 1 end
      into last_used from public.card_code_seq;
    if n > last_used then
      perform setval('public.card_code_seq', n, true);
    end if;
  end if;
  return new;
end;
$$;

revoke execute on function public.assign_card_code() from public, anon;

drop trigger if exists cards_assign_code on public.cards;
create trigger cards_assign_code
  before insert on public.cards
  for each row execute function public.assign_card_code();

alter table public.cards
  add constraint cards_board_id_code_key unique (board_id, code);
