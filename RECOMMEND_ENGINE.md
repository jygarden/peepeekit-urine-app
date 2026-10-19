# 🎯 추천 엔진 스펙 · v0.1 (MVP)

> **건강어때의 심장.** UI보다 이것부터.
> 이 문서 준수 · 새 로직 추가 시 이 문서를 먼저 업데이트.
> 관련 원칙: [BRAIN.md](./BRAIN.md) Section 10.

---

## 0. 아키텍처

**핵심 원칙: Client is disposable. Server is the moat.** ([SECURITY.md](./SECURITY.md))

```
클라이언트 (앱)
    │
    │  POST /api/recommend-next
    ▼
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ [서버 벽]
    │
    ▼
[Rule Engine · 결정]  →  Top 3 후보  →  [Gemini · 설명]
    ↓                                       ↑
"뭘 추천할지"                          "왜 추천했는지"
    │                                       │
    └──────────────┬────────────────────────┘
                   ▼
    { primary, alternatives } · 완성된 결과만
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ [서버 벽]
                   │
                   ▼
              클라이언트 렌더
```

**분리 원칙**
- Rule Engine: 결정 논리 · 결정론적 · 로그 남김 · **서버 전용**
- Gemini: 자연어 설명 · **서버 전용** (API key·프롬프트 노출 X)
- **Gemini는 절대 후보 선택에 관여하지 않는다.** 오직 표현만.

### 서버 전용 자산 (절대 클라이언트 X)
- 점수 배점 (45/30/15/10)
- Rule Engine 코드
- Gemini system prompt
- food_menu_v2 큐레이션 데이터
- reason_code 사전

### 클라이언트가 받는 것 (완성된 결과만)
- headline: "오늘 저녁, 고등어구이 어때요?"
- reason: "최근 생선이 조금 부족했어요"
- food_id (표시용)

**절대 X**: 점수 breakdown, reason_codes, deficits 등 원본 데이터.

---

## 1. 데이터 파이프라인

```
① 최근 식사 조회 (Supabase)
      ↓
② 영양 추정 (음식 DB 조회 · 부족량 계산)
      ↓
③ 후보 필터링 (제외 규칙 적용)
      ↓
④ 점수화 (100점 만점)
      ↓
⑤ Top 3 다양성 선택
      ↓
⑥ Gemini에 근거 + 후보 넘김 → 설명 생성
      ↓
⑦ 사용자에게 노출 (대표 1 + 대체 2)
      ↓
⑧ Feedback 수집 → 학습 데이터
```

---

## 2. 입력 데이터

### 사용자가 실제로 주는 것 (원천)
| 필드 | 타입 | 필수 | 예시 |
|---|---|---|---|
| user_id | uuid | Y | - |
| recent_meals | array | Y | 최근 3-7끼 식사 로그 |
| preferences | object | N | 좋아함/싫어함/알레르기 |
| current_time | datetime | Y | 요청 시각 |
| dietary_restrictions | array | N | ['채식','저염'] |

### 엔진이 계산하는 것
| 필드 | 타입 | 계산법 |
|---|---|---|
| nutrition_estimate | object | recent_meals → KOREAN_FOOD_DB 조회 → 3일 누적 |
| deficits | array | RDA 대비 부족한 상위 3개 영양소 |
| meal_slot | enum | current_time으로 아침/점심/저녁/간식 결정 |
| recent_categories | array | 최근 24시간 먹은 음식 카테고리 |

---

## 3. Rule Engine · 3단계

### 단계 1 · 후보 필터링

**food_menu_v2에서 시작 → 필터로 축소**

```typescript
candidates = food_menu_v2.filter(food => {
  // 시간대 맞는 것만
  if (!food.slots.includes(meal_slot)) return false;
  
  // 최근 24시간 중복 제거
  if (recent_24h_ids.includes(food.id)) return false;
  
  // 알레르기 제거
  if (food.allergens.some(a => user_allergens.includes(a))) return false;
  
  // 싫어함 제거 (영구)
  if (user_dislikes.includes(food.id)) return false;
  
  // 식이 제한 매칭
  if (dietary_restrictions.includes('채식') && !food.vegan_compatible) return false;
  if (dietary_restrictions.includes('저염') && food.sodium_level === 'high') return false;
  
  return true;
});
```

