// 🔑 PT 트레이너 로그인
//
//   POST /api/coach-login
//   body: { email, password }
//   → { token, trainer: { id, email, name, gym_name } }
//
// 보안: 5회 연속 실패 시 15분 잠금

const { getServerClient, sendError, applyCors } = require('./_supabase');
const { verifyPassword, issueTrainerToken } = require('./_coachAuth');

const LOCK_THRESHOLD = 5;
const LOCK_DURATION_MIN = 15;

module.exports = async function handler(req, res) {
  applyCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return sendError(res, 405, 'POST only');

  let { email, password } = req.body || {};
  email = (email || '').trim().toLowerCase();
  if (!email || !password) return sendError(res, 400, '이메일/비밀번호 필요');

  try {
    const sb = getServerClient();
    const { data: trainer, error } = await sb
      .from('trainers')
      .select('id, email, password_hash, name, gym_name, failed_login_count, locked_until')
      .eq('email', email)
      .maybeSingle();
    if (error) return sendError(res, 500, error.message);
    if (!trainer) return sendError(res, 401, '이메일 또는 비밀번호가 틀렸어요'); // 이메일 존재 노출 방지

    // 잠금 확인
    if (trainer.locked_until && new Date(trainer.locked_until).getTime() > Date.now()) {
      const left = Math.ceil((new Date(trainer.locked_until).getTime() - Date.now()) / 60000);
      return sendError(res, 423, `${LOCK_THRESHOLD}회 연속 실패로 잠김 · ${left}분 후 재시도`);
    }

    const ok = await verifyPassword(password, trainer.password_hash);
    if (!ok) {
      const next = (trainer.failed_login_count || 0) + 1;
      const lockPatch = next >= LOCK_THRESHOLD
        ? { failed_login_count: 0, locked_until: new Date(Date.now() + LOCK_DURATION_MIN * 60000).toISOString() }
        : { failed_login_count: next };
      await sb.from('trainers').update(lockPatch).eq('id', trainer.id);
      return sendError(res, 401, '이메일 또는 비밀번호가 틀렸어요');
    }

    // 로그인 성공 → 카운터 초기화 + 마지막 로그인 갱신
    await sb.from('trainers').update({
      failed_login_count: 0,
      locked_until: null,
      last_login_at: new Date().toISOString()
    }).eq('id', trainer.id);

    const token = issueTrainerToken(trainer);
    return res.status(200).json({
      token,
      trainer: {
        id: trainer.id, email: trainer.email,
        name: trainer.name, gym_name: trainer.gym_name
      }
    });
  } catch(e) {
    console.error('[coach-login]', e.message);
    return sendError(res, 500, e.message);
  }
};
