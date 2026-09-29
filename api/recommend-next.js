// 🎯 추천 엔진 · Rule Engine · v0.1
// 참조: RECOMMEND_ENGINE.md · BRAIN.md · SECURITY.md
//
// 원칙:
// - Rule Engine이 결정 · Gemini는 설명만 (Gemini는 아직 미연결)
// - 서버 전용 · 절대 클라이언트에 이 코드 X
// - 8개 함수 분리 · 튜닝·A/B 쉽게

const path = require('path');
const fs = require('fs');

// ═══════════════════════════════════════════════════════════
// 상수 · 서버 전용
// ═══════════════════════════════════════════════════════════
const ENGINE_VERSION = '0.1.0';
const MENU_VERSION   = '2026-09-v1-seed';
const PROMPT_VERSION = 'recommend-copy-v0';  // Gemini 미연결 상태

const SCORING_MAX = {
  nutrition:  45,
  preference: 30,
  diversity:  15,
  timeslot:   10
};

// 부족 영양소 판정 기준 (하루 권장량 대비 % · 최근 3일 누적)
const DEFICIT_THRESHOLDS = {
  protein: 0.7,   // 70% 미만이면 부족
  fiber:   0.6,
  vitD:    0.5,
  vitC:    0.6,
  calcium: 0.6,
  iron:    0.6,
  omega3:  0.5
};

const RDA_3DAYS = {
  // 하루 * 3 (3일치 누적 기준)
  protein: 65 * 3,
  fiber:   30 * 3,
  vitD:    10 * 3,
  vitC:    100 * 3,
  calcium: 800 * 3,
  iron:    10 * 3,
  omega3:  1600 * 3
};

// ═══════════════════════════════════════════════════════════
// 데이터 로드 · (Phase 4에서 Supabase로 교체)
// ═══════════════════════════════════════════════════════════
let _foodMenuCache = null;
function loadFoodMenu() {
  if (_foodMenuCache) return _foodMenuCache;
  const jsonPath = path.join(__dirname, '..', 'data', 'food_menu_v2.json');
  _foodMenuCache = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
  return _foodMenuCache;
}

// ═══════════════════════════════════════════════════════════
// 부족 영양소 계산 · 최근 식사 → 부족량
// ═══════════════════════════════════════════════════════════
function estimateDeficits(recentMeals, foodMenu) {
  // recentMeals: [{food_id, name, timestamp}]
  const totals = { protein: 0, fiber: 0, vitD: 0, vitC: 0, calcium: 0, iron: 0, omega3: 0 };

  for (const meal of recentMeals) {
    // food_id 매칭
    const food = foodMenu.find(f => f.id === meal.food_id || f.name === meal.name);
    if (!food) continue;
    const n = food.nutrients_per_serving || {};
    for (const k of Object.keys(totals)) {
      totals[k] += (n[k] || 0);
    }
  }

  const deficits = [];
  for (const [nutrient, threshold] of Object.entries(DEFICIT_THRESHOLDS)) {
    const rda = RDA_3DAYS[nutrient];
    const got = totals[nutrient] || 0;
    const fillRate = got / rda;
    if (fillRate < threshold) {
      const amount_needed = rda - got;  // 부족량 (mg/μg/g)
      const severity = 1 - fillRate;    // 0-1
      deficits.push({ nutrient, amount_needed, severity, fillRate });
    }
  }

  // severity 높은 순
  deficits.sort((a, b) => b.severity - a.severity);
  return deficits;
}

// ═══════════════════════════════════════════════════════════
// 시간대 결정
// ═══════════════════════════════════════════════════════════
function decideMealSlot(currentTime) {
  const h = currentTime.getHours();
  if (h >= 5  && h < 10)  return 'breakfast';
  if (h >= 10 && h < 15)  return 'lunch';
  if (h >= 15 && h < 21)  return 'dinner';
  return 'snack';  // 21시 이후 · 새벽
}