**목표: 후보 20-40개로 축소**

### 단계 2 · 점수화 (100점 만점)

**BRAIN.md 확정 배점**

```
영양 적합도      45점
개인 취향        30점
최근 식사 다양성 15점
시간대 적합도    10점
─────────────────
                100점
```

#### 영양 적합도 (45점)

**핵심: "있기만 하면" X · "1인분이 부족량을 얼마나 채우는가" O**

```typescript
function scoreNutrition(food, deficits) {
  let score = 0;
  
  // food.nutrients_per_serving = 1인분 영양 (100g 아님!)
  // = food.nutrients_per_100g * (food.serving_size_g / 100)
  
  for (const deficit of deficits) {
    // deficit.amount_needed: 부족량 (예: 비타민D 10㎍)
    if (deficit.amount_needed <= 0) continue;
    
    const providedByServing = food.nutrients_per_serving[deficit.nutrient] || 0;
    const fillRate = Math.min(1, providedByServing / deficit.amount_needed);
    // 0.8 = 80% 채움 → 12점
    // 0.1 = 10% 채움 → 1.5점
    // 완전히 채움 이상은 그냥 max
    
    const perNutrientMax = 45 / deficits.length; // 부족 3개면 각 15점
    score += fillRate * perNutrientMax;
  }
  return Math.min(45, score);
}
```

**왜 이렇게?**
- 비타민D 조금 든 음식 = 낮은 점수
- 고등어처럼 많이 든 음식 = 높은 점수
- 부족량 넘게 채워도 max 유지 (과잉 방지)

#### 개인 취향 (30점)
```typescript
function scoreTaste(food, user_prefs) {
  let score = 15; // 기본
  
  // 좋아함 카테고리
  if (user_prefs.liked_categories.includes(food.category)) score += 10;
  
  // 좋아함 조리법
  if (user_prefs.liked_methods.includes(food.method)) score += 5;
  
  // 자주 먹은 (안전한 선택)
  if (user_prefs.frequently_eaten.includes(food.id)) score += 5;
  
  // 최근 안 당김 표시
  if (user_prefs.recent_skipped.includes(food.id)) score -= 15;
  
  return Math.max(0, Math.min(30, score));
}
```

#### 다양성 (15점)
```typescript
function scoreDiversity(food, recent_categories) {
  // 최근 24시간에 이 카테고리 안 먹었으면 +15
  if (!recent_categories.includes(food.category)) return 15;
  // 먹었으면 감점
  return 5;
}
```

#### 시간대 (10점)
```typescript
function scoreTimeSlot(food, meal_slot) {
  // 이 시간대 대표 태그면 +10
  if (food.primary_slot === meal_slot) return 10;
  // 그냥 허용되는 시간대면 +5
  if (food.slots.includes(meal_slot)) return 5;
  return 0;
}
```

### 단계 3 · Top 3 유사도 패널티 (강제 X)

**카테고리 강제 배제 X · 유사도 패널티로 자연스럽게**

```typescript
// 점수 정렬
sorted = candidates.sort((a, b) => b.score - a.score);

// 유사도 패널티로 다양성 확보
selected = [sorted[0]]; // 1위는 무조건 선정

const similarityKey = (food) => `${food.category}|${food.method}`;
// 같은 카테고리 + 같은 조리법 조합만 유사

for (const food of sorted.slice(1)) {
  if (selected.length >= 3) break;
  
  // 이미 선정된 것들과 유사도 체크
  const tooSimilar = selected.some(s =>
    similarityKey(s) === similarityKey(food)
  );
  
  if (tooSimilar) continue; // 완전 동일 조합만 배제
  selected.push(food);
}

// 부족하면 유사도 체크 없이 채움
while (selected.length < 3 && sorted.length > selected.length) {
  const next = sorted.find(f => !selected.includes(f));
  if (next) selected.push(next);
}
```

