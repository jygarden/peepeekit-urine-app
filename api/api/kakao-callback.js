// Vercel Serverless Function — 카카오 OAuth 토큰 교환 + 사용자 정보 조회
// 위치: /api/kakao-callback.js
//
// 클라이언트(브라우저)에서 직접 카카오 토큰 엔드포인트를 호출하면 CORS 에러가 발생하므로
// 이 서버 함수가 중간에서 토큰 교환과 사용자 정보 조회를 대신해줍니다.

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST만 허용됩니다.' });

  try {
    const { code, redirectUri } = req.body;
    if (!code || !redirectUri) {
      return res.status(400).json({ error: 'code와 redirectUri가 필요합니다.' });
    }

    // 카카오 JS 키 (환경변수 우선, 없으면 코드값)
    const clientId = process.env.KAKAO_JS_KEY || 'aacf444a8f6bc5687084b289c7217ada';
    // 클라이언트 시크릿 (사용함 설정인 경우에만 필요)
    const clientSecret = process.env.KAKAO_CLIENT_SECRET || '';

    // ── 1) 인가 코드 → 액세스 토큰 교환 ──
    const tokenBody = new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: clientId,
      redirect_uri: redirectUri,
      code: code,
    });
    if (clientSecret) tokenBody.append('client_secret', clientSecret);

    const tokenRes = await fetch('https://kauth.kakao.com/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8' },
      body: tokenBody.toString(),
    });
    const tokenData = await tokenRes.json();

    if (tokenData.error) {
      return res.status(400).json({
        error: tokenData.error_description || tokenData.error,
        debug: tokenData,
      });
    }
    if (!tokenData.access_token) {
      return res.status(500).json({ error: '액세스 토큰을 받지 못했습니다.', debug: tokenData });
    }

    // ── 2) 액세스 토큰으로 사용자 정보 조회 ──
    const userRes = await fetch('https://kapi.kakao.com/v2/user/me', {
      headers: { Authorization: 'Bearer ' + tokenData.access_token },
    });
    const user = await userRes.json();

    if (user.code) {
      return res.status(500).json({ error: '사용자 정보 조회 실패', debug: user });
    }

    // ── 3) 필요한 정보만 정리해서 반환 ──
    const nickname = (user.properties && user.properties.nickname)
      || (user.kakao_account && user.kakao_account.profile && user.kakao_account.profile.nickname)
      || '사용자';
    const profileImage = (user.properties && user.properties.profile_image)
      || (user.kakao_account && user.kakao_account.profile && user.kakao_account.profile.profile_image_url)
      || null;
    const email = user.kakao_account && user.kakao_account.email;

    return res.status(200).json({
      ok: true,
      kakaoId: String(user.id),
      nickname,
      profileImage,
      email: email || null,
    });
  } catch (err) {
    return res.status(500).json({ error: err.message || '서버 오류가 발생했습니다.' });
  }
};
