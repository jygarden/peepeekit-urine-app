# 🔒 건강어때 · 보안·방어 원칙

> **Client is disposable. Server is the moat.**
> 화면은 일주일이면 베낄 수 있지만, 추천 품질은 몇 년치 데이터를 베껴야 한다.

관련 문서:
- [BRAIN.md](./BRAIN.md) Section 3-1
- [RECOMMEND_ENGINE.md](./RECOMMEND_ENGINE.md)

---

## 1. 자산 분류

### 🔴 서버 전용 (Class S · Server-only)
클라이언트에 절대 노출 X. 유출 시 사업 훼손.

| 자산 | 위치 | 접근 방법 |
|---|---|---|
| 추천 알고리즘 코드 | `/api/recommend-next.js` (Vercel) | 서버 실행만 |
| 점수 배점 (45/30/15/10) | 서버 코드 상수 | 변경 시 engine_version 증가 |
| Gemini system prompt | 서버 코드 상수 | `.env` X · 상수로 코드 안에 |
| food_menu_v2 전체 데이터 | Supabase RLS 차단 | service_role만 |
| reason_code 사전 | 서버 코드 상수 | 클라이언트는 완성된 문구만 봄 |
| 사용자 집계 통계 | Supabase (별도 뷰) | 관리자만 |

### 🟡 서비스 키 (Class K · Keys)
절대 클라이언트 코드나 저장소에 X.

**Supabase · 새 키 시스템 채택** (레거시 anon/service_role은 2026말까지 마이그레이션)
- `SUPABASE_PUBLISHABLE_KEY` · 클라이언트 · 공개 가능 (RLS로 보호)
- `SUPABASE_SECRET_KEY` · 서버 전용 · RLS 우회

**기타**
- `GEMINI_API_KEY` · Vercel env vars만 · 서버 전용
- `NCP_API_KEY_ID` / `NCP_API_KEY` · Vercel env vars만
- `KAKAO_REST_API_KEY` · Vercel env vars만

**GitHub에 commit 금지.** `.gitignore` 필수.

### 🔵 프롬프트 (Class P · Prompts)
**코드 하드코딩 X · 별도 파일 or DB로 버전 관리.**

```
서버 파일: /server/prompts/recommend-copy-v1.txt
DB 테이블: internal_prompts (server-only)
```

**이유**
- 프롬프트도 A/B 테스트 대상 · `prompt_version` 필수
- "같은 엔진에 프롬프트만 바꿔서 수락률 어떻게 바뀌는지" 실험 가능
- 프롬프트 자체가 노하우 · 유출 시 복제 쉬워짐

### 🟢 클라이언트에 있어도 되는 것 (Class C · Client-OK)
유출돼도 사업에 지장 X.

- UI 코드 · CSS · 이미지
- 화면 상태 · 애니메이션
- 완성된 추천 결과 텍스트
- 본인 식사 기록·프로필 (RLS로 본인만)
- `SUPABASE_PUBLISHABLE_KEY` (공개 · RLS로 보호)

---

## 2. 아키텍처 규칙

### 절대 이렇게 하면 안 됨 (Anti-pattern)

```javascript
// ❌ 클라이언트에서 Gemini 직접 호출
fetch('https://generativelanguage.googleapis.com/v1beta/...?key=' + GEMINI_KEY)

// ❌ 클라이언트에서 food_menu_v2 직접 조회
const foods = await supabase.from('food_menu_v2').select('*')

// ❌ 클라이언트에서 점수 계산
const score = protein * 0.45 + taste * 0.30 + ...

// ❌ 클라이언트에서 프롬프트 조합
const prompt = "너는 음식 큐레이터다..."
```

### 올바른 구조