**왜 이렇게?**
- 고등어구이 + 연어덮밥 (seafood 같지만 조리법 다름) → 둘 다 OK
- 고등어구이 + 삼치구이 (seafood + grill 완전 동일) → 하나만
- 강제 배제하면 좋은 후보 놓침

**출력**
- `primary`: 대표 추천 1개
- `alternatives`: 대체 후보 2개 (다른 거 눌렀을 때)

---

## 4. Gemini · 설명 생성

### reason_codes 구조 (필수)

Rule Engine은 선정 이유를 **코드**로 남김. Gemini는 이 코드만 자연어화.
→ 설명과 근거 기술적 강제 일치 (BRAIN.md 원칙 7)

```typescript
// Rule Engine 출력 예
{
  primary: 'food_id_고등어구이',
  reason_codes: [
    'PROTEIN_DEFICIT',           // 단백질 부족 채움
    'VITAMIN_D_DEFICIT',         // 비타민D 부족 채움
    'SEAFOOD_NOT_RECENTLY_EATEN' // 최근 생선 안 먹음
  ],
  score_breakdown: { nutrition: 42, taste: 20, diversity: 15, timing: 8 }
}
```

### reason_code 사전

```
영양 관련:
  PROTEIN_DEFICIT, FIBER_DEFICIT, VITAMIN_D_DEFICIT,
  CALCIUM_DEFICIT, IRON_DEFICIT, OMEGA3_DEFICIT

식사 다양성:
  {CATEGORY}_NOT_RECENTLY_EATEN   (예: SEAFOOD_NOT_RECENTLY_EATEN)
  MAIN_PROTEIN_ROTATION            (단백질 소스 다양화)

취향:
  LIKED_CATEGORY, LIKED_METHOD, FREQUENTLY_EATEN

시간대:
  PRIMARY_SLOT_MATCH               (이 시간대 대표 음식)
  FULLNESS_MATCH                   (아침=가벼움/저녁=든든함 매칭)
```

### 프롬프트 템플릿

```
너는 건강어때 앱의 음식 큐레이터다.

【Rule Engine 선정 결과】
- 추천 음식: {food_name}
- 시간대: {meal_slot}
- 선정 이유 (reason_codes): {reason_codes_list}

【reason_code 자연어 매핑 · 참고】
PROTEIN_DEFICIT → "최근 단백질이 조금 부족했어요"
VITAMIN_D_DEFICIT → "비타민D 채우기 좋아요"
SEAFOOD_NOT_RECENTLY_EATEN → "최근 생선 요리가 없었어요"
LIKED_CATEGORY → (자연스럽게 녹임 · 강조 X)
...

【톤 · 필수】
- 존댓말 · 친근하게
- 숫자·퍼센트 X ("41% 부족" 금지)
- 명령형 X ("먹으세요" 금지)
- 감정·상황 언어 O

【출력 · JSON】
{
  "headline": "오늘 저녁, {음식} 어때요?",
  "reason": "20자 이내 한 줄 이유",
  "long_reason": "50자 이내 · '왜?' 눌렀을 때"
}

【절대 규칙】
- reason_codes에 없는 이유를 지어내지 마라.
- reason_codes만 자연어로 표현하라.
```

### Gemini는 후보 선택에 관여 X · 표현만
Rule Engine 결정한 3개를 그대로 받음. Gemini 실패 시 하드코딩 fallback.

---

## 5. Feedback 처리

### accepted vs consumed 분리 (중요)

**추천 수락 ≠ 실제 식사**

```
accepted   = "이걸로 할게요" (추천 직후 · 의도 선언)
             → 추천 로그에만 기록 · food_history 자동 기록 X

consumed   = "먹었어요" (식사 후 · 실제 기록)
             → food_history에 정식 기록
             → 이때만 취향 학습 반영
```

