// 📏 인바디/체성분 기록 CRUD
//
//   POST   /api/body-log          { weight_kg, body_fat_pct, muscle_mass_kg, waist_cm, memo, photo_base64? }
//   GET    /api/body-log          → 최근 30건 (그래프용)
//   GET    /api/body-log?latest=1 → 가장 최근 1건
//   DELETE /api/body-log?id=UUID
//
// 보안: x-device-id 헤더 필수

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

  if (req.method === 'GET')    return handleGet(sb, user, req, res);
  if (req.method === 'POST')   return handlePost(sb, user, req, res);
  if (req.method === 'DELETE') return handleDelete(sb, user, req, res);
  return sendError(res, 405, 'method not allowed');
};

async function handleGet(sb, user, req, res) {
  const latest = req.query && req.query.latest === '1';
  const limit = latest ? 1 : Math.min(90, parseInt(req.query.limit) || 30);
  const { data, error } = await sb
    .from('body_logs')
    .select('id, weight_kg, body_fat_pct, muscle_mass_kg, waist_cm, photo_path, memo, recorded_at')
    .eq('user_id', user.id)
    .order('recorded_at', { ascending: false })
    .limit(limit);
  if (error) return sendError(res, 500, error.message);

  // 변화량 계산 (전주/전월 비교)
  let changes = null;
  if (!latest && data && data.length >= 2) {
    const now = data[0];
    const findPast = (daysAgo) => {
      const target = new Date(Date.now() - daysAgo * 86400000);
      return data.find(d => new Date(d.recorded_at) <= target);
    };
    const week = findPast(7);
    const month = findPast(30);
    const diff = (a, b, key) => (a && b && a[key] != null && b[key] != null) ? +(a[key] - b[key]).toFixed(1) : null;
    changes = {
      week_ago: week ? { weight: diff(now, week, 'weight_kg'), body_fat: diff(now, week, 'body_fat_pct'), muscle: diff(now, week, 'muscle_mass_kg') } : null,
      month_ago: month ? { weight: diff(now, month, 'weight_kg'), body_fat: diff(now, month, 'body_fat_pct'), muscle: diff(now, month, 'muscle_mass_kg') } : null
    };
  }

  return res.status(200).json({ logs: data || [], changes });
}

async function handlePost(sb, user, req, res) {
  const { weight_kg, body_fat_pct, muscle_mass_kg, waist_cm, memo, photo_base64, recorded_at } = req.body || {};

  // 입력 검증
  if (weight_kg != null) {
    const w = Number(weight_kg);
    if (!(w >= 20 && w <= 300)) return sendError(res, 400, '체중 범위 오류 (20~300kg)');
  }
  if (body_fat_pct != null) {
    const b = Number(body_fat_pct);
    if (!(b >= 1 && b <= 70)) return sendError(res, 400, '체지방 범위 오류 (1~70%)');
  }

  // 사진 업로드 (선택)
  let photoPath = null;
  if (photo_base64 && typeof photo_base64 === 'string' && photo_base64.length > 100) {
    try {
      const buffer = Buffer.from(photo_base64.replace(/^data:image\/\w+;base64,/, ''), 'base64');
      // 10MB 제한
      if (buffer.length > 10 * 1024 * 1024) return sendError(res, 400, '사진 10MB 이내');
      const filename = `${user.id}/${Date.now()}.jpg`;
      const { error: upErr } = await sb.storage.from('body-photos').upload(filename, buffer, {
        contentType: 'image/jpeg',
        upsert: false
      });
      if (upErr) {
        console.warn('[body-log] photo upload fail', upErr.message);
      } else {
        photoPath = filename;
      }
    } catch(e) {
      console.warn('[body-log] photo parse fail', e.message);
    }
  }

  const { data, error } = await sb
    .from('body_logs')
    .insert({
      user_id: user.id,
      weight_kg: weight_kg != null ? Number(weight_kg) : null,
      body_fat_pct: body_fat_pct != null ? Number(body_fat_pct) : null,
      muscle_mass_kg: muscle_mass_kg != null ? Number(muscle_mass_kg) : null,
      waist_cm: waist_cm != null ? Number(waist_cm) : null,
      photo_path: photoPath,
      memo: memo ? String(memo).slice(0, 500) : null,
      recorded_at: recorded_at || new Date().toISOString()
    })
    .select('id, recorded_at')
    .single();
  if (error) return sendError(res, 500, error.message);
  return res.status(200).json({ id: data.id, recorded_at: data.recorded_at, photo_path: photoPath });
}

async function handleDelete(sb, user, req, res) {
  const id = req.query && req.query.id;
  if (!id) return sendError(res, 400, 'id 필요');
  const { data, error } = await sb
    .from('body_logs')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)
    .select('id');
  if (error) return sendError(res, 500, error.message);
  if (!data || !data.length) return sendError(res, 404, '기록 없음');
  return res.status(200).json({ ok: true });
}
