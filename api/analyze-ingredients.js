// Vercel Serverless Function — 식품 성분표 AI 분석
// 위치: /api/analyze-ingredients.js
//
// Gemini 2.5 Flash로 제품 성분표 인식
// → 각 성분 분류 (정제수/비타민/감미료/착색료/보존료/방부제...)
// → 인체 영향 + 안전 등급 + 일일 한도 안내
// → 종합 점수 + AI 평가 + 추천

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST만 허용됩니다.' });

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return res.status(500).json({ error: '서버에 API 키가 설정되지 않았습니다.' });

  try {
    const { imageB64 } = req.body;
    if (!imageB64) return res.status(400).json({ error: '이미지 데이터가 없습니다.' });

    const prompt = buildIngredientPrompt();
    const model = 'gemini-2.5-flash';

    let response = await callGemini(apiKey, model, prompt, imageB64);
    let textOutput = await extractText(response);

    // 1회 자동 재시도
    if (!textOutput) {
      const retryPrompt = prompt + '\n\n⚠️ JSON 응답 짧고 정확하게! 각 설명 2~3문장 이내.';
      response = await callGemini(apiKey, model, retryPrompt, imageB64);
      textOutput = await extractText(response);
    }
    if (!textOutput) {
      return res.status(500).json({ error: 'AI가 분석에 실패했어요. 성분표 사진을 다시 찍어주세요.' });
    }

    // JSON 정리
    textOutput = textOutput.trim();
    textOutput = textOutput.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '');
    const firstBrace = textOutput.indexOf('{');
    const lastBrace = textOutput.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace > firstBrace) {
      textOutput = textOutput.slice(firstBrace, lastBrace + 1);
    }

    let result;
    try {
      result = JSON.parse(textOutput);
    } catch(e) {
      const recovered = tryRecoverTruncatedJSON(textOutput);
      if (recovered) {
        try { result = JSON.parse(recovered); }
        catch(e2) { result = buildMinimalResult(); }
      } else {
        result = buildMinimalResult();
      }
    }

    if (result.error) return res.status(400).json(result);

    // 누락 필드 채우기
    result = fillMissingFields(result);
    return res.status(200).json(result);
  } catch (err) {
    return res.status(500).json({ error: err.message || '서버 오류' });
  }
};

function buildIngredientPrompt() {
  return `🇰🇷 한국어로만 응답. 매우 간결하게! (Vercel 10초 timeout)

당신은 식품안전·영양학 전문가. 사진은 시중 식음료 제품의 **성분 표시(원재료명)** 부분이에요. 거기 적힌 모든 성분을 분석하세요.

=== 분석 규칙 ===
1. 사진에서 성분명을 정확히 읽기 (정제수/구연산/아스파탐/카라기난/적색40호 등)
2. 각 성분을 분류 (예: 천연성분/비타민/인공감미료/착색료/보존료/유화제/산도조절제/방부제/카페인 등)
3. 인체 영향을 일반인 눈높이로 (어려운 화학용어 NO)
4. 안전 등급 4단계 분류:
   - "safe": 일반적으로 안전 (정제수, 비타민, 천연추출물, 일반 향료)
   - "caution": 적당히 섭취 권장 (인공감미료 일부, 자연 카페인)
   - "warning": 다량 섭취 시 부작용 가능 (아스파탐, 적색40호, 합성착색료, 안식향산나트륨)
   - "danger": 가능한 피해야 (트랜스지방, 아질산나트륨, MSG 다량, 알려진 유해 인공첨가물)
5. **다당류 첨가물·인공감미료·인공착색료**는 가급적 정확히 분류 (사용자 보호 우선)
6. 일일 권장 섭취 한도는 알려진 경우만 표시 (없으면 "정해진 한도 없음")

=== 종합 점수 산정 ===
- 90~100점 (A): 천연 성분 위주, 첨가물 거의 없음
- 75~89점 (B): 대부분 안전, 일부 가벼운 첨가물
- 60~74점 (C): 첨가물 다수, 주의 필요
- 40~59점 (D): 합성 첨가물·인공감미료 많음
- 0~39점 (F): 다량의 유해 첨가물

=== 사진이 성분표 아닐 때 ===
{"error": "제품의 성분표 부분을 더 가까이 찍어주세요."}

=== JSON 응답 (이대로만) ===
{
  "productName": "제품명 (사진에 보이면, 없으면 빈 문자열)",
  "overallScore": 0~100 정수,
  "overallGrade": "A 또는 B 또는 C 또는 D 또는 F",
  "ingredients": [
    {
      "name": "성분명 (예: 아스파탐)",
      "type": "분류 (예: 인공감미료, 천연성분, 비타민, 착색료, 보존료, 산도조절제, 유화제, 향료, 방부제 등)",
      "safety": "safe 또는 caution 또는 warning 또는 danger",
      "impact": "인체 영향 (1~2문장, 일반인 눈높이)",
      "description": "이 성분이 뭔지 (1~2문장)",
      "dailyLimit": "알려진 일일 한도 (예: 체중 1kg당 40mg) 또는 '정해진 한도 없음'"
    }
  ],
  "summary": "이 제품의 전체적인 평가 (3~4문장, 친근한 어조)",
  "recommendation": "이 제품을 어떻게 섭취하면 좋을지 (2~3문장, 예: 하루 1캔 이내 권장, 식사 후 섭취 피하기 등)"
}

⚡ 모든 응답값 한국어! ingredients 배열은 사진에서 읽은 모든 성분 포함 (5~30개 정도).`;
}

