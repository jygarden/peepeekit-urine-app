// 👤 PT 트레이너 가입
//
//   POST /api/coach-register
//   body: { email, password, name, gym_name?, phone? }
//   → { token, trainer: { id, email, name, gym_name } }

const { getServerClient, sendError, applyCors } = require('./_supabase');
const { hashPassword, issueTrainerToken } = require('./_coachAuth');

module.exports = async function handler(req, res) {
  applyCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return sendError(res, 405, 'POST only');

  let { email, password, name, gym_name, phone } = req.body || {};
  email = (email || '').trim().toLowerCase();
  name = (name || '').trim();
  gym_name = gym_name ? String(gym_name).trim().slice(0, 60) : null;
  phone = phone ? String(phone).trim() : null;

  if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email))
    return sendError(res, 400, '이메일 형식 오류');
  if (!password || password.length < 8)
    return sendError(res, 400, '비밀번호는 8자 이상');
  if (!name || name.length > 40)
    return sendError(res, 400, '이름은 1~40자');

  try {
    const sb = getServerClient();
    const password_hash = await hashPassword(password);
    const { data, error } = await sb
      .from('trainers')
      .insert({ email, password_hash, name, gym_name, phone })
      .select('id, email, name, gym_name')
      .single();
    if (error) {
      if (error.code === '23505') return sendError(res, 409, '이미 가입된 이메일');
      return sendError(res, 500, error.message);
    }
    const token = issueTrainerToken(data);
    return res.status(200).json({ token, trainer: data });
  } catch(e) {
    console.error('[coach-register]', e.message);
    return sendError(res, 500, e.message);
  }
};
