// ═══════════════════════════════════════════════════════
// Unsplash 음식 사진 프록시
// GET /api/food-photo?q=grilled+mackerel+korean
// 반환: { url, thumb, credit: { name, link } }
// ═══════════════════════════════════════════════════════
module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const query = (req.query && req.query.q) || '';
  if (!query) return res.status(400).json({ error: 'q 파라미터가 필요합니다.' });

  const key = process.env.UNSPLASH_KEY;
  if (!key) {
    // 키 없으면 placeholder gradient URL 반환 (개발/테스트용)
    return res.status(200).json({
      url: null,
      thumb: null,
      credit: null,
      placeholder: true
    });
  }

  try {
    const url = `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query + ' food')}&per_page=1&orientation=landscape`;
    const r = await fetch(url, {
      headers: { 'Authorization': `Client-ID ${key}` }
    });
    const data = await r.json();
    if (!data.results || !data.results.length) {
      return res.status(200).json({ url: null, thumb: null, credit: null, placeholder: true });
    }
    const p = data.results[0];
    return res.status(200).json({
      url: p.urls.regular,
      thumb: p.urls.small,
      credit: {
        name: p.user.name,
        link: p.user.links.html + '?utm_source=geongangeottae&utm_medium=referral'
      }
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};
