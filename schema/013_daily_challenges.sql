-- 🎯 일일 챌린지 완료 기록 (Phase H)
-- 챌린지 자체는 클라이언트 상수 (DB 저장 불필요)
-- 완료 기록만 저장 → 통계·포인트 지급·메이트 공유

create table if not exists challenge_completions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references app_users(id) on delete cascade,
  challenge_id text not null,         -- 챌린지 코드 (예: 'protein_100g')
  completed_date date not null default current_date,
  completed_at timestamptz not null default now(),
  points_awarded int default 0,
  unique(user_id, challenge_id, completed_date)
);

create index if not exists idx_challenge_user_date on challenge_completions(user_id, completed_date desc);

alter table challenge_completions enable row level security;
drop policy if exists deny_all_challenge_completions on challenge_completions;
create policy deny_all_challenge_completions on challenge_completions for all to anon, authenticated using (false);
