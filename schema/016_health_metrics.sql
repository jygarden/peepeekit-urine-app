-- ═══════════════════════════════════════════════════════════════
-- Phase L · 건강 수치 확장 (혈당/혈압/인바디 추가 항목)
-- ═══════════════════════════════════════════════════════════════

-- body_logs 테이블에 컬럼 추가 (혈당, 혈압)
alter table body_logs add column if not exists glucose_mg_dl numeric(5,1);
alter table body_logs add column if not exists glucose_context text check (glucose_context in ('fasting','after_meal_1h','after_meal_2h','random') or glucose_context is null);
alter table body_logs add column if not exists bp_systolic int;
alter table body_logs add column if not exists bp_diastolic int;
alter table body_logs add column if not exists bmr_kcal int;            -- 기초대사량
alter table body_logs add column if not exists visceral_fat_level int;  -- 내장지방 레벨 1-20
alter table body_logs add column if not exists bmi numeric(4,1);        -- BMI
alter table body_logs add column if not exists waist_hip_ratio numeric(4,2); -- 복부지방률
alter table body_logs add column if not exists ecw_tbw_ratio numeric(4,3);   -- 세포외수분비 (부종 지표)

-- 사용자 추천 모드 설정
create table if not exists user_preferences (
  user_id uuid primary key references app_users(id) on delete cascade,
  recommendation_mode text default 'free' check (recommendation_mode in ('free','healthy','medical','auto')),
  share_scope jsonb default '{"meals":true,"workouts":true,"inbody":true,"glucose":false,"bp":false,"urine":false}'::jsonb,
  taste_prefs jsonb,
  measurement_reminder_days int default 7,
  push_enabled boolean default true,
  updated_at timestamptz default now()
);
alter table user_preferences enable row level security;
drop policy if exists user_prefs_deny on user_preferences;
create policy user_prefs_deny on user_preferences for all using (false);

select 'health_metrics schema ready · body_logs +7 cols · user_preferences 신규' as status;
