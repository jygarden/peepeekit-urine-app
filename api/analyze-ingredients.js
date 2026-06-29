// Vercel Serverless Function — 식품 성분표 AI 분석
// 위치: /api/analyze-ingredients.js
// v2 — responseSchema + 디버깅 정보 + 단순화 prompt

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST만 허용됩니다.' });

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({
      error: '서버에 GEMINI_API_KEY가 설정되지 않았어요.',
      debug: { reason: 'no_api_key' }
    });
  }

  try {
    const { imageB64 } = req.body || {};
    if (!imageB64) return res.status(400).json({ error: '이미지 데이터가 없습니다.' });

    const prompt = buildSimplePrompt();
    const model = 'gemini-2.5-flash';

    // ── 1차 호출 ──
    let geminiRes = await callGemini(apiKey, model, prompt, imageB64);
    let rawText = await extractText(geminiRes);

    // ── 응답 비었으면 1회 재시도 ──
    if (!rawText) {
      const retryPrompt = prompt + '\n\n⚠️ 매우 간결한 JSON만 출력. 마크다운 X.';
      geminiRes = await callGemini(apiKey, model, retryPrompt, imageB64);
      rawText = await extractText(geminiRes);
    }

    if (!rawText) {
      return res.status(500).json({
        error: 'AI가 응답하지 않았어요. 잠시 후 다시 시도해주세요.',
        debug: { reason: 'gemini_no_response', status: geminiRes?.status }
      });
    }

    // ── JSON 정리 ──
    let cleaned = rawText.trim()
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/\s*```\s*$/i, '');
    const firstBrace = cleaned.indexOf('{');
    const lastBrace = cleaned.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace > firstBrace) {
      cleaned = cleaned.slice(firstBrace, lastBrace + 1);
    }

    let result = null;
    let parseError = null;
    try {
      result = JSON.parse(cleaned);
    } catch(e) {
      parseError = e.message;
      const recovered = tryRecoverTruncatedJSON(cleaned);
      if (recovered) {
        try { result = JSON.parse(recovered); }
        catch(e2) { parseError = e2.message; }
      }
    }

    // ── 파싱 완전 실패 시 디버깅 정보와 함께 반환 ──
    if (!result) {
      return res.status(200).json({
        overallScore: 0,
        overallGrade: 'F',
        ingredients: [],
        summary: '⚠️ AI 응답 형식이 이상해요. (관리자용 디버깅: raw 응답을 추천란에서 확인하세요)',
        recommendation: '[DEBUG] 파싱 실패. AI 원본 응답:\n\n' + rawText.slice(0, 600),
        _debug: {
          parseError,
          rawTextLength: rawText.length,
          rawTextHead: rawText.slice(0, 200)
        }
      });
    }

    // ── AI가 명시적 error 반환 (예: 성분표 아님) ──
    if (result.error) return res.status(400).json(result);

    // ── 결과가 너무 빈약한 경우 디버깅 정보 추가 ──
    if (!Array.isArray(result.ingredients) || result.ingredients.length === 0) {
      result._debug = {
        reason: 'no_ingredients_in_response',
        rawTextHead: rawText.slice(0, 200)
      };
      result.summary = result.summary || '⚠️ AI가 성분을 인식하지 못했어요. 사진을 더 가까이서 명확하게 찍어주세요.';
    }

    // 필드 채우기
    result = fillMissingFields(result);
    return res.status(200).json(result);
  } catch (err) {
    return res.status(500).json({
      error: '서버 오류: ' + (err.message || '알 수 없음'),
      debug: { stack: err.stack?.slice(0, 300) }
    });
  }
};

// ── 단순한 프롬프트 (Gemini가 더 잘 따르도록) ──
function buildSimplePrompt() {
  return `한국어로만 응답. JSON 형식으로만 출력 (마크다운 코드블럭 X).

사진에 보이는 식품 제품의 성분표(원재료명)를 읽고 각 성분을 분석해요.

각 성분마다:
- name: 성분명 (한글)
- type: 종류 (예: 천연성분/인공감미료/착색료/보존료/산도조절제/유화제/향료 등)
- safety: "safe" 또는 "caution" 또는 "warning" 또는 "danger" 중 하나
- impact: 인체 영향 (1~2문장, 일반인 눈높이)
- description: 이 성분이 뭔지 (1~2문장)
- dailyLimit: 알려진 일일 한도 (없으면 "정해진 한도 없음")

종합 점수 (overallScore, 0~100):
- 90~100: 천연 성분 위주
- 75~89: 대부분 안전
- 60~74: 첨가물 다수
- 40~59: 합성 첨가물 많음
- 0~39: 다량의 유해 첨가물

JSON 구조:
{
  "productName": "제품명 (보이면, 아니면 빈 문자열)",
  "overallScore": 정수,
  "overallGrade": "A 또는 B 또는 C 또는 D 또는 F",
  "ingredients": [
    {
      "name": "...",
      "type": "...",
      "safety": "safe|caution|warning|danger",
      "impact": "...",
      "description": "...",
      "dailyLimit": "..."
    }
  ],
  "summary": "이 제품 종합 평가 3~4문장",
  "recommendation": "어떻게 섭취하면 좋을지 2~3문장"
}

만약 사진에 성분표가 안 보이면:
{"error": "성분표 부분을 더 가까이 찍어주세요."}

⚡ 모든 값 한국어. ingredients는 사진의 모든 성분 포함 (보통 5~30개).`;
}

// ── Gemini 호출 + responseSchema ──
async function callGemini(apiKey, model, prompt, imageB64) {
  const body = {
    contents: [{
      parts: [
        { text: prompt },
        { inline_data: { mime_type: 'image/jpeg', data: imageB64 } }
      ]
    }],
    generationConfig: {
      temperature: 0.2,
      maxOutputTokens: 8192,
      responseMimeType: 'application/json',
      responseSchema: {
        type: 'OBJECT',
        properties: {
          productName: { type: 'STRING' },
          overallScore: { type: 'INTEGER' },
          overallGrade: { type: 'STRING' },
          ingredients: {
            type: 'ARRAY',
            items: {
              type: 'OBJECT',
              properties: {
                name: { type: 'STRING' },
                type: { type: 'STRING' },
                safety: { type: 'STRING' },
                impact: { type: 'STRING' },
                description: { type: 'STRING' },
                dailyLimit: { type: 'STRING' }
              },
              required: ['name', 'safety', 'impact']
            }
          },
          summary: { type: 'STRING' },
          recommendation: { type: 'STRING' },
          error: { type: 'STRING' }
        }
      }
    }
  };

  return fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    }
  );
}

async function extractText(response) {
  if (!response || !response.ok) {
    try {
      const errText = await response.text();
      console.error('[Gemini 오류]', response?.status, errText.slice(0, 300));
    } catch(e) {}
    return null;
  }
  try {
    const data = await response.json();
    return data?.candidates?.[0]?.content?.parts?.[0]?.text || null;
  } catch(e) {
    console.error('[응답 파싱 실패]', e.message);
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

  let depth = 0, inString = false, escape = false, lastSafeIdx = -1;
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
  let d2 = 0, in2 = false, e2 = false;
  for (let i = 0; i < cut.length; i++) {
    const ch = cut[i];
    if (e2) { e2 = false; continue; }
    if (ch === '\\') { e2 = true; continue; }
    if (ch === '"') in2 = !in2;
    if (in2) continue;
    if (ch === '{' || ch === '[') d2++;
    else if (ch === '}' || ch === ']') d2--;
  }
  return cut + '}'.repeat(Math.max(0, d2));
}

function fillMissingFields(r) {
  if (!r || typeof r !== 'object') r = {};

  if (typeof r.overallScore !== 'number') r.overallScore = 65;
  r.overallScore = Math.max(0, Math.min(100, Math.round(r.overallScore)));
  if (!r.overallGrade) {
    const s = r.overallScore;
    r.overallGrade = s >= 90 ? 'A' : s >= 75 ? 'B' : s >= 60 ? 'C' : s >= 40 ? 'D' : 'F';
  }
  if (!r.productName) r.productName = '';
  if (!Array.isArray(r.ingredients)) r.ingredients = [];
  r.ingredients = r.ingredients.map(ing => ({
    name: ing?.name || '알 수 없음',
    type: ing?.type || '성분',
    safety: ['safe','caution','warning','danger'].includes((ing?.safety || '').toLowerCase())
      ? ing.safety.toLowerCase() : 'caution',
    impact: ing?.impact || '정보가 부족해요',
    description: ing?.description || '',
    dailyLimit: ing?.dailyLimit || '정해진 한도 없음'
  }));
  if (!r.summary) r.summary = '분석을 완료했어요!';
  if (!r.recommendation) r.recommendation = '제품을 적당히 섭취하시고, 다른 식품과 균형 있게 드세요.';
  return r;
}
