// 🔒 Supabase 공통 헬퍼 · PT 코치 모드
//
// 보안 원칙:
//   - 서버 사이드 전용 · service role key (SUPABASE_SECRET_KEY) 사용
//   - RLS deny-by-default이므로 service role 외에는 아무것도 못 함
//   - anon key는 쓰지 않음 (쓰면 RLS에 막힘)
//
// 사용 예:
//   const { getServerClient, getOrCreateUser } = require('./_supabase');
//   const sb = getServerClient();
//   const user = await getOrCreateUser(sb, req.headers['x-device-id']);

const { createClient } = require('@supabase/supabase-js');

let _cachedClient = null;

/**
 * service role 클라이언트 (RLS 우회)
 * 반드시 서버 API에서만 사용. 응답 바디에 노출 금지.
 */
function getServerClient() {
  if (_cachedClient) return _cachedClient;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) {
    throw new Error('Supabase 서버 자격 증명 미설정 (SUPABASE_URL / SUPABASE_SECRET_KEY)');
  }
  _cachedClient = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false }
  });
  return _cachedClient;
}

/**
 * device_id로 app_users 조회·생성 (idempotent)
 * @returns {object} { id, device_id, nickname, created_at, ... }
 */
async function getOrCreateUser(sb, deviceId, opts = {}) {
  if (!deviceId || typeof deviceId !== 'string' || deviceId.length < 8 || deviceId.length > 100) {
    throw new Error('invalid device_id');
  }
  // 한글 nickname은 클라이언트가 encodeURIComponent로 보내므로 디코딩
  let rawNick = opts.nickname ? String(opts.nickname) : null;
  if (rawNick) {
    try { rawNick = decodeURIComponent(rawNick); } catch(e) { /* 원문 유지 */ }
  }
  const nickname = rawNick ? rawNick.trim().slice(0, 20) : null;
  // 1차 조회
  let { data: user, error } = await sb
    .from('app_users')
    .select('*')
    .eq('device_id', deviceId)
    .maybeSingle();
  if (error) throw error;
  if (user) {
    // 닉네임 바뀌었거나 비어있으면 갱신 + last_active
    const patch = { last_active_at: new Date().toISOString() };
    if (nickname && nickname !== user.nickname) patch.nickname = nickname;
    const last = user.last_active_at ? new Date(user.last_active_at).getTime() : 0;
    if (patch.nickname || Date.now() - last > 60000) {
      await sb.from('app_users').update(patch).eq('id', user.id);
      if (patch.nickname) user.nickname = patch.nickname;
    }
    return user;
  }
  // 신규 생성
  const { data: created, error: insErr } = await sb
    .from('app_users')
    .insert({ device_id: deviceId, nickname })
    .select()
    .single();
  if (insErr) {
    // 레이스: 동시에 두 요청이 오면 unique 충돌 → 재조회
    if (insErr.code === '23505') {
      const retry = await sb.from('app_users').select('*').eq('device_id', deviceId).single();
      if (!retry.error) return retry.data;
    }
    throw insErr;
  }
  return created;
}

/**
 * 10자리 영숫자 대문자 (헷갈리는 문자 제외: I, O, 0, 1)
 * 예: "HLT-A3K9XQ"
 */
function generateShareCode() {
  const alphabet = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ'; // 32자
  let suffix = '';
  for (let i = 0; i < 6; i++) {
    suffix += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return `HLT-${suffix}`;
}

/**
 * 충돌 없는 코드 생성 (최대 5회 재시도)
 */
async function generateUniqueShareCode(sb) {
  for (let i = 0; i < 5; i++) {
    const code = generateShareCode();
    const { data } = await sb.from('share_codes').select('code').eq('code', code).maybeSingle();
    if (!data) return code;
  }
  throw new Error('공유 코드 생성 실패 (충돌)');
}

/**
 * 공통 에러 응답
 */
function sendError(res, status, message, extra) {
  const body = { error: message };
  if (extra) Object.assign(body, extra);
  return res.status(status).json(body);
}

/**
 * 공통 CORS/OPTIONS 처리
 */
function applyCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, PATCH, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Device-Id');
}

module.exports = {
  getServerClient,
  getOrCreateUser,
  generateShareCode,
  generateUniqueShareCode,
  sendError,
  applyCors
};
