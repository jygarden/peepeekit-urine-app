module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST만 허용됩니다.' });

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return res.status(500).json({ error: '서버에 API 키가 설정되지 않았습니다.' });

  try {
    const { imageB64, petHint, recordData } = req.body;
    if (!imageB64) return res.status(400).json({ error: '이미지 데이터가 없습니다.' });

    const PROMPT = `당신은 반려동물 소변검사 전문 AI입니다. 제공된 소변검사 키트 이미지를 분석하여 아래 JSON 형식으로만 응답하세요. 설명 없이 순수 JSON만 반환하세요.

{
  "testItems": [
    {
      "name": "항목명(pH, 단백질, 포도당, 잠혈, 케톤, 백혈구, 아질산염, 비중 등 이미지에서 확인되는 모든 항목)",
      "value": "측정값 또는 색상 단계(예: 6.5, 음성, +1, 정상 등)",
      "status": "normal 또는 warning 또는 danger",
      "description": "이 항목에 대한 한국어 해석 1~2문장"
    }
  ],
  "overallStatus": "normal 또는 warning 또는 danger",
  "summary": "종합 건강 상태 평가 2~3문장 한국어",
  "tips": ["관리 팁1 한국어", "관리 팁2 한국어", "관리 팁3 한국어"],
  "vetVisitRecommended": true,
  "urgency": "normal 또는 soon 또는 urgent"
}

소변검사 키트가 아닌 이미지라면: {"error": "소변검사 키트 이미지를 다시 업로드해 주세요."}`;

    // 1. Gemini AI 분석
    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [
            { text: (petHint || '') + PROMPT },
            { inline_data: { mime_type: 'image/jpeg', data: imageB64 } }
          ]}],
          generationConfig: { temperature: 0.1, responseMimeType: 'application/json' }
        })
      }
    );

    const geminiData = await geminiRes.json();
    if (geminiData.error) return res.status(500).json({ error: geminiData.error.message });

    const raw = geminiData.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!raw) return res.status(500).json({ error: '분석 결과를 받지 못했습니다.' });

    const result = JSON.parse(raw);
    if (result.error) return res.status(400).json({ error: result.error });

    // 2. Supabase에 기록 저장 (설정된 경우)
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_ANON_KEY;

    if (supabaseUrl && supabaseKey && recordData) {
      try {
        await fetch(`${supabaseUrl}/rest/v1/pet_records`, {
          method: 'POST',
          headers: {
            'apikey': supabaseKey,
            'Authorization': `Bearer ${supabaseKey}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=minimal'
          },
          body: JSON.stringify({
            owner_contact:      recordData.contact || null,
            marketing_consent:  recordData.marketing || false,
            pet_type:           recordData.petType || null,
            pet_name:           recordData.petName || null,
            pet_birth_year:     recordData.birthYear ? parseInt(recordData.birthYear) : null,
            pet_birth_month:    recordData.birthMonth ? parseInt(recordData.birthMonth) : null,
            region:             recordData.region || null,
            living_environment: recordData.environment || null,
            overall_status:     result.overallStatus || null,
            analysis_result:    result
          })
        });
      } catch (dbErr) {
        // DB 저장 실패해도 분석 결과는 정상 반환
        console.error('DB save error:', dbErr.message);
      }
    }

    return res.status(200).json(result);

  } catch (err) {
    return res.status(500).json({ error: err.message || '서버 오류가 발생했습니다.' });
  }
};
