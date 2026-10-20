// 🍽 트레이너가 보는 특정 회원의 식단 피드
//
//   GET  /api/coach-member-meals?user_id=UUID&limit=30
//   POST /api/coach-member-meals  { user_id, text, meal_log_id?, visible_to_user? }
//
// 보안: 유효한 coach_access + 'meals' scope만 통과

const { getServerClient, sendError, applyCors } = require('./_supabase');
const { requireTrainer } = require('./_coachAuth');

async function assertAccess(sb, trainerId, userId, scopeKey) {
  const { data, error } = await sb
    .from('coach_access')
    .select('id, scopes, revoked_at')
    .eq('trainer_id', trainerId)
    .eq('user_id', userId)
    .is('revoked_at', null)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error('이 회원에 접근 권한이 없거나 해제됨');
  if (scopeKey && data.scopes && data.scopes[scopeKey] === false)
    throw new Error(`회원이 ${scopeKey} 공유를 꺼둠`);
  return data;
}

async function handler(req, res) {
  applyCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  const sb = getServerClient();

  const userId = (req.query && req.query.user_id) || (req.body && req.body.user_id);
  if (!userId) return sendError(res, 400, 'user_id 필요');

  try { await assertAccess(sb, req.trainer.trainerId, userId, 'meals'); }
  catch(e) { return sendError(res, 403, e.message); }

  if (req.method === 'GET')  return listMeals(sb, userId, req, res);
  if (req.method === 'POST') return addMemo(sb, userId, req, res);
  return sendError(res, 405, 'method not allowed');
}

async function listMeals(sb, userId, req, res) {
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 30));
  const [{ data: meals, error: mErr }, { data: memos, error: memoErr }] = await Promise.all([
    sb.from('meal_logs')
      .select('id, foods, totals, meal_time, user_memo, store_tag, consumed_at')
      .eq('user_id', userId)
      .order('consumed_at', { ascending: false })
      .limit(limit),
    sb.from('coach_memos')
      .select('id, meal_log_id, text, created_at, trainer_id')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(200)
  ]);
  if (mErr) return sendError(res, 500, mErr.message);
  if (memoErr) return sendError(res, 500, memoErr.message);

  // 각 식단에 코치 메모 attach
  const memosByMeal = {};
  (memos || []).forEach(m => {
    if (m.meal_log_id) {
      memosByMeal[m.meal_log_id] = memosByMeal[m.meal_log_id] || [];
      memosByMeal[m.meal_log_id].push({ id: m.id, text: m.text, created_at: m.created_at, mine: m.trainer_id === req.trainer.trainerId });
    }
  });
  const mealsOut = (meals || []).map(m => ({ ...m, memos: memosByMeal[m.id] || [] }));
  const generalMemos = (memos || []).filter(m => !m.meal_log_id).map(m => ({
    id: m.id, text: m.text, created_at: m.created_at, mine: m.trainer_id === req.trainer.trainerId
  }));

  return res.status(200).json({ meals: mealsOut, general_memos: generalMemos });
}

async function addMemo(sb, userId, req, res) {
  const { text, meal_log_id, visible_to_user } = req.body || {};
  if (!text || !String(text).trim()) return sendError(res, 400, '메모 내용 필요');
  if (String(text).length > 1000) return sendError(res, 400, '1000자 이내');

  const { data, error } = await sb.from('coach_memos').insert({
    trainer_id: req.trainer.trainerId,
    user_id: userId,
    meal_log_id: meal_log_id || null,
    text: String(text).trim(),
    visible_to_user: visible_to_user !== false
  }).select('id, created_at').single();
  if (error) return sendError(res, 500, error.message);
  return res.status(200).json(data);
}

module.exports = requireTrainer(handler);
