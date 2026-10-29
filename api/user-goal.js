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
    const goal = req.body && req.body.goal;
    if (goal !== null && !VALID_GOALS.has(goal)) {
      return sendError(res, 400, '잘못된 목표');
    }
    const { data, error } = await sb
      .from('app_users')
      .update({ goal, goal_updated_at: new Date().toISOString() })
      .eq('id', user.id)
      .select('goal, goal_updated_at')
      .single();
    if (error) return sendError(res, 500, error.message);
    return res.status(200).json(data);
  }

  return sendError(res, 405, 'method not allowed');
};
