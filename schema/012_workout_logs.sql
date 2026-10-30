-- 💪 운동 기록 (Phase G)
-- 세트별 무게·반복 수 기록 + 운동 부위 태그

create table if not exists workout_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references app_users(id) on delete cascade,
  workout_date date not null default current_date,
  workout_type text,  -- 'chest' | 'back' | 'leg' | 'shoulder' | 'arm' | 'core' | 'cardio' | 'full'
  exercises jsonb not null default '[]'::jsonb,
    -- [{ name:'벤치프레스', sets:[{weight_kg:60, reps:8}, {weight_kg:65, reps:6}], note:'' }]
  duration_min int check (duration_min is null or (duration_min between 1 and 600)),
  total_volume_kg numeric,  -- sum of weight × reps for quick stats
  memo text check (length(coalesce(memo,'')) <= 500),
  created_at timestamptz not null default now()
);

create index if not exists idx_workout_user_date on workout_logs(user_id, workout_date desc);

alter table workout_logs enable row level security;
drop policy if exists deny_all_workout_logs on workout_logs;
create policy deny_all_workout_logs on workout_logs for all to anon, authenticated using (false);