async function callGemini(apiKey, model, prompt, imageB64) {
  return fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [
            { text: prompt },
            { inline_data: { mime_type: 'image/jpeg', data: imageB64 } }
          ]
        }],
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 8192,
          responseMimeType: 'application/json'
        }
      })
    }
  );
}

async function extractText(response) {
  if (!response.ok) {
    const errText = await response.text();
    console.error('Gemini 오류:', errText.slice(0, 200));
    return null;
  }
  try {
    const data = await response.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || null;
  } catch(e) {
    console.error('응답 파싱 실패:', e.message);
    return null;
  }
}

function tryRecoverTruncatedJSON(text) {
  if (!text) return null;
  let s = text.trim();
  s = s.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '');
  const firstBrace = s.indexOf('{');
  if (firstBrace === -1) return null;
  s = s.slice(firstBrace);

  let depth = 0, inString = false, escape = false;
  let lastSafeIdx = -1;
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (escape) { escape = false; continue; }
    if (ch === '\\') { escape = true; continue; }
    if (ch === '"') inString = !inString;
    if (inString) continue;
    if (ch === '{' || ch === '[') depth++;
    else if (ch === '}' || ch === ']') {
      depth--;
      if (depth === 0) lastSafeIdx = i;
    }
  }
  if (depth === 0 && lastSafeIdx > 0) return s.slice(0, lastSafeIdx + 1);

  let cut = s;
  if (inString) {
    const lastQuote = cut.lastIndexOf('"');
    cut = cut.slice(0, lastQuote);
  }
  cut = cut.replace(/,\s*$/, '').replace(/:\s*$/, ': null');
  let recovered = cut;
  let d2 = 0, in2 = false, e2 = false;
  for (let i = 0; i < recovered.length; i++) {
    const ch = recovered[i];
    if (e2) { e2 = false; continue; }
    if (ch === '\\') { e2 = true; continue; }
    if (ch === '"') in2 = !in2;
    if (in2) continue;
    if (ch === '{' || ch === '[') d2++;
    else if (ch === '}' || ch === ']') d2--;
  }
  recovered = recovered + '}'.repeat(Math.max(0, d2));
  return recovered;
}

function buildMinimalResult() {
  return {
    productName: '',
    overallScore: 65,
    overallGrade: 'C',
    ingredients: [{
      name: '분석 실패',
      type: '정보',
      safety: 'caution',
      impact: '사진을 다시 찍어주시면 더 정확하게 분석해드릴게요',
      description: 'AI가 성분을 명확히 읽지 못했어요',
      dailyLimit: '-'
    }],
    summary: '죄송해요! 성분표 사진을 명확하게 다시 찍어주시면 정확한 분석이 가능해요. 글자가 또렷이 보이도록, 반사·그림자 없이 찍어주세요. 😊',
    recommendation: '제품 뒷면 성분 표시 부분을 가까이서 다시 찍어보세요.'
  };
}

function fillMissingFields(r) {
  if (!r || typeof r !== 'object') return buildMinimalResult();

  if (typeof r.overallScore !== 'number') r.overallScore = 65;
  r.overallScore = Math.max(0, Math.min(100, Math.round(r.overallScore)));
  if (!r.overallGrade) {
    if (r.overallScore >= 90) r.overallGrade = 'A';
    else if (r.overallScore >= 75) r.overallGrade = 'B';
    else if (r.overallScore >= 60) r.overallGrade = 'C';
    else if (r.overallScore >= 40) r.overallGrade = 'D';
    else r.overallGrade = 'F';
  }
  if (!r.productName) r.productName = '';
  if (!Array.isArray(r.ingredients)) r.ingredients = [];
  r.ingredients = r.ingredients.map(ing => ({
    name: ing.name || '알 수 없음',
    type: ing.type || '성분',
    safety: ['safe','caution','warning','danger'].includes((ing.safety||'').toLowerCase())
      ? ing.safety.toLowerCase() : 'caution',
    impact: ing.impact || '정보가 부족해요',
    description: ing.description || '',
    dailyLimit: ing.dailyLimit || '정해진 한도 없음'
  }));
  if (!r.summary) r.summary = '분석을 완료했어요!';
  if (!r.recommendation) r.recommendation = '제품을 적당히 섭취하시고, 다른 식품과 균형 있게 드세요.';
  return r;
}
