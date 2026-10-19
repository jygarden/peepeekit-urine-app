#!/usr/bin/env node
// 🔄 KOREAN_FOOD_DB → food_menu_v2 마이그레이션
// 실행: node scripts/migrate_food_db_v2.js
// 결과: schema/003_food_menu_seed.sql (INSERT문)
//
// 원칙:
// - 1인분 기준 필수
// - 카테고리·시간대·조리법 자동 추정 (초기 시드용 · 수동 검증 필요)
// - nutrients_per_serving = nutrients_per_100g * (serving_size / 100)

const fs = require('fs');
const path = require('path');

// ─────────────────────────────────────────────────────────
// 1. index.html에서 KOREAN_FOOD_DB 파싱
// ─────────────────────────────────────────────────────────
const INDEX_PATH = path.join(__dirname, '..', 'index.html');
const OUTPUT_PATH = path.join(__dirname, '..', 'schema', '003_food_menu_seed.sql');
const JSON_OUTPUT = path.join(__dirname, '..', 'data', 'food_menu_v2.json');

const html = fs.readFileSync(INDEX_PATH, 'utf8');

// KOREAN_FOOD_DB 블록 추출 (정규식 · const KOREAN_FOOD_DB = { ... };)
const dbStart = html.indexOf('const KOREAN_FOOD_DB = {');
if (dbStart < 0) throw new Error('KOREAN_FOOD_DB not found');

// 중괄호 매칭으로 끝 찾기
let depth = 0, dbEnd = -1;
for (let i = dbStart + 'const KOREAN_FOOD_DB = '.length; i < html.length; i++) {
  const c = html[i];
  if (c === '{') depth++;
  else if (c === '}') {
    depth--;
    if (depth === 0) { dbEnd = i + 1; break; }
  }
}
if (dbEnd < 0) throw new Error('KOREAN_FOOD_DB end not found');

const dbCode = html.slice(dbStart, dbEnd + 1); // + ';'
const codeToEval = dbCode.replace(/^const /, 'globalThis.__KFD = ') + ';';
eval(codeToEval);
const KFD = globalThis.__KFD;

console.log(`✅ KOREAN_FOOD_DB 파싱: ${Object.keys(KFD).length}개 항목`);

// ─────────────────────────────────────────────────────────
// 2. 태그 추정 사전
// ─────────────────────────────────────────────────────────

