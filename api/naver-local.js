// 🗺 NAVER 지역 검색 API (매장 자동완성)
// 상호명 → 매장 후보 리스트 (주소·카테고리·좌표·전화)
//
// ⚠️ 중요: NCP API HUB는 "지역(Local) 검색"을 제공하지 않습니다.
//   지역 검색은 반드시 Naver Developers (openapi.naver.com) 앱에 등록해야 합니다.
//   https://developers.naver.com → Application 등록 → 지역 API 선택
//   그 후 Vercel 환경변수에 NAVER_CLIENT_ID / NAVER_CLIENT_SECRET 추가.
//
// 이 파일은 두 방식 다 시도합니다:
//   1순위: Naver Developers (openapi.naver.com) — 표준 지역 검색
//   2순위 (폴백): NCP APIGW — 혹시 지원되는 계정을 위해

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  const { query, display = 5, sort = 'random', lat, lng } = req.body || {};
  if (!query || !String(query).trim()) {
    return res.status(400).json({ error: 'query required' });
  }
  const q = String(query).trim();

  const navId = process.env.NAVER_CLIENT_ID;
  const navSecret = process.env.NAVER_CLIENT_SECRET;
  const ncpId = process.env.NCP_API_KEY_ID;
  const ncpKey = process.env.NCP_API_KEY;

  if (!navId && !ncpId) {
    return res.status(500).json({
      error: 'API 자격증명 미설정',
      detail: 'Vercel 환경변수에 NAVER_CLIENT_ID + NAVER_CLIENT_SECRET을 추가하세요. (지역 검색은 NCP가 아닌 Naver Developers 앱 필요)'
    });
  }

  // 시도 순서
  const attempts = [];
  if (navId && navSecret) {
    attempts.push({
      name: 'naver-developers',
      url: `https://openapi.naver.com/v1/search/local.json?query=${encodeURIComponent(q)}&display=${Math.min(5, display)}&sort=${sort}`,
      headers: { 'X-Naver-Client-Id': navId, 'X-Naver-Client-Secret': navSecret }
    });
  }
  if (ncpId && ncpKey) {
    attempts.push({
      name: 'ncp',
      url: `https://naveropenapi.apigw.ntruss.com/search/v1/local?query=${encodeURIComponent(q)}&display=${Math.min(5, display)}&sort=${sort}`,
      headers: { 'X-NCP-APIGW-API-KEY-ID': ncpId, 'X-NCP-APIGW-API-KEY': ncpKey }
    });
  }

  let lastErr = null;
  for (const a of attempts) {
    try {
      const r = await fetch(a.url, { headers: a.headers });
      if (r.ok) {
        const data = await r.json();
        const items = (data.items || []).map(it => normalizeItem(it, lat, lng));
        if (items.some(x => x.distance != null)) {
          items.sort((x, y) => (x.distance ?? 1e12) - (y.distance ?? 1e12));
        }
        return res.status(200).json({ query: q, total: data.total || items.length, items, source: a.name });
      }
      const txt = await r.text();
      lastErr = { status: r.status, detail: txt.slice(0, 300), source: a.name };
      console.error(`naver-local ${a.name} failed:`, r.status, txt.slice(0, 200));
    } catch (err) {
      lastErr = { status: 500, detail: err.message, source: a.name };
      console.error(`naver-local ${a.name} exception:`, err.message);
    }
  }

  return res.status(500).json({
    error: '네이버 지역 검색 실패',
    detail: lastErr ? `${lastErr.source}(${lastErr.status}): ${lastErr.detail}` : '알 수 없는 오류',
    hint: (navId ? '' : 'NAVER_CLIENT_ID/NAVER_CLIENT_SECRET 등록 필요. Naver Developers에서 "지역" API 사용신청 후 발급.')
  });
};

function normalizeItem(it, lat, lng) {
  const mx = Number(it.mapx) || 0;
  const my = Number(it.mapy) || 0;
  // WGS84 * 10^7 형식으로 오는 경우 (최신 Local API 응답)
  const isWgsScaled = mx > 100000000 || my > 100000000;
  const wgsLng = isWgsScaled ? mx / 10000000 : null;
  const wgsLat = isWgsScaled ? my / 10000000 : null;

  const clean = s => String(s || '').replace(/<[^>]+>/g, '').trim();
  let distance = null;
  if (wgsLat && wgsLng && Number.isFinite(lat) && Number.isFinite(lng)) {
    const R = 6371000;
    const toRad = d => d * Math.PI / 180;
    const dLat = toRad(wgsLat - lat);
    const dLng = toRad(wgsLng - lng);
    const a = Math.sin(dLat/2)**2 + Math.cos(toRad(lat)) * Math.cos(toRad(wgsLat)) * Math.sin(dLng/2)**2;
    distance = Math.round(2 * R * Math.asin(Math.sqrt(a)));
  }

  return {
    title: clean(it.title),
    category: clean(it.category),
    address: clean(it.address),
    roadAddress: clean(it.roadAddress),
    telephone: clean(it.telephone),
    link: it.link || '',
    mapx: mx, mapy: my,
    lat: wgsLat, lng: wgsLng,
    distance
  };
}
