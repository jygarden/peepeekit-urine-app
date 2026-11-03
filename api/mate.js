// 👥 식단메이트 · 이용자끼리 양방향 식단 공유
//
//   POST   /api/mate            { code }      → 내가 상대 식단 보기 추가
//   GET    /api/mate                           → 내가 보고 있는 메이트 리스트
//   DELETE /api/mate?owner_id=UUID             → 메이트 끊기 (내 쪽에서 안 봄)
//   GET    /api/mate?action=meals&owner_id=UUID&limit=30 → 특정 메이트 식단 피드

const { getServerClient, getOrCreateUser, sendError, applyCors } = require('./_supabase');

module.exports = async function handler(req, res) {
  applyCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  const deviceId = req.headers['x-device-id'];
  if (!deviceId) return sendError(res, 400, 'device_id 헤더 누락');

  const nickname = req.headers['x-nickname'];
  let sb, viewer;
  try {
    sb = getServerClient();
    viewer = await getOrCreateUser(sb, deviceId, { nickname });
  } catch (e) {
    return sendError(res, 400, e.message);
  }

  // GET + action=meals → 식단 피드 (메세지 포함)
  if (req.method === 'GET' && req.query.action === 'meals') {
    return getMealFeed(sb, viewer, req, res);
  }
  // GET + action=workouts → 운동 피드
  if (req.method === 'GET' && req.query.action === 'workouts') {
    return getWorkoutFeed(sb, viewer, req, res);
  }
  // GET + action=summary → 종합 (영양 평균·부족 영양소·운동 통계)
  if (req.method === 'GET' && req.query.action === 'summary') {
    return getMateSummary(sb, viewer, req, res);
  }
  // GET + action=viewers → 내 식단을 보고 있는 사람 리스트 (owner_id=나)
  if (req.method === 'GET' && req.query.action === 'viewers') {
    return listViewers(sb, viewer, res);
  }
  // DELETE + action=remove_viewer → 특정 viewer 끊기 (owner 쪽에서)
  if (req.method === 'DELETE' && req.query.action === 'remove_viewer') {
    return removeViewer(sb, viewer, req, res);
  }
  // POST + action=message → 식단에 메세지 작성
  if (req.method === 'POST' && req.body && req.body.action === 'message') {
    return postMessage(sb, viewer, req, res);
  }

  if (req.method === 'GET')    return listMates(sb, viewer, res);
  if (req.method === 'POST')   return addMate(sb, viewer, req, res);
  if (req.method === 'DELETE') return removeMate(sb, viewer, req, res);
  return sendError(res, 405, 'method not allowed');
};

// 운동 피드 (메이트의 운동 로그 조회)
async function getWorkoutFeed(sb, viewer, req, res) {
  const ownerId = req.query.owner_id;
  if (!ownerId) return sendError(res, 400, 'owner_id 필요');
  const { data: conn } = await sb.from('mate_connections')
    .select('scopes').eq('viewer_id', viewer.id).eq('owner_id', ownerId)
    .is('revoked_at', null).maybeSingle();
  if (!conn) return sendError(res, 403, '권한 없음');

  const limit = Math.min(50, parseInt(req.query.limit) || 20);
  const { data, error } = await sb
    .from('workout_logs')
    .select('id, workout_date, workout_type, exercises, duration_min, total_volume_kg, memo')
    .eq('user_id', ownerId)
    .order('workout_date', { ascending: false })
    .limit(limit);
  if (error) return sendError(res, 500, error.message);

  return res.status(200).json({ workouts: data || [] });
}