// 카테고리 = 음식 형태/역할 (재료 X · 재료는 protein_source·has_* 사용)
// 음식 카테고리 taxonomy (재료 분류와 분리):
//   rice, noodle, soup, stew, main_dish, side_dish, salad,
//   porridge, bread, snack, dessert, beverage, fruit, dairy
function guessCategory(name, tags = []) {
  const n = name.replace(/\s+/g, '');

  // 죽·미음 · 특수 카테고리
  if (/죽$|미음$|포리지|오트밀/.test(n)) return 'porridge';

  // 찌개·전골 = stew (국물 있는 볶음)
  if (/찌개$|전골$|샤브샤브/.test(n)) return 'stew';

  // 국·탕 = soup (맑은 국물)
  if (/국$|탕$|해장|국밥$/.test(n)) return 'soup';

  // 면류
  if (/면$|국수$|파스타|우동|칼국수|냉면|막국수|짜장|짬뽕|라면|쌀국수|스파게티|만두|딤섬|교자|찐빵/.test(n)) return 'noodle';

  // 밥류 (덮밥·비빔밥·볶음밥·초밥·김밥)
  if (/밥$|덮밥|비빔밥|볶음밥|주먹밥|초밥|김밥|롤$/.test(n)) return 'rice';

  // 회 · 사시미 · 회덮밥 아닌 순수 회
  if (/회$(?!덮)|사시미/.test(n)) return 'main_dish';

  // side_dish = 반찬·김치·나물·조미김
  if (/김치$|무침|나물$|장아찌|겉절이|조미김|김$|반찬|피클/.test(n)) return 'side_dish';

  // 샐러드·포케
  if (/샐러드|포케|월남쌈|샐러드볼/.test(n)) return 'salad';

  // 분식류 · 떡볶이 등
  if (/떡볶이|순대|어묵|오뎅|꼬치|튀김$/.test(n)) return 'snack';

  // 빵류
  if (/피자|버거|햄버거|샌드위치|토스트|와플|랩$|타코|부리또|베이글|크로와상|바게트|빵$/.test(n)) return 'bread';

  // 디저트
  if (/케이크|쿠키|마카롱|디저트|아이스크림|파이|타르트|푸딩|초콜릿/.test(n)) return 'dessert';

  // 음료
  if (/커피|아메리카노|라떼|카푸치노|스무디|주스|버블티|밀크티|음료|콜라|사이다|우유|두유|차$/.test(n)) return 'beverage';

  // 과일
  if (/바나나|사과$|귤$|블루베리|딸기|과일|오렌지|키위|망고|수박|참외/.test(n)) return 'fruit';

  // 유제품
  if (/요거트|치즈$/.test(n)) return 'dairy';

  // 견과류·간식
  if (/견과|아몬드|호두|피스타치오|땅콩|캐슈넛/.test(n)) return 'snack';

  // 메인 요리 (고기·생선·계란 요리 · 반찬 아닌 것)
  //  - 삼겹·갈비·불고기·제육·스테이크·구이·볶음·조림·찜 등
  if (/생선구이|고등어|연어|장어|삼치|갈치|조기|명태|알탕|아구|카츠|돈까스|튀김/.test(n)) return 'main_dish';
  if (/오징어|낙지|쭈꾸미|새우|조개|굴|홍합|전복/.test(n)) return 'main_dish';
  if (/삼겹|목살|갈비|불고기|제육|소고기|등심|안심|스테이크|육회/.test(n)) return 'main_dish';
  if (/닭|치킨|프라이드|양념|삼계|백숙|닭갈비/.test(n)) return 'main_dish';
  if (/계란|달걀|오믈렛|스크램블|프리타타/.test(n)) return 'main_dish';

  // 태그 기반 폴백
  if (tags.some(t => /단백질/.test(t))) return 'main_dish';
  if (tags.some(t => /탄수화물/.test(t))) return 'rice';
  return 'rice'; // default
}

function guessCuisine(name) {
  const n = name.replace(/\s+/g, '');
  if (/초밥|스시|사시미|우동|라멘|덮밥|돈까스|규동|미소|낫토|다코야끼|오코노미|일본/.test(n)) return 'japanese';
  if (/짜장|짬뽕|탕수육|마파|딤섬|만두|중국|양장피|라조기|팔보채/.test(n)) return 'chinese';
  if (/피자|파스타|스테이크|리조또|샌드위치|버거|햄버거|프렌치|이탈리안|샐러드|스프|수프|스팀|스테이/.test(n)) return 'western';
  if (/쌀국수|팟타이|월남쌈|반미|커리|카레(?!우동)|나시고랭|톰얌/.test(n)) return 'southeast_asian';
  if (/커피|아메리카노|라떼|카푸치노|케이크|쿠키|마카롱|디저트|아이스크림|와플|토스트|크로와상|베이글|스무디|주스|밀크티|버블티/.test(n)) return 'cafe';
  return 'korean';
}

function guessMethod(name) {
  const n = name.replace(/\s+/g, '');
  if (/구이/.test(n)) return 'grill';
  if (/튀김|튀긴|프라이드|카츠|돈까스/.test(n)) return 'fry';
  if (/찜$|찐/.test(n)) return 'steam';
  if (/볶음|볶은/.test(n)) return 'stir_fry';
  if (/조림$|조린/.test(n)) return 'stew';
  if (/찌개$|전골$/.test(n)) return 'stew';
  if (/국$|탕$|스프|수프/.test(n)) return 'soup';
  if (/회$|사시미|생/.test(n)) return 'raw';
  if (/오븐|베이크|굽/.test(n)) return 'bake';
  if (/삶은|끓인/.test(n)) return 'boil';
  if (/로스트/.test(n)) return 'roast';
  return null;
}

