// 🔍 NAVER API HUB (NCP) · 블로그 검색
// 브랜드·메뉴명으로 블로그 리뷰 조회 → 재료·양 힌트 추출

module.exports = async function handler(req, res) {
  // CORS 헤더
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'POST only' });
  }

  const keyId = process.env.NCP_API_KEY_ID;
  const key = process.env.NCP_API_KEY;
  if (!keyId || !key) {
    return res.status(500).json({ error: 'NCP API credentials not configured (NCP_API_KEY_ID, NCP_API_KEY)' });
  }

  const { query, display = 5, sort = 'sim' } = req.body || {};
  if (!query || !String(query).trim()) {
    return res.status(400).json({ error: 'query required' });
  }

  try {
    const url = `https://naveropenapi.apigw.ntruss.com/search/v1/blog?query=${encodeURIComponent(query)}&display=${display}&sort=${sort}`;
    const naverRes = await fetch(url, {
      headers: {
        'X-NCP-APIGW-API-KEY-ID': keyId,
        'X-NCP-APIGW-API-KEY': key
      }
    });

    if (!naverRes.ok) {
      const txt = await naverRes.text();
      console.error('Naver API error:', naverRes.status, txt);
      return res.status(naverRes.status).json({ error: 'Naver API failed', detail: txt.slice(0, 200) });
    }

    const data = await naverRes.json();
    // 결과 정제 · HTML 태그 제거 · 필요한 필드만 반환
    const items = (data.items || []).map(item => ({
      title: (item.title || '').replace(/<[^>]+>/g, ''),
      description: (item.description || '').replace(/<[^>]+>/g, ''),
      bloggername: item.bloggername || '',
      postdate: item.postdate || ''
    }));

    return res.status(200).json({
      query,
      total: data.total || 0,
      items
    });
  } catch (err) {
    console.error('naver-search error', err);
    return res.status(500).json({ error: err.message || '검색 실패' });
  }
};