// ═══════════════════════════════════════════════════════════
// 1. 필터 · 후보 축소
// ═══════════════════════════════════════════════════════════
function filterCandidates(foodMenu, ctx) {
  const {
    meal_slot,
    allergens = [],
    user_dislikes = [],
    dietary_restrictions = [],
    recent_food_ids = [],
    recent_ate_hint_categories = []  // 카테고리 48h 억제 힌트
  } = ctx;

  const now = Date.now();

  return foodMenu.filter(food => {
    if (!food.is_active) return false;

    // 시간대 매칭
    if (!food.slots || !food.slots.includes(meal_slot)) return false;

    // 최근 24h 중복 제거
    if (recent_food_ids.includes(food.id)) return false;

    // 알레르기 제거
    const foodAllergens = food.allergens || [];
    if (foodAllergens.some(a => allergens.includes(a))) return false;

    // 싫어함 제거 (영구)
    if (user_dislikes.includes(food.id)) return false;

    // 식이 제한
    if (dietary_restrictions.includes('채식') && !food.vegan_compatible) return false;
    if (dietary_restrictions.includes('저염') && food.sodium_level === 'high') return false;
    if (dietary_restrictions.includes('저당') && food.category === 'dessert') return false;

    return true;
  });
}

// ═══════════════════════════════════════════════════════════
// 2. 영양 적합도 (45점 max) · 부족량 대비 충족률
// ═══════════════════════════════════════════════════════════
function scoreNutrition(food, deficits) {
  if (!deficits.length) return { score: SCORING_MAX.nutrition * 0.5, reason_codes: [] };  // 부족 없으면 중간값

  const nutrients = food.nutrients_per_serving || {};
  let score = 0;
  const perNutrientMax = SCORING_MAX.nutrition / deficits.length;

  const codes = [];
  for (const deficit of deficits) {
    const provided = nutrients[deficit.nutrient] || 0;
    if (deficit.amount_needed <= 0) continue;

    const fillRate = Math.min(1, provided / deficit.amount_needed);
    const gained = fillRate * perNutrientMax;
    score += gained;

    // 이 음식이 실제로 채우면 reason_code 후보
    if (fillRate >= 0.3) {
      codes.push(`${deficit.nutrient.toUpperCase()}_DEFICIT`);
    }
  }

  return { score: Math.min(SCORING_MAX.nutrition, score), reason_codes: codes };
}

// ═══════════════════════════════════════════════════════════
// 3. 개인 취향 (30점 max)
// ═══════════════════════════════════════════════════════════
function scorePreference(food, prefs) {
  const {
    liked_categories = [],
    liked_methods = [],
    frequently_eaten = [],
    recent_skipped = []
  } = prefs;

  let score = 15;  // 기본
  const codes = [];

  if (liked_categories.includes(food.category)) {
    score += 8;
    codes.push('LIKED_CATEGORY');
  }
  if (food.method && liked_methods.includes(food.method)) {
    score += 5;
    codes.push('LIKED_METHOD');
  }
  if (frequently_eaten.includes(food.id) || frequently_eaten.includes(food.name)) {
    score += 5;
    codes.push('FREQUENTLY_EATEN');
  }
  if (recent_skipped.some(x => x.food_id === food.id)) {
    score -= 15;
  }

  return { score: Math.max(0, Math.min(SCORING_MAX.preference, score)), reason_codes: codes };
}

// ═══════════════════════════════════════════════════════════
// 4. 다양성 (15점 max)
// ═══════════════════════════════════════════════════════════
function scoreDiversity(food, ctx) {
  const { recent_categories = [], recent_protein_sources = [] } = ctx;
  let score = 0;
  const codes = [];

  // 카테고리 최근 안 먹었으면 만점
  if (!recent_categories.includes(food.category)) {
    score += 10;
    codes.push(`${food.category.toUpperCase()}_NOT_RECENTLY_EATEN`);
  } else {
    score += 3;
  }

  // 단백질 소스 로테이션
  if (food.protein_source && food.protein_source !== 'none' &&
      !recent_protein_sources.includes(food.protein_source)) {
    score += 5;
    codes.push('MAIN_PROTEIN_ROTATION');
  } else {
    score += 2;
  }

  return { score: Math.min(SCORING_MAX.diversity, score), reason_codes: codes };
}