function guessSlots(name, category) {
  // 🟡 BUG-C fix · 한국 아침 문화 반영 (국+밥+반찬) + snack 확대
  const n = name.replace(/\s+/g, '');
  const slots = [];

  // 아침 · 서양식 + 죽/토스트/계란/과일
  if (/죽$|미음|시리얼|오트밀|토스트|샌드위치|샐러드|요거트|과일|계란|스크램블|오믈렛|커피|주스|스무디|우유|두유|빵|베이글|크로와상|크루아상/.test(n)) {
    slots.push('breakfast');
  }
  // 아침 · 한식 국류 (미역국·된장국·계란국·콩나물국 등)
  if (category === 'soup' && !/삼계탕|육개장|해장국|설렁탕|갈비탕|추어탕/.test(n)) {
    slots.push('breakfast');
  }
  // 아침 · 한식 간단한 밥 (김밥·주먹밥·볶음밥·죽 종류)
  if (category === 'rice' && /김밥|주먹밥|볶음밥|덮밥/.test(n)) {
    slots.push('breakfast');
  }
  if (category === 'porridge') slots.push('breakfast');
  // 아침 · 가벼운 반찬
  if (category === 'side_dish' && /계란|나물|김|무침/.test(n)) slots.push('breakfast');

  // 점심/저녁 대부분
  if (!/커피|디저트|케이크|아이스크림|음료|주스|스무디|과일$|견과/.test(n)) {
    slots.push('lunch', 'dinner');
  }

  // 야식(snack) · 가벼운 것 + 스낵/디저트/음료/과일/유제품
  if (['snack','dessert','beverage','fruit','dairy'].includes(category)) slots.push('snack');
  if (category === 'noodle' && /라면|우동|메밀|잔치국수|칼국수/.test(n)) slots.push('snack');
  if (category === 'porridge') slots.push('snack');
  if (category === 'soup' && /계란|미역|콩나물|어묵/.test(n)) slots.push('snack');
  if (category === 'rice' && /주먹밥|김밥/.test(n)) slots.push('snack');
  // 저녁 후 배고플 때 · 견과·과일·요거트
  if (/견과|아몬드|호두|피스타치오|땅콩|캐슈넛|요거트|바나나|사과/.test(n)) slots.push('snack');

  return [...new Set(slots)];
}

function guessPrimarySlot(name, slots) {
  const n = name.replace(/\s+/g, '');
  if (slots.includes('breakfast') && /죽|시리얼|오트밀|토스트|계란|샐러드|과일|요거트|커피|주스/.test(n)) return 'breakfast';
  if (/삼겹|갈비|스테이크|찜|찌개|탕|국밥|장어/.test(n)) return 'dinner';
  if (/스낵|과자|디저트|음료|커피/.test(n)) return 'snack';
  return 'lunch';
}

// 1인분 크기 (그램)
function guessServingSize(name, category) {
  const n = name.replace(/\s+/g, '');
  // 국물류: 300g (국물 포함)
  if (category === 'soup') return 500;
  // 면·죽: 500g
  if (category === 'noodle') return 500;
  if (category === 'porridge') return 400;
  // 밥+반찬: 400g
  if (category === 'grain') return 400;
  // 고기·구이: 200g
  if (category === 'meat') return 200;
  // 생선: 150g
  if (category === 'seafood') return 180;
  // 샐러드: 300g
  if (category === 'vegetable') return 300;
  // 빵/피자/버거: 250g
  if (category === 'bread') return 250;
  // 계란: 100g
  if (category === 'egg') return 100;
  // 디저트: 100g
  if (category === 'dessert') return 100;
  // 음료: 300g (ml 근사)
  if (category === 'beverage') return 300;
  // 스낵: 100g
  if (category === 'snack') return 100;
  // 과일: 150g
  if (category === 'fruit') return 150;
  // 유제품: 200g
  if (category === 'dairy') return 200;
  // 튀김: 150g
  if (category === 'fried') return 150;
  return 250;
}

