-- 🍱 food_menu_v2 · 추천 엔진 핵심 데이터
-- 참조: RECOMMEND_ENGINE.md Section 6
-- 원칙: BRAIN.md
-- Migration: 001
-- Date: 2026-09-28

-- ═══════════════════════════════════════════════════════════
-- 확장 (UUID 생성용)
-- ═══════════════════════════════════════════════════════════
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ═══════════════════════════════════════════════════════════
-- food_menu_v2 · 추천 후보 큐레이션 DB
-- ═══════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS food_menu_v2 (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name          text NOT NULL UNIQUE,
  aliases       text[] DEFAULT '{}',

  -- 분류
  category      text NOT NULL,
  cuisine       text NOT NULL,

  -- 시간대
  slots         text[] NOT NULL,
  primary_slot  text NOT NULL,

  -- 조리·특성
  method        text,
  spicy_level   int DEFAULT 0 CHECK (spicy_level BETWEEN 0 AND 3),
  fullness      int DEFAULT 2 CHECK (fullness BETWEEN 1 AND 3),

  -- 재료 분류
  protein_source text,
  has_vegetable  boolean DEFAULT false,
  has_meat       boolean DEFAULT false,
  has_seafood    boolean DEFAULT false,

  -- 🔑 1인분 기준 (nullable · 가짜 정밀도 방지)
  serving_size_g      numeric,               -- 정확한 값 있으면만
  serving_label       text NOT NULL,         -- 필수 · '1인분','한 그릇','2조각'
  serving_confidence  text NOT NULL DEFAULT 'estimated'
    CHECK (serving_confidence IN (
      'measured',   -- 실측·표준 기준
      'database',   -- 공식 DB 참조
      'estimated'   -- 카테고리 기반 추정
    )),

  -- 영양 (1인분 기준 · 원천 필수)
  nutrients_per_serving jsonb NOT NULL,
  -- 영양 (100g · nullable · 역산·참고용)
  nutrients_per_100g    jsonb,

  -- 영양 데이터 출처·검증
  nutrition_source_basis text NOT NULL
    CHECK (nutrition_source_basis IN (
      'serving',    -- 원본이 1인분 기준 (KOREAN_FOOD_DB · 확인됨)
      '100g',       -- 원본이 100g 기준
      'verified'    -- 수동 검증 완료
    )),
  nutrition_source       text,                 -- '식약처','수동입력','KOREAN_FOOD_DB'
  nutrition_verified     boolean DEFAULT false,
  nutrition_review_note  text,

  -- 특성 태그
  vegan_compatible  boolean DEFAULT false,
  sodium_level      text CHECK (sodium_level IN ('low','medium','high')),
  allergens         text[] DEFAULT '{}',

  -- 이유 설명용 (Gemini 컨텍스트)
  strengths     text[] DEFAULT '{}',
  keywords      text[] DEFAULT '{}',

  -- 데이터 품질 검증 (이상치 탐지)
  needs_review  boolean DEFAULT false,
  review_reasons text[] DEFAULT '{}',    -- ['HIGH_KCAL','HIGH_SODIUM','NO_SERVING_SIZE',...]

  -- 메타
  menu_version  text NOT NULL DEFAULT '2026-09-v1',
  is_active     boolean DEFAULT true,
  created_at    timestamptz DEFAULT now(),
  updated_at    timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_fmv2_needs_review ON food_menu_v2(needs_review) WHERE needs_review = true;

-- ═══════════════════════════════════════════════════════════
-- Enum 참고 (문서용 · 실제 강제 X, 값 목록만)
--
-- category · 음식 형태/역할 (재료 X · 재료는 protein_source · has_* 사용)
--   rice        · 밥·덮밥·비빔밥·볶음밥·초밥·김밥
--   noodle      · 면·국수·만두
--   soup        · 국·탕 (맑은 국물)
--   stew        · 찌개·전골 (걸쭉한 국물)
--   main_dish   · 고기·생선·계란 요리 (반찬 아닌 것)
--   side_dish   · 반찬·김치·나물·조미김
--   salad       · 샐러드·포케
--   porridge    · 죽·미음
--   bread       · 빵·샌드위치·피자·버거·토스트
--   snack       · 분식·간식·견과
--   dessert     · 케이크·아이스크림·디저트
--   beverage    · 커피·차·음료
--   fruit       · 과일 단품
--   dairy       · 요거트·치즈
--
-- cuisine:       'korean','japanese','chinese','western','southeast_asian','fusion','cafe'
-- slots:         'breakfast','lunch','dinner','snack'
-- method:        'grill','fry','stew','soup','raw','steam','bake','boil','stir_fry','roast'
-- protein_source:'fish','shellfish','chicken','pork','beef','tofu','egg','legume','none'
-- allergens:     'gluten','dairy','egg','fish','shellfish','nuts','soy','peanut'
-- ═══════════════════════════════════════════════════════════

-- 인덱스 · 자주 쓰는 쿼리 최적화
CREATE INDEX IF NOT EXISTS idx_fmv2_slots     ON food_menu_v2 USING GIN(slots);
CREATE INDEX IF NOT EXISTS idx_fmv2_category  ON food_menu_v2(category);
CREATE INDEX IF NOT EXISTS idx_fmv2_allergens ON food_menu_v2 USING GIN(allergens);
CREATE INDEX IF NOT EXISTS idx_fmv2_cuisine   ON food_menu_v2(cuisine);
CREATE INDEX IF NOT EXISTS idx_fmv2_active    ON food_menu_v2(is_active) WHERE is_active = true;

-- updated_at 자동 갱신 트리거
CREATE OR REPLACE FUNCTION trigger_set_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_timestamp_fmv2 ON food_menu_v2;
CREATE TRIGGER set_timestamp_fmv2
BEFORE UPDATE ON food_menu_v2
FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();

-- 🔒 food_menu_v2 · 서버 전용 · 2중 방어 (REVOKE + RLS)
-- 원칙: Client is disposable, Server is the moat.
-- 참조: SECURITY.md

-- 1) Data API 권한 자체 회수 (RLS와 별개)
--    Supabase 문서상 RLS와 GRANT는 별개 · 기존 프로젝트는 anon/authenticated에 권한 있을 수 있음
REVOKE ALL ON TABLE food_menu_v2 FROM anon;
REVOKE ALL ON TABLE food_menu_v2 FROM authenticated;
-- 앞으로 새 테이블에 자동 권한 부여 안 되게
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM anon;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM authenticated;

