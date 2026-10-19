-- 🎯 추천 관련 3개 테이블
-- 참조: RECOMMEND_ENGINE.md Section 7
-- Migration: 002
-- Date: 2026-09-28

-- ═══════════════════════════════════════════════════════════
-- user_preference · 사용자 취향 (누적 학습)
-- ═══════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS user_preference (
  user_id               uuid PRIMARY KEY,

  -- 좋아함 (consumed 신호로 학습)
  liked_categories      text[] DEFAULT '{}',
  liked_methods         text[] DEFAULT '{}',
  frequently_eaten      uuid[] DEFAULT '{}',   -- food_menu_v2.id 배열

  -- 제외 (강 신호 · 즉시 반영)
  user_dislikes         uuid[] DEFAULT '{}',   -- food_menu_v2.id

  -- 프로필 기반
  allergens             text[] DEFAULT '{}',
  dietary_restrictions  text[] DEFAULT '{}',   -- '채식','저염','저당'

  -- 일시 제외 (skip · not_craving)
  recent_skipped        jsonb DEFAULT '[]',    -- [{food_id, expire_at}]
  -- 일시 카테고리 억제 (skip · recently_ate)
  recent_ate_hint       jsonb DEFAULT '[]',    -- [{category, expire_at}]

  updated_at            timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_up_updated_at ON user_preference(updated_at DESC);

-- ═══════════════════════════════════════════════════════════
-- recommendation_log · 뭘 추천했는지 · 버전 필수
-- ═══════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS recommendation_log (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL,

  -- 추천 결과
  primary_food_id uuid NOT NULL REFERENCES food_menu_v2(id),
  alternatives    uuid[] NOT NULL DEFAULT '{}',

  -- Gemini 생성 문구
  headline        text NOT NULL,
  reason          text NOT NULL,
  long_reason     text,

  -- Rule Engine 근거 (설명·감사·A/B)
  reason_codes    text[] NOT NULL,
  score_breakdown jsonb NOT NULL,
  meal_slot       text NOT NULL,

  -- 🔑 버전 (A/B 비교) · 3종 세트
  engine_version  text NOT NULL,          -- Rule Engine 버전 (점수식)
  menu_version    text NOT NULL,          -- food_menu_v2 스냅샷 버전
  prompt_version  text NOT NULL,          -- Gemini 프롬프트 버전

  created_at      timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_rl_user_time     ON recommendation_log(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_rl_engine        ON recommendation_log(engine_version);
CREATE INDEX IF NOT EXISTS idx_rl_reason_codes  ON recommendation_log USING GIN(reason_codes);

-- ═══════════════════════════════════════════════════════════
-- recommendation_feedback · 유저 반응
-- ═══════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS recommendation_feedback (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recommendation_id  uuid NOT NULL REFERENCES recommendation_log(id) ON DELETE CASCADE,
  user_id            uuid NOT NULL,

  -- accepted vs consumed 분리 (BRAIN.md 원칙)
  action             text NOT NULL CHECK (action IN (
                       'accepted',      -- "이걸로 할게요" (의도)
                       'consumed',      -- 실제 먹음 (기록)
                       'skip',          -- 다른 거
                       'why',           -- 상세 설명 열람
                       'dislike_undo'   -- 싫어요 실행 취소
                     )),

  skip_reason        text CHECK (skip_reason IN (
                       'not_craving',   -- 24h soft
                       'recently_ate',  -- 48h suppress
                       'dislike'        -- 영구 hard
                     )),

  actual_food_id     uuid REFERENCES food_menu_v2(id),
                     -- consumed일 때 · 진짜 KPI(일치율) 계산용

  created_at         timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_rf_rec_id  ON recommendation_feedback(recommendation_id);
CREATE INDEX IF NOT EXISTS idx_rf_user    ON recommendation_feedback(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_rf_action  ON recommendation_feedback(action);

-- ═══════════════════════════════════════════════════════════
-- RLS · 세분화 (읽기/쓰기 분리)
-- ═══════════════════════════════════════════════════════════
ALTER TABLE user_preference          ENABLE ROW LEVEL SECURITY;
ALTER TABLE recommendation_log       ENABLE ROW LEVEL SECURITY;
ALTER TABLE recommendation_feedback  ENABLE ROW LEVEL SECURITY;

-- 정책 초기화
DROP POLICY IF EXISTS "up_own_only"      ON user_preference;
DROP POLICY IF EXISTS "up_read_own"      ON user_preference;
DROP POLICY IF EXISTS "up_write_own"     ON user_preference;
DROP POLICY IF EXISTS "rl_own_only"      ON recommendation_log;
DROP POLICY IF EXISTS "rl_read_own"      ON recommendation_log;
DROP POLICY IF EXISTS "rl_no_client_write" ON recommendation_log;
DROP POLICY IF EXISTS "rf_own_only"      ON recommendation_feedback;
DROP POLICY IF EXISTS "rf_read_own"      ON recommendation_feedback;
DROP POLICY IF EXISTS "rf_insert_own"    ON recommendation_feedback;
DROP POLICY IF EXISTS "rf_no_client_update" ON recommendation_feedback;

-- user_preference · 본인이 관리 (앱에서 프로필 편집)
CREATE POLICY "up_read_own"  ON user_preference
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "up_write_own" ON user_preference
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- recommendation_log · 서버가 생성하는 감사 로그
--   SELECT: 본인 것만 (앱에서 히스토리 조회)
--   INSERT/UPDATE/DELETE: service key (서버)만 · client role 차단
CREATE POLICY "rl_read_own" ON recommendation_log
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "rl_no_client_write" ON recommendation_log
  FOR INSERT WITH CHECK (false);
-- UPDATE·DELETE는 정책 없음 = 클라이언트 거부

-- recommendation_feedback · 유저가 피드백만 남길 수 있음
--   SELECT: 본인 것만
--   INSERT: 본인 것만 (앱에서 accepted/skip/why 등)
--   UPDATE/DELETE: service key만 (감사 로그 무결성)
CREATE POLICY "rf_read_own" ON recommendation_feedback
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "rf_insert_own" ON recommendation_feedback
  FOR INSERT WITH CHECK (auth.uid() = user_id);
-- UPDATE·DELETE는 정책 없음 = 클라이언트 거부

COMMENT ON TABLE user_preference IS '사용자 취향 · 유저 소유 · 본인이 편집';
COMMENT ON TABLE recommendation_log IS '추천 감사 로그 · 서버(secret key)만 쓰기 · 본인 읽기';
COMMENT ON TABLE recommendation_feedback IS '유저 피드백 · 본인만 INSERT · 수정·삭제는 서버';
COMMENT ON COLUMN recommendation_feedback.actual_food_id IS 'DEPRECATED · food_history.recommendation_id 사용 권장';

-- ═══════════════════════════════════════════════════════════
-- food_history 확장 · recommendation_id FK 추가
-- (실제 식사 기록이 source of truth · 추천과 연결)
-- ═══════════════════════════════════════════════════════════
-- 기존 food_history 테이블이 있다면 · 컬럼만 추가
-- (없으면 별도 스키마로 생성 필요)

-- food_history 테이블이 존재할 때만 확장 (없으면 나중에 만들 때 반영)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'food_history'
  ) THEN
    ALTER TABLE food_history
      ADD COLUMN IF NOT EXISTS recommendation_id uuid REFERENCES recommendation_log(id);

    CREATE INDEX IF NOT EXISTS idx_fh_rec_id
      ON food_history(recommendation_id)
      WHERE recommendation_id IS NOT NULL;

    COMMENT ON COLUMN food_history.recommendation_id
      IS '이 식사가 추천에서 나온 것이면 · 추천-실제식사 일치율 계산';
  ELSE
    RAISE NOTICE 'food_history 테이블 없음 · recommendation_id 확장 스킵 · food_history 생성 시 재실행 필요';
  END IF;
END $$;