function guessServingLabel(name, category) {
  const n = name.replace(/\s+/g, '');
  if (category === 'soup' || category === 'noodle' || category === 'porridge') return '한 그릇';
  if (category === 'grain') return '한 공기';
  if (category === 'beverage') return '한 잔';
  if (category === 'dessert') return '한 조각';
  if (category === 'bread') return '1인분';
  if (category === 'fruit') return '한 개';
  return '1인분';
}

function guessProteinSource(name, category) {
  const n = name.replace(/\s+/g, '');
  if (/생선|고등어|연어|장어|삼치|갈치|참치|명태|조기|가자미/.test(n)) return 'fish';
  if (/오징어|낙지|새우|조개|굴|홍합|전복|문어|가재|게|랍스터/.test(n)) return 'shellfish';
  if (/치킨|닭|삼계|백숙|닭갈비/.test(n)) return 'chicken';
  if (/삼겹|목살|제육|돼지|포크|햄|베이컨|소시지/.test(n)) return 'pork';
  if (/소고기|불고기|갈비|스테이크|육회|우육|등심|안심|양지|차돌/.test(n)) return 'beef';
  if (/두부|유부/.test(n)) return 'tofu';
  if (/계란|달걀|오믈렛|스크램블/.test(n)) return 'egg';
  if (/콩|렌틸|병아리콩/.test(n)) return 'legume';
  if (category === 'seafood') return 'fish';
  if (category === 'meat') return 'chicken'; // 기본
  if (category === 'egg') return 'egg';
  return 'none';
}

function guessSpicy(name) {
  const n = name.replace(/\s+/g, '');
  if (/매운|매콤|불닭|땡초|청양|김치찌개|낙지볶음|제육|고추장|고춧가루|매콤달콤/.test(n)) return 2;
  if (/육개장|짬뽕|아구찜|낙지|해장국|김치볶음밥|떡볶이/.test(n)) return 3;
  return 0;
}

function guessFullness(name, category, kcal) {
  if (kcal >= 700) return 3;
  if (kcal >= 400) return 2;
  return 1;
}

function guessAllergens(name, category, proteinSource) {
  const n = name.replace(/\s+/g, '');
  const allergens = [];
  // 곡물 대부분 gluten
  if (/면$|국수|파스타|우동|칼국수|짜장|짬뽕|피자|버거|빵|토스트|샌드위치|만두|튀김|카츠|돈까스|와플|케이크|쿠키|베이글|크로와상|바게트/.test(n)) {
    allergens.push('gluten');
  }
  if (proteinSource === 'fish') allergens.push('fish');
  if (proteinSource === 'shellfish') allergens.push('shellfish');
  if (proteinSource === 'egg' || /계란|달걀/.test(n)) allergens.push('egg');
  if (/우유|치즈|요거트|버터|크림|라떼|카푸치노|아이스크림|밀크|피자/.test(n)) allergens.push('dairy');
  if (/땅콩|아몬드|호두|캐슈|잣|피스타치오/.test(n)) allergens.push('nuts');
  if (/두부|콩국수|콩|두유|된장|간장|고추장/.test(n)) allergens.push('soy');
  return [...new Set(allergens)];
}

function guessSodiumLevel(sodium) {
  if (sodium == null) return 'medium';
  if (sodium < 400) return 'low';
  if (sodium < 1200) return 'medium';
  return 'high';
}

