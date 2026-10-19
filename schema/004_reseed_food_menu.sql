-- 🔄 food_menu_v2 재시드
-- 실행 후 003_food_menu_seed.sql 다시 실행
--
-- 배경: Phase 7.5 실검증에서 발견된 3개 버그 수정
-- BUG-B: vegan_compatible 오마킹 (순두부찌개 등)
-- BUG-C: 아침·야식 슬롯 부족
-- + 떡볶이 kcal 520 → 280 (표준화)
--
-- ⚠️ 이 스크립트는 food_menu_v2 데이터 전체를 삭제하고 재삽입
-- ⚠️ recommendation_log의 primary_food_id FK가 있으면 CASCADE로 정리됨

-- 1. 기존 데이터 삭제 (FK 있는 참조도 함께 정리)
DELETE FROM recommendation_feedback WHERE actual_food_id IN (SELECT id FROM food_menu_v2) OR recommendation_id IN (SELECT id FROM recommendation_log);
DELETE FROM recommendation_log WHERE primary_food_id IN (SELECT id FROM food_menu_v2);
DELETE FROM food_menu_v2;

-- 2. 그다음 003_food_menu_seed.sql을 다시 실행하세요.
--    (이 파일 실행 후 003 실행하는 순서)
