// 🎯 추천 피드백 기록 API
// 참조: SECURITY.md · RECOMMEND_ENGINE.md
//
// 원칙:
// - 서버 전용 · 클라이언트는 이 엔드포인트만 호출
// - recommendation_feedback INSERT를 서버에서 대신 (SECRET_KEY 사용)
// - action: 'accepted' | 'consumed' | 'skip' | 'why' | 'dislike_undo'
// - dislike 같은 강한 신호는 user_preference에도 반영

let _createClient = null;
try { _createClient = require('@supabase/supabase-js').createClient; } catch (_) {}

function getSupabaseAdmin() {
  if (!_createClient) return null;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return _createClient(url, key, { auth: { persistSession: false } });
}

const VALID_ACTIONS = ['accepted', 'consumed', 'skip', 'why', 'dislike_undo', 'dislike'];

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  const supabase = getSupabaseAdmin();
  if (!supabase) return res.status(500).json({ error: 'Supabase not configured' });

  try {
    const body = req.body || {};
    const { user_id, recommendation_id, food_id, action, skip_reason } = body;

    if (!user_id) return res.status(400).json({ error: 'user_id required' });
    if (!action || !VALID_ACTIONS.includes(action)) return res.status(400).json({ error: 'invalid action' });

    // 1. feedback INSERT
    const feedback = {
      user_id,
      recommendation_id: recommendation_id || null,
      food_id: food_id || null,
      action,
      skip_reason: skip_reason || null
    };
    const { error: fbErr } = await supabase.from('recommendation_feedback').insert(feedback);
    if (fbErr) {
      console.warn('[recommend-feedback] insert failed', fbErr.message);
      return res.status(500).json({ error: fbErr.message });
    }

    // 2. dislike는 user_preference.user_dislikes에도 추가 (즉시 제외)
    if (action === 'dislike' && food_id) {
      try {
        const { data: pref } = await supabase
          .from('user_preference')
          .select('user_dislikes')
          .eq('user_id', user_id)
          .maybeSingle();
        const list = Array.isArray(pref?.user_dislikes) ? pref.user_dislikes : [];
        if (!list.includes(food_id)) {
          list.push(food_id);
          await supabase
            .from('user_preference')
            .upsert({ user_id, user_dislikes: list, updated_at: new Date().toISOString() }, { onConflict: 'user_id' });
        }
      } catch (e) { console.warn('[recommend-feedback] dislike sync', e.message); }
    }

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('[recommend-feedback]', err);
    return res.status(500).json({ error: err.message || 'feedback failed' });
  }
};