```javascript
// ✅ 클라이언트는 요청만
const res = await fetch('/api/recommend-next', { method: 'POST', ... })
const { primary, alternatives } = await res.json()
// 여기서 받은 결과만 화면에 렌더

// ✅ 서버가 모든 무거운 일 (숨겨져 있음)
// /api/recommend-next.js
//   1. Supabase service_role로 food_menu_v2 접근
//   2. Rule Engine 실행 (점수 계산)
//   3. Gemini 호출 (프롬프트 · API key 서버에만)
//   4. 결과만 반환
```

---

## 3. Supabase RLS 정책

### 클라이언트가 직접 접근 가능한 테이블
| 테이블 | 접근 |
|---|---|
| `food_history` | 본인 것만 (RLS) |
| `user_preference` | 본인 것만 (RLS) |
| `user_profile` | 본인 것만 (RLS) |

### 클라이언트가 절대 접근 못 하는 테이블 (Class S)
| 테이블 | 정책 |
|---|---|
| `food_menu_v2` | 모든 client role 차단 · service_role만 |
| `recommendation_log` (읽기) | 본인 것만 (RLS) · 하지만 API가 대신 씀 |
| `recommendation_feedback` | 본인 것만 (RLS) |

### 검증 방법 (배포 전 필수)
`schema/000_verify_access.sql` 실행. 3가지 role로 접근 테스트:

| Role | food_menu_v2 SELECT | rec_log INSERT | rec_log SELECT |
|---|---|---|---|
| `anon` | ❌ 0 rows | ❌ 실패 | ❌ 0 rows |
| `authenticated` | ❌ 0 rows | ❌ 실패 | ✅ 본인 것만 |
| `secret key` | ✅ 전체 | ✅ 성공 | ✅ 전체 |

**중요**: Supabase 문서상 GRANT가 먼저 평가되고 RLS는 그다음. `REVOKE ALL FROM anon`을 한 상태에서도 secret key는 postgres role이라 접근 가능. 하지만 반드시 배포 전 실제 테스트로 확인.

### ⚠️ ALTER DEFAULT PRIVILEGES 정책
`001_food_menu_v2.sql`의 다음 명령은 **프로젝트 전체 정책**:
```sql
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL FROM anon;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL FROM authenticated;
```
- 앞으로 `public` 스키마에 만드는 모든 새 테이블 = 기본 deny
- 공개 테이블이 필요하면 **명시적으로 GRANT** (`GRANT SELECT ON table TO anon;`)
- 다른 개발자가 "왜 접근이 안 되지?" 헷갈릴 수 있음 · 팀 문서에 반드시 기록

---

## 4. Gemini API 사용 규칙