function guessVeganCompatible(name, proteinSource, allergens, category) {
  // 🟡 BUG-B fix · 한국 음식은 대부분 육수(멸치·사골)로 시작 · 기본 non-vegan
  // 명시적으로 채식 가능한 것만 true (whitelist 전략)
  const n = name.replace(/\s+/g, '');

  // 명시적 제외 (동물성)
  if (['fish','shellfish','chicken','pork','beef','egg'].includes(proteinSource)) return false;
  if (allergens.some(a => ['dairy','egg','fish','shellfish'].includes(a))) return false;
  if (/고기|치킨|닭|생선|계란|달걀|우유|치즈|요거트|버터|크림|어묵|햄|소시지|베이컨|참치|연어|장어|굴|조개|새우|오징어|낙지|문어|육수|사골|멸치|가다랑어|황태|꽁치|고등어/.test(n)) return false;

  // 국물류 · 대부분 육수 · 명시적 채식 표기 없으면 non-vegan
  if (['soup','stew'].includes(category)) {
    if (/채식|비건|시금치된장|버섯된장|들깨미역|콩나물|열무|시래기/.test(n)) return true;
    return false;
  }

  // 밥/면류 · 반찬으로 고기·해물 가능성 높음 · 순수 채식 표기만 true
  if (['rice','noodle'].includes(category)) {
    if (/나물|채소|비건|콩국수|들기름|김밥.*채소|샐러드/.test(n)) return true;
    return false;
  }

  // 나머지 · 채소·과일·견과·두부는 기본 vegan
  if (['fruit','vegetable','salad'].includes(category)) return true;
  if (proteinSource === 'tofu' && !/찌개|국|탕|전골/.test(n)) return true;
  if (proteinSource === 'legume') return true;

  // 그 외는 안전하게 false
  return false;
}

function guessStrengths(nutrients) {
  const s = [];
  if ((nutrients.protein || 0) >= 20) s.push('단백질');
  if ((nutrients.fiber || 0) >= 5) s.push('식이섬유');
  if ((nutrients.omega3 || 0) >= 400) s.push('오메가3');
  if ((nutrients.vitD || 0) >= 2) s.push('비타민D');
  if ((nutrients.vitC || 0) >= 30) s.push('비타민C');
  if ((nutrients.calcium || 0) >= 200) s.push('칼슘');
  if ((nutrients.iron || 0) >= 3) s.push('철분');
  if ((nutrients.magnesium || 0) >= 80) s.push('마그네슘');
  return s;
}

function guessKeywords(name, category, fullness) {
  const n = name.replace(/\s+/g, '');
  const k = [];
  if (category === 'soup' || category === 'noodle') k.push('따뜻함');
  if (fullness >= 3) k.push('든든함');
  if (fullness === 1) k.push('가벼움');
  if (category === 'vegetable') k.push('신선함');
  if (category === 'seafood') k.push('바다');
  if (category === 'beverage' || category === 'dessert') k.push('여유');
  if (/매운|매콤/.test(n)) k.push('매콤함');
  return k;
}

// ─────────────────────────────────────────────────────────
// 3. 각 음식을 v2 스키마로 변환
// ─────────────────────────────────────────────────────────

function normalizeNutrients(raw) {
  // KOREAN_FOOD_DB → 표준 키 (vitaminD로 통일)
  return {
    kcal:      raw.kcal      || 0,
    protein:   raw.protein   || 0,
    carbs:     raw.carbs     || 0,
    fat:       raw.fat       || 0,
    fiber:     raw.fiber     || 0,
    sodium:    raw.sodium    || 0,
    calcium:   raw.calcium   || 0,
    iron:      raw.iron      || 0,
    magnesium: raw.magnesium || 0,
    zinc:      raw.zinc      || 0,
    vitA:      raw.vitA      || 0,
    vitC:      raw.vitC      || 0,
    vitD:      raw.vitD      || 0,
    vitB1:     raw.vitB1     || 0,
    omega3:    raw.omega3    || 0
  };
}

