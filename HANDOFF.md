# 🎯 건강어때 · 인수인계 (Phase 8+ 캐릭터 시스템 시작 전)

> 이 문서는 새 채팅에서 프로젝트 컨텍스트를 빠르게 로드하기 위한 것.
> **새 채팅 시작 시 이 파일 먼저 읽어달라고 하면 됨.**

---

## 1. 제품 정체성 (Phase 0 확정)

**한 줄 정의:** AI가 내 다음 끼니를 정해주는 앱

**시그니처 기능:** "오늘 뭐 먹지?" — 홈에서 Top1 음식 하나 크게 추천

**참고 문서 (반드시 읽어야 함)**
- `BRAIN.md` — 8가지 제품 원칙 (Client is disposable, 데이터 없이 임의 변경 금지 등)
- `SECURITY.md` — 자산 방어 원칙 (Server is moat)
- `RECOMMEND_ENGINE.md` — 추천 엔진 스펙
- `TEST_SCENARIOS.md` — 20개 검증 시나리오

---

## 2. 이미 완성된 것 (건드리지 말 것)

### ✅ Rule Engine (Phase 3)
- `api/recommend-next.js` — 8개 함수 분리
  - filterCandidates / scoreNutrition / scorePreference / scoreDiversity / scoreTimeSlot / applySimilarityPenalty / generateReasonCodes / selectTop3
- 배점: 영양 45 / 취향 30 / 다양성 15 / 시간대 10
- `scripts/test_rule_engine.js` — 35/35 assertion 통과
- ENGINE_VERSION = '0.1.0'

### ✅ Gemini 문구 생성 (Phase 6)
- `server/prompts/recommend-copy-v1.txt` — 프롬프트 파일 (하드코딩 X)
- Gemini 2.5 Flash · thinking budget 0 · responseSchema 강제
- fallback 로직 있음 (Gemini 실패해도 앱 동작)

### ✅ 피드백 API (Phase 7)
- `api/recommend-feedback.js`
- action: accepted / consumed / skip / why / dislike / dislike_undo
- dislike는 user_preference에 자동 반영

### ✅ Supabase 4개 테이블 (Phase 2)
- `food_menu_v2` — 123개 음식 (Rule Engine 데이터 소스)
- `user_preference` — 취향
- `recommendation_log` — 서버 전용 감사 로그
- `recommendation_feedback` — 클라이언트 피드백
- 모두 RLS + REVOKE 적용 · 자물쇠 아이콘 표시
- schema/001~004 SQL 파일 존재

### ✅ 홈 UI 통합 (Phase 7)
- `index.html`의 `v21Hero` 카드 → Rule Engine + Gemini 데이터 사용
- `_v21FetchFromNewApi()`, `_v21ApplyToHero()`, `_v21RenderHero()` 수정됨
- [다른 음식] [내 주변] [자세히] 버튼 동작
- 15분 캐시 (`window._v21NewApi`)

### ✅ 실검증 + 3개 버그 수정 (Phase 7.5)
- BUG-A: 신규 유저 = 3일 굶은 사람으로 오판 → estimateDeficits 최소 3끼 요구
- BUG-B: vegan_compatible 오마킹 → whitelist 전략
- BUG-C: 아침·야식 슬롯 부족 → guessSlots 확대
- 떡볶이 kcal 520 → 280 수정

### ✅ 캐릭터 파츠 시스템 v0.1 초안 (Phase 8a)
- `character/character-system.html` — 단독 gallery 페이지
- 7 얼굴형 · 7 피부톤 · 12 헤어 × 12 색상 · 8 눈 · 5 코 · 8 입 · 6 눈썹 · 10 액세서리
- 20 프리셋 조합
- 손그림 톤 · 2.2px black stroke · imperfect lines
- 참고 스타일: `/Users/jinyoungchoi/Downloads/health-eottae-illustrations-v2/png/human-man.png`

---

## 3. 아직 남은 것 (Phase 8+ 앞으로 할 것)

### 🚧 다음 · 캐릭터 시스템 확장

**결정된 방향 (레이어 오버라이드)**
```
캐릭터 = Identity (내가 선택한 것 · 변하지 않음)
       + Growth Stage (시간·행동 기반 진화)
       + State Overlays (건강 데이터 기반 실시간 증상)
```

**증상 라이브러리 구상 (30종)**
- 부정: 콧물 / 다크서클 / 여드름 (은유적) / 부기 / 눈 침침 / 입술 트임 / 창백 / 빈혈 별 / 두통 힘줄 등
- 긍정: 반짝임 / 밝음 / 활력 / 피부 광채 / 눈 초롱초롱
- 특별: 파츠 잠금 해제 폭죽 / 균형 완성 왕관 / 기록 달성 뱃지

**성장 방식 (미결정 · 아래 옵션)**
- A · 씨앗 → 새싹 → 어린잎 → 묘목 → 열매 (은유적)
- B · 파츠 잠금 해제 (기본 파츠만 → 잘 챙기면 새 파츠 열림) ← 이게 더 좋다고 판단

**⚠️ 반드시 지킬 것**
1. 뚱뚱 표현 절대 X (지방혐오·이미지 콤플렉스 유도) · 대신 "부기"
2. 여드름은 은유적으로만 (얼굴 채도 어두워짐 정도)
3. 캐릭터에 죄책감 유도 X · "네가 못 챙겨서 이렇게 됐어" 톤 금지
4. 다마고치식 "죽음" X · 슬픈 표정만 허용
5. 모든 증상은 원인+해결책 세트로 설명

