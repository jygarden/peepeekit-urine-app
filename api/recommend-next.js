// 🎯 추천 엔진 · Rule Engine + Gemini 설명 · v0.1
// 참조: RECOMMEND_ENGINE.md · BRAIN.md · SECURITY.md
//
// 원칙:
// - Rule Engine이 결정 · Gemini는 문구만 생성
// - 서버 전용 · 절대 클라이언트에 이 코드 X
// - 8개 함수 분리 · 튜닝·A/B 쉽게
// - 프롬프트는 server/prompts/*.txt 파일에서 로드 (하드코딩 X)

const path = require('path');
const fs = require('fs');
// Supabase는 서버(prod)에서만 로드 · 테스트/CLI에서는 없어도 동작
let _createClient = null;
try { _createClient = require('@supabase/supabase-js').createClient; } catch (_) { /* dev · optional */ }

// ═══════════════════════════════════════════════════════════
// 상수 · 서버 전용
// ═══════════════════════════════════════════════════════════
const ENGINE_VERSION = '0.1.0';
const MENU_VERSION   = '2026-09-v1-seed';
const PROMPT_VERSION = 'recommend-copy-v1';  // server/prompts/recommend-copy-v1.txt

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
// 데이터 로드
// - 프로덕션: Supabase food_menu_v2 (secret key 필요)
// - 로컬 테스트: data/food_menu_v2.json (fallback)
// ═══════════════════════════════════════════════════════════
let _foodMenuCache = null;
let _foodMenuCacheAt = 0;
const FOOD_MENU_CACHE_TTL = 5 * 60 * 1000;  // 5분

function loadFoodMenu() {
  // 동기 · 로컬 JSON (테스트·fallback)
  if (_foodMenuCache) return _foodMenuCache;
  const jsonPath = path.join(__dirname, '..', 'data', 'food_menu_v2.json');
  _foodMenuCache = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
  return _foodMenuCache;
}

function getSupabaseAdmin() {
  if (!_createClient) return null;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return _createClient(url, key, { auth: { persistSession: false } });
}

async function loadFoodMenuAsync() {
  // 5분 캐시
  if (_foodMenuCache && (Date.now() - _foodMenuCacheAt) < FOOD_MENU_CACHE_TTL) {
    return _foodMenuCache;
  }
  const supabase = getSupabaseAdmin();
  if (supabase) {
    const { data, error } = await supabase
      .from('food_menu_v2')
      .select('*')
      .eq('is_active', true);
    if (!error && data && data.length > 0) {
      _foodMenuCache = data;
      _foodMenuCacheAt = Date.now();
      return data;
    }
    console.warn('[recommend-next] Supabase load failed · JSON fallback', error?.message);
  }
  return loadFoodMenu();
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
function recommend(ctx, injectedFoodMenu = null) {
  const foodMenu = injectedFoodMenu || loadFoodMenu();

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
// Gemini · 추천 문구 생성 (Rule Engine 결과에 자연스러운 표현 붙이기)
// ═══════════════════════════════════════════════════════════
let _promptCache = null;
function loadPromptTemplate() {
  if (_promptCache) return _promptCache;
  try {
    const p = path.join(__dirname, '..', 'server', 'prompts', 'recommend-copy-v1.txt');
    _promptCache = fs.readFileSync(p, 'utf8');
    return _promptCache;
  } catch (err) {
    console.warn('[recommend-next] prompt load failed', err.message);
    return null;
  }
}

function buildPrompt(food, meal_slot, reason_codes) {
  const template = loadPromptTemplate();
  if (!template) return null;
  // SYSTEM 섹션 + 채워진 USER 섹션
  const system = template.split('=============================================================')[2] || '';
  const user = `음식: ${food.name}
분류: ${food.category} / ${food.method || 'none'}
시간대: ${meal_slot}
추천 이유 코드: ${JSON.stringify(reason_codes)}

이 음식에 어울리는 headline·reason을 JSON으로 만들어.`;
  return { system: system.trim(), user };
}

async function callGeminiForCopy(food, meal_slot, reason_codes) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  const prompt = buildPrompt(food, meal_slot, reason_codes);
  if (!prompt) return null;

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
    const body = {
      systemInstruction: { parts: [{ text: prompt.system }] },
      contents: [{ role: 'user', parts: [{ text: prompt.user }] }],
      generationConfig: {
        temperature: 0.8,
        maxOutputTokens: 200,
        responseMimeType: 'application/json'
      }
    };
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal
    });
    clearTimeout(timeout);
    if (!res.ok) {
      console.warn('[recommend-next] Gemini HTTP', res.status);
      return null;
    }
    const data = await res.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) return null;
    const parsed = JSON.parse(text);
    if (!parsed.headline || !parsed.reason) return null;
    // 안전장치 · 너무 긴 문구 자르기
    return {
      headline: String(parsed.headline).slice(0, 20),
      reason:   String(parsed.reason).slice(0, 40)
    };
  } catch (err) {
    console.warn('[recommend-next] Gemini failed', err.message);
    return null;
  }
}

