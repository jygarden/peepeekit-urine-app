// ⚙️ 사용자 환경설정 (추천 모드 · 공유 범위 · 취향 · 알림)
//   GET  /api/user-preferences → { recommendation_mode, share_scope, taste_prefs, ... }
//   POST /api/user-preferences { recommendation_mode?, share_scope?, taste_prefs?, push_enabled? }

const { getServerClient, getOrCreateUser, sendError, applyCors } = require('./_supabase');

const DEFAULTS = {
  recommendation_mode: 'free',
  share_scope: { meals:true, workouts:true, inbody:true, glucose:false, bp:false, urine:false },
  taste_prefs: null,
  measurement_reminder_days: 7,
  push_enabled: true
};

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

  if (req.method === 'GET')  return handleGet(sb, user, res);
  if (req.method === 'POST') return handlePost(sb, user, req, res);
  return sendError(res, 405, 'method not allowed');
};

async function handleGet(sb, user, res) {
  const { data } = await sb
    .from('user_preferences').select('*').eq('user_id', user.id).maybeSingle();
  if (!data) return res.status(200).json(DEFAULTS);
  return res.status(200).json({
    recommendation_mode: data.recommendation_mode || DEFAULTS.recommendation_mode,
    share_scope: data.share_scope || DEFAULTS.share_scope,
    taste_prefs: data.taste_prefs || null,
    measurement_reminder_days: data.measurement_reminder_days || 7,
    push_enabled: data.push_enabled !== false
  });
}

async function handlePost(sb, user, req, res) {
  const b = req.body || {};
  const patch = { user_id: user.id, updated_at: new Date().toISOString() };

  if (b.recommendation_mode && ['free','healthy','medical','auto'].includes(b.recommendation_mode))
    patch.recommendation_mode = b.recommendation_mode;
  if (b.share_scope && typeof b.share_scope === 'object') patch.share_scope = b.share_scope;
  if (b.taste_prefs !== undefined) patch.taste_prefs = b.taste_prefs;
  if (b.measurement_reminder_days != null)
    patch.measurement_reminder_days = Math.max(1, Math.min(30, parseInt(b.measurement_reminder_days)));
  if (typeof b.push_enabled === 'boolean') patch.push_enabled = b.push_enabled;

  const { error } = await sb
    .from('user_preferences')
    .upsert(patch, { onConflict: 'user_id' });
  if (error) return sendError(res, 500, error.message);
  return res.status(200).json({ ok: true });
}