// ═══════════════════════════════════════════════════════════
// 5. 시간대 (10점 max)
// ═══════════════════════════════════════════════════════════
function scoreTimeSlot(food, meal_slot) {
  const codes = [];
  let score = 0;

  if (food.primary_slot === meal_slot) {
    score = 10;
    codes.push('PRIMARY_SLOT_MATCH');
  } else if (food.slots && food.slots.includes(meal_slot)) {
    score = 5;
  }

  // 아침 · 매운 것/무거운 것 감점
  if (meal_slot === 'breakfast') {
    if ((food.spicy_level || 0) >= 2) score -= 3;
    if ((food.fullness || 0) >= 3) score -= 3;
  }
  // 야식 (snack) · 무거운 것 감점
  if (meal_slot === 'snack') {
    if ((food.fullness || 0) >= 3) score -= 4;
  }

  return { score: Math.max(0, Math.min(SCORING_MAX.timeslot, score)), reason_codes: codes };
}

// ═══════════════════════════════════════════════════════════
// 6. 유사도 패널티 · 같은 category+method 동시 배제
// ═══════════════════════════════════════════════════════════
function applySimilarityPenalty(selected, candidate) {
  const key = (f) => `${f.category}|${f.method || 'none'}`;
  return selected.some(s => key(s) === key(candidate));
}

// ═══════════════════════════════════════════════════════════
// 7. reason_codes 통합
// ═══════════════════════════════════════════════════════════
function generateReasonCodes(nutritionCodes, preferenceCodes, diversityCodes, timeslotCodes) {
  // 우선순위 · 중요한 것만
  const all = [
    ...nutritionCodes,   // 영양 부족 채움 (최우선)
    ...diversityCodes,   // 다양성
    ...preferenceCodes,  // 취향
    ...timeslotCodes     // 시간대
  ];
  // 중복 제거 · 최대 3개
  return [...new Set(all)].slice(0, 3);
}

// ═══════════════════════════════════════════════════════════
// 8. Top 3 선택 (유사도 패널티)
// ═══════════════════════════════════════════════════════════
function selectTop3(scoredCandidates) {
  const sorted = [...scoredCandidates].sort((a, b) => b.total_score - a.total_score);
  const selected = [];

  for (const cand of sorted) {
    if (selected.length >= 3) break;
    // 이미 선정된 것과 유사한 조합이면 스킵
    if (selected.length > 0 && applySimilarityPenalty(selected.map(s => s.food), cand.food)) continue;
    selected.push(cand);
  }

  // 3개 못 채우면 유사도 무시하고 추가
  while (selected.length < 3 && sorted.length > selected.length) {
    const next = sorted.find(f => !selected.includes(f));
    if (!next) break;
    selected.push(next);
  }

  return selected;
}

