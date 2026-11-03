// ═══════════════════════════════════════════════════════════════
// 메이트 소셜 · 좋아요 + 댓글
//
//   GET  /api/mate-social?target_type=meal&target_id=UUID  → { likes, liked, comments }
//   POST /api/mate-social  action=like    { target_type, target_id, target_owner_id }
//   POST /api/mate-social  action=unlike  { target_type, target_id }
//   POST /api/mate-social  action=comment { target_type, target_id, target_owner_id, content }
//   DELETE /api/mate-social?comment_id=UUID
// ═══════════════════════════════════════════════════════════════

const { getServerClient, getOrCreateUser, sendError, applyCors } = require('./_supabase');

const VALID_TARGETS = new Set(['meal','workout','body']);

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
  const t = req.query && req.query.target_type;
  const id = req.query && req.query.target_id;
  if (!VALID_TARGETS.has(t) || !id) return sendError(res, 400, 'target_type/id 필요');

  const [{ data: likes = [] }, { data: comments = [] }] = await Promise.all([
    sb.from('mate_likes').select('liker_id').eq('target_type', t).eq('target_id', id),
    sb.from('mate_comments').select('id, commenter_id, content, created_at').eq('target_type', t).eq('target_id', id).order('created_at', { ascending: true })
  ]);

  // 댓글 작성자 닉네임 가져오기
  const commenterIds = [...new Set(comments.map(c => c.commenter_id))];
  let nickMap = {};
  if (commenterIds.length) {
    const { data: profs = [] } = await sb.from('app_users').select('id, nickname').in('id', commenterIds);
    nickMap = Object.fromEntries(profs.map(p => [p.id, p.nickname || '익명']));
  }

  return res.status(200).json({
    likes: likes.length,
    liked: likes.some(l => l.liker_id === user.id),
    comments: comments.map(c => ({
      id: c.id,
      author: nickMap[c.commenter_id] || '익명',
      is_mine: c.commenter_id === user.id,
      content: c.content,
      created_at: c.created_at
    }))
  });
}

async function handlePost(sb, user, req, res) {
  const b = req.body || {};
  const action = b.action;
  const t = b.target_type;
  const id = b.target_id;
  if (!VALID_TARGETS.has(t) || !id) return sendError(res, 400, 'target_type/id 필요');

  if (action === 'like') {
    const owner = b.target_owner_id;
    if (!owner) return sendError(res, 400, 'target_owner_id 필요');
    // 자기 자신 좋아요도 OK (일단 허용 · 나중에 제외하려면 체크)
    const { error } = await sb.from('mate_likes').insert({
      target_type: t, target_id: id, target_owner_id: owner, liker_id: user.id
    });
    if (error && !error.message.includes('duplicate')) return sendError(res, 500, error.message);
    return res.status(200).json({ ok: true, liked: true });
  }

  if (action === 'unlike') {
    const { error } = await sb.from('mate_likes').delete()
      .eq('target_type', t).eq('target_id', id).eq('liker_id', user.id);
    if (error) return sendError(res, 500, error.message);
    return res.status(200).json({ ok: true, liked: false });
  }

  if (action === 'comment') {
    const owner = b.target_owner_id;
    const content = String(b.content || '').trim().slice(0, 500);
    if (!owner || !content) return sendError(res, 400, 'owner/content 필요');
    const { data, error } = await sb.from('mate_comments').insert({
      target_type: t, target_id: id, target_owner_id: owner,
      commenter_id: user.id, content
    }).select('id, created_at').single();
    if (error) return sendError(res, 500, error.message);
    return res.status(200).json({ ok: true, comment: {
      id: data.id, author: user.nickname || '나', is_mine: true, content, created_at: data.created_at
    }});
  }

  return sendError(res, 400, 'invalid action');
}

async function handleDelete(sb, user, req, res) {
  const cid = req.query && req.query.comment_id;
  if (!cid) return sendError(res, 400, 'comment_id 필요');
  const { data, error } = await sb.from('mate_comments')
    .delete().eq('id', cid).eq('commenter_id', user.id).select('id');
  if (error) return sendError(res, 500, error.message);
  if (!data || !data.length) return sendError(res, 404, '댓글 없음 or 권한 없음');
  return res.status(200).json({ ok: true });
}
