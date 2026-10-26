-- 식단메이트 · 이용자끼리 양방향 연결
-- (coach_access는 PT 트레이너용 유지 · mate_connections는 일반 이용자용)

create table if not exists mate_connections (
  id uuid primary key default gen_random_uuid(),
  viewer_id uuid not null references app_users(id) on delete cascade,  -- 보는 사람
  owner_id uuid not null references app_users(id) on delete cascade,   -- 식단 주인
  granted_at timestamptz not null default now(),
  granted_via_code text,
  revoked_at timestamptz,
  revoked_by text check (revoked_by in ('viewer','owner','system') or revoked_by is null),
  scopes jsonb not null default '{"meals":true}'::jsonb,
  nickname text check (length(coalesce(nickname,'')) <= 40),  -- viewer가 owner에게 붙인 별명
  unique(viewer_id, owner_id),
  check (viewer_id != owner_id)
);

create index if not exists idx_mate_conn_viewer on mate_connections(viewer_id)
  where revoked_at is null;
create index if not exists idx_mate_conn_owner on mate_connections(owner_id)
  where revoked_at is null;

alter table mate_connections enable row level security;

drop policy if exists deny_all_mate_connections on mate_connections;
create policy deny_all_mate_connections on mate_connections for all to anon, authenticated using (false);
