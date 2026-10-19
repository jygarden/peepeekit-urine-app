# 🩺 건강어때 (Geongangeottae) — Claude 인수인계 문서

새 Cowork 대화방에서 이 문서를 첫 메시지로 붙여넣기 하세요.

---

## 📋 프로젝트 개요

- **이름**: 건강어때 (Geongangeottae)
- **회사**: 에그닷 (허재율, 비개발자 창업자)
- **형태**: PWA (index.html) + Flutter WebView 앱 래퍼
- **배포**: Vercel Pro 플랜 (60초 maxDuration), GitHub 자동 연동
- **저장소**: https://github.com/jygarden/health-today-app
- **AI**: Gemini 2.5 Flash (`generativelanguage.googleapis.com`)

## 🗂 핵심 파일 구조

```
peepee_new/
├── index.html            (13,000+ lines · 앱 전체)
├── build.js              (Terser minify + assets 복사)
├── vercel.json
├── api/
│   ├── analyze-food.js         (식단 분석)
│   ├── analyze-ingredients.js  (성분 분석)
│   ├── analyze-urine.js        (소변검사)
│   ├── analyze-pet-food.js     (반려동물 사료 하이브리드)
│   └── _rateLimit.js
├── assets/guide/
│   ├── urine-strip.jpg   (소변검사 예시 사진 · 1:1 · 675×675)
│   └── food-tray.jpg     (식단 예시 사진 · 1126×900)
└── admin.html
```

## 🎯 앱 방향 (최종 결정)

- **통합 앱** (분리 X) · **본인 + 반려동물** 2컨텍스트
- **아이(kid) 프로필**: UI에서 완전히 숨김 (데이터는 보존)
- **필라이즈 벤치마킹** — 인체는 그들이 점령했으니 **반려동물 식단**을 주 승부처로

## ✅ 최근 완료 작업 (Task #156까지)

### 최근 큰 변경사항
- **사주 기반 건강 추천** — Fortune 화면에 🎋 사주 카드 추가
  - `_getDayGanjiIndex`, `_getDayStem`, `_getSajuHealthAdvice` (index.html)
  - 60갑자 근사식 (기준: 1900-01-01 = 갑술일)
  - 오행(목·화·토·금·수) → 오장 매핑
  - 상생·상극 → 4단계 조언 (best/good/neutral/warn)
  - Fortune 캐시 v4 → **v5** (사주 필드 추가로 강제 무효화)
- **반려동물 사료 하이브리드 인식**
  - `analyze-pet-food.js` 프롬프트: OCR → 제품인식 → 부분 → 실패 4단계
  - 결과에 `source` + `confidence` 필드 추가
  - UI 가이드: "2가지 방법" (원재료명 권장 / 앞면 AI 인식)
  - 결과 화면 상단에 인식 방식 배지
- **가족 프로필 편집에 생년월일 3필드** (성인 타입 · 사주용)
  - `apBirthYear/Month/Day` 인풋
  - v2 프로필과 양방향 동기화
- **4개 촬영 가이드 필라이즈 스타일 강화**
  - 인체 소변검사, 반려 소변검사, 인체 식단, 반려동물 사료
  - 각각 히어로 카드 + 3개 벤치 칩 + 개인정보 안심 배지
  - 반려동물 사료는 특별 강화 (원재료명 라벨 예시, 독성 4종 시각화, 결과 리포트 미리보기)
- **가이드 사진 정리** — urine-strip 1:1 크롭 (손 아래), food-tray 180° 회전

### 그 외 이번 세션 이전 완료
- 프로필 v2 시스템 (개인 프로필 · 생년월일 · 키·몸무게)
- 영양제 관리 (룰 DB 50개 성분 × 8개 시간대)
- 오늘의 운세 (띠 + 6지표 + 상황별 quote 생성)
- 오늘의 상식, 건강 퀴즈 (130+ 문제)
- 인스타 스토리 공유 (Flutter Method Channel · shareToInstagramStory)
- Rate Limiting, Terser 난독화

## 🔧 주요 함수·컴포넌트

- `getPersonalProfile()` — v2 회원가입 프로필
- `getFamilyProfiles()` — Me + Pet 가족 프로필
- `getVisibleProfiles()` — kid 필터링
- `getTodayFortune()` — 오늘의 운세 (사주 포함)
- `getSajuHealth(y,m,mode)` — 소변검사 사주 조언 (기존 · 년+월)
- `_getSajuHealthAdvice(myStem, todayStem)` — Fortune용 사주 (신규 · 일주 오행)
- `enterHuman() / enterPet() / enterFood() / enterIngredient() / enterPetFood()` — 홈 카드 진입
- `openFortune() / openFortuneResult()` — 운세

## 🎨 브랜드 컬러 (Sage Green 계열)

- Primary: `#059669` (초록 · 인체 소변검사 · 반려동물 사료)
- Orange: `#EA580C` (식단 분석)
- Purple: `#8B5CF6` (성분 분석)
- Yellow: `#FEF3C7 → #FCE7F3` (오늘의 운세 그라디언트)

## 🚀 배포 프로세스

1. 로컬에서 `index.html` 등 수정
2. `node build.js` 로컬 빌드 검증
3. GitHub 웹 UI에서 파일 업로드 (터미널 push 인증 안 됨)
4. Vercel 자동 배포

## 📌 다음 스텝 (Pending)

1. **홈 화면 대규모 리팩토링** — "오늘의 할 일 1개" 히어로 + 컨디션 체크 + 라이프 탭
2. **온보딩 페르소나 선택** (본인만 / 본인+반려동물 등)
3. **Flutter Local Notification** — 영양제 리마인더
4. **알레르기 크로스체크 통합** — familyAllergies 기반
5. **사주 정확도 개선** — 만세력 라이브러리 통합 (현재는 근사식)

## ⚠️ 알려진 제약

- Git repo가 사용자 홈 디렉토리(`/Users/jinyoungchoi`)에 잘못 초기화됨. 지금 상태로 운영 가능하니 그대로 둠
- GitHub push 인증 안 됨 → 웹 UI 업로드 방식으로 진행 중
- 사주 계산은 근사식 (정밀 만세력 아님)

## 💬 대화 톤

- 사용자는 **비개발자 한국인 창업자**. 기술 용어는 최소화, 결정 이유를 짧게 설명
- 자주 쓰는 인터랙션 패턴: "옹옹" = 진행 OK, "가자 진행시켜~" = 승인
- 이모지 캐주얼 사용 O · 결과물 사진 자주 요청함
- **간결·직설** 스타일 (user_preferences)

---

**새 대화 시작 시 첫 인사말 예시:**
> "건강어때 앱 작업 이어서 하자. 인수인계 문서는 CLAUDE_HANDOFF.md에 있어. 
> 다음 스텝은 홈 화면 대규모 리팩토링이야."
