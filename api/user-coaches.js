// 👥 내 PT 목록 · 특정 PT 접근 해제
//
//   GET    /api/user-coaches              → 내 PT 리스트
//   DELETE /api/user-coaches?trainer_id=  → 특정 PT 접근 해제

const { getServerClient, getOrCreateUser, sendError, applyCors } = require('./_supabase');

module.exports = async function handler(req, res) {
  applyCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  const deviceId = req.headers['x-device-id'];
  if (!deviceId) return sendError(res, 400, 'device_id 헤더 누락');

  const nickname = req.headers['x-nickname'];
  let sb, user;
  try {
    sb = getServerClient();
    user = await getOrCreateUser(sb, deviceId, { nickname });
  } catch (e) {
    return sendError(res, 400, e.message);
  }

  if (req.method === 'GET')    return handleList(sb, user, res);
  if (req.method === 'DELETE') return handleRevoke(sb, user, req, res);
  return sendError(res, 405, 'method not allowed');
};

async function handleList(sb, user, res) {
  const { data, error } = await sb
    .from('coach_access')
    .select(`
      id, granted_at, scopes, granted_via_code,
      trainer:trainers(id, name, gym_name)
    `)
    .eq('user_id', user.id)
    .is('revoked_at', null)
    .order('granted_at', { ascending: false });
  if (error) return sendError(res, 500, error.message);
  return res.status(200).json({ coaches: data || [] });
}

async function handleRevoke(sb, user, req, res) {
  const trainerId = (req.query && req.query.trainer_id) ||
                    (req.body && req.body.trainer_id);
  if (!trainerId) return sendError(res, 400, 'trainer_id 필요');

  const { data, error } = await sb
    .from('coach_access')
    .update({ revoked_at: new Date().toISOString(), revoked_by: 'user' })
    .eq('user_id', user.id)
    .eq('trainer_id', trainerId)
    .is('revoked_at', null)
    .select('id');
  if (error) return sendError(res, 500, error.message);
  if (!data || !data.length) return sendError(res, 404, '등록된 PT가 아니거나 이미 해제됨');
  return res.status(200).json({ ok: true, revoked: data.length });
}
