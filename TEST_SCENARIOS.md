# 🧪 추천 엔진 테스트 시나리오 · v0.1

> **이 문서가 추천 엔진의 회귀 테스트 기준서다.**
> 코드가 이 시나리오를 통과하지 못하면 배포하지 않는다.
> 알고리즘 변경 시 · 이 문서 먼저 · 코드는 나중.

관련 문서: [BRAIN.md](./BRAIN.md) · [RECOMMEND_ENGINE.md](./RECOMMEND_ENGINE.md)

---

## 원칙

### Top1 고정 금지
❌ "고등어구이가 반드시 Top1"
✅ "Top3 안에 생선 계열 최소 1"
✅ "최근 먹은 음식 X"
✅ "저녁 슬롯 가능한 것만"

**행동 규칙으로 검증한다.** 특정 음식으로 고정하면 알고리즘이 경직됨.

### 각 케이스 필수 명세
```
입력
├─ 최근 식사 (3-7끼 · 시각 포함)
├─ 취향 (좋음/싫음/알레르기)
├─ 식이 제한
├─ 시간대
└─ 부족 영양 (엔진이 계산)

기대 조건 (assertion)
├─ 반드시 포함되어야 할 것
├─ 반드시 제외되어야 할 것
└─ 허용 후보 범위

실패 조건
├─ 최근 먹은 음식 재추천
├─ 알레르기 포함
├─ 시간대 불일치
├─ 같은 유형만 Top3
└─ 영양 점수 무시
```

---

## 시나리오 구성 · 20개

| # | 그룹 | 케이스 |
|---|---|---|
| 1-5 | 정상 | 기본 추천 패턴 |
| 6-8 | 중복 회피 | 최근 음식 다양성 |
| 9-11 | 제외 | 싫어함·알레르기 |
| 12-14 | 영양 부족 우선 | 타겟 영양소 |
| 15-16 | 시간대 | 아침·야식 |
| 17-18 | 식이 제한 | 저염·저당 |
| 19-20 | 예외 | 필터 극단·신규 유저 |

---

## 정상 케이스 (1-5)

### CASE 01 · 저녁·평범한 직장인

```yaml
입력:
  최근 3끼:
    - 08:00 김밥 (아침)
    - 12:30 짜장면 (점심)
    - (저녁 아직)
  취향:
    liked_categories: []
    liked_methods: []
    frequently_eaten: []
    user_dislikes: []
  알레르기: []
  식이 제한: []
  시간대: dinner (19:00)
  프로필: 30대 남성

기대 조건:
  ✓ Top3 모두 dinner 슬롯 허용 (breakfast·snack 제외)
  ✓ Top3에 rice/noodle/main_dish 중 최소 2개 (다양성)
  ✓ 최근 24h 안 먹은 것만 (김밥·짜장면 없음)
  ✓ 반찬(side_dish)만으로 Top3 채워지지 않음

실패:
  ✗ 김밥이 다시 Top3에 나옴
  ✗ Top3 전부 side_dish
  ✗ 죽류(porridge) Top1
```

### CASE 02 · 아침·가벼운 것

```yaml
입력:
  최근 3끼: (어제 저녁 · 삼겹살 + 소주)
  취향: 없음
  알레르기: []
  식이 제한: []
  시간대: breakfast (07:30)

기대 조건:
  ✓ Top3 모두 fullness ≤ 2 (가벼움~보통)
  ✓ Top3에 kcal ≤ 500 인 것 최소 2개
  ✓ 매운 것(spicy_level ≥ 2) 제외
  ✓ breakfast 슬롯 허용된 것만

실패:
  ✗ 삼계탕·갈비탕 등 fullness 3
  ✗ 매운 음식
```

### CASE 03 · 점심·평범

```yaml
입력:
  최근 3끼:
    - 어제 저녁: 파스타
    - 오늘 아침: 시리얼
  취향: 없음
  알레르기: []
  시간대: lunch (12:30)

기대 조건:
  ✓ Top3 모두 lunch 허용
  ✓ 파스타 재추천 X
  ✓ 서양식만 Top3 채우지 않음 (다양성)

실패:
  ✗ 파스타 재추천
  ✗ 서양식(pasta·pizza·burger)만 3개
```

### CASE 04 · 저녁·고기 좋아함

```yaml
입력:
  최근 3끼:
    - 아침: 오트밀
    - 점심: 샐러드
    - (저녁)
  취향:
    liked_categories: ['main_dish']
    liked_methods: ['grill']
    frequently_eaten: [삼겹살, 스테이크, 갈비]
  시간대: dinner

기대 조건:
  ✓ Top3에 has_meat=true 최소 2개
  ✓ Top3에 method='grill' 최소 1개
  ✓ 취향 반영으로 점수 상위

실패:
  ✗ 취향 무시 (샐러드·과일 Top3)
  ✗ 이미 오늘 먹은 샐러드 재추천
```

### CASE 05 · 저녁·건강 지향