**미결정 3가지**
- 증상 강도 · 약/중/강 (중 추천)
- 회복 속도 · 빠름/중간/느림 (3일 잘 챙기면 회복 = 중간 추천)
- 아이·부모 모드 대응 방식

### 🚧 데이터 미완결
- **food_history 테이블 없음** · Phase 8b에서 만들어야 · recommendation_id FK 필요 · 진짜 KPI ("추천 vs 실제 일치율") 계산 위해 필수
- **인증 = device UUID** · Supabase Auth 마이그레이션 미정
- **계절성 없음** · 콩국수 여름 한정 등 반영 안 됨
- **치킨·볶음밥 등 대표 음식** · KOREAN_FOOD_DB에 아직 안 들어감
- **Gemini reason 품질** · "오랜만에 다른 결로 든하게!" 같은 오탈자·어색함 · 프롬프트 튜닝 필요

### 🚧 UX 미완결
- [자세히] 버튼 alert → 예쁜 bottom sheet
- [먹었어요] 시 실제 food_history 기록 (지금은 feedback만)
- 홈의 다른 카드들 정리 (BRAIN.md 우선순위대로)

---

## 4. 기술 스택 / 파일 위치

**경로**
- 프로젝트 루트: `/Users/jinyoungchoi/Desktop/peepee_ai_final/peepee_new/`
- API: `api/*.js` (Vercel serverless)
- Supabase 스키마: `schema/*.sql`
- 데이터: `data/food_menu_v2.json`
- 스크립트: `scripts/*.js`
- 서버 전용: `server/prompts/*.txt`
- 캐릭터: `character/*.html`

**스택**
- PWA (Service Worker: `sw.js` · 버전 업하면 캐시 자동 클리어)
- 프론트: `index.html` (단일 파일 · 27000+ 줄 · 이유는 build.js가 minify)
- 백엔드: Vercel serverless (Node.js)
- DB: Supabase (Postgres + RLS + 새 키 시스템 publishable/secret)
- AI: Gemini 2.5 Flash (서버 전용)

**환경변수 (Vercel에 등록됨)**
- SUPABASE_URL / SUPABASE_ANON_KEY (기존)
- SUPABASE_SECRET_KEY (Rule Engine 용)
- GEMINI_API_KEY (Sensitive 타입)
- KAKAO_REST_API_KEY / NCP_API_KEY 등 (기존 기능용)

**로컬 실행**
```bash
cd /Users/jinyoungchoi/Desktop/peepee_ai_final/peepee_new
npm run build   # dist/ 폴더에 빌드 (수정할 때마다 필요!)
vercel dev      # localhost:3000
```

**⚠️ 주의**
- Vercel은 `dist/` 폴더에서 서빙 · `npm run build` 안 하면 옛 파일 서빙됨
- Service Worker 캐시가 강함 · 개발 중 시크릿 창 권장

---

## 5. 협업 스타일 (이전 대화에서 확립된 것)

**언어**
- 사용자와 나 모두 반말·친근 톤
- 긴급하거나 심각한 부분은 볼드로 강조
- 이모지는 절제 사용 (❌ 남발 · ✅ 포인트에만)

**의사결정 방식**
- 여러 옵션 (A/B/C) 제시하고 추천 명시
- Trade-off 정직하게 설명
- 사용자가 잘못 선택하려 하면 다시 물어봄
- "정직하게 말할게" 톤 · 좋은 것만 얘기 X

**작업 방식**
- 파일 편집 후 반드시 검증 (테스트 실행 · 회귀 확인)
- 큰 변경은 사용자에게 진행 여부 확인 후
- "내가 할 수 있는 것 vs 사용자가 해야 하는 것" 명확히 구분
- 버그 발견하면 즉시 수정 제안

**금기 사항**
- Client에 서버 로직·API 키·프롬프트 노출 X
- 사용자 데이터 X 계산 결과만 응답
- 프로덕션 배포는 사용자 명시적 허락 후에만
- 채팅에 secret key 등 절대 붙여넣지 X

---

## 6. 새 채팅에서 이 문서 사용법

**새 채팅 첫 메시지 예시:**

> "건강어때 앱 개발 이어서 하자. 프로젝트 루트: /Users/jinyoungchoi/Desktop/peepee_ai_final/peepee_new/
> 
> 먼저 이 파일 읽어줘: HANDOFF.md
> 
> 그리고 BRAIN.md, SECURITY.md도 훑어봐. 그다음 뭐 할지 얘기하자."

이렇게 하면 새 Claude가 컨텍스트 로드하고 이어서 작업 가능.

---

## 7. 원래 사용자의 큰 목표 (안 잊기)

**해결하려던 4가지 근본 문제**
1. 창작자가 자기 앱 안 씀 → 사용자가 매일 열게 만들기
2. UI 일관성 없음 → 디자인 시스템 확립
3. 바이럴 힘 약함 → 캐릭터·정체성으로 공유 유도
4. 시그니처 기능 없음 → "AI 다음 끼니 추천" 확립 ✅

**진짜 KPI**
- 클릭 수 X
- **추천-실제식사 일치율** (food_history.recommendation_id로 계산)
- 균형점수 · 재방문율 · 피드백 품질

**시장 위치**
- 다른 건강앱: 숫자로 다그침
- 건강어때: 감정으로 유도 (캐릭터 · 코치 · 친구 톤)

---

_문서 작성일: 2026-09-29 · Phase 7.5 완료 시점_
_다음 단계: Phase 8 · 캐릭터 시스템_