**홈 버튼도 명확히 구분:**
```
[이걸로 할게요]   → accepted
[먹었어요]        → consumed (식사 후 눌림)
[다른 거]         → skip
[왜?]            → detail view
```

### API
```
POST /api/recommend-feedback
{
  recommendation_id: uuid,
  action: 'accepted' | 'consumed' | 'skip' | 'why',
  skip_reason?: 'not_craving' | 'recently_ate' | 'dislike'
}
```

### 신호 강도별 처리

| 신호 | 강도 | 처리 |
|---|---|---|
| **안 당김** | 약 | 24h soft exclude · 이 음식만 |
| **최근 먹음** | 중 | 48h suppress · 카테고리 다양성 강화 |
| **싫어함** | 강 | **즉시 hard exclude** + [실행 취소] 제공 |

### 학습 반영

```typescript
switch (action) {
  case 'accepted':
    // 추천 로그만 갱신 · food_history 건드리지 않음
    // 아직 실제로 먹은 것 아님
    break;
    
  case 'consumed':
    // 실제 먹음 · food_history 기록
    // 취향 학습 (frequently_eaten 갱신)
    break;
    
  case 'skip':
    if (reason === 'not_craving') {
      // 약 신호 · 24h만 제외
      recent_skipped.push({food_id, expire: now + 24h});
    }
    if (reason === 'recently_ate') {
      // 중 신호 · 카테고리 48h suppress
      recent_ate_hint.push({category, expire: now + 48h});
    }
    if (reason === 'dislike') {
      // 강 신호 · 즉시 영구 제외 (실행 취소 UI 제공)
      user_dislikes.push(food_id);
      // dislike_count 3회 로직 삭제 · 명확한 의사표시니까
    }
    break;
}
```

### 진짜 KPI · 일치율

```typescript
// consumed 이후 12시간 안에 실제 food_history에 기록된 음식과 매칭
// 추천 = 고등어구이 · 실제 기록 = 고등어구이 → 일치
// 추천 = 고등어구이 · 실제 기록 = 치킨 → 불일치

matchRate = matches / total_consumed_events
```

이게 진짜 추천 품질 지표. "먹었어요" 클릭 수는 참고용.

---

## 6. food_menu_v2 스키마

**신규 큐레이션 DB. serving_size 필수. 영양은 100g + 1인분 모두 제공.**

```sql
CREATE TABLE food_menu_v2 (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL,        -- '고등어구이'
  aliases     text[],               -- ['자반고등어','구운 고등어']
  category    text NOT NULL,        -- 'seafood' | 'meat' | 'grain' | ...
  cuisine     text NOT NULL,        -- 'korean' | 'japanese' | 'western' | ...
  
  -- 시간대
  slots       text[] NOT NULL,      -- ['lunch','dinner']
  primary_slot text NOT NULL,       -- 'dinner'
  
  -- 조리법·특성
  method      text,                 -- 'grill' | 'stew' | 'raw' | ...
  spicy_level int DEFAULT 0,        -- 0-3
  fullness    int DEFAULT 2,        -- 1(가벼움)-3(든든)
  
  -- 재료 분류
  protein_source text,              -- 'fish' | 'chicken' | 'pork' | 'tofu' | ...
  has_vegetable  boolean,
  has_meat       boolean,
  has_seafood    boolean,
  
  -- 🔑 1인분 기준 (필수)
  serving_size_g   int NOT NULL,    -- 예: 180
  serving_label    text NOT NULL,   -- 예: '1인분' | '한 그릇' | '2조각'
  
  -- 영양 (100g 기준 원본)
  nutrients_per_100g jsonb NOT NULL, -- { kcal, protein, carbs, fat, fiber, vitD, ... }
  
  -- 영양 (1인분 기준 · 자동 계산 or 마이그레이션 시 채움)
  nutrients_per_serving jsonb NOT NULL, -- 위 * (serving_size_g / 100)
  
  -- 특성 태그
  vegan_compatible  boolean DEFAULT false,
  sodium_level      text,           -- 'low' | 'medium' | 'high'
  allergens         text[],         -- ['gluten','dairy','egg','fish','shellfish','nuts']
  
  -- 이유 설명용 (Gemini 컨텍스트)
  strengths   text[],               -- ['오메가3','단백질','비타민D']
  keywords    text[],               -- ['따뜻함','든든함','바다']
  
  -- 메타
  menu_version text DEFAULT '2026-09-v1',  -- A/B 비교용
  created_at   timestamptz DEFAULT now(),
  updated_at   timestamptz DEFAULT now()
);

CREATE INDEX idx_food_slots ON food_menu_v2 USING GIN(slots);
CREATE INDEX idx_food_category ON food_menu_v2(category);
CREATE INDEX idx_food_allergens ON food_menu_v2 USING GIN(allergens);
```

