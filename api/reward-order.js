// Vercel Serverless Function — 보상 교환 주문 처리
// 위치: /api/reward-order.js
//
// 사용자가 실물 상품(키트, 영양제 샘플 등) 교환 신청 시 호출됩니다.
// Supabase에 저장 + 운영자 알림 발송.

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST만 허용됩니다.' });

  try {
    const { orderId, rewardId, rewardName, userName, shipName, shipPhone, shipAddress, shipMemo } = req.body;
    if (!orderId || !shipName || !shipPhone || !shipAddress) {
      return res.status(400).json({ error: '필수 정보 누락' });
    }

    // ─── Supabase 저장 (있으면) ───
    const SUPABASE_URL = process.env.SUPABASE_URL;
    const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;
    if (SUPABASE_URL && SUPABASE_KEY) {
      try {
        const sbRes = await fetch(`${SUPABASE_URL}/rest/v1/reward_orders`, {
          method: 'POST',
          headers: {
            'apikey': SUPABASE_KEY,
            'Authorization': `Bearer ${SUPABASE_KEY}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=minimal'
          },
          body: JSON.stringify({
            order_id: orderId,
            reward_id: rewardId,
            reward_name: rewardName,
            user_name: userName || '익명',
            ship_name: shipName,
            ship_phone: shipPhone,
            ship_address: shipAddress,
            ship_memo: shipMemo || null,
            status: 'pending'
          })
        });
        if (!sbRes.ok) {
          console.error('Supabase 저장 실패:', await sbRes.text());
        }
      } catch (e) { console.error('Supabase 오류:', e.message); }
    }

    // ─── 운영자에게 이메일/슬랙/카카오톡 알림 (선택) ───
    // 환경변수에 RESEND_API_KEY, ADMIN_EMAIL 등록되어 있으면 발송
    const RESEND_KEY = process.env.RESEND_API_KEY;
    const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@checkmyhealth.co.kr';
    if (RESEND_KEY) {
      try {
        await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${RESEND_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            from: 'noreply@checkmyhealth.co.kr',
            to: [ADMIN_EMAIL],
            subject: `[건강어때] 새 보상 교환 신청 — ${rewardName}`,
            html: `
              <h2>🎁 새 보상 교환 신청</h2>
              <p><strong>주문번호:</strong> ${orderId}</p>
              <p><strong>상품:</strong> ${rewardName}</p>
              <p><strong>신청자:</strong> ${userName || '익명'}</p>
              <hr>
              <p><strong>받는 분:</strong> ${shipName}</p>
              <p><strong>연락처:</strong> ${shipPhone}</p>
              <p><strong>주소:</strong> ${shipAddress}</p>
              <p><strong>요청사항:</strong> ${shipMemo || '없음'}</p>
            `
          })
        });
      } catch (e) { console.error('이메일 발송 오류:', e.message); }
    }

    return res.status(200).json({ ok: true, orderId });
  } catch (err) {
    return res.status(500).json({ error: err.message || '서버 오류' });
  }
};
