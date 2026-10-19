#!/usr/bin/env node
// 🧪 Rule Engine · 20 시나리오 검증
// 참조: TEST_SCENARIOS.md
// 실행: node scripts/test_rule_engine.js
//
// 원칙:
// - Top1 고정 X · 행동 규칙만 검증
// - 각 케이스는 assertion 배열로 표현
// - PASS/FAIL 개수 요약

const {
  recommend,
  filterCandidates,
  scoreNutrition,
  scoreDiversity,
  ENGINE_VERSION,
  MENU_VERSION
} = require('../api/recommend-next');

let PASS = 0;
let FAIL = 0;
const FAILURES = [];

function assert(caseName, description, condition) {
  if (condition) {
    PASS++;
    console.log(`  ✅ ${description}`);
  } else {
    FAIL++;
    FAILURES.push(`${caseName} · ${description}`);
    console.log(`  ❌ ${description}`);
  }
}

function runCase(name, description, fn) {
  console.log(`\n──── ${name} · ${description} ────`);
  try {
    fn();
  } catch (err) {
    FAIL++;
    FAILURES.push(`${name} · CRASHED: ${err.message}`);
    console.log(`  💥 CRASHED: ${err.message}`);
  }
}

// ═══════════════════════════════════════════════════════════
// 그룹 A · 정상 케이스 (5)
// ═══════════════════════════════════════════════════════════

runCase('CASE 01', '점심 시간 · 신규 유저 · 아무 제약 X', () => {
  const r = recommend({
    meal_slot: 'lunch',
    recent_meals: [],
    preferences: {},
    allergens: [],
    user_dislikes: [],
    dietary_restrictions: []
  });
  assert('CASE 01', 'top 3개 반환', r.top.length === 3);
  assert('CASE 01', '모두 lunch slot 포함', r.top.every(t => t.food.slots.includes('lunch')));
  assert('CASE 01', '점수 내림차순', r.top[0].total_score >= r.top[1].total_score && r.top[1].total_score >= r.top[2].total_score);
  assert('CASE 01', 'engine_version 표기', r.engine_version === ENGINE_VERSION);
});

runCase('CASE 02', '아침 시간 · breakfast 우선', () => {
  const r = recommend({ meal_slot: 'breakfast' });
  assert('CASE 02', 'top 3개', r.top.length === 3);
  assert('CASE 02', 'breakfast slot 포함', r.top.every(t => t.food.slots.includes('breakfast')));
  const heavySpicy = r.top.filter(t => (t.food.spicy_level || 0) >= 2);
  assert('CASE 02', '매운 것 Top1 아님 (감점됨)', !r.top[0].food.spicy_level || r.top[0].food.spicy_level < 2);
});

runCase('CASE 03', '저녁 시간 · dinner slot', () => {
  const r = recommend({ meal_slot: 'dinner' });
  assert('CASE 03', 'top 3개', r.top.length === 3);
  assert('CASE 03', 'dinner slot 포함', r.top.every(t => t.food.slots.includes('dinner')));
});

runCase('CASE 04', '취향 반영 · 좋아하는 카테고리', () => {
  const r = recommend({
    meal_slot: 'lunch',
    preferences: { liked_categories: ['noodle'] }
  });
  assert('CASE 04', 'top 3에 noodle 최소 1개', r.top.some(t => t.food.category === 'noodle'));
  const noodleItem = r.top.find(t => t.food.category === 'noodle');
  if (noodleItem) {
    assert('CASE 04', 'noodle에 LIKED_CATEGORY reason', noodleItem.reason_codes.includes('LIKED_CATEGORY'));
  }
});

runCase('CASE 05', '자주 먹는 음식 우선', () => {
  const menu = require('../data/food_menu_v2.json');
  const bibimbap = menu.find(f => f.name.includes('비빔밥'));
  if (!bibimbap) { assert('CASE 05', '비빔밥 존재', false); return; }
  const r = recommend({
    meal_slot: 'lunch',
    preferences: { frequently_eaten: [bibimbap.id] }
  });
  const item = r.top.find(t => t.food.id === bibimbap.id);
  assert('CASE 05', 'frequently_eaten이 top3에 포함', !!item);
  if (item) assert('CASE 05', 'FREQUENTLY_EATEN reason', item.reason_codes.includes('FREQUENTLY_EATEN'));
});

// ═══════════════════════════════════════════════════════════
// 그룹 B · 중복 회피 (3)
// ═══════════════════════════════════════════════════════════

