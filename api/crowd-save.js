// 👥 크라우드소싱 · 사용자 인식 결과 수정 저장 (Supabase)
const { createClient } = require('@supabase/supabase-js');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  try {
    const url = process.env.SUPABASE_URL;
    const anon = process.env.SUPABASE_ANON_KEY;
    if (!url || !anon) return res.status(500).json({ error: 'Supabase not configured' });

    const { brand, foodName, ingredients, portion } = req.body || {};
    if (!foodName || !String(foodName).trim()) {
      return res.status(400).json({ error: 'foodName required' });
    }

    const supabase = createClient(url, anon);
    const { data, error } = await supabase
      .from('crowd_corrections')
      .insert({
        brand: (brand || '').trim() || null,
        food_name: foodName.trim(),
        ingredients: Array.isArray(ingredients) ? ingredients : [],
        portion: portion || 1
      })
      .select();

    if (error) {
      console.error('supabase insert', error);
      return res.status(500).json({ error: error.message });
    }
    return res.status(200).json({ ok: true, id: data?.[0]?.id });
  } catch (err) {
    console.error('crowd-save', err);
    return res.status(500).json({ error: err.message || '저장 실패' });
  }
};