```yaml
입력:
  최근 3끼:
    - 아침: 계란 스크램블
    - 점심: 김밥
    - (저녁)
  취향:
    liked_categories: ['salad','main_dish']
    frequently_eaten: [고등어구이, 연어덮밥, 회덮밥, 나물비빔밥]
  시간대: dinner
  프로필: 30대 여성

기대 조건:
  ✓ Top3에 has_seafood=true 또는 has_vegetable=true 최소 2개
  ✓ 튀김·기름진 것 후순위
  ✓ 취향 매칭 점수 상위

실패:
  ✗ 부대찌개·삼겹살 Top1
  ✗ 튀김·프라이드 Top3
```

---

## 중복 회피 케이스 (6-8)

### CASE 06 · 최근 3끼 모두 면류

```yaml
입력:
  최근 3끼:
    - 짜장면
    - 라면
    - 우동
  시간대: dinner

기대 조건:
  ✓ Top3에 category='noodle' 0개 (완전 배제)
  ✓ Top3 카테고리 최소 2종

실패:
  ✗ 짬뽕·칼국수 등 면류가 Top3에 등장
```

### CASE 07 · 최근 3끼 모두 생선

```yaml
입력:
  최근 3끼:
    - 고등어구이
    - 연어덮밥
    - 회덮밥
  취향:
    liked_categories: ['main_dish']
  시간대: dinner

기대 조건:
  ✓ Top3에 has_seafood=true 최대 1개 (다양성)
  ✓ 다른 protein_source (chicken/pork/beef/tofu) 최소 1개
  ✓ 취향 있어도 다양성 우선

실패:
  ✗ Top3 전부 생선 요리
```

### CASE 08 · 최근 3끼 모두 튀김

```yaml
입력:
  최근 3끼:
    - 돈까스
    - 치킨
    - 튀김덮밥
  시간대: dinner

기대 조건:
  ✓ Top3에 method='fry' 최대 1개
  ✓ 조리법 다양성 (grill/stew/soup 중 최소 1)

실패:
  ✗ Top3 전부 fry
```

---

## 제외 케이스 (9-11)

### CASE 09 · 새우 알레르기

```yaml
입력:
  최근 3끼: 평범
  알레르기: ['shellfish']
  시간대: lunch

기대 조건:
  ✓ 어떤 후보에도 'shellfish' allergen 없음
  ✓ 새우·조개 요리 완전 제외
  ✓ Top3에 대체 protein 있음

실패:
  ✗ 새우볶음밥·해물탕 등이 Top3에 등장
```

### CASE 10 · 채식주의

```yaml
입력:
  식이 제한: ['채식']
  시간대: lunch

기대 조건:
  ✓ 모든 후보 vegan_compatible=true
  ✓ has_meat=true 완전 제외
  ✓ has_seafood=true 완전 제외
  ✓ 계란 함유 X
  ✓ 유제품 X

실패:
  ✗ 삼겹살·치킨·계란·요거트 등장
```

### CASE 11 · 김치 dislike 즉시 제외

```yaml
입력:
  user_dislikes: [김치_id, 김치찌개_id]
  시간대: dinner

기대 조건:
  ✓ Top3에 김치·김치찌개 없음 (영구 제외)
  ✓ 다른 후보로 Top3 채워짐

실패:
  ✗ 김치찌개가 Top3에 등장
  ✗ 3번 추천 후에도 재등장
```

---

## 영양 부족 우선 (12-14)

### CASE 12 · 단백질 심한 부족

```yaml
입력:
  최근 3끼: 밥·라면·과일 (탄수 위주)
  deficit (계산됨):
    protein: 70% 부족 (하루 70g 필요 · 20g만 섭취)
  시간대: dinner

기대 조건:
  ✓ Top3의 총 단백질 합계 > 60g (상위 3개 1인분 기준)
  ✓ Top1의 단백질 ≥ 25g
  ✓ 저단백 (밥·과일·빵) Top3에 X

실패:
  ✗ Top1이 단백질 10g 미만
  ✗ Top3 전부 저단백
```

### CASE 13 · 식이섬유 부족

```yaml
입력:
  최근 3끼: 라면·햄버거·피자
  deficit:
    fiber: 60% 부족
  시간대: dinner

기대 조건:
  ✓ Top3 중 has_vegetable=true 최소 2개
  ✓ 나물·샐러드·비빔밥 등 Top3 등장
  ✓ 순수 육류 요리 Top3에 최대 1개

실패:
  ✗ Top3 전부 육류·튀김
```

### CASE 14 · 비타민D 부족

```yaml
입력:
  최근 3끼: 밥·면·과일 (실내 위주)
  deficit:
    vitD: 심각 부족 (하루 10μg 중 2μg만)
  시간대: dinner

기대 조건:
  ✓ Top3에 vitD 강점 태그 있는 것 최소 1개
  ✓ 생선(연어·고등어) 또는 계란 요리 등장
  ✓ Top1의 nutrients_per_serving.vitD > 3μg

실패:
  ✗ Top3 전부 vitD 0 근처
```

---

## 시간대 (15-16)

### CASE 15 · 아침 07:00