**추천 엔진은 nutrients_per_serving으로 계산.** nutrients_per_100g는 참고용.

### 초기 큐레이션 목표
- **150-300개** (2000개 X · 잘 관리된 것)
- KOREAN_FOOD_DB에서 이관 (~200개)
- 태그 정확도 최우선

---

## 7. Supabase 스키마 · 추천 관련

```sql
-- 사용자 취향
CREATE TABLE user_preference (
  user_id uuid PRIMARY KEY,
  liked_categories    text[] DEFAULT '{}',
  liked_methods       text[] DEFAULT '{}',
  frequently_eaten    uuid[] DEFAULT '{}',    -- food_menu_v2.id
  user_dislikes       uuid[] DEFAULT '{}',    -- 영구 제외
  allergens           text[] DEFAULT '{}',
  dietary_restrictions text[] DEFAULT '{}',   -- ['채식','저염']
  updated_at          timestamptz DEFAULT now()
);

-- 추천 로그 (뭘 추천했는지 · 버전 기록 필수)
CREATE TABLE recommendation_log (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL,
  primary_food_id uuid NOT NULL,
  alternatives    uuid[] NOT NULL,            -- 대체 후보
  headline        text NOT NULL,              -- Gemini 생성 문구
  reason          text NOT NULL,              -- 짧은 이유
  reason_codes    text[] NOT NULL,            -- ['PROTEIN_DEFICIT','SEAFOOD_NOT_RECENT']
  score_breakdown jsonb NOT NULL,             -- 점수 근거
  meal_slot       text NOT NULL,
  
  -- 🔑 버전 관리 (A/B 비교 필수)
  engine_version  text NOT NULL,              -- '0.1.0'
  menu_version    text NOT NULL,              -- '2026-09-v1'
  
  created_at      timestamptz DEFAULT now()
);

-- 추천 피드백
CREATE TABLE recommendation_feedback (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recommendation_id   uuid REFERENCES recommendation_log(id),
  user_id             uuid NOT NULL,
  
  -- 🔑 accepted vs consumed 분리
  action              text NOT NULL,          -- 'accepted' | 'consumed' | 'skip' | 'why' | 'dislike_undo'
  skip_reason         text,                    -- 'not_craving' | 'recently_ate' | 'dislike'
  actual_food_id      uuid,                    -- consumed일 때 실제 먹은 음식 (일치율 계산용)
  
  created_at          timestamptz DEFAULT now()
);

CREATE INDEX idx_rec_log_user ON recommendation_log(user_id, created_at DESC);
CREATE INDEX idx_rec_feedback_rec ON recommendation_feedback(recommendation_id);
```

---

## 8. API 인터페이스

### POST /api/recommend-next
```typescript
// Request
{
  meal_slot?: 'breakfast' | 'lunch' | 'dinner' | 'snack'  // 없으면 현재 시각으로
}

// Response
{
  recommendation_id: string,
  primary: {
    food_id: string,
    name: "고등어구이",
    headline: "오늘 저녁, 고등어구이 어때요?",
    reason: "최근 생선이 조금 부족했어요"
  },
  alternatives: [
    { food_id, name, headline, reason },
    { food_id, name, headline, reason }
  ]
}
```

