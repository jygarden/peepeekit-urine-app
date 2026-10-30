// 🎯 일일 챌린지 완료 체크·조회
//
//   POST /api/challenge  { challenge_id, points }  → 완료 처리
//   GET  /api/challenge                             → 오늘 완료 리스트

const { getServerClient, getOrCreateUser, sendError, applyCors } = require('./_supabase');

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
  } catch(e) { return sendError(res, 400, e.message); }

  if (req.method === 'GET') {
    const today = new Date().toISOString().slice(0, 10);
    const sevenAgo = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10);
    const [todayRes, weekRes] = await Promise.all([
      sb.from('challenge_completions').select('challenge_id, points_awarded, completed_at')
        .eq('user_id', user.id).eq('completed_date', today),
      sb.from('challenge_completions').select('id', { count: 'exact', head: true })
        .eq('user_id', user.id).gte('completed_date', sevenAgo)
    ]);
    return res.status(200).json({
      today: todayRes.data || [],
      week_count: weekRes.count || 0
    });
  }

  if (req.method === 'POST') {
    const { challenge_id, points } = req.body || {};
    if (!challenge_id) return sendError(res, 400, 'challenge_id 필요');
    const cleanId = String(challenge_id).slice(0, 50);
    const pts = Math.min(500, Math.max(0, Number(points) || 10));

    const { data, error } = await sb
      .from('challenge_completions')
      .insert({
        user_id: user.id,
        challenge_id: cleanId,
        points_awarded: pts
      })
      .select('id, completed_at')
      .single();

    if (error) {
      // 이미 완료한 챌린지
      if (error.code === '23505') return sendError(res, 409, '오늘 이미 완료');
      return sendError(res, 500, error.message);
    }
    return res.status(200).json({ ok: true, id: data.id, points_awarded: pts });
  }

  return sendError(res, 405, 'method not allowed');
};