// 🔑 KOREAN_FOOD_DB 원본값 = 1인분 기준
// (원본 코드 5794줄 주석 확인: "성인 기준 · 1인분 기준 g/mg/μg")
// nutrients_per_serving = 원본값 그대로
// nutrients_per_100g = 원본값 ÷ serving_size_g × 100 (역산 · 참고용)
// serving_size_g는 카테고리 기반 추정 · serving_confidence='estimated'
function convertItem(name, raw) {
  // 원본은 1인분 기준
  const nutrients_per_serving = normalizeNutrients(raw);

  const category = guessCategory(name, raw.tags || []);
  const cuisine  = guessCuisine(name);
  const method   = guessMethod(name);
  const slots    = guessSlots(name, category);
  const primary_slot = guessPrimarySlot(name, slots);
  const serving_size_g = guessServingSize(name, category);
  const serving_label  = guessServingLabel(name, category);
  const protein_source = guessProteinSource(name, category);
  const spicy_level = guessSpicy(name);
  const fullness    = guessFullness(name, category, nutrients_per_serving.kcal);
  const allergens = guessAllergens(name, category, protein_source);
  const sodium_level = guessSodiumLevel(nutrients_per_serving.sodium);
  const vegan_compatible = guessVeganCompatible(name, protein_source, allergens, category);

  // 100g 기준 역산 (nutrients_per_serving / serving_size_g * 100)
  const factor = 100 / serving_size_g;
  const nutrients_per_100g = {};
  for (const k of Object.keys(nutrients_per_serving)) {
    nutrients_per_100g[k] = Math.round(nutrients_per_serving[k] * factor * 10) / 10;
  }

  const strengths = guessStrengths(nutrients_per_serving);
  const keywords  = guessKeywords(name, category, fullness);

  // 🔍 이상치 탐지 · needs_review = "아직 데이터가 의심스럽다"
  // 자연스러운 저칼로리(반찬·과일·음료)는 needs_review 대상 아님
  const review_reasons = [];
  const s = nutrients_per_serving;
  const naturallyLowKcal = ['side_dish','beverage','fruit','snack'].includes(category);

  if (!serving_size_g || serving_size_g <= 0)         review_reasons.push('NO_SERVING_SIZE');
  if ((s.kcal || 0) > 1800)                            review_reasons.push('HIGH_KCAL_PER_SERVING');
  if ((s.kcal || 0) < 30 && !naturallyLowKcal)         review_reasons.push('LOW_KCAL_PER_SERVING');
  if ((s.sodium || 0) > 4000)                          review_reasons.push('HIGH_SODIUM');
  if ((s.protein || 0) > 150)                          review_reasons.push('HIGH_PROTEIN');
  if ((s.fat || 0) > 150)                              review_reasons.push('HIGH_FAT');
  if ((s.carbs || 0) > 300)                            review_reasons.push('HIGH_CARBS');
  if ((nutrients_per_100g.kcal || 0) > 900)            review_reasons.push('HIGH_KCAL_PER_100G');
  if ((nutrients_per_100g.kcal || 0) < 20 && !naturallyLowKcal) review_reasons.push('LOW_KCAL_PER_100G');

  const needs_review = review_reasons.length > 0;

  return {
    name,
    category,
    cuisine,
    slots,
    primary_slot,
    method,
    spicy_level,
    fullness,
    protein_source,
    has_vegetable: /채소|나물|샐러드|김치|양파|당근|시금치|브로콜리|파|버섯/.test(name),
    has_meat:      /고기|삼겹|불고기|제육|스테이크|치킨|닭|삼계|육개장|국밥|해장국|설렁탕|갈비|목살|안심|등심|양지|차돌/.test(name),
    has_seafood:   /생선|고등어|연어|장어|오징어|낙지|새우|조개|굴|홍합|전복|참치|명태|알탕|미역|다시마|어묵|초밥|회$/.test(name),
    serving_size_g,
    serving_label,
    serving_confidence: 'estimated',       // 모두 카테고리 기반 추정
    nutrients_per_100g,
    nutrients_per_serving,
    nutrition_source_basis: 'serving',     // 원본이 1인분 기준
    nutrition_source:       'KOREAN_FOOD_DB',
    nutrition_verified:     false,
    nutrition_review_note:  needs_review ? review_reasons.join(', ') : null,
    vegan_compatible,
    sodium_level,
    allergens,
    strengths,
    keywords,
    needs_review,
    review_reasons
  };
}

