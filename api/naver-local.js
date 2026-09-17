// 🗺 NAVER 지역 검색 API (매장 자동완성)
// 상호명 → 매장 후보 리스트 (주소·카테고리·좌표·전화)
//
// 📌 2026-06-29 이관 안내: Naver Developers의 Search API가 NCP NAVER API HUB로 이관됨.
//   기존 NCP_API_KEY_ID / NCP_API_KEY 그대로 사용 가능.
//   ⚠️ 단, NCP 콘솔에서 "지역(Local) 검색" 서비스를 개별 이용 신청해야 함.
//   (블로그만 신청돼 있으면 지역은 안 됨)
//
// 폴백 순서:
//   1. NCP APIGW (신규 URL: naveropenapi.apigw.ntruss.com/search/v1/local)
//   2. NCP APIGW (레거시 URL 후보)
//   3. Naver Developers (openapi.naver.com) — 기존 앱이 있는 경우

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
      detail: 'Vercel 환경변수에 NCP_API_KEY_ID + NCP_API_KEY (기존 블로그와 동일) 를 추가하고, NCP 콘솔에서 "지역(Local) 검색" 이용 신청도 해야 합니다.'
    });
  }

  const qs = `query=${encodeURIComponent(q)}&display=${Math.min(5, display)}&sort=${sort}`;

  // 시도 순서 · NCP 여러 URL + 트래디셔널 (구 앱 남아있는 경우)
  const attempts = [];
  if (ncpId && ncpKey) {
    const ncpHeaders = { 'X-NCP-APIGW-API-KEY-ID': ncpId, 'X-NCP-APIGW-API-KEY': ncpKey };
    // 이관 후 가능한 URL들 (모두 시도)
    [
      `https://naveropenapi.apigw.ntruss.com/search/v1/local?${qs}`,
      `https://naveropenapi.apigw.ntruss.com/search/v1/local.json?${qs}`,
      `https://naversearchapi.apigw.ntruss.com/search/v1/local?${qs}`,
      `https://naveropenapi.apigw.gov-ntruss.com/search/v1/local?${qs}`
    ].forEach((url, i) => {
      attempts.push({ name: `ncp-${i+1}`, url, headers: ncpHeaders });
    });
  }
  if (navId && navSecret) {
    // 구 앱 (2026-06-29 이관 이전에 등록된 앱)이 남아있는 경우
    attempts.push({
      name: 'naver-developers',
      url: `https://openapi.naver.com/v1/search/local.json?${qs}`,
      headers: { 'X-Naver-Client-Id': navId, 'X-Naver-Client-Secret': navSecret }
    });
  }

  let lastErr = null;
  const tried = [];
  for (const a of attempts) {
    try {
      const r = await fetch(a.url, { headers: a.headers });
      tried.push(`${a.name}:${r.status}`);
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
      tried.push(`${a.name}:err`);
      console.error(`naver-local ${a.name} exception:`, err.message);
    }
  }

  return res.status(500).json({
    error: '네이버 지역 검색 실패',
    detail: lastErr ? `${lastErr.source}(${lastErr.status}): ${lastErr.detail}` : '알 수 없는 오류',
    tried,
    hint: 'NCP 콘솔에서 "지역(Local) 검색" 서비스를 별도 이용신청 하셨는지 확인해주세요. (기존 블로그 신청과 별개)'
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
