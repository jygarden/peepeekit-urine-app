// ═══════════════════════════════════════════════════════════════
// 운동 루틴 저장 · 공유 · 가져오기
//
//   GET  /api/workout-routine          → 내 루틴 리스트
//   GET  /api/workout-routine?shared=1 → 내 메이트 공유 루틴
//   GET  /api/workout-routine?id=UUID  → 단일 루틴 상세
//   POST /api/workout-routine          { name, workout_type, exercises, is_shared }
//   POST /api/workout-routine action=copy { id }  → 메이트 루틴 복사
//   PATCH /api/workout-routine?id=UUID { is_shared?, name? }
//   DELETE /api/workout-routine?id=UUID
// ═══════════════════════════════════════════════════════════════

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
  if (req.method === 'PATCH')  return handlePatch(sb, user, req, res);
  if (req.method === 'DELETE') return handleDelete(sb, user, req, res);
  return sendError(res, 405, 'method not allowed');
};

async function handleGet(sb, user, req, res) {
  const q = req.query || {};
  if (q.id) {
    const { data, error } = await sb.from('workout_routines')
      .select('id, owner_id, name, workout_type, exercises, is_shared, copy_count, created_at')
      .eq('id', q.id).single();
    if (error) return sendError(res, 404, '루틴 없음');
    // 접근 권한: 본인 or shared
    if (data.owner_id !== user.id && !data.is_shared) return sendError(res, 403, '권한 없음');
    return res.status(200).json(data);
  }
  if (q.shared === '1') {
    // 내가 메이트로 받아들인 사람들의 공유 루틴
    const { data: mates = [] } = await sb.from('mate_connections')
      .select('mate_id').eq('viewer_id', user.id).eq('status', 'active');
    const mateIds = mates.map(m => m.mate_id);
    if (!mateIds.length) return res.status(200).json({ routines: [] });
    const { data, error } = await sb.from('workout_routines')
      .select('id, owner_id, name, workout_type, exercises, copy_count, created_at')
      .in('owner_id', mateIds).eq('is_shared', true)
      .order('created_at', { ascending: false }).limit(50);
    if (error) return sendError(res, 500, error.message);
    // 소유자 닉네임
    const { data: profs = [] } = await sb.from('app_users').select('id, nickname').in('id', mateIds);
    const nickMap = Object.fromEntries(profs.map(p => [p.id, p.nickname || '익명']));
    return res.status(200).json({ routines: (data || []).map(r => ({ ...r, owner_name: nickMap[r.owner_id] || '익명' })) });
  }
  // 내 루틴 전체
  const { data, error } = await sb.from('workout_routines')
    .select('id, name, workout_type, exercises, is_shared, copy_count, created_at')
    .eq('owner_id', user.id)
    .order('created_at', { ascending: false }).limit(50);
  if (error) return sendError(res, 500, error.message);
  return res.status(200).json({ routines: data || [] });
}

async function handlePost(sb, user, req, res) {
  const b = req.body || {};

  if (b.action === 'copy') {
    const srcId = b.id;
    if (!srcId) return sendError(res, 400, 'id 필요');
    const { data: src, error: e1 } = await sb.from('workout_routines')
      .select('name, workout_type, exercises, owner_id, is_shared').eq('id', srcId).single();
    if (e1) return sendError(res, 404, '루틴 없음');
    if (!src.is_shared && src.owner_id !== user.id) return sendError(res, 403, '공유 안 됨');
    const copyName = `${src.name} (복사)`;
    const { data, error } = await sb.from('workout_routines').insert({
      owner_id: user.id, name: copyName.slice(0, 60),
      workout_type: src.workout_type, exercises: src.exercises,
      is_shared: false, copied_from_id: srcId
    }).select('id, name').single();
    if (error) return sendError(res, 500, error.message);
    // 원본 copy_count 증가 (실패 무시)
    sb.rpc('increment_routine_copy', { routine_id: srcId }).then(()=>{}).catch(()=>{});
    try { await sb.from('workout_routines').update({ copy_count: (await sb.from('workout_routines').select('copy_count').eq('id', srcId).single()).data.copy_count + 1 }).eq('id', srcId); } catch(e){}
    return res.status(200).json({ ok: true, new_id: data.id });
  }

  const name = String(b.name || '').trim().slice(0, 60);
  if (!name) return sendError(res, 400, 'name 필요');
  const exercises = Array.isArray(b.exercises) ? b.exercises.slice(0, 30) : [];
  if (!exercises.length) return sendError(res, 400, 'exercises 필요');

  const { data, error } = await sb.from('workout_routines').insert({
    owner_id: user.id, name,
    workout_type: b.workout_type || null,
    exercises, is_shared: !!b.is_shared
  }).select('id, name').single();
  if (error) return sendError(res, 500, error.message);
  return res.status(200).json({ ok: true, id: data.id });
}

async function handlePatch(sb, user, req, res) {
  const id = req.query && req.query.id;
  if (!id) return sendError(res, 400, 'id 필요');
  const b = req.body || {};
  const patch = {};
  if (b.name !== undefined)      patch.name = String(b.name).trim().slice(0, 60);
  if (b.is_shared !== undefined) patch.is_shared = !!b.is_shared;
  if (!Object.keys(patch).length) return sendError(res, 400, '수정할 필드 없음');
  patch.updated_at = new Date().toISOString();
  const { data, error } = await sb.from('workout_routines')
    .update(patch).eq('id', id).eq('owner_id', user.id).select('id').single();
  if (error) return sendError(res, 404, '권한 없음 or 루틴 없음');
  return res.status(200).json({ ok: true });
}

async function handleDelete(sb, user, req, res) {
  const id = req.query && req.query.id;
  if (!id) return sendError(res, 400, 'id 필요');
  const { data, error } = await sb.from('workout_routines')
    .delete().eq('id', id).eq('owner_id', user.id).select('id');
  if (error) return sendError(res, 500, error.message);
  if (!data || !data.length) return sendError(res, 404, '권한 없음');
  return res.status(200).json({ ok: true });
}
