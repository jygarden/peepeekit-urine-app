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
    const key = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_ANON_KEY;
    if (!url || !key) return res.status(500).json({ error: 'Supabase not configured' });

    const { brand, foodName, ingredients, portion } = req.body || {};
    if (!foodName || !String(foodName).trim()) {
      return res.status(400).json({ error: 'foodName required' });
    }

    // 디바이스 ID 추출 (헤더에서) · 1명이 N번 저장해도 1표만 쳐주려고 저장
    const deviceId = req.headers['x-device-id'] || null;

    // 음식 이름 길이 검증 (악의적 긴 입력 차단)
    const cleanName = String(foodName).trim().slice(0, 40);
    const cleanBrand = brand ? String(brand).trim().slice(0, 60) : null;

    // 재료 최대 20개 · 각 이름 최대 20자
    const cleanIngs = Array.isArray(ingredients)
      ? ingredients.slice(0, 20).map(ing => {
          if (typeof ing === 'string') return ing.slice(0, 20);
          if (ing && ing.name) return { name: String(ing.name).slice(0, 20) };
          return null;
        }).filter(Boolean)
      : [];

    const supabase = createClient(url, key);
    const { data, error } = await supabase
      .from('crowd_corrections')
      .insert({
        brand: cleanBrand,
        food_name: cleanName,
        ingredients: cleanIngs,
        portion: Math.min(10, Math.max(0.1, Number(portion) || 1)),
        device_id: deviceId
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