// ═══════════════════════════════════════════════════════════
// 메인 · 추천 실행
// ═══════════════════════════════════════════════════════════
function recommend(ctx) {
  const foodMenu = loadFoodMenu();

  // 컨텍스트 정규화
  const meal_slot = ctx.meal_slot || decideMealSlot(ctx.current_time || new Date());
  const deficits  = ctx.deficits  || estimateDeficits(ctx.recent_meals || [], foodMenu);

  // 최근 24h 음식 ID (중복 회피)
  const recent_food_ids = [];
  const recent_categories = [];
  const recent_protein_sources = [];
  for (const meal of ctx.recent_meals || []) {
    const food = foodMenu.find(f => f.id === meal.food_id || f.name === meal.name);
    if (!food) continue;
    recent_food_ids.push(food.id);
    if (food.category) recent_categories.push(food.category);
    if (food.protein_source && food.protein_source !== 'none') recent_protein_sources.push(food.protein_source);
  }

  const filterCtx = {
    meal_slot,
    allergens:            ctx.allergens || [],
    user_dislikes:        ctx.user_dislikes || [],
    dietary_restrictions: ctx.dietary_restrictions || [],
    recent_food_ids
  };

  // 1. 필터
  const candidates = filterCandidates(foodMenu, filterCtx);

  // 후보 부족 시 · fallback
  if (candidates.length === 0) {
    return {
      engine_version: ENGINE_VERSION,
      menu_version:   MENU_VERSION,
      meal_slot,
      fallback: true,
      fallback_reason: 'NO_CANDIDATES',
      top: [],
      deficits
    };
  }

  // 2. 점수화
  const scored = candidates.map(food => {
    const nut  = scoreNutrition(food, deficits);
    const pref = scorePreference(food, ctx.preferences || {});
    const div  = scoreDiversity(food, { recent_categories, recent_protein_sources });
    const time = scoreTimeSlot(food, meal_slot);

    const breakdown = {
      nutrition:  nut.score,
      preference: pref.score,
      diversity:  div.score,
      timeslot:   time.score
    };
    const total_score = breakdown.nutrition + breakdown.preference + breakdown.diversity + breakdown.timeslot;

    const reason_codes = generateReasonCodes(nut.reason_codes, pref.reason_codes, div.reason_codes, time.reason_codes);

    return { food, total_score, breakdown, reason_codes };
  });

  // 3. Top 3 (유사도 패널티)
  const top3 = selectTop3(scored);

  return {
    engine_version: ENGINE_VERSION,
    menu_version:   MENU_VERSION,
    prompt_version: PROMPT_VERSION,
    meal_slot,
    fallback: top3.length < 3,
    top: top3,
    deficits,
    candidates_count: candidates.length
  };
}

// ═══════════════════════════════════════════════════════════
// Vercel serverless handler
// ═══════════════════════════════════════════════════════════
module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  try {
    const result = recommend(req.body || {});

    // 🔒 클라이언트에 넘길 것: 완성된 결과만
    // score_breakdown·reason_codes·deficits는 서버 로그에만 · 클라이언트 X
    const clientResponse = {
      engine_version: result.engine_version,
      menu_version: result.menu_version,
      meal_slot: result.meal_slot,
      fallback: result.fallback,
      primary: result.top[0] ? {
        food_id: result.top[0].food.id,
        name: result.top[0].food.name,
        // Gemini 연결 전 · 임시 문구
        headline: `${result.meal_slot === 'breakfast' ? '오늘 아침' : result.meal_slot === 'lunch' ? '오늘 점심' : result.meal_slot === 'dinner' ? '오늘 저녁' : '지금'}, ${result.top[0].food.name} 어때요?`,
        reason: result.top[0].reason_codes[0] || ''
      } : null,
      alternatives: result.top.slice(1).map(t => ({
        food_id: t.food.id,
        name: t.food.name,
        headline: `${t.food.name} 어때요?`,
        reason: t.reason_codes[0] || ''
      }))
    };

    // TODO Phase 4: recommendation_log에 result 전체 저장 (서버 로그)

    return res.status(200).json(clientResponse);
  } catch (err) {
    console.error('[recommend-next]', err);
    return res.status(500).json({ error: err.message || '추천 실패' });
  }
};

// 테스트에서 import 가능하도록 export
module.exports.recommend = recommend;
module.exports.filterCandidates = filterCandidates;
module.exports.scoreNutrition = scoreNutrition;
module.exports.scorePreference = scorePreference;
module.exports.scoreDiversity = scoreDiversity;
module.exports.scoreTimeSlot = scoreTimeSlot;
module.exports.applySimilarityPenalty = applySimilarityPenalty;
module.exports.generateReasonCodes = generateReasonCodes;
module.exports.selectTop3 = selectTop3;
module.exports.estimateDeficits = estimateDeficits;
module.exports.decideMealSlot = decideMealSlot;
module.exports.ENGINE_VERSION = ENGINE_VERSION;
module.exports.MENU_VERSION = MENU_VERSION;
