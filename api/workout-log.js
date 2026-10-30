// 💪 운동 기록 CRUD + 운동 → 식단 추천 연동
//
//   POST   /api/workout-log  { workout_type, exercises, duration_min, memo }
//   GET    /api/workout-log  → 최근 20건
//   GET    /api/workout-log?today=1 → 오늘 1건
//   DELETE /api/workout-log?id=UUID

const { getServerClient, getOrCreateUser, sendError, applyCors } = require('./_supabase');

const VALID_TYPES = new Set(['chest','back','leg','shoulder','arm','core','cardio','full','other']);

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
  const todayOnly = req.query && req.query.today === '1';
  let query = sb
    .from('workout_logs')
    .select('id, workout_date, workout_type, exercises, duration_min, total_volume_kg, memo, created_at')
    .eq('user_id', user.id);
  if (todayOnly) {
    const today = new Date().toISOString().slice(0, 10);
    query = query.eq('workout_date', today);
  }
  const { data, error } = await query.order('workout_date', { ascending: false }).limit(todayOnly ? 1 : 30);
  if (error) return sendError(res, 500, error.message);

  // 7일 통계
  let stats = null;
  if (!todayOnly) {
    const sevenAgo = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10);
    const recent = (data || []).filter(w => w.workout_date >= sevenAgo);
    const typeCount = {};
    recent.forEach(w => {
      if (w.workout_type) typeCount[w.workout_type] = (typeCount[w.workout_type] || 0) + 1;
    });
    const totalVolume = recent.reduce((s, w) => s + (Number(w.total_volume_kg) || 0), 0);
    stats = {
      sessions_7d: recent.length,
      total_volume_7d: Math.round(totalVolume),
      types_7d: typeCount
    };
  }

  return res.status(200).json({ logs: data || [], stats });
}

async function handlePost(sb, user, req, res) {
  const { workout_type, exercises, duration_min, memo, workout_date } = req.body || {};
  const wt = workout_type && VALID_TYPES.has(workout_type) ? workout_type : 'other';
  const exes = Array.isArray(exercises) ? exercises : [];

  // 입력 정리 및 총 volume 계산
  let totalVolume = 0;
  const cleanExes = exes.slice(0, 30).map(e => {
    const name = String(e.name || '').trim().slice(0, 40);
    const sets = Array.isArray(e.sets) ? e.sets.slice(0, 20).map(s => {
      const w = Number(s.weight_kg) || 0;
      const r = Number(s.reps) || 0;
      totalVolume += w * r;
      return { weight_kg: w, reps: r };
    }) : [];
    return { name, sets, note: e.note ? String(e.note).slice(0, 100) : '' };
  }).filter(e => e.name);

  if (!cleanExes.length) return sendError(res, 400, '운동 1개 이상 필요');

  const { data, error } = await sb
    .from('workout_logs')
    .insert({
      user_id: user.id,
      workout_date: workout_date || new Date().toISOString().slice(0, 10),
      workout_type: wt,
      exercises: cleanExes,
      duration_min: duration_min ? Math.min(600, Math.max(1, Number(duration_min))) : null,
      total_volume_kg: totalVolume || null,
      memo: memo ? String(memo).slice(0, 500) : null
    })
    .select('id, workout_date, total_volume_kg')
    .single();
  if (error) return sendError(res, 500, error.message);
  return res.status(200).json(data);
}

async function handleDelete(sb, user, req, res) {
  const id = req.query && req.query.id;
  if (!id) return sendError(res, 400, 'id 필요');
  const { data, error } = await sb
    .from('workout_logs')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)
    .select('id');
  if (error) return sendError(res, 500, error.message);
  if (!data || !data.length) return sendError(res, 404, '기록 없음');
  return res.status(200).json({ ok: true });
}
