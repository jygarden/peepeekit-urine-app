// 💧 최근 소변검사 결과 (홈 메트릭 카드용)
// GET /api/urine-latest → { latest: {sg, ph, leu, nit, pro, glu, ket, uro, bil, bld, tested_at} }
const { getServerClient, getOrCreateUser, sendError, applyCors } = require('./_supabase');

module.exports = async function handler(req, res) {
  applyCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return sendError(res, 405, 'method not allowed');

  const deviceId = req.headers['x-device-id'];
  if (!deviceId) return sendError(res, 400, 'device_id 헤더 누락');

  let nickname = req.headers['x-nickname'];
  if (nickname) { try { nickname = decodeURIComponent(nickname); } catch(e){} }

  let sb, user;
  try {
    sb = getServerClient();
    user = await getOrCreateUser(sb, deviceId, { nickname });
  } catch(e) { return sendError(res, 400, e.message); }

  const { data, error } = await sb
    .from('urine_tests')
    .select('*')
    .eq('user_uuid', user.id)
    .order('created_at', { ascending: false })
    .limit(1);

  if (error) return sendError(res, 500, error.message);
  if (!data || !data.length) return res.status(200).json({ latest: null });

  const row = data[0];
  // results 객체에서 10항목 추출 (스키마 유연하게)
  const r = row.results || row.result || row;
  return res.status(200).json({
    latest: {
      id: row.id,
      sg: r.sg ?? r.specific_gravity ?? null,
      ph: r.ph ?? r.PH ?? null,
      leu: r.leu ?? r.leukocytes ?? null,
      nit: r.nit ?? r.nitrite ?? null,
      pro: r.pro ?? r.protein ?? null,
      glu: r.glu ?? r.glucose ?? null,
      ket: r.ket ?? r.ketone ?? null,
      uro: r.uro ?? r.urobilinogen ?? null,
      bil: r.bil ?? r.bilirubin ?? null,
      bld: r.bld ?? r.blood ?? null,
      tested_at: row.created_at || row.tested_at,
      raw: r
    }
  });
};
