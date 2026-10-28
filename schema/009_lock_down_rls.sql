-- 🔒 전체 테이블 RLS 잠금 (deny-all + service_role만 통과)
-- 보안 경고 해결 · 서버 API만 접근 가능하게

-- 1. 9개 민감 테이블에 RLS 활성화 + 모든 anon/authenticated 차단
alter table if exists pet_records enable row level security;
alter table if exists food_records enable row level security;
alter table if exists water_intake enable row level security;
alter table if exists users enable row level security;
alter table if exists urine_tests enable row level security;
alter table if exists activity_logs enable row level security;
alter table if exists consent_logs enable row level security;
alter table if exists nutrition_insights enable row level security;
alter table if exists supplement_opportunities enable row level security;

-- 2. 각 테이블에 deny-all 정책 (anon/authenticated 전부 차단, service_role은 자동 우회)
drop policy if exists deny_all_pet_records on pet_records;
create policy deny_all_pet_records on pet_records for all to anon, authenticated using (false);

drop policy if exists deny_all_food_records on food_records;
create policy deny_all_food_records on food_records for all to anon, authenticated using (false);

drop policy if exists deny_all_water_intake on water_intake;
create policy deny_all_water_intake on water_intake for all to anon, authenticated using (false);

drop policy if exists deny_all_users on users;
create policy deny_all_users on users for all to anon, authenticated using (false);

drop policy if exists deny_all_urine_tests on urine_tests;
create policy deny_all_urine_tests on urine_tests for all to anon, authenticated using (false);

drop policy if exists deny_all_activity_logs on activity_logs;
create policy deny_all_activity_logs on activity_logs for all to anon, authenticated using (false);

drop policy if exists deny_all_consent_logs on consent_logs;
create policy deny_all_consent_logs on consent_logs for all to anon, authenticated using (false);

drop policy if exists deny_all_nutrition_insights on nutrition_insights;
create policy deny_all_nutrition_insights on nutrition_insights for all to anon, authenticated using (false);

drop policy if exists deny_all_supplement_opportunities on supplement_opportunities;
create policy deny_all_supplement_opportunities on supplement_opportunities for all to anon, authenticated using (false);

-- 3. 추가 안전장치 · 공개 역할 권한 회수
revoke all on pet_records, food_records, water_intake, users, urine_tests,
             activity_logs, consent_logs, nutrition_insights, supplement_opportunities
  from anon, authenticated;

-- 4. 확인 쿼리
-- select tablename, rowsecurity from pg_tables where schemaname='public' order by tablename;
-- 모두 rowsecurity = true 여야 함
