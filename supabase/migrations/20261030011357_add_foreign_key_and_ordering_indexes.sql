-- The board screen loads `.eq(board_id).order("order")` on every open,
-- so the composites match that exactly. The single-column indexes are
-- the foreign keys Postgres would otherwise scan on delete.

create index if not exists lists_board_id_order_idx on public.lists (board_id, "order");
create index if not exists cards_board_id_order_idx on public.cards (board_id, "order");
create index if not exists cards_list_id_order_idx  on public.cards (list_id, "order");
create index if not exists cards_assignee_id_idx    on public.cards (assignee_id);
create index if not exists boards_owner_id_idx      on public.boards (owner_id);
create index if not exists board_members_user_id_idx on public.board_members (user_id);
