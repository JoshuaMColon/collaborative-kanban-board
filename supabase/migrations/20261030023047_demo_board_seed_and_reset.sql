-- Public demo board: seeded with sample lists, cards, labels and comments,
-- reset to that seed every hour by pg_cron. Expired anonymous demo guests
-- are cleaned up daily. Neither function is callable from the API.

create extension if not exists pg_cron;

create or replace function private.reset_demo_board()
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  demo uuid;
  l_ideas uuid; l_todo uuid; l_doing uuid; l_review uuid; l_done uuid;
  lb_design uuid; lb_frontend uuid; lb_backend uuid; lb_bug uuid; lb_research uuid; lb_docs uuid;
  c1 uuid; c2 uuid; c3 uuid; c4 uuid; c5 uuid; c6 uuid; c7 uuid; c8 uuid; c9 uuid; c10 uuid;
  today date := (now() at time zone 'America/New_York')::date;
begin
  select id into demo from public.boards where is_demo order by created_at limit 1;
  if demo is null then
    insert into public.boards (title, owner_id, is_demo)
    values ('Launch Week (Demo)', null, true)
    returning id into demo;
  else
    update public.boards set title = 'Launch Week (Demo)' where id = demo;
  end if;

  -- Wipe the demo board's content (cards, card_labels and comments cascade).
  delete from public.lists where board_id = demo;
  delete from public.board_labels where board_id = demo;
  delete from public.cards where board_id = demo;

  insert into public.board_labels (board_id, name, color) values (demo, 'Design', 'terracotta') returning id into lb_design;
  insert into public.board_labels (board_id, name, color) values (demo, 'Frontend', 'sky') returning id into lb_frontend;
  insert into public.board_labels (board_id, name, color) values (demo, 'Backend', 'sage') returning id into lb_backend;
  insert into public.board_labels (board_id, name, color) values (demo, 'Bug', 'rose') returning id into lb_bug;
  insert into public.board_labels (board_id, name, color) values (demo, 'Research', 'plum') returning id into lb_research;
  insert into public.board_labels (board_id, name, color) values (demo, 'Docs', 'amber') returning id into lb_docs;

  insert into public.lists (board_id, title, "order") values (demo, 'Ideas', 0) returning id into l_ideas;
  insert into public.lists (board_id, title, "order") values (demo, 'To do', 1) returning id into l_todo;
  insert into public.lists (board_id, title, "order") values (demo, 'In progress', 2) returning id into l_doing;
  insert into public.lists (board_id, title, "order") values (demo, 'Review', 3) returning id into l_review;
  insert into public.lists (board_id, title, "order") values (demo, 'Done', 4) returning id into l_done;

  insert into public.cards (board_id, list_id, code, title, description, priority, "order", due_date) values
    (demo, l_ideas, 'DEMO-101', 'Dark mode for the marketing site', 'Match the warm charcoal theme from the app so the two feel like one product.', 'low', 1024, null)
    returning id into c1;
  insert into public.cards (board_id, list_id, code, title, description, priority, "order", due_date) values
    (demo, l_ideas, 'DEMO-102', 'Interview five early users', 'Ask what they track today and where it falls apart.', 'standard', 2048, today + 9)
    returning id into c2;
  insert into public.cards (board_id, list_id, code, title, description, priority, "order", due_date) values
    (demo, l_todo, 'DEMO-103', 'Write the launch announcement', 'Short and friendly. One GIF, one link, no jargon.', 'standard', 1024, today + 2)
    returning id into c3;
  insert into public.cards (board_id, list_id, code, title, description, priority, "order", due_date) values
    (demo, l_todo, 'DEMO-104', 'Fix avatar cropping on Safari', 'Square images get squashed in the header on iOS 18.', 'urgent', 2048, today - 1)
    returning id into c4;
  insert into public.cards (board_id, list_id, code, title, description, priority, "order", due_date) values
    (demo, l_todo, 'DEMO-105', 'Pick an illustration style', null, 'low', 3072, null)
    returning id into c5;
  insert into public.cards (board_id, list_id, code, title, description, priority, "order", due_date) values
    (demo, l_doing, 'DEMO-106', 'Realtime comments on cards', 'Comments should show up for everyone without a refresh.', 'urgent', 1024, today + 1)
    returning id into c6;
  insert into public.cards (board_id, list_id, code, title, description, priority, "order", due_date) values
    (demo, l_doing, 'DEMO-107', 'Onboarding checklist', 'Three steps: name your board, add a list, invite a teammate.', 'standard', 2048, today + 5)
    returning id into c7;
  insert into public.cards (board_id, list_id, code, title, description, priority, "order", due_date) values
    (demo, l_review, 'DEMO-108', 'Rate-limit the public API', 'Start with 60 requests a minute per token.', 'standard', 1024, today)
    returning id into c8;
  insert into public.cards (board_id, list_id, code, title, description, priority, "order", due_date) values
    (demo, l_done, 'DEMO-109', 'Set up row-level security', 'Every table checks who you are before it answers.', 'urgent', 1024, today - 3)
    returning id into c9;
  insert into public.cards (board_id, list_id, code, title, description, priority, "order", due_date) values
    (demo, l_done, 'DEMO-110', 'Choose fonts and colors', 'Inter + Nunito, cream and terracotta.', 'low', 2048, null)
    returning id into c10;

  insert into public.card_labels (card_id, label_id, board_id) values
    (c1, lb_design, demo), (c1, lb_frontend, demo),
    (c2, lb_research, demo),
    (c3, lb_docs, demo),
    (c4, lb_bug, demo), (c4, lb_frontend, demo),
    (c5, lb_design, demo),
    (c6, lb_backend, demo), (c6, lb_frontend, demo),
    (c7, lb_design, demo),
    (c8, lb_backend, demo),
    (c9, lb_backend, demo),
    (c10, lb_design, demo);

  insert into public.card_comments (card_id, board_id, author_id, body, created_at) values
    (c6, demo, null, 'Subscriptions are wired up. Try adding a comment here in two tabs!', now() - interval '40 minutes'),
    (c6, demo, null, 'Edits and deletes come through live too.', now() - interval '12 minutes'),
    (c4, demo, null, 'Repro: upload a 1:1 photo, open the profile dialog on an iPhone.', now() - interval '2 hours'),
    (c3, demo, null, 'Draft is in the shared doc. Needs a punchier first line.', now() - interval '1 day');

  return demo;
end;
$$;

create or replace function private.cleanup_anonymous_users()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  n integer;
begin
  delete from auth.users
  where is_anonymous is true
    and created_at < now() - interval '1 day';
  get diagnostics n = row_count;
  return n;
end;
$$;

revoke all on function private.reset_demo_board() from public, anon, authenticated;
revoke all on function private.cleanup_anonymous_users() from public, anon, authenticated;

-- Seed it now.
select private.reset_demo_board();

-- Hourly reset at :00, daily guest cleanup at 08:15 UTC.
select cron.unschedule(jobid) from cron.job where jobname in ('reset-demo-board', 'cleanup-anonymous-users');
select cron.schedule('reset-demo-board', '0 * * * *', 'select private.reset_demo_board()');
select cron.schedule('cleanup-anonymous-users', '15 8 * * *', 'select private.cleanup_anonymous_users()');