runCase('CASE 06', '방금 먹은 음식 재추천 X', () => {
  const menu = require('../data/food_menu_v2.json');
  const kimchi = menu.find(f => f.name.includes('김치찌개'));
  const r = recommend({
    meal_slot: 'lunch',
    recent_meals: [{ food_id: kimchi.id, name: kimchi.name, timestamp: Date.now() }]
  });
  assert('CASE 06', '김치찌개 top3 제외', !r.top.some(t => t.food.id === kimchi.id));
});

runCase('CASE 07', '같은 카테고리 반복 억제 (다양성)', () => {
  const menu = require('../data/food_menu_v2.json');
  // 최근에 rice 계열 3개 먹었다고 가정
  const rices = menu.filter(f => f.category === 'rice').slice(0, 3);
  const r = recommend({
    meal_slot: 'lunch',
    recent_meals: rices.map(f => ({ food_id: f.id, name: f.name, timestamp: Date.now() }))
  });
  const riceCount = r.top.filter(t => t.food.category === 'rice').length;
  assert('CASE 07', 'top3에 rice 비중 낮음 (2개 이하)', riceCount <= 2);
});

runCase('CASE 08', 'Top3 자기들끼리도 유사 조합 억제', () => {
  const r = recommend({ meal_slot: 'lunch' });
  const keys = r.top.map(t => `${t.food.category}|${t.food.method || 'none'}`);
  const uniqueKeys = new Set(keys);
  assert('CASE 08', 'top3 category+method 조합 다양', uniqueKeys.size >= 2);
});

// ═══════════════════════════════════════════════════════════
// 그룹 C · 제외 (3)
// ═══════════════════════════════════════════════════════════

runCase('CASE 09', '알레르기 제외 (계란)', () => {
  const r = recommend({ meal_slot: 'lunch', allergens: ['계란'] });
  assert('CASE 09', 'top 어느 것도 계란 알레르기 X',
    r.top.every(t => !(t.food.allergens || []).includes('계란')));
});

runCase('CASE 10', 'user_dislike 즉시 제외', () => {
  const menu = require('../data/food_menu_v2.json');
  const target = menu.find(f => f.slots.includes('lunch'));
  const r = recommend({ meal_slot: 'lunch', user_dislikes: [target.id] });
  assert('CASE 10', '싫어함 음식 제외', !r.top.some(t => t.food.id === target.id));
});

runCase('CASE 11', '채식 제한', () => {
  const r = recommend({ meal_slot: 'lunch', dietary_restrictions: ['채식'] });
  assert('CASE 11', 'top 모두 vegan_compatible', r.top.every(t => t.food.vegan_compatible));
});

// ═══════════════════════════════════════════════════════════
// 그룹 D · 영양 반영 (3)
// ═══════════════════════════════════════════════════════════

runCase('CASE 12', '단백질 부족 시 · 단백질 풍부 음식 우선', () => {
  const r = recommend({
    meal_slot: 'lunch',
    deficits: [{ nutrient: 'protein', amount_needed: 60, severity: 0.8, fillRate: 0.2 }]
  });
  assert('CASE 12', 'top1 단백질 함량 상위권',
    r.top[0].food.nutrients_per_serving && r.top[0].food.nutrients_per_serving.protein >= 15);
  assert('CASE 12', 'PROTEIN_DEFICIT reason 포함',
    r.top.some(t => t.reason_codes.includes('PROTEIN_DEFICIT')));
});

runCase('CASE 13', '식이섬유 부족 · 채소 있는 음식 유도', () => {
  const r = recommend({
    meal_slot: 'lunch',
    deficits: [{ nutrient: 'fiber', amount_needed: 20, severity: 0.7, fillRate: 0.3 }]
  });
  const withFiber = r.top.filter(t => (t.food.nutrients_per_serving.fiber || 0) >= 3);
  assert('CASE 13', 'top3 중 식이섬유 있는 음식 최소 1개', withFiber.length >= 1);
});

runCase('CASE 14', '영양 부족 없음 · 균형 스코어', () => {
  const r = recommend({ meal_slot: 'lunch', deficits: [] });
  assert('CASE 14', 'top3 반환', r.top.length === 3);
  assert('CASE 14', '점수 정상 범위 (0-100)',
    r.top.every(t => t.total_score >= 0 && t.total_score <= 100));
});

// ═══════════════════════════════════════════════════════════
// 그룹 E · 시간대 (2)
// ═══════════════════════════════════════════════════════════

runCase('CASE 15', '야식 시간 (snack) · 가벼운 것 우선', () => {
  const r = recommend({ meal_slot: 'snack' });
  assert('CASE 15', 'top1 fullness 낮음 (3 미만)', (r.top[0].food.fullness || 0) < 3);
});

