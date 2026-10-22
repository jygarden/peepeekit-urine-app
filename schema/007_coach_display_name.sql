-- Phase A6 보강 · PT가 회원마다 별명 붙이기
-- coach_access에 display_name 컬럼 추가 (PT가 보는 회원 이름)

alter table coach_access
  add column if not exists display_name text check (length(coalesce(display_name,'')) <= 40);

comment on column coach_access.display_name is 'PT가 회원에게 붙인 별명 (예: 진영(화목저녁반)) · null이면 app_users.nickname 사용';