-- 2) RLS로 2중 방어 (실수로 GRANT되어도 막힘)
ALTER TABLE food_menu_v2 ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "food_menu_read_all" ON food_menu_v2;
DROP POLICY IF EXISTS "food_menu_no_client" ON food_menu_v2;
DROP POLICY IF EXISTS "food_menu_no_client_read" ON food_menu_v2;
DROP POLICY IF EXISTS "food_menu_no_client_write" ON food_menu_v2;

CREATE POLICY "food_menu_no_client_read" ON food_menu_v2
  FOR SELECT USING (false);
CREATE POLICY "food_menu_no_client_write" ON food_menu_v2
  FOR ALL USING (false) WITH CHECK (false);

-- service_role/secret_key는 RLS 우회 · API 서버만 접근

COMMENT ON TABLE food_menu_v2 IS '추천 엔진 후보 큐레이션 DB · BRAIN.md 원칙 기반';
COMMENT ON COLUMN food_menu_v2.serving_size_g IS '1인분 그램 · 추천 계산의 기준';
COMMENT ON COLUMN food_menu_v2.nutrients_per_serving IS '1인분 기준 영양 · 추천 엔진이 이 값으로 계산';
COMMENT ON COLUMN food_menu_v2.strengths IS 'Gemini 설명 생성용 강점 태그 · 사용자용 X';
