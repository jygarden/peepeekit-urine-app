-- 메이트 식단별 메시지 (양방향 · owner ↔ viewer)
create table if not exists mate_messages (
  id uuid primary key default gen_random_uuid(),
  meal_log_id uuid not null references meal_logs(id) on delete cascade,
  sender_id uuid not null references app_users(id) on delete cascade,
  text text not null check (length(text) between 1 and 500),
  created_at timestamptz not null default now()
);

create index if not exists idx_mate_msg_meal on mate_messages(meal_log_id, created_at);
create index if not exists idx_mate_msg_sender on mate_messages(sender_id);

alter table mate_messages enable row level security;
drop policy if exists deny_all_mate_messages on mate_messages;
create policy deny_all_mate_messages on mate_messages for all to anon, authenticated using (false);