```yaml
입력:
  최근 3끼: (어제 저녁 · 삼겹살)
  시간대: breakfast (07:00)

기대 조건:
  ✓ Top3 모두 slots에 'breakfast' 포함
  ✓ fullness ≤ 2 (가벼움·보통)
  ✓ spicy_level ≤ 1
  ✓ 삼겹살·갈비 등 무거운 것 제외

실패:
  ✗ 삼겹살·부대찌개 Top3에 등장
  ✗ 매운 음식
```

### CASE 16 · 야식 22:30

```yaml
입력:
  최근 3끼: 정상 3끼
  시간대: snack (22:30)

기대 조건:
  ✓ Top3 kcal 합계 낮음 (가벼운 것 우선)
  ✓ 무거운 정찬 (삼계탕·부대찌개) 제외
  ✓ 죽·과일·요거트 등 가벼운 옵션 등장

실패:
  ✗ 삼겹살·부대찌개 Top3
  ✗ Top1의 kcal > 800
```

---

## 식이 제한 (17-18)

### CASE 17 · 저염식

```yaml
입력:
  식이 제한: ['저염']
  시간대: lunch

기대 조건:
  ✓ Top3 모두 sodium_level ≠ 'high'
  ✓ Top3의 nutrients_per_serving.sodium < 800mg 각각
  ✓ 국물류·찌개류 대부분 제외 (해장국·부대찌개 등)

실패:
  ✗ 짬뽕·부대찌개·해장국 Top3
```

### CASE 18 · 저당식

```yaml
입력:
  식이 제한: ['저당']
  시간대: dinner

기대 조건:
  ✓ dessert 카테고리 완전 제외
  ✓ beverage 중 sugar 함유 제외
  ✓ 단맛 강한 것 후순위

실패:
  ✗ 케이크·아이스크림 Top3
```

---

## 예외 (19-20)

### CASE 19 · 필터 극단 · 후보 3개 미만

```yaml
입력:
  알레르기: ['gluten','dairy','egg','shellfish','nuts','soy']
  식이 제한: ['채식','저염']
  시간대: dinner
  최근 3끼: 채소 위주 3끼 (다양성 요구)

기대 조건:
  ✓ 시스템 에러 X · 반드시 응답
  ✓ 후보가 부족하면 Top3 대신 Top1 또는 Top2 반환 가능
  ✓ 응답에 fallback=true 플래그
  ✓ Gemini 설명에 "제한이 많아서" 언급 (사용자용)

실패:
  ✗ 500 에러
  ✗ 필터 무시하고 알레르기 음식 추천
  ✗ 빈 결과 (반드시 최소 1개 반환)
```

### CASE 20 · 신규 유저 · 데이터 없음

```yaml
입력:
  최근 3끼: (없음)
  취향: (없음)
  알레르기: []
  식이 제한: []
  시간대: dinner
  프로필: 없음

기대 조건:
  ✓ 시스템 에러 X · 반드시 응답
  ✓ Top3에 일반 인기 메뉴 (rice·main_dish·soup 등)
  ✓ 다양성 확보 (서로 다른 카테고리 3개)
  ✓ 극단적 매운·과다 칼로리 회피 (안전 옵션)
  ✓ reason_codes에 개인화 코드 없음 · GENERAL 코드만

실패:
  ✗ 데이터 없다고 에러
  ✗ Top3 모두 같은 카테고리
  ✗ Top3에 spicy_level=3 포함
```

---

## 실행 방법 (CLI)

```bash
# 각 케이스마다 하드코딩 입력 → Rule Engine → assertion 검증
node scripts/test_rule_engine.js

# 예상 출력:
#
# CASE 01 · 저녁·평범한 직장인
#   Top1: 순두부찌개 (78점)
#     nutrition: 40 / preference: 15 / diversity: 15 / timeslot: 8
#   Top2: 제육덮밥 (75점) ...
#   Top3: 비빔밥 (72점) ...
#   ✅ dinner 슬롯: OK
#   ✅ 최근 음식 X: OK
#   ✅ 다양성: 3 카테고리
#   ✅ side_dish only X: OK
#   PASS
#
# CASE 06 · 최근 3끼 모두 면류
#   Top1: 순두부찌개 (76점)
#   Top2: 삼계탕 (73점)
#   Top3: 회덮밥 (70점)
#   ✅ noodle 0개: OK
#   ✅ 카테고리 3종
#   PASS
```

---

## 통과 기준

- **20개 전부 PASS** → Rule Engine v0.1 배포 가능
- **1개라도 FAIL** → 알고리즘 수정 · 재검증
- **CASE 19, 20 (예외)**은 특히 중요 · 실제 서비스에서 항상 발생

---

## 회귀 테스트 규칙

**엔진·DB·프롬프트 버전 올릴 때마다 이 20개 모두 재실행.**

- `engine_version` 상승 → 20개 재실행 필수
- `menu_version` 상승 → 관련 케이스 재실행
- `prompt_version` 상승 → Gemini 응답 스팟 체크

**한 번이라도 FAIL한 케이스는 · 원인 분석 · 문서화 · 재확인 완료 전 배포 금지.**
