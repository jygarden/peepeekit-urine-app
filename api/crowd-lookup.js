// 👥 크라우드소싱 · 브랜드+메뉴 조회 (Supabase)
const { createClient } = require('@supabase/supabase-js');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const url = process.env.SUPABASE_URL;
    const anon = process.env.SUPABASE_ANON_KEY;
    if (!url || !anon) return res.status(500).json({ error: 'Supabase not configured' });

    const brand = req.body?.brand || req.query?.brand || '';
    const foodName = req.body?.foodName || req.query?.foodName || '';
    if (!foodName) return res.status(400).json({ error: 'foodName required' });

    const supabase = createClient(url, anon);
    let query = supabase
      .from('crowd_corrections')
      .select('*')
      .ilike('food_name', `%${foodName.trim()}%`);
    if (brand && brand.trim()) {
      query = query.ilike('brand', `%${brand.trim()}%`);
    }
    const { data, error } = await query.order('created_at', { ascending: false }).limit(50);
    if (error) return res.status(500).json({ error: error.message });
    if (!data || data.length === 0) return res.status(200).json({ found: false });

    // 재료 통계 · 가장 자주 등장한 재료
    const ingCount = {};
    data.forEach(r => {
      (r.ingredients || []).forEach(ing => {
        const name = typeof ing === 'string' ? ing : (ing.name || '');
        if (name) ingCount[name] = (ingCount[name] || 0) + 1;
      });
    });
    const topIngredients = Object.entries(ingCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([name, count]) => ({ name, count }));

    const portions = data.map(r => Number(r.portion) || 1);
    const avgPortion = portions.length
      ? Math.round((portions.reduce((a, b) => a + b, 0) / portions.length) * 10) / 10
      : 1;

    return res.status(200).json({
      found: true,
      confidence: data.length,
      brand: data[0].brand,
      foodName: data[0].food_name,
      topIngredients,
      avgPortion,
      lastUpdate: data[0].created_at
    });
  } catch (err) {
    console.error('crowd-lookup', err);
    return res.status(500).json({ error: err.message || '조회 실패' });
  }
};
