// 🎫 공유 코드 발급·조회·폐기
//
// 흐름:
//   POST  /api/user-share-code  → 새 코드 발급 (기존 유효 코드 폐기 후 재발급)
//   GET   /api/user-share-code  → 현재 활성 코드 조회
//   DELETE /api/user-share-code → 모든 공유 끊기 (coach_access 전부 revoke)
//
// 보안:
//   - x-device-id 헤더 필수
//   - 발급 레이트 제한: 디바이스당 하루 3회
//   - 코드 유효기간: 7일

const {
  getServerClient, getOrCreateUser, generateUniqueShareCode,
  sendError, applyCors
} = require('./_supabase');

const SHARE_CODE_TTL_DAYS = 7;
const DAILY_ISSUE_LIMIT = 3;

module.exports = async function handler(req, res) {
  applyCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  const deviceId = req.headers['x-device-id'];
  if (!deviceId) return sendError(res, 400, 'device_id 헤더 누락');

  const nickname = req.headers['x-nickname'] || (req.body && req.body.nickname);
  let sb, user;
  try {
    sb = getServerClient();
    user = await getOrCreateUser(sb, deviceId, { nickname });
  } catch (e) {
    console.error('[share-code] auth', e.message);
    return sendError(res, 400, e.message);
  }

  if (req.method === 'GET')    return handleGet(sb, user, res);
  if (req.method === 'POST')   return handlePost(sb, user, res);
  if (req.method === 'DELETE') return handleDelete(sb, user, res);
  return sendError(res, 405, 'method not allowed');
};

async function handleGet(sb, user, res) {
  const { data, error } = await sb
    .from('share_codes')
    .select('code, expires_at, used_count, revoked, scopes')
    .eq('user_id', user.id)
    .eq('revoked', false)
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false })
    .limit(1);
  if (error) return sendError(res, 500, error.message);
  const active = (data && data[0]) || null;
  return res.status(200).json({ active });
}

async function handlePost(sb, user, res) {
  // 하루 발급 제한 체크 + 기존 코드 폐기를 병렬로 (대기 시간 단축)
  const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
  const expiresAt = new Date(Date.now() + SHARE_CODE_TTL_DAYS * 24 * 3600 * 1000).toISOString();
  const code = generateUniqueShareCode();

  // 1·2·3번 쿼리 병렬 실행
  const [countRes, _revokeRes, insertRes] = await Promise.all([
    sb.from('share_codes')
      .select('code', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .gt('created_at', since),
    sb.from('share_codes')
      .update({ revoked: true })
      .eq('user_id', user.id)
      .eq('revoked', false),
    sb.from('share_codes')
      .insert({ code, user_id: user.id, expires_at: expiresAt })
      .select('code, expires_at, scopes')
      .single()
  ]);

  // 하루 제한 초과면 방금 insert한 코드도 무효화 (낭비지만 낙관적 처리로 UX 우선)
  if ((countRes.count || 0) >= DAILY_ISSUE_LIMIT) {
    await sb.from('share_codes').update({ revoked: true }).eq('code', code);
    return sendError(res, 429, `하루 ${DAILY_ISSUE_LIMIT}회까지 발급 가능 · 24시간 후 다시 시도`);
  }
  if (insertRes.error) {
    // 코드 충돌 시 1회 재시도
    const retry = generateUniqueShareCode();
    const r2 = await sb.from('share_codes')
      .insert({ code: retry, user_id: user.id, expires_at: expiresAt })
      .select('code, expires_at, scopes')
      .single();
    if (r2.error) return sendError(res, 500, r2.error.message);
    return res.status(200).json({
      code: r2.data.code,
      expires_at: r2.data.expires_at,
      scopes: r2.data.scopes,
      ttl_days: SHARE_CODE_TTL_DAYS
    });
  }

  return res.status(200).json({
    code: insertRes.data.code,
    expires_at: insertRes.data.expires_at,
    scopes: insertRes.data.scopes,
    ttl_days: SHARE_CODE_TTL_DAYS
  });
}

async function handleDelete(sb, user, res) {
  // 1. 모든 활성 공유 코드 폐기
  await sb.from('share_codes')
    .update({ revoked: true })
    .eq('user_id', user.id)
    .eq('revoked', false);

  // 2. 모든 PT 접근 해제
  const nowIso = new Date().toISOString();
  const { data: revoked, error } = await sb
    .from('coach_access')
    .update({ revoked_at: nowIso, revoked_by: 'user' })
    .eq('user_id', user.id)
    .is('revoked_at', null)
    .select('trainer_id');
  if (error) return sendError(res, 500, error.message);

  return res.status(200).json({
    ok: true,
    revoked_coaches: (revoked || []).length
  });
}