// ─────────────────────────────────────────────────────────
// 4. SQL INSERT 생성
// ─────────────────────────────────────────────────────────

function sqlValue(v) {
  if (v === null || v === undefined) return 'NULL';
  if (typeof v === 'boolean') return v.toString();
  if (typeof v === 'number') return v.toString();
  if (Array.isArray(v)) {
    if (v.length === 0) return `'{}'`;
    return `ARRAY[${v.map(x => `'${String(x).replace(/'/g, "''")}'`).join(',')}]`;
  }
  if (typeof v === 'object') return `'${JSON.stringify(v).replace(/'/g, "''")}'::jsonb`;
  return `'${String(v).replace(/'/g, "''")}'`;
}

const items = Object.entries(KFD).map(([name, raw]) => convertItem(name, raw));

const outLines = [
  '-- 🍱 food_menu_v2 · 초기 시드 (KOREAN_FOOD_DB → v2)',
  '-- 자동 생성: scripts/migrate_food_db_v2.js',
  '-- ⚠️ 카테고리·시간대·1인분 크기는 추정치 · 수동 검증 필요',
  '-- Migration: 003',
  '',
  '-- 기존 데이터 초기화 (재실행 안전)',
  "DELETE FROM food_menu_v2 WHERE menu_version = '2026-09-v1-seed';",
  ''
];

for (const it of items) {
  outLines.push(
    `INSERT INTO food_menu_v2 (name, category, cuisine, slots, primary_slot, method, spicy_level, fullness, protein_source, has_vegetable, has_meat, has_seafood, serving_size_g, serving_label, serving_confidence, nutrients_per_serving, nutrients_per_100g, nutrition_source_basis, nutrition_source, nutrition_verified, nutrition_review_note, vegan_compatible, sodium_level, allergens, strengths, keywords, needs_review, review_reasons, menu_version) VALUES (${sqlValue(it.name)}, ${sqlValue(it.category)}, ${sqlValue(it.cuisine)}, ${sqlValue(it.slots)}, ${sqlValue(it.primary_slot)}, ${sqlValue(it.method)}, ${it.spicy_level}, ${it.fullness}, ${sqlValue(it.protein_source)}, ${it.has_vegetable}, ${it.has_meat}, ${it.has_seafood}, ${it.serving_size_g || 'NULL'}, ${sqlValue(it.serving_label)}, ${sqlValue(it.serving_confidence)}, ${sqlValue(it.nutrients_per_serving)}, ${sqlValue(it.nutrients_per_100g)}, ${sqlValue(it.nutrition_source_basis)}, ${sqlValue(it.nutrition_source)}, ${it.nutrition_verified}, ${sqlValue(it.nutrition_review_note)}, ${it.vegan_compatible}, ${sqlValue(it.sodium_level)}, ${sqlValue(it.allergens)}, ${sqlValue(it.strengths)}, ${sqlValue(it.keywords)}, ${it.needs_review}, ${sqlValue(it.review_reasons)}, '2026-09-v1-seed');`
  );
}

fs.writeFileSync(OUTPUT_PATH, outLines.join('\n'));

