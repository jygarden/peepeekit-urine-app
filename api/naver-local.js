// 🗺 NAVER 지역 검색 API (매장 자동완성)
// 상호명 → 매장 후보 리스트 (주소·카테고리·좌표·전화)
// 두 가지 인증 지원:
//   1. NCP API HUB (NCP_API_KEY_ID/NCP_API_KEY) — 기존 블로그 검색과 동일
//   2. NAVER Developers (NAVER_CLIENT_ID/NAVER_CLIENT_SECRET) — 폴백
//
// NCP APIGW의 search/v1/local이 지원되지 않는 경우 자동으로 traditional API로 폴백.

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

  // 인증 방식 결정
  const ncpId = process.env.NCP_API_KEY_ID;
  const ncpKey = process.env.NCP_API_KEY;
  const navId = process.env.NAVER_CLIENT_ID;
  const navSecret = process.env.NAVER_CLIENT_SECRET;

  let endpoint, headers;

  if (ncpId && ncpKey) {
    endpoint = `https://naveropenapi.apigw.ntruss.com/search/v1/local?query=${encodeURIComponent(q)}&display=${Math.min(5, display)}&sort=${sort}`;
    headers = { 'X-NCP-APIGW-API-KEY-ID': ncpId, 'X-NCP-APIGW-API-KEY': ncpKey };
  } else if (navId && navSecret) {
    endpoint = `https://openapi.naver.com/v1/search/local.json?query=${encodeURIComponent(q)}&display=${Math.min(5, display)}&sort=${sort}`;
    headers = { 'X-Naver-Client-Id': navId, 'X-Naver-Client-Secret': navSecret };
  } else {
    return res.status(500).json({ error: 'Naver API 자격증명이 없어요 (NCP_API_KEY_ID/NCP_API_KEY 또는 NAVER_CLIENT_ID/NAVER_CLIENT_SECRET)' });
  }

  try {
    let r = await fetch(endpoint, { headers });

    // NCP가 로컬 검색을 지원하지 않는 경우 (404/403) → 트래디셔널로 폴백
    if (!r.ok && (r.status === 404 || r.status === 403) && navId && navSecret && endpoint.includes('ntruss.com')) {
      endpoint = `https://openapi.naver.com/v1/search/local.json?query=${encodeURIComponent(q)}&display=${Math.min(5, display)}&sort=${sort}`;
      headers = { 'X-Naver-Client-Id': navId, 'X-Naver-Client-Secret': navSecret };
      r = await fetch(endpoint, { headers });
    }

    if (!r.ok) {
      const txt = await r.text();
      console.error('naver-local error', r.status, txt);
      return res.status(r.status).json({ error: 'Naver local API failed', detail: txt.slice(0, 200) });
    }

    const data = await r.json();
    const items = (data.items || []).map(it => {
      // Katech TM128 (mapx/mapy) → WGS84 대략 변환 (프론트 지도용)
      const mx = Number(it.mapx) || 0;
      const my = Number(it.mapy) || 0;
      // 최신 반환은 이미 WGS84 * 10000000 형태로 오는 경우가 있음 (mapx > 100M)
      const isWgsScaled = mx > 100000000 || my > 100000000;
      const wgsLng = isWgsScaled ? mx / 10000000 : null;
      const wgsLat = isWgsScaled ? my / 10000000 : null;

      const clean = s => String(s || '').replace(/<[^>]+>/g, '').trim();
      let distance = null;
      if (wgsLat && wgsLng && Number.isFinite(lat) && Number.isFinite(lng)) {
        // 하버사인 (m)
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
    });

    // 거리 있으면 가까운 순 정렬
    if (items.some(x => x.distance != null)) {
      items.sort((a, b) => (a.distance ?? 1e12) - (b.distance ?? 1e12));
    }

    return res.status(200).json({ query: q, total: data.total || 0, items });
  } catch (err) {
    console.error('naver-local exception', err);
    return res.status(500).json({ error: err.message || '검색 실패' });
  }
};