// 요약 (최근 7일 영양 평균 + 부족 영양소 · PT에게 디테일 제공)
async function getMateSummary(sb, viewer, req, res) {
  const ownerId = req.query.owner_id;
  if (!ownerId) return sendError(res, 400, 'owner_id 필요');
  const { data: conn } = await sb.from('mate_connections')
    .select('scopes').eq('viewer_id', viewer.id).eq('owner_id', ownerId)
    .is('revoked_at', null).maybeSingle();
  if (!conn) return sendError(res, 403, '권한 없음');

  const sevenAgo = new Date(Date.now() - 7 * 86400000).toISOString();
  const [mealsRes, workoutsRes, bodyRes] = await Promise.all([
    sb.from('meal_logs').select('totals, consumed_at').eq('user_id', ownerId).gte('consumed_at', sevenAgo),
    sb.from('workout_logs').select('workout_type, total_volume_kg, workout_date').eq('user_id', ownerId)
      .gte('workout_date', sevenAgo.slice(0, 10)),
    sb.from('body_logs').select('weight_kg, body_fat_pct, muscle_mass_kg, recorded_at')
      .eq('user_id', ownerId).order('recorded_at', { ascending: false }).limit(5)
  ]);

  // 7일 식단 평균
  const meals = mealsRes.data || [];
  const avg = (key) => {
    const vals = meals.map(m => m.totals && m.totals[key]).filter(v => v != null && v > 0);
    if (!vals.length) return null;
    return Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);
  };
  const daily_avg = {
    meals_per_day: Math.round((meals.length / 7) * 10) / 10,
    kcal: avg('kcal'),
    protein_g: avg('protein_g'),
    carbs_g: avg('carbs_g'),
    fat_g: avg('fat_g'),
    sodium_mg: avg('sodium_mg'),
    fiber_g: avg('fiber_g')
  };

  // 운동 통계
  const workouts = workoutsRes.data || [];
  const type_count = {};
  workouts.forEach(w => { if (w.workout_type) type_count[w.workout_type] = (type_count[w.workout_type] || 0) + 1; });
  const workout_stats = {
    sessions_7d: workouts.length,
    total_volume_kg: Math.round(workouts.reduce((s, w) => s + (Number(w.total_volume_kg) || 0), 0)),
    by_type: type_count
  };

  // 몸 변화
  const body = (bodyRes.data || []);
  const body_latest = body[0] || null;
  const body_prev = body[1] || null;
  const body_change = (body_latest && body_prev) ? {
    weight: body_latest.weight_kg != null && body_prev.weight_kg != null
      ? +(body_latest.weight_kg - body_prev.weight_kg).toFixed(1) : null,
    body_fat: body_latest.body_fat_pct != null && body_prev.body_fat_pct != null
      ? +(body_latest.body_fat_pct - body_prev.body_fat_pct).toFixed(1) : null,
    muscle: body_latest.muscle_mass_kg != null && body_prev.muscle_mass_kg != null
      ? +(body_latest.muscle_mass_kg - body_prev.muscle_mass_kg).toFixed(1) : null
  } : null;

  return res.status(200).json({ daily_avg, workout_stats, body_latest, body_change });
}

// POST /api/mate  { action:'message', meal_log_id, text }
// viewer 또는 owner 둘 다 메세지 작성 가능 (해당 식단 접근 권한 확인)
async function postMessage(sb, user, req, res) {
  const { meal_log_id, text } = req.body;
  if (!meal_log_id || !text) return sendError(res, 400, 'meal_log_id, text 필요');
  if (String(text).length > 500) return sendError(res, 400, '500자 이내');

  // 식단 소유자 조회
  const { data: meal, error: mErr } = await sb
    .from('meal_logs')
    .select('user_id')
    .eq('id', meal_log_id)
    .maybeSingle();
  if (mErr) return sendError(res, 500, mErr.message);
  if (!meal) return sendError(res, 404, '식단 없음');

  // 권한: 식단 주인 본인 또는 메이트 연결된 viewer
  const isOwner = meal.user_id === user.id;
  let authorized = isOwner;
  if (!authorized) {
    const { data: conn } = await sb
      .from('mate_connections')
      .select('id')
      .eq('viewer_id', user.id)
      .eq('owner_id', meal.user_id)
      .is('revoked_at', null)
      .maybeSingle();
    authorized = !!conn;
  }
  if (!authorized) return sendError(res, 403, '접근 권한 없음');

  const { data, error } = await sb
    .from('mate_messages')
    .insert({ meal_log_id, sender_id: user.id, text: String(text).trim() })
    .select('id, created_at')
    .single();
  if (error) return sendError(res, 500, error.message);
  return res.status(200).json({ ok: true, id: data.id, created_at: data.created_at });
}

