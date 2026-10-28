// 🔒 사용자 데이터 프록시 · RLS deny-all 테이블 안전 접근
//
// 모든 클라이언트 DB 호출은 이 엔드포인트 거침.
// 이용자가 자기 user_uuid 데이터만 R/W 가능 (device_id → user_uuid 매칭 검증).
//
//   POST /api/user-data
//     body: { op, table, data?, filter?, conflict? }
//     op: 'insert' | 'upsert' | 'select'
//
// 허용 테이블: food_records, nutrition_insights, supplement_opportunities,
//              users, activity_logs, consent_logs, water_intake

const { getServerClient, sendError, applyCors } = require('./_supabase');

const ALLOWED_TABLES = new Set([
  'food_records', 'nutrition_insights', 'supplement_opportunities',
  'users', 'activity_logs', 'consent_logs', 'water_intake',
  'pet_records'
]);

module.exports = async function handler(req, res) {
  applyCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return sendError(res, 405, 'POST only');

  const deviceId = req.headers['x-device-id'];
  if (!deviceId) return sendError(res, 400, 'device_id 헤더 누락');

  const { op, table, data, filter, conflict } = req.body || {};

  if (!table || !ALLOWED_TABLES.has(table)) {
    return sendError(res, 400, `허용되지 않은 테이블: ${table}`);
  }

  // user_uuid 소유권 검증 (payload의 user_uuid가 device_id와 일치해야 함)
  const checkOwnership = (payload) => {
    if (!payload) return true;
    const uuid = payload.user_uuid;
    if (!uuid) return true; // user_uuid 없는 레코드는 통과 (글로벌 설정 등)
    return uuid === deviceId;
  };

  let sb;
  try { sb = getServerClient(); }
  catch (e) { return sendError(res, 500, e.message); }

  try {
    if (op === 'insert') {
      if (!checkOwnership(data)) return sendError(res, 403, 'user_uuid 소유권 불일치');
      const { error } = await sb.from(table).insert(data);
      if (error) return sendError(res, 500, error.message);
      return res.status(200).json({ ok: true });
    }

    if (op === 'upsert') {
      if (!checkOwnership(data)) return sendError(res, 403, 'user_uuid 소유권 불일치');
      let q = sb.from(table).upsert(data, conflict ? { onConflict: conflict } : {});
      const { error } = await q;
      if (error) return sendError(res, 500, error.message);
      return res.status(200).json({ ok: true });
    }

    if (op === 'select') {
      // 반드시 user_uuid 필터링 (자기 것만 조회)
      const uuidFilter = filter && filter.user_uuid;
      if (!uuidFilter || uuidFilter !== deviceId) {
        return sendError(res, 403, 'user_uuid 필터 필수 (자기 것만 조회)');
      }
      const { data: rows, error } = await sb.from(table).select('*').eq('user_uuid', deviceId);
      if (error) return sendError(res, 500, error.message);
      return res.status(200).json({ rows: rows || [] });
    }

    return sendError(res, 400, `op 잘못됨: ${op}`);
  } catch (e) {
    console.error('[user-data]', e.message);
    return sendError(res, 500, e.message);
  }
};
