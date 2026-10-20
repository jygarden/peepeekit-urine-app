// 🍽 식단 서버 저장 (PT 코치 모드용)
//
//   POST /api/meal-log  → 식단 1건 저장
//
// 흐름:
//   클라이언트가 식단 분석 완료 (/api/analyze-food 결과) 받은 후
//   이걸 Supabase에도 비동기로 저장
//   → PT가 /api/coach/members/:userId/meals 에서 조회 가능
//
// 보안:
//   - x-device-id 헤더 필수
//   - 사진은 저장 안 함 (프라이버시 · Phase B에서 Storage 추가 검토)

const { getServerClient, getOrCreateUser, sendError, applyCors } = require('./_supabase');

module.exports = async function handler(req, res) {
  applyCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return sendError(res, 405, 'POST only');

  const deviceId = req.headers['x-device-id'];
  if (!deviceId) return sendError(res, 400, 'device_id 헤더 누락');

  let sb, user;
  try {
    sb = getServerClient();
    user = await getOrCreateUser(sb, deviceId);
  } catch (e) {
    return sendError(res, 400, e.message);
  }

  const {
    foods, totals, meal_time, user_memo,
    store_tag, evidence, consumed_at
  } = req.body || {};

  if (!Array.isArray(foods) || foods.length === 0) {
    return sendError(res, 400, 'foods 배열 필요');
  }
  if (user_memo && String(user_memo).length > 500) {
    return sendError(res, 400, '메모는 500자 이내');
  }

  // 저장할 때 민감 데이터 제거 (이미지 base64, api key 등이 섞여 올 가능성 0 수준으로)
  const safeFoods = foods.map(f => ({
    name: f.name,
    brand: f.brand,
    portion: f.portion,
    ingredients: f.ingredients,
    calories: f.calories,
    protein_g: f.protein_g,
    carbs_g: f.carbs_g,
    fat_g: f.fat_g,
    sodium_mg: f.sodium_mg,
    fiber_g: f.fiber_g,
    sugar_g: f.sugar_g,
    keyNutrients: f.keyNutrients
  }));

  const { data, error } = await sb
    .from('meal_logs')
    .insert({
      user_id: user.id,
      foods: safeFoods,
      totals: totals || null,
      meal_time: ['breakfast','lunch','dinner','snack'].includes(meal_time) ? meal_time : null,
      user_memo: user_memo || null,
      store_tag: store_tag || null,
      evidence: evidence || null,
      consumed_at: consumed_at || new Date().toISOString()
    })
    .select('id, consumed_at')
    .single();
  if (error) {
    console.error('[meal-log]', error.message);
    return sendError(res, 500, error.message);
  }

  return res.status(200).json({ id: data.id, consumed_at: data.consumed_at });
};