### POST /api/recommend-feedback
```typescript
// Request
{
  recommendation_id: string,
  action: 'ate' | 'skip' | 'why',
  skip_reason?: 'not_craving' | 'recently_ate' | 'dislike'
}

// Response
{ ok: true }
```

### GET /api/recommend-explain?id={recommendation_id}
```typescript
// Response
{
  long_reason: "최근 3일간 생선·오메가3 섭취가 적었어요...",
  deficits_shown: ['오메가3', '비타민D'],  // 사용자에게 보여줄 부족 영양 (숫자 X)
  based_on_meals: [                        // 어떤 식사 기반인지
    { date: '2026-09-27', name: '김밥' },
    { date: '2026-09-27', name: '치킨' }
  ]
}
```

---

## 9. KPI 로깅

각 추천마다 자동 로그:
- `recommendation_id`
- `score_breakdown` (감사용)
- 노출 시각
- Feedback (ate/skip/why + 이유)
- 이후 12시간 내 실제 기록과의 매칭 여부 (일치율)

**KPI 대시보드는 Phase 8 이후. 지금은 로그 수집만.**

---

## 10. 절대 넣지 않는 것

- 사주 (별도 재미 옵션 · 추천 로직 밖)
- 요일 가정 ("월요일=가볍게")
- 날씨 가정 (초기 X)
- 특정 매장 정보 (매장 추천 · PMF 후)
- 광고성 추천 (제휴 음식 우선순위)

---

## 11. 개발 우선순위

```
1. food_menu_v2 스키마 + serving_size + 1인분 영양 환산
2. KOREAN_FOOD_DB → v2 마이그레이션 (200개)
3. Supabase 3개 테이블 (engine_version, reason_codes 포함)
4. Rule Engine 구현 (Rule + Gemini)
5. 🔑 CLI 테스트 케이스 20-30개 통과 (하드코딩 시나리오)
6. Gemini 설명 연결
7. 실제 사용자 데이터 연결
```

**5번이 진짜 관문.** 프론트 붙이기 전에 상식적인 시나리오 다 통과해야 함.

### 필수 테스트 케이스 예시

```
CASE 1 · 부족 영양 채우기
  최근 3끼: 김밥 / 라면 / 제육볶음
  → 생선·비타민D 부족
  → 사용자: 생선 좋아함
  → 저녁 시간
  EXPECT: 고등어구이·연어·오리 등이 Top 3에 포함

CASE 2 · 중복 회피
  최근 3끼: 고등어구이 / 연어덮밥 / 참치회
  → 생선·단백질 충분
  EXPECT: 생선류 Top 3에 없거나 후순위

CASE 3 · 취향 반영
  liked_categories: ['korean']
  user_dislikes: [떡볶이_id]
  EXPECT: 한식 가중치, 떡볶이 제외

CASE 4 · 알레르기
  allergens: ['shellfish']
  EXPECT: 새우·조개 요리 완전 제외

CASE 5 · 시간대
  현재 시각: 08:00
  EXPECT: 삼겹살·매운 음식 제외, 가벼운 음식 우선

CASE 6 · 유사도 패널티
  Top 1: 고등어구이
  Top 2 후보: 삼치구이 (같은 seafood+grill) vs 연어덮밥 (seafood but 다른 조리)
  EXPECT: 연어덮밥 우선

CASE 7 · 부족 정도 반영
  비타민D 부족 심각
  후보 A: 계란 (비타민D 조금)
  후보 B: 고등어 (비타민D 많음)
  EXPECT: B가 A보다 훨씬 높은 점수

... 총 20-30개 통과해야 프론트 시작
```

**Phase 3까지는 API가 CLI로 검증 가능한 상태까지.** 프론트는 Phase 5.