async function listMates(sb, viewer, res) {
  const { data, error } = await sb
    .from('mate_connections')
    .select(`
      id, granted_at, scopes, nickname,
      owner:app_users!mate_connections_owner_id_fkey(id, nickname, last_active_at)
    `)
    .eq('viewer_id', viewer.id)
    .is('revoked_at', null)
    .order('granted_at', { ascending: false });
  if (error) return sendError(res, 500, error.message);

  const mates = await Promise.all((data || []).map(async row => {
    const o = row.owner || {};
    const sevenAgo = new Date(Date.now() - 7 * 86400000).toISOString();
    const [cRes, lastRes] = await Promise.all([
      sb.from('meal_logs')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', o.id)
        .gt('consumed_at', sevenAgo),
      sb.from('meal_logs')
        .select('consumed_at')
        .eq('user_id', o.id)
        .order('consumed_at', { ascending: false })
        .limit(1)
    ]);
    return {
      owner_id: o.id,
      nickname: row.nickname || o.nickname || '메이트',
      granted_at: row.granted_at,
      meals_last_7d: cRes.count || 0,
      last_meal_at: lastRes.data && lastRes.data[0] ? lastRes.data[0].consumed_at : null
    };
  }));

  return res.status(200).json({ mates });
}

// 내 식단을 보고 있는 사람 리스트 (owner_id=나)
async function listViewers(sb, owner, res) {
  const { data, error } = await sb
    .from('mate_connections')
    .select(`
      id, granted_at, scopes, granted_via_code,
      viewer:app_users!mate_connections_viewer_id_fkey(id, nickname, last_active_at)
    `)
    .eq('owner_id', owner.id)
    .is('revoked_at', null)
    .order('granted_at', { ascending: false });
  if (error) return sendError(res, 500, error.message);
  const viewers = (data || []).map(row => {
    const v = row.viewer || {};
    const days = Math.floor((Date.now() - new Date(row.granted_at).getTime()) / 86400000);
    return {
      viewer_id: v.id,
      nickname: v.nickname || '메이트',
      granted_at: row.granted_at,
      granted_via_code: row.granted_via_code,
      days_since: days
    };
  });
  return res.status(200).json({ viewers });
}

async function removeViewer(sb, owner, req, res) {
  const viewerId = req.query && req.query.viewer_id;
  if (!viewerId) return sendError(res, 400, 'viewer_id 필요');
  const { data, error } = await sb
    .from('mate_connections')
    .update({ revoked_at: new Date().toISOString(), revoked_by: 'owner' })
    .eq('owner_id', owner.id)
    .eq('viewer_id', viewerId)
    .is('revoked_at', null)
    .select('id');
  if (error) return sendError(res, 500, error.message);
  return res.status(200).json({ ok: true, revoked: data?.length || 0 });
}