**모든 Gemini 호출은 서버(Vercel /api/*)에서.**

```
클라이언트 (앱)
    ↓
건강어때 API (/api/*)
    ↓  [GEMINI_API_KEY 여기서만]
Gemini API
    ↓
건강어때 API (응답 파싱·검증)
    ↓
클라이언트 (완성된 문구만)
```

### 프롬프트 보호 · 버전 관리
- 프롬프트는 **서버 전용 파일** (`/server/prompts/recommend-copy-v1.txt`) 또는 **DB internal_prompts 테이블**
- 코드에 하드코딩 X · `prompt_version` 필수
- 클라이언트에서 절대 조합 X
- A/B 실험 기반 · "같은 엔진에 프롬프트만 바꾸면 어떻게 변하는지" 확인용

```typescript
// 서버 코드에서 로드
const promptTemplate = await loadPrompt('recommend-copy-v1');
const filled = fillTemplate(promptTemplate, { food, reasons });
// recommendation_log.prompt_version = 'recommend-copy-v1' 저장
```

### 응답 후처리 필수
- Gemini 응답을 그대로 클라이언트에 전달 X
- JSON 파싱 · 검증 · 필요 필드만 추출 후 전달

---

## 5. 클라이언트 코드 원칙

### index.html에서 하면 안 되는 것
```javascript
// ❌ 있으면 안 됨
const KOREAN_FOOD_DB = { ... 200개 ... }
const scoringWeights = { nutrition: 0.45, taste: 0.30, ... }
const geminiPrompt = "너는 음식 큐레이터다..."
```

### 마이그레이션 계획
기존 `index.html`의 `KOREAN_FOOD_DB` 200개 노출 상태 → 단계적 제거:
1. **Phase 3 완료 후**: 추천 관련 로직에서 KOREAN_FOOD_DB 사용 제거
2. **Phase 5 완료 후**: 분석 결과 페이지도 서버 API 통해서만
3. **최종**: 클라이언트에는 fallback용 소수(~20개)만 · 나머지 서버

**당장 지금 KOREAN_FOOD_DB 지울 필요 X** · 기존 기능이 씀 · 단, **추천 로직은 처음부터 서버에**.

---

## 6. 법적 보호 (병행)

기술적 방어와 별개로:

| 항목 | 방법 |
|---|---|
| 앱 이름 "건강어때" | 상표 등록 |
| 로고 | 상표 + 저작권 |
| 독창적 UI 요소 | 디자인권 검토 |
| 소스코드 | GitHub Private + 저작권 |
| 추천 알고리즘·큐레이션 | **영업비밀 관리** |

### 영업비밀 관리 조건
- 실제로 비밀로 관리 (공개 저장소 X)
- 접근 제한 (팀원 최소화)
- NDA 필요 시
- 문서에 "영업비밀" 표시

---

## 7. Moat 원칙

> **Moat는 사용자 수가 아니라, 추천 → 반응 → 실제 식사로 연결된 고품질 피드백 데이터의 축적으로 정의한다.**

100만 개의 쓰레기 로그보다 5만 개의 정확한 **추천-실제식사 매칭 데이터**가 훨씬 가치 있음.

### 진짜 자산 · 우선순위
1. **추천 → 실제 식사 일치 데이터** (최상위)
   - `recommendation_log` + `food_history` 매칭
   - "이 추천을 실제로 먹었는가"
2. **정확한 피드백 이유** (상위)
   - `skip_reason` 분포 · 왜 별로였는지
   - `dislike` 신호
3. **큐레이션 DB 품질** (상위)
   - `nutrition_verified=true` 비율
   - `serving_confidence='measured'` 비율
4. **개인 취향 학습** (중간)
   - `user_preference` 축적
   - `frequently_eaten` 정확도

### 로그 필드 필수
초기부터 남길 것:
- `engine_version` · A/B
- `menu_version` · DB 버전
- `prompt_version` · 프롬프트 버전
- `reason_codes` · 실제 선정 근거
- `actual_food_id` · 실제 먹은 것 (consumed)

### 나쁜 Moat 지표 (경계)
- 단순 사용자 수 (활성도 없으면 쓰레기)
- 총 로그 개수 (품질 없으면 쓰레기)
- MAU/DAU (수락률·일치율 없으면 표면적 지표)

**핵심**: 100명이라도 90% 일치율이 1만명 5% 일치율보다 가치 있음.

---

## 8. 정기 감사 체크리스트

**월 1회 확인:**
- [ ] `.env.example`에 실제 키가 안 들어갔는지
- [ ] Git 히스토리에 API 키 노출 없는지 (`git secrets` 등)
- [ ] Supabase RLS 정책 여전히 유효한지
- [ ] 새 API 엔드포인트가 Gemini 키를 노출 안 하는지
- [ ] 클라이언트 코드에 점수식·프롬프트 안 들어갔는지

**분기 1회:**
- [ ] 취약점 스캔 (Snyk · npm audit)
- [ ] Supabase 로그 이상 접근 확인
- [ ] Vercel env vars 접근 권한 재검토

---

## 9. 이 문서 개정 규칙

보안 원칙은 원칙적으로 **완화 방향은 신중히**.
새 서비스 추가 시 이 문서 먼저 업데이트 후 코드 작성.
