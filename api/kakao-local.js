// 🗺 카카오 로컬 검색 API (매장 자동완성)
// 상호명 → 매장 후보 리스트 (주소·카테고리·좌표·전화)
//
// 📌 설정: Vercel 환경변수에 KAKAO_REST_API_KEY 추가
//   1. https://developers.kakao.com → 내 애플리케이션 → 새 앱 등록
//   2. 앱 키 탭 → REST API 키 복사
//   3. Vercel Settings > Environment Variables → KAKAO_REST_API_KEY
//
// 무료: 하루 300,000회, 초당 30회

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  const key = process.env.KAKAO_REST_API_KEY;
  if (!key) {
    return res.status(500).json({
      error: '카카오 API 자격증명 미설정',
      hint: 'Vercel 환경변수에 KAKAO_REST_API_KEY를 추가하세요. (developers.kakao.com → 앱 → REST API 키)'
    });
  }

  const { query, display = 5, lat, lng, radius } = req.body || {};
  if (!query || !String(query).trim()) {
    return res.status(400).json({ error: 'query required' });
  }
  const q = String(query).trim();

  // 카카오 로컬 키워드 검색
  const params = new URLSearchParams();
  params.append('query', q);
  params.append('size', String(Math.min(15, Math.max(5, display))));
  // 음식점(FD6)·카페(CE7)로 살짝 편향하되 다른 카테고리도 나오게 (필터 적용 X)
  if (Number.isFinite(lat) && Number.isFinite(lng)) {
    // 카카오는 x=경도, y=위도
    params.append('x', String(lng));
    params.append('y', String(lat));
    if (Number.isFinite(radius)) {
      params.append('radius', String(Math.min(20000, radius)));
    }
    params.append('sort', 'distance');
  } else {
    params.append('sort', 'accuracy');
  }

  const url = `https://dapi.kakao.com/v2/local/search/keyword.json?${params.toString()}`;

  try {
    const r = await fetch(url, {
      headers: { 'Authorization': `KakaoAK ${key}` }
    });
    const data = await r.json();
    if (!r.ok) {
      console.error('kakao-local error', r.status, data);
      return res.status(r.status).json({
        error: '카카오 로컬 검색 실패',
        detail: (data && (data.msg || data.errorType || JSON.stringify(data))) || `HTTP ${r.status}`,
        hint: r.status === 401 ? 'REST API 키가 잘못됐거나 만료됨.' :
              r.status === 403 ? 'IP 제한 또는 사용량 초과. 카카오 개발자센터에서 확인.' :
              r.status === 429 ? '초당 요청 제한 초과 (30 rps).' : ''
      });
    }

    const docs = data.documents || [];
    // 음식점·카페 먼저, 그다음 나머지 (같은 이름의 병원·은행 등이 앞에 나오는 걸 방지)
    const priority = { 'FD6': 0, 'CE7': 1 };
    docs.sort((a, b) => {
      const pa = priority[a.category_group_code] ?? 2;
      const pb = priority[b.category_group_code] ?? 2;
      if (pa !== pb) return pa - pb;
      // 같은 우선순위 안에서는 GPS 있으면 거리 순 (이미 sort=distance지만 재정렬 위해)
      const da = a.distance ? Number(a.distance) : 1e9;
      const db = b.distance ? Number(b.distance) : 1e9;
      return da - db;
    });

    const items = docs.slice(0, Math.min(5, display)).map(d => ({
      title: d.place_name || '',
      category: (d.category_name || '').split('>').slice(-2).map(s => s.trim()).filter(Boolean).join(' > ') || d.category_group_name || '',
      categoryGroup: d.category_group_name || '',
      address: d.address_name || '',
      roadAddress: d.road_address_name || '',
      telephone: d.phone || '',
      link: d.place_url || '',
      lat: Number(d.y) || null,
      lng: Number(d.x) || null,
      distance: d.distance ? Number(d.distance) : null,
      id: d.id || ''
    }));

    return res.status(200).json({
      query: q,
      total: (data.meta && data.meta.total_count) || items.length,
      items,
      source: 'kakao'
    });
  } catch (err) {
    console.error('kakao-local exception', err);
    return res.status(500).json({ error: err.message || '검색 실패' });
  }
};