runCase('CASE 16', '아침 시간 · 매운 김치찌개 등 감점', () => {
  const menu = require('../data/food_menu_v2.json');
  const spicy = menu.find(f => f.name.includes('김치찌개'));
  const r = recommend({ meal_slot: 'breakfast' });
  // 매운 김치찌개가 top1일 확률 매우 낮아야 함
  assert('CASE 16', '아침 top1은 매운 것 아님', (r.top[0].food.spicy_level || 0) < 2);
});

// ═══════════════════════════════════════════════════════════
// 그룹 F · 식이 (2)
// ═══════════════════════════════════════════════════════════

runCase('CASE 17', '저염 제한 · sodium high 제외', () => {
  const r = recommend({ meal_slot: 'lunch', dietary_restrictions: ['저염'] });
  assert('CASE 17', 'top 어느 것도 sodium high X',
    r.top.every(t => t.food.sodium_level !== 'high'));
});

runCase('CASE 18', '알레르기 + 채식 복합', () => {
  const r = recommend({
    meal_slot: 'lunch',
    allergens: ['땅콩'],
    dietary_restrictions: ['채식']
  });
  assert('CASE 18', 'top 모두 vegan', r.top.every(t => t.food.vegan_compatible));
  assert('CASE 18', 'top 모두 땅콩 X', r.top.every(t => !(t.food.allergens || []).includes('땅콩')));
});

// ═══════════════════════════════════════════════════════════
// 그룹 G · 예외 (2)
// ═══════════════════════════════════════════════════════════

runCase('CASE 19', '극단 제약 · 후보 부족', () => {
  const r = recommend({
    meal_slot: 'lunch',
    dietary_restrictions: ['채식', '저염', '저당'],
    allergens: ['글루텐', '계란', '유제품', '땅콩', '갑각류']
  });
  // 크래시 없이 반환하는지가 핵심
  assert('CASE 19', '크래시 X · 결과 객체 반환', !!r);
  assert('CASE 19', 'fallback 처리', r.top.length <= 3);
  if (r.top.length === 0) {
    assert('CASE 19', 'fallback_reason 표기', r.fallback === true);
  }
});

runCase('CASE 20', '신규 유저 · 완전 zero context', () => {
  const r = recommend({ meal_slot: 'lunch' });  // slot만 · 나머지 zero
  assert('CASE 20', 'top 3개', r.top.length === 3);
  assert('CASE 20', 'meal_slot 자동 결정', ['breakfast','lunch','dinner','snack'].includes(r.meal_slot));
  assert('CASE 20', 'engine_version 존재', !!r.engine_version);
  assert('CASE 20', 'menu_version 존재', !!r.menu_version);
});

runCase('CASE 21', '메뉴 다양성 · 재료 제외 · 날짜마다 다른 추천 · 최근 추천 쉬기', () => {
  const menu = require('../data/food_menu_v2.json');
  assert('CASE 21', '메뉴 300개 이상', menu.length >= 300);
  const base = recommend({ meal_slot: 'lunch' }, menu);
  assert('CASE 21', '밥·김치 같은 재료는 추천 X', base.top.every(t => t.food.recommendable !== false));
  const tops = new Set();
  for (let d = 1; d <= 7; d++) tops.add(recommend({ meal_slot: 'lunch', variety: 8, variety_seed: 'u|d' + d + '|lunch' }, menu).top[0].food.id);
  assert('CASE 21', '7일 동안 메인 추천 4가지 이상', tops.size >= 4);
  const a1 = recommend({ meal_slot: 'lunch', variety: 8, variety_seed: 'u|same|lunch' }, menu).top[0].food.id;
  const a2 = recommend({ meal_slot: 'lunch', variety: 8, variety_seed: 'u|same|lunch' }, menu).top[0].food.id;
  assert('CASE 21', '같은 날·같은 끼니엔 결과 고정', a1 === a2);
  const rested = recommend({ meal_slot: 'lunch', variety: 8, variety_seed: 'u|same|lunch', recent_reco_ids: [a1] }, menu);
  assert('CASE 21', '최근 추천한 메뉴는 쉬기', rested.top.every(t => t.food.id !== a1));
});

// ═══════════════════════════════════════════════════════════
// 요약
// ═══════════════════════════════════════════════════════════
console.log('\n═══════════════════════════════════════════════════════════');
console.log(`  총 ${PASS + FAIL} assertion · ✅ ${PASS} PASS · ❌ ${FAIL} FAIL`);
console.log(`  engine_version: ${ENGINE_VERSION} · menu_version: ${MENU_VERSION}`);
console.log('═══════════════════════════════════════════════════════════');
if (FAIL > 0) {
  console.log('\n실패 목록:');
  FAILURES.forEach(f => console.log(`  - ${f}`));
  process.exit(1);
}
console.log('\n✅ 모든 assertion 통과 · Rule Engine v0.1 안정.');
