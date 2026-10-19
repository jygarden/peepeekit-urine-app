-- 🧪 배포 전 필수 · 접근 권한 검증
-- 실행: Supabase SQL Editor에서 각 케이스별로 실행
-- 원칙: SECURITY.md
--
-- ⚠️ ALTER DEFAULT PRIVILEGES는 프로젝트 전체 정책.
-- 앞으로 public 스키마의 모든 새 테이블은 기본 deny.
-- 공개 테이블 필요시 명시적으로 GRANT.

-- ═══════════════════════════════════════════════════════════
-- 테스트 1 · anon (익명) → 실패해야 함
-- ═══════════════════════════════════════════════════════════
SET ROLE anon;
-- 기대: 0 rows or permission denied
SELECT count(*) AS anon_food_menu_v2_count FROM food_menu_v2;
SELECT count(*) AS anon_recommendation_log_count FROM recommendation_log;
RESET ROLE;

-- ═══════════════════════════════════════════════════════════
-- 테스트 2 · authenticated (로그인 유저) → food_menu_v2 실패해야 함
-- ═══════════════════════════════════════════════════════════
SET ROLE authenticated;
-- 기대: 0 rows (RLS로 차단)
SELECT count(*) AS auth_food_menu_v2_count FROM food_menu_v2;
-- 기대: 본인 것만
SELECT count(*) AS auth_own_rec_log FROM recommendation_log;
-- 기대: 삽입 실패
INSERT INTO recommendation_log (
  user_id, primary_food_id, headline, reason, reason_codes,
  score_breakdown, meal_slot, engine_version, menu_version, prompt_version
) VALUES (
  auth.uid(), (SELECT id FROM food_menu_v2 LIMIT 1),
  'test', 'test', ARRAY['test'], '{}', 'lunch', 'test', 'test', 'test'
);
RESET ROLE;

-- ═══════════════════════════════════════════════════════════
-- 테스트 3 · service_role / secret key → 전부 성공해야 함
-- ═══════════════════════════════════════════════════════════
-- (secret key로 실행 · Supabase SQL Editor에서 자동으로 postgres role)
SELECT count(*) AS service_food_count FROM food_menu_v2;
SELECT count(*) AS service_rec_count FROM recommendation_log;

-- ═══════════════════════════════════════════════════════════
-- 검증 체크리스트 (수동)
-- ═══════════════════════════════════════════════════════════
-- [ ] anon: food_menu_v2 → 0 rows
-- [ ] anon: recommendation_log → 0 rows
-- [ ] authenticated: food_menu_v2 → 0 rows (RLS 차단)
-- [ ] authenticated: recommendation_log INSERT → 실패
-- [ ] authenticated: recommendation_log SELECT → 본인 것만
-- [ ] authenticated: recommendation_feedback INSERT → 본인 것만 성공
-- [ ] authenticated: recommendation_feedback UPDATE → 실패
-- [ ] service: food_menu_v2 → 123 rows
-- [ ] service: recommendation_log INSERT/UPDATE/DELETE → 성공
