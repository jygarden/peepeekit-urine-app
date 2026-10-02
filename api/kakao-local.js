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

  const { query, display = 15, lat, lng, radius } = req.body || {};
  if (!query || !String(query).trim()) {
    return res.status(400).json({ error: 'query required' });
  }
  const q = String(query).trim();

  // 카카오 로컬 키워드 검색 · 최대 15개 (API 한계)
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
    // 원문 본문 항상 보관 (JSON 파싱 실패 대비)
    const rawText = await r.text();
    let data = null;
    try { data = JSON.parse(rawText); } catch(e) {}

    if (!r.ok) {
      const kakaoMsg = data && (data.message || data.msg) ? (data.message || data.msg) : '';
      const kakaoType = data && data.errorType ? data.errorType : '';
      const kakaoCode = data && (data.code != null) ? String(data.code) : '';
      const summary = [kakaoType, kakaoCode, kakaoMsg].filter(Boolean).join(' · ') || rawText.slice(0, 300) || `HTTP ${r.status}`;
      const keyPreview = key ? `${key.slice(0, 4)}…${key.slice(-4)} (${key.length}자)` : '(없음)';
      console.error('[kakao-local]', r.status, 'summary:', summary, 'raw:', rawText.slice(0, 500));

      let hint = '';
      if (r.status === 401) hint = 'REST API 키가 잘못됨. 카카오 개발자센터 → 앱 → 앱 키 → REST API 키를 다시 복사해주세요.';
      else if (r.status === 403) {
        if (kakaoType && kakaoType.includes('Auth')) hint = 'REST API 키 인증 실패. 다른 종류의 키(JavaScript, Native)를 넣으면 이렇게 나옵니다.';
        else if (kakaoType && kakaoType.includes('Access')) hint = '앱에 Web 플랫폼이 등록 안 됨. 카카오 개발자센터 → 앱 → 플랫폼 → Web 플랫폼 등록 → 배포 도메인 추가.';
        else hint = 'REST API 키 확인 + 플랫폼(Web) 등록 확인. 앱이 삭제됐거나 비활성 상태일 수도.';
      }
      else if (r.status === 429) hint = '초당 30회 제한 초과.';

      return res.status(r.status).json({
        error: '카카오 로컬 검색 실패',
        detail: summary,
        raw: rawText.slice(0, 500),
        hint,
        keyPreview
      });
    }

    const docs = data.documents || [];
    // 음식 관련 카테고리 우선 (FD6=음식점, CE7=카페, MT1=대형마트, CS2=편의점)
    // 명백히 무관한 카테고리만 뒤로 (BK9=은행, HP8=병원, PM9=약국, PO3=공공기관)
    const foodPriority = { 'FD6': 0, 'CE7': 1, 'MT1': 2, 'CS2': 2 };
    const nonFoodPenalty = { 'BK9': 9, 'HP8': 9, 'PM9': 9, 'PO3': 9, 'SC4': 9, 'AC5': 9 };
    docs.sort((a, b) => {
      const pa = foodPriority[a.category_group_code] ?? (nonFoodPenalty[a.category_group_code] ?? 3);
      const pb = foodPriority[b.category_group_code] ?? (nonFoodPenalty[b.category_group_code] ?? 3);
      if (pa !== pb) return pa - pb;
      // 같은 우선순위 안에서는 GPS 있으면 거리 순
      const da = a.distance ? Number(a.distance) : 1e9;
      const db = b.distance ? Number(b.distance) : 1e9;
      return da - db;
    });

    // 사용자가 원하는 만큼 리턴 (기본 15 · 최대 15)
    const items = docs.slice(0, Math.min(15, display)).map(d => ({
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