async function addMate(sb, viewer, req, res) {
  const code = (req.body && req.body.code || '').trim().toUpperCase();
  if (!/^HLT-[A-Z0-9]{6,10}$/.test(code))
    return sendError(res, 400, '코드 형식 오류 (예: HLT-A3K9XQ)');

  const { data: sc, error: scErr } = await sb
    .from('share_codes')
    .select('code, user_id, expires_at, revoked, scopes')
    .eq('code', code)
    .maybeSingle();
  if (scErr) return sendError(res, 500, scErr.message);
  if (!sc) return sendError(res, 404, '존재하지 않는 코드');
  if (sc.revoked) return sendError(res, 410, '폐기된 코드');
  if (new Date(sc.expires_at).getTime() < Date.now())
    return sendError(res, 410, '만료된 코드');
  if (sc.user_id === viewer.id) return sendError(res, 400, '자기 코드는 등록 불가');

  // 이미 등록되어 있나?
  const { data: existing } = await sb
    .from('mate_connections')
    .select('id, revoked_at')
    .eq('viewer_id', viewer.id)
    .eq('owner_id', sc.user_id)
    .maybeSingle();

  if (existing && !existing.revoked_at)
    return sendError(res, 409, '이미 등록된 메이트');

  if (existing && existing.revoked_at) {
    await sb.from('mate_connections').update({
      revoked_at: null, revoked_by: null,
      granted_at: new Date().toISOString(),
      granted_via_code: code,
      scopes: sc.scopes
    }).eq('id', existing.id);
  } else {
    const { error: insErr } = await sb.from('mate_connections').insert({
      viewer_id: viewer.id,
      owner_id: sc.user_id,
      granted_via_code: code,
      scopes: sc.scopes
    });
    if (insErr) return sendError(res, 500, insErr.message);
  }

  // used_count 증가
  const { data: cur } = await sb.from('share_codes').select('used_count').eq('code', code).single();
  await sb.from('share_codes').update({ used_count: (cur?.used_count || 0) + 1 }).eq('code', code);

  // 추가된 상대 정보 반환
  const { data: owner } = await sb.from('app_users').select('id, nickname').eq('id', sc.user_id).single();
  return res.status(200).json({ ok: true, owner_id: sc.user_id, nickname: owner?.nickname || '메이트' });
}

async function removeMate(sb, viewer, req, res) {
  const ownerId = req.query && req.query.owner_id;
  if (!ownerId) return sendError(res, 400, 'owner_id 필요');

  const { data, error } = await sb
    .from('mate_connections')
    .update({ revoked_at: new Date().toISOString(), revoked_by: 'viewer' })
    .eq('viewer_id', viewer.id)
    .eq('owner_id', ownerId)
    .is('revoked_at', null)
    .select('id');
  if (error) return sendError(res, 500, error.message);
  if (!data || !data.length) return sendError(res, 404, '등록된 메이트가 아님');
  return res.status(200).json({ ok: true });
}

async function getMealFeed(sb, viewer, req, res) {
  const ownerId = req.query.owner_id;
  if (!ownerId) return sendError(res, 400, 'owner_id 필요');

  // 접근 권한 검증
  const { data: conn, error: connErr } = await sb
    .from('mate_connections')
    .select('scopes, revoked_at')
    .eq('viewer_id', viewer.id)
    .eq('owner_id', ownerId)
    .is('revoked_at', null)
    .maybeSingle();
  if (connErr) return sendError(res, 500, connErr.message);
  if (!conn) return sendError(res, 403, '이 메이트 접근 권한 없음');
  if (conn.scopes && conn.scopes.meals === false)
    return sendError(res, 403, '상대가 식단 공유 꺼둠');

  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 30));
  const { data, error } = await sb
    .from('meal_logs')
    .select('id, foods, totals, meal_time, user_memo, store_tag, consumed_at')
    .eq('user_id', ownerId)
    .order('consumed_at', { ascending: false })
    .limit(limit);
  if (error) return sendError(res, 500, error.message);

  const meals = data || [];
  const mealIds = meals.map(m => m.id);

  // 식단별 메세지 조회 (viewer, owner 양쪽 다 포함)
  let msgsByMeal = {};
  if (mealIds.length) {
    const { data: msgs } = await sb
      .from('mate_messages')
      .select('id, meal_log_id, sender_id, text, created_at')
      .in('meal_log_id', mealIds)
      .order('created_at', { ascending: true });
    (msgs || []).forEach(m => {
      (msgsByMeal[m.meal_log_id] = msgsByMeal[m.meal_log_id] || [])
        .push({ id: m.id, text: m.text, created_at: m.created_at, mine: m.sender_id === viewer.id });
    });
  }
  meals.forEach(m => { m.messages = msgsByMeal[m.id] || []; });

  const { data: owner } = await sb.from('app_users').select('nickname').eq('id', ownerId).single();
  return res.status(200).json({
    nickname: owner?.nickname || '메이트',
    meals
  });
}