function fallbackCopy(food, meal_slot) {
  const slotLabel = meal_slot === 'breakfast' ? '오늘 아침'
                  : meal_slot === 'lunch' ? '오늘 점심'
                  : meal_slot === 'dinner' ? '오늘 저녁' : '지금';
  return {
    headline: `${slotLabel}, ${food.name} 어때요?`,
    reason: ''
  };
}

async function withGeminiCopy(item, meal_slot) {
  const gemini = await callGeminiForCopy(item.food, meal_slot, item.reason_codes);
  if (gemini) return { ...gemini, from: 'gemini' };
  return { ...fallbackCopy(item.food, meal_slot), from: 'fallback' };
}

// ═══════════════════════════════════════════════════════════
// Vercel serverless handler
// ═══════════════════════════════════════════════════════════
async function insertRecommendationLog(supabase, userId, result, primaryCopy) {
  if (!supabase || !userId || !result.top[0]) return null;
  try {
    const primary = result.top[0];
    const { data, error } = await supabase
      .from('recommendation_log')
      .insert({
        user_id: userId,
        primary_food_id: primary.food.id,
        headline: primaryCopy?.headline || `${primary.food.name} 어때요?`,
        reason:   primaryCopy?.reason   || primary.reason_codes[0] || '',
        reason_codes: primary.reason_codes,
        score_breakdown: primary.breakdown,
        meal_slot: result.meal_slot,
        engine_version: result.engine_version,
        menu_version: result.menu_version,
        prompt_version: result.prompt_version || PROMPT_VERSION
      })
      .select('id')
      .single();
    if (error) {
      console.warn('[recommend-next] log insert failed', error.message);
      return null;
    }
    return data.id;
  } catch (err) {
    console.warn('[recommend-next] log exception', err.message);
    return null;
  }
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  try {
    const supabase = getSupabaseAdmin();

    // 사용자 식별 · Authorization Bearer <access_token> · 클라이언트 세션 토큰
    let userId = null;
    if (supabase && req.headers.authorization) {
      const token = req.headers.authorization.replace(/^Bearer\s+/i, '');
      const { data: { user } } = await supabase.auth.getUser(token);
      userId = user?.id || null;
    }
    // dev · 요청 바디에 user_id 있으면 사용
    if (!userId && req.body?.user_id) userId = req.body.user_id;

    const foodMenu = await loadFoodMenuAsync();
    const result = recommend(req.body || {}, foodMenu);

    // Gemini 문구 생성 · Top3 병렬 호출 (실패 시 fallback)
    const copies = await Promise.all(
      result.top.map(item => withGeminiCopy(item, result.meal_slot))
    );

    // recommendation_log · 서버에서만 INSERT (primary 문구 포함)
    const logId = await insertRecommendationLog(supabase, userId, result, copies[0]);

    // 🔒 클라이언트에 넘길 것: 완성된 결과만
    // score_breakdown·reason_codes·deficits는 서버 로그에만 · 클라이언트 X
    const clientResponse = {
      recommendation_id: logId,  // 피드백 시 이걸로 매칭
      engine_version: result.engine_version,
      menu_version: result.menu_version,
      meal_slot: result.meal_slot,
      fallback: result.fallback,
      primary: result.top[0] ? {
        food_id: result.top[0].food.id,
        name: result.top[0].food.name,
        headline: copies[0].headline,
        reason: copies[0].reason
      } : null,
      alternatives: result.top.slice(1).map((t, i) => ({
        food_id: t.food.id,
        name: t.food.name,
        headline: copies[i + 1].headline,
        reason: copies[i + 1].reason
      }))
    };

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
