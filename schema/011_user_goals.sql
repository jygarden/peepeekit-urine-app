-- 🎯 이용자 식단 목표
-- 6개 선택지:
--   weight_loss    · 체중 감량 (다이어트)
--   muscle_gain    · 근육 증량 (벌크업)
--   balance        · 건강 유지 (밸런스)
--   nutrition      · 영양소 보충
--   wellness       · 웰빙 (장 건강·면역)
--   disease_mgmt   · 생활습관 질환 관리

alter table app_users
  add column if not exists goal text
    check (goal in ('weight_loss','muscle_gain','balance','nutrition','wellness','disease_mgmt') or goal is null),
  add column if not exists goal_updated_at timestamptz;

create index if not exists idx_app_users_goal on app_users(goal) where goal is not null;

comment on column app_users.goal is '이용자 식단 목표 · 추천/분석 가중치에 반영';
