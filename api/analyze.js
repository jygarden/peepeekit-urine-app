// Vercel 서버리스 함수 - API 키를 서버에서 안전하게 보관
module.exports = async function handler(req, res) {
  // CORS 허용
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST만 허용됩니다.' });

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return res.status(500).json({ error: '서버에 API 키가 설정되지 않았습니다.' });

  try {
    // 프론트엔드에서 강아지 정보(breed, gender, birthYear, birthMonth)를 추가로 받습니다.
    const { imageB64, petHint, breed, gender, birthYear, birthMonth } = req.body;
    if (!imageB64) return res.status(400).json({ error: '이미지 데이터가 없습니다.' });

    // AI에게 전달할 강아지 정보 문자열 조립 (값이 없을 경우를 대비해 기본값 설정)
    const petInfo = `견종: ${breed || '알 수 없음'}, 성별: ${gender || '알 수 없음'}, 출생년월: ${birthYear || '알 수 없음'}년 ${birthMonth || '알 수 없음'}월`;

    const PROMPT = `당신은 수의학 지식과 동양의 명리학(사주팔자)을 꿰뚫고 있는 '펫 사주 전문 수의사'입니다.
제공된 소변검사 키트 이미지와 아래의 반려견 정보를 종합하여 아래 JSON 형식으로만 응답하세요. 설명 없이 순수 JSON만 반환하세요.

[반려견 정보]
${petInfo}

[JSON 응답 형식]
{
  "sajuFortune": "생년월과 성별을 바탕으로 재미있게 풀어낸 강아지의 타고난 사주와 건강 운세 (3~4문장, 예: 흙의 기운이 강하게 태어나 위장이 튼튼한 사주입니다. 하지만 금(金)의 기운이 부족해 호흡기 쪽을 신경 써주면 대성할 견공이네요!)",
  "testItems": [
    {
      "name": "항목명(pH, 단백질, 포도당, 잠혈, 케톤, 백혈구, 아질산염, 비중 등 이미지에서 확인되는 모든 항목)",
      "value": "측정값 또는 색상 단계(예: 6.5, 음성, +1, 정상 등)",
      "status": "normal 또는 warning 또는 danger",
      "description": "이 항목에 대한 한국어 해석 1~2문장"
    }
  ],
  "overallStatus": "normal 또는 warning 또는 danger",
  "summary": "소변 검사 결과와 견종 특성을 종합한 건강 상태 평가 2~3문장",
  "careGuide": {
    "breedRisks": ["해당 견종이 유전적으로 취약하여 조심해야 할 질병 2~3가지"],
    "supplements": ["현재 소변 상태와 견종을 고려해 추천하는 영양제 성분 2~3가지 (예: 오메가3, 크랜베리 추출물 등)"],
    "diet": "맞춤형 식습관 가이드 1~2문장 (예: 음수량을 늘리기 위해 습식 캔을 섞어주세요)",
    "exercise": "맞춤형 운동법 1~2문장 (예: 슬개골이 약한 견종이니 무리한 점프는 피하고 평지 산책을 늘려주세요)"
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
            temperature: 0.2, // 사주 풀이를 위해 창의성을 아주 살짝(0.1 -> 0.2) 올렸습니다.
            response_mime_type: 'application/json' 
          }
        })
      }
    );

    const data = await geminiRes.json();
    if (data.error) return res.status(500).json({ error: data.error.message });

    const raw = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!raw) return res.status(500).json({ error: '분석 결과를 받지 못했습니다.' });

    // 제미나이가 마크다운(```json)을 섞어 보낼 경우를 대비해 텍스트 클리닝 작업 추가
    const cleanedRaw = raw.replace(/```json/gi, '').replace(/```/gi, '').trim();

    const result = JSON.parse(cleanedRaw);
    return res.status(200).json(result);

  } catch (err) {
    return res.status(500).json({ error: err.message || '서버 오류가 발생했습니다.' });
  }
}