// JSON export · Rule Engine과 테스트에서 사용
const jsonItems = items.map(it => ({
  id: `seed_${it.name.replace(/\s+/g, '_')}`,  // 임시 ID · Supabase는 UUID 자동
  name: it.name,
  category: it.category,
  cuisine: it.cuisine,
  slots: it.slots,
  primary_slot: it.primary_slot,
  method: it.method,
  spicy_level: it.spicy_level,
  fullness: it.fullness,
  protein_source: it.protein_source,
  has_vegetable: it.has_vegetable,
  has_meat: it.has_meat,
  has_seafood: it.has_seafood,
  serving_size_g: it.serving_size_g,
  serving_label: it.serving_label,
  serving_confidence: it.serving_confidence,
  nutrients_per_serving: it.nutrients_per_serving,
  nutrients_per_100g: it.nutrients_per_100g,
  nutrition_source_basis: it.nutrition_source_basis,
  vegan_compatible: it.vegan_compatible,
  sodium_level: it.sodium_level,
  allergens: it.allergens,
  strengths: it.strengths,
  keywords: it.keywords,
  needs_review: it.needs_review,
  review_reasons: it.review_reasons,
  is_active: true,
  menu_version: '2026-09-v1-seed'
}));
fs.mkdirSync(path.dirname(JSON_OUTPUT), { recursive: true });
fs.writeFileSync(JSON_OUTPUT, JSON.stringify(jsonItems, null, 2));

// ─────────────────────────────────────────────────────────
// 검증 리포트
// ─────────────────────────────────────────────────────────
const reviewItems = items.filter(i => i.needs_review);
const categoryDist = items.reduce((a, i) => { a[i.category] = (a[i.category] || 0) + 1; return a; }, {});

console.log('');
console.log('═══════════════════════════════════════════════');
console.log(`✅ 마이그레이션 완료 · ${items.length}개 항목`);
console.log('═══════════════════════════════════════════════');
console.log('');
console.log('📊 카테고리 분포:', categoryDist);
console.log('');
console.log(`⚠️  이상치 (needs_review): ${reviewItems.length}개`);
if (reviewItems.length > 0) {
  const reasonCount = {};
  reviewItems.forEach(i => i.review_reasons.forEach(r => { reasonCount[r] = (reasonCount[r] || 0) + 1; }));
  console.log('   사유별 분포:', reasonCount);
  console.log('');
  console.log('   상위 이상치 15개:');
  reviewItems.slice(0, 15).forEach(i => {
    console.log(`   - ${i.name} (${i.serving_size_g}g) : ${i.review_reasons.join(', ')} · kcal_serving=${i.nutrients_per_serving.kcal}, sodium=${i.nutrients_per_serving.sodium}`);
  });
}
console.log('');
console.log('📝 수동 검증 대표 음식 10개 (샘플):');
const samples = ['삼계탕','비빔밥','김치찌개','순두부찌개','갈비탕','짜장면','냉면','제육덮밥','김밥','회덮밥'];
samples.forEach(name => {
  const it = items.find(i => i.name === name);
  if (!it) return;
  const s = it.nutrients_per_serving;
  const p100 = it.nutrients_per_100g;
  console.log(`   ${name.padEnd(8)} · ${it.serving_label}(${it.serving_size_g}g)`);
  console.log(`     1인분: ${s.kcal}kcal · 단백 ${s.protein}g · 나트륨 ${s.sodium}mg · 지방 ${s.fat}g`);
  console.log(`     100g : ${p100.kcal}kcal · 단백 ${p100.protein}g · 나트륨 ${p100.sodium}mg${it.needs_review ? ' ⚠️' : ' ✓'}`);
});
console.log('');
console.log('다음 단계:');
console.log('  1. 위 샘플 10개 · 상식 대비 확인 · 이상하면 serving_size_g 수동 조정');
console.log('  2. Supabase에 001_food_menu_v2.sql (스키마)');
console.log('  3. Supabase에 003_food_menu_seed.sql (데이터)');
console.log('  4. 이상치 needs_review=true 항목만 별도 관리 화면에서 검토');
