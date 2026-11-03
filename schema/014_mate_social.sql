-- ═══════════════════════════════════════════════════════════════
-- Phase I-2 · 메이트 소셜 (좋아요 · 댓글 · 루틴 공유)
-- ═══════════════════════════════════════════════════════════════

-- 1. 좋아요 (meals / workouts / body_logs 어디든 가능)
create table if not exists mate_likes (
  id uuid primary key default gen_random_uuid(),
  target_type text not null check (target_type in ('meal','workout','body')),
  target_id uuid not null,
  target_owner_id uuid not null references app_users(id) on delete cascade,  -- 피드 소유자
  liker_id uuid not null references app_users(id) on delete cascade,          -- 좋아요 누른 사람
  created_at timestamptz default now(),
  unique(target_type, target_id, liker_id)
);
create index if not exists mate_likes_owner_idx on mate_likes(target_owner_id, created_at desc);
create index if not exists mate_likes_target_idx on mate_likes(target_type, target_id);

-- 2. 댓글
create table if not exists mate_comments (
  id uuid primary key default gen_random_uuid(),
  target_type text not null check (target_type in ('meal','workout','body')),
  target_id uuid not null,
  target_owner_id uuid not null references app_users(id) on delete cascade,
  commenter_id uuid not null references app_users(id) on delete cascade,
  content text not null check (length(content) between 1 and 500),
  created_at timestamptz default now()
);
create index if not exists mate_comments_target_idx on mate_comments(target_type, target_id, created_at desc);
create index if not exists mate_comments_owner_idx on mate_comments(target_owner_id, created_at desc);

-- 3. 운동 루틴 공유 (저장 · 공유 · 가져오기)
create table if not exists workout_routines (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references app_users(id) on delete cascade,
  name text not null check (length(name) between 1 and 60),
  workout_type text,  -- chest/back/leg 등
  exercises jsonb not null,  -- [{name, type, sets[], distance_km, duration_min}]
  is_shared boolean default false,  -- 메이트에게 공개
  copied_from_id uuid references workout_routines(id) on delete set null, -- 가져온 원본
  copy_count int default 0,  -- 몇 명이 복사했나 (owner 통계용)
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index if not exists workout_routines_owner_idx on workout_routines(owner_id, created_at desc);
create index if not exists workout_routines_shared_idx on workout_routines(is_shared) where is_shared = true;

-- RLS 전부 deny-all (서버 service_role만 접근)
alter table mate_likes       enable row level security;
alter table mate_comments    enable row level security;
alter table workout_routines enable row level security;

drop policy if exists mate_likes_deny       on mate_likes;
drop policy if exists mate_comments_deny    on mate_comments;
drop policy if exists workout_routines_deny on workout_routines;

create policy mate_likes_deny       on mate_likes       for all using (false);
create policy mate_comments_deny    on mate_comments    for all using (false);
create policy workout_routines_deny on workout_routines for all using (false);

-- 완료 확인
select 'mate_social schema ready' as status;
