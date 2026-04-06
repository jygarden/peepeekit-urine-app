// Vercel 서버리스 함수 - API 키를 서버에서 안전하게 보관
module.exports = async function handler(req, res) {
  // CORS 허용
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.module.exports = async function handler(req, res) {
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
status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST만 허용됩니다.' });

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return res.status(500).json({ error: '서버에 API 키가 설정되지 않았습니다.' });

  try {
    // 프론트엔드에서 강아지 이름(petName), 견종(breed), 성별(gender)을 받습니다.
    const { imageB64, petHint, breed, gender, petName } = req.body;
    if (!imageB64) return res.status(400).json({ error: '이미지 데이터가 없습니다.' });

    // 이름이 입력되지 않았을 경우를 대비한 기본값
    const nameToUse = petName || '이 아이';
    const petInfo = `이름: ${nameToUse}, 견종: ${breed || '알 수 없음'}, 성별: ${gender || '알 수 없음'}`;

    const PROMPT = `당신은 반려동물 소변검사 키트 이미지를 기반으로 정밀 건강 분석을 수행하는 '전문 AI 수의사'입니다.
제공된 소변검사 키트 이미지와 반려견 정보를 종합하여 아래 JSON 형식으로만 응답하세요. 설명 없이 순수 JSON만 반환하세요.

[분석 절대 규칙 - 반드시 지킬 것!]
1. 사주, 명리학, 오행, 기운(물, 불 등), 선천적, 타고난, 체질과 같은 단어는 절대 사용하지 마세요. 오직 **촬영된 소변검사 키트 이미지의 색상 변화와 수치**에 근거하여 분석하세요.
2. 분석 결과나 관리 팁을 작성할 때 견종 이름(예: 코카스파니엘, 말티푸 등)은 문장에 절대 노출하지 마세요.
3. 견종 이름 대신 반드시 제공된 이름인 '${nameToUse}'를 주어로 사용하세요. (예: "코카스파니엘은 귀가 안 좋으니" -> "${nameToUse}는 귀가 취약할 수 있으니 평소 관리가 필요합니다.")

[반려견 정보]
${petInfo}

[JSON 응답 형식]
{
  "urinalysisInterpretation": "촬영된 소변검사 키트 이미지에서 확인되는 각 항목의 수치를 바탕으로 분석한 ${nameToUse}의 현재 건강 상태 해석 (3~4문장, 전문적이고 다정한 수의사 말투, '소변 검사 결과'임을 명확히 할 것)",
  "testItems": [
    {
      "name": "항목명(pH, 단백질, 포도당, 잠혈, 케톤, 백혈구, 아질산염, 비중 등 이미지에서 확인되는 모든 항목)",
      "value": "측정값 또는 색상 단계(예: 6.5, 음성, +1, 정상 등)",
      "status": "normal 또는 warning 또는 danger",
      "description": "이 항목의 수치가 ${nameToUse}에게 의미하는 한국어 해석 1~2문장"
    }
  ],
  "overallStatus": "normal 또는 warning 또는 danger",
  "summary": "소변 검사 결과와 유전적 특성을 종합한 ${nameToUse}의 현재 건강 상태 평가 2~3문장",
  "careGuide": {
    "breedRisks": ["${nameToUse}가 주의해야 할 일반적인 질병 2~3가지 (견종 이름 절대 언급 금지)"],
    "supplements": ["현재 소변 검사 수치를 고려해 ${nameToUse}에게 추천하는 영양제 성분 2~3가지"],
    "diet": "소변 검사 수치 기반 ${nameToUse}를 위한 맞춤형 식습관 가이드 1~2문장",
    "exercise": "${nameToUse}를 위한 맞춤형 운동법 1~2문장"
  },
  "vetVisitRecommended": true,
  "urgency": "normal 또는 soon 또는 urgent"
}

소변검사 키트가 아닌 이미지라면: {"error": "소변검사 키트 이미지를 다시 업로드해 주세요."}`;

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
          generationConfig: { 
            temperature: 0.1, // 결과를 이미지만 기반하도록 가장 엄격하게 세팅
            response_mime_type: 'application/json' 
          }
        })
      }
    );

    const data = await geminiRes.json();
    if (data.error) return res.status(500).json({ error: data.error.message });

    const raw = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!raw) return res.status(500).json({ error: '분석 결과를 받지 못했습니다.' });

    const cleanedRaw = raw.replace(/```json/gi, '').replace(/```/gi, '').trim();

    const result = JSON.parse(cleanedRaw);
    return res.status(200).json(result);

  } catch (err) {
    return res.status(500).json({ error: err.message || '서버 오류가 발생했습니다.' });
  }
}
