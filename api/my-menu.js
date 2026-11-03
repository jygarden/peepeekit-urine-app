// ═══════════════════════════════════════════════════════════════
// 내 메뉴 CRUD + 기록용 (자주 먹는 메뉴 저장 · 1탭 기록)
//
//   GET  /api/my-menu        → 내 메뉴 리스트 (사용 많은 순)
//   POST /api/my-menu        { name, foods, totals, tag, store_tag }
//   POST /api/my-menu action=use { id } → 사용 횟수 +1 (+ meal_logs insert)
//   DELETE /api/my-menu?id=UUID
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
  if (req.method === 'DELETE') return handleDelete(sb, user, req, res);
  return sendError(res, 405, 'method not allowed');
};

async function handleGet(sb, user, req, res) {
  const { data, error } = await sb
    .from('my_menus')
    .select('id, name, foods, totals, tag, store_tag, use_count, last_used_at, created_at')
    .eq('user_id', user.id)
    .order('use_count', { ascending: false })
    .limit(50);
  if (error) return sendError(res, 500, error.message);
  return res.status(200).json({ menus: data || [] });
}

async function handlePost(sb, user, req, res) {
  const b = req.body || {};

  // action=use → 사용 (meal_logs 추가 + use_count++)
  if (b.action === 'use') {
    const id = b.id;
    if (!id) return sendError(res, 400, 'id 필요');
    const { data: menu, error: mErr } = await sb.from('my_menus')
      .select('name, foods, totals, tag, store_tag, use_count')
      .eq('id', id).eq('user_id', user.id).single();
    if (mErr) return sendError(res, 404, '메뉴 없음');

    // 끼니 결정 (요청에 있으면 override)
    const mealTime = b.meal_time || menu.tag || _guessMealTime();
    const consumedAt = b.consumed_at || new Date().toISOString();

    const { data: inserted, error: iErr } = await sb.from('meal_logs').insert({
      user_id: user.id,
      meal_time: mealTime,
      consumed_at: consumedAt,
      foods: menu.foods,
      totals: menu.totals,
      store_tag: menu.store_tag,
      source: 'my_menu'
    }).select('id').single();
    if (iErr) return sendError(res, 500, iErr.message);

    // use_count 증가 + last_used_at
    await sb.from('my_menus').update({
      use_count: (menu.use_count || 0) + 1,
      last_used_at: new Date().toISOString()
    }).eq('id', id);

    return res.status(200).json({ ok: true, meal_id: inserted.id });
  }

  // 새 메뉴 저장
  const name = String(b.name || '').trim().slice(0, 60);
  const foods = Array.isArray(b.foods) ? b.foods.slice(0, 20) : [];
  if (!name) return sendError(res, 400, 'name 필요');
  if (!foods.length) return sendError(res, 400, 'foods 필요');

  const { data, error } = await sb.from('my_menus').insert({
    user_id: user.id,
    name,
    foods,
    totals: b.totals || null,
    tag: b.tag || null,
    store_tag: b.store_tag || null
  }).select('id, name').single();
  if (error) return sendError(res, 500, error.message);
  return res.status(200).json({ ok: true, id: data.id, name: data.name });
}

async function handleDelete(sb, user, req, res) {
  const id = req.query && req.query.id;
  if (!id) return sendError(res, 400, 'id 필요');
  const { data, error } = await sb.from('my_menus')
    .delete().eq('id', id).eq('user_id', user.id).select('id');
  if (error) return sendError(res, 500, error.message);
  if (!data || !data.length) return sendError(res, 404, '메뉴 없음');
  return res.status(200).json({ ok: true });
}

function _guessMealTime() {
  const h = new Date().getHours();
  if (h >= 5 && h < 10) return 'breakfast';
  if (h >= 10 && h < 15) return 'lunch';
  if (h >= 15 && h < 21) return 'dinner';
  return 'snack';
}
