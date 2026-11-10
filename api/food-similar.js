// ═══════════════════════════════════════════════════════════════
// 🔍 비슷한 음식 검색 (식약처 식품영양성분DB 기반)
//   GET /api/food-similar?q=비빔밥 → { foods: [{name, category, kcal_per_serving, ...}] }
// ═══════════════════════════════════════════════════════════════

const path = require('path');
const fs = require('fs');

let _foodDb = null;
function loadFoodDb() {
  if (_foodDb) return _foodDb;
  try {
    // dist/, root, 그리고 몇 경로 시도
    const candidates = [
      path.join(process.cwd(), 'data', 'food_menu_v2.json'),
      path.join(__dirname, '..', 'data', 'food_menu_v2.json'),
      path.join(__dirname, '..', '..', 'data', 'food_menu_v2.json')
    ];
    for (const p of candidates) {
      if (fs.existsSync(p)) {
        const raw = fs.readFileSync(p, 'utf8');
        _foodDb = JSON.parse(raw);
        return _foodDb;
      }
    }
    _foodDb = [];
    return _foodDb;
  } catch(e) {
    _foodDb = [];
    return _foodDb;
  }
}

// 간단 퍼지 매칭 점수 (N-gram 기반)
function fuzzyScore(query, name) {
  const q = (query || '').toLowerCase().trim();
  const n = (name || '').toLowerCase();
  if (!q || !n) return 0;
  if (n === q) return 1000;
  if (n.includes(q)) return 500 + (q.length / n.length) * 100;
  if (q.includes(n)) return 300 + (n.length / q.length) * 100;

  // 한글 음절 단위 2-gram 비교
  const bigrams = s => {
    const bs = new Set();
    for (let i = 0; i < s.length - 1; i++) bs.add(s.slice(i, i + 2));
    return bs;
  };
  const qb = bigrams(q), nb = bigrams(n);
  let overlap = 0;
  qb.forEach(b => { if (nb.has(b)) overlap++; });
  const union = qb.size + nb.size - overlap;
  return union > 0 ? (overlap / union) * 200 : 0;
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Device-Id, X-Nickname');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'method not allowed' });

  const q = (req.query && req.query.q) || '';
  if (!q.trim()) return res.status(200).json({ foods: [] });

  const db = loadFoodDb();
  if (!db.length) return res.status(200).json({ foods: [], note: 'DB unavailable' });

  // 전체 음식에 대해 점수 계산 → 상위 15개 리턴
  const scored = db.map(f => ({
    name: f.name,
    category: f.category || null,
    cuisine: f.cuisine || null,
    serving_size_g: f.serving_size_g || null,
    kcal_per_serving: f.kcal_per_serving || null,
    protein_g: f.protein_g || null,
    _score: fuzzyScore(q, f.name)
  })).filter(f => f._score > 20);

  scored.sort((a, b) => b._score - a._score);
  const top = scored.slice(0, 15).map(({ _score, ...rest }) => rest);

  return res.status(200).json({
    foods: top,
    source: 'KOREAN_FOOD_DB_v2 (식약처 기반)',
    total_candidates: scored.length
  });
};
