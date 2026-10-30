// 🎯 이용자 식단 목표 CRUD
//
//   GET  /api/user-goal → { goal, updated_at }
//   POST /api/user-goal  { goal } → 저장
//
// goal 값: weight_loss | muscle_gain | balance | nutrition | wellness | disease_mgmt

const { getServerClient, getOrCreateUser, sendError, applyCors } = require('./_supabase');

const VALID_GOALS = new Set([
  'weight_loss', 'muscle_gain', 'balance', 'nutrition', 'wellness', 'disease_mgmt'
]);

module.exports = async function handler(req, res) {
  applyCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  const deviceId = req.headers['x-device-id'];
  if (!deviceId) return sendError(res, 400, 'device_id 헤더 누락');

  let nickname = req.headers['x-nickname'];
  if (nickname) { try { nickname = decodeURIComponent(nickname); } catch(e){} }

  let sb, user;
  try {
    sb = getServerClient();
    user = await getOrCreateUser(sb, deviceId, { nickname });
  } catch (e) {
    return sendError(res, 400, e.message);
  }

  if (req.method === 'GET') {
    return res.status(200).json({
      goal: user.goal || null,
      updated_at: user.goal_updated_at || null
    });
  }

  if (req.method === 'POST') {
    const rawGoal = req.body && req.body.goal;
    // CSV 형식 지원 ('weight_loss,wellness') · 각 요소 검증
    let goalToSave = null;
    if (rawGoal) {
      const parts = String(rawGoal).split(',').map(s => s.trim()).filter(Boolean);
      for (const p of parts) {
        if (!VALID_GOALS.has(p)) return sendError(res, 400, `잘못된 목표: ${p}`);
      }
      goalToSave = parts.join(',');
    }
    const { data, error } = await sb
      .from('app_users')
      .update({ goal: goalToSave, goal_updated_at: new Date().toISOString() })
      .eq('id', user.id)
      .select('goal, goal_updated_at')
      .single();
    if (error) return sendError(res, 500, error.message);
    return res.status(200).json(data);
  }

  return sendError(res, 405, 'method not allowed');
};
