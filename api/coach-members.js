// 👥 트레이너의 회원 관리
//
//   GET  /api/coach-members                        → 내 회원 리스트
//   POST /api/coach-members  { code: "HLT-XXXXXX" } → 공유 코드로 회원 추가
//
// 헤더: Authorization: Bearer <JWT>

const { getServerClient, sendError, applyCors } = require('./_supabase');
const { requireTrainer } = require('./_coachAuth');

async function handler(req, res) {
  applyCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  const sb = getServerClient();
  if (req.method === 'GET')  return listMembers(sb, req, res);
  if (req.method === 'POST') return addMember(sb, req, res);
  return sendError(res, 405, 'method not allowed');
}

async function listMembers(sb, req, res) {
  const { data, error } = await sb
    .from('coach_access')
    .select(`
      id, granted_at, scopes,
      user:app_users(id, nickname, last_active_at)
    `)
    .eq('trainer_id', req.trainer.trainerId)
    .is('revoked_at', null)
    .order('granted_at', { ascending: false });
  if (error) return sendError(res, 500, error.message);

  // 각 회원의 최근 식단 요약 (최근 7일 끼니 수 + 마지막 식단 시각)
  const members = await Promise.all((data || []).map(async row => {
    const u = row.user || {};
    const sevenAgo = new Date(Date.now() - 7 * 86400000).toISOString();
    const { count: meals7d } = await sb
      .from('meal_logs')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', u.id)
      .gt('consumed_at', sevenAgo);
    const { data: lastMeal } = await sb
      .from('meal_logs')
      .select('consumed_at')
      .eq('user_id', u.id)
      .order('consumed_at', { ascending: false })
      .limit(1);
    return {
      user_id: u.id,
      nickname: u.nickname || '회원',
      last_active_at: u.last_active_at,
      granted_at: row.granted_at,
      scopes: row.scopes,
      meals_last_7d: meals7d || 0,
      last_meal_at: lastMeal && lastMeal[0] ? lastMeal[0].consumed_at : null
    };
  }));

  return res.status(200).json({ members });
}

async function addMember(sb, req, res) {
  const code = (req.body && req.body.code || '').trim().toUpperCase();
  if (!/^HLT-[A-Z0-9]{6,10}$/.test(code))
    return sendError(res, 400, '코드 형식 오류 (예: HLT-A3K9XQ)');

  // 코드 유효성 확인
  const { data: sc, error: scErr } = await sb
    .from('share_codes')
    .select('code, user_id, expires_at, revoked, scopes')
    .eq('code', code)
    .maybeSingle();
  if (scErr) return sendError(res, 500, scErr.message);
  if (!sc) return sendError(res, 404, '존재하지 않는 코드');
  if (sc.revoked) return sendError(res, 410, '폐기된 코드 · 회원에게 재발급 요청');
  if (new Date(sc.expires_at).getTime() < Date.now())
    return sendError(res, 410, '만료된 코드 · 회원에게 재발급 요청');

  // 이미 등록되어 있나?
  const { data: existing } = await sb
    .from('coach_access')
    .select('id, revoked_at')
    .eq('user_id', sc.user_id)
    .eq('trainer_id', req.trainer.trainerId)
    .maybeSingle();

  if (existing && !existing.revoked_at) {
    return sendError(res, 409, '이미 등록된 회원');
  }

  if (existing && existing.revoked_at) {
    // 재등록 (복구)
    await sb.from('coach_access').update({
      revoked_at: null, revoked_by: null,
      granted_at: new Date().toISOString(),
      granted_via_code: code,
      scopes: sc.scopes
    }).eq('id', existing.id);
  } else {
    const { error: insErr } = await sb.from('coach_access').insert({
      user_id: sc.user_id,
      trainer_id: req.trainer.trainerId,
      granted_via_code: code,
      scopes: sc.scopes
    });
    if (insErr) return sendError(res, 500, insErr.message);
  }

  // used_count 증가
  await sb.rpc ? null : null; // placeholder (increment은 raw SQL 또는 두 번 쿼리)
  const { data: cur } = await sb.from('share_codes').select('used_count').eq('code', code).single();
  await sb.from('share_codes').update({ used_count: (cur?.used_count || 0) + 1 }).eq('code', code);

  return res.status(200).json({ ok: true, user_id: sc.user_id });
}

module.exports = requireTrainer(handler);
