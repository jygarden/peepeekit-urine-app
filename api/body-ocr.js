// 📸 인바디 종이 사진 OCR · Gemini vision으로 수치 추출
//
//   POST /api/body-ocr  { imageB64 }
//   → { weight_kg, body_fat_pct, muscle_mass_kg, waist_cm, confidence }

const { sendError, applyCors } = require('./_supabase');

module.exports = async function handler(req, res) {
  applyCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return sendError(res, 405, 'POST only');

  const { imageB64 } = req.body || {};
  if (!imageB64 || typeof imageB64 !== 'string') return sendError(res, 400, 'imageB64 필요');

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return sendError(res, 500, 'GEMINI_API_KEY 미설정');

  const prompt = `이 사진은 인바디(체성분) 측정 결과지야. 핵심 수치만 JSON으로 추출해.

규칙:
1. 순수 JSON 하나만 응답 · 마크다운 금지
2. 숫자 값만 (단위 뺌)
3. 못 읽는 값은 null
4. confidence는 전체 인식 신뢰도 0~1

스키마:
{
  "weight_kg": 70.5,
  "body_fat_pct": 18.3,
  "muscle_mass_kg": 32.4,
  "waist_cm": 82,
  "bmi": 23.1,
  "basal_metabolic_rate": 1650,
  "confidence": 0.85,
  "notes": "읽기 어려운 부분이 있으면 설명"
}

사진이 인바디 결과지가 아니면 {"error": "인바디 결과지가 맞는지 확인해주세요"}`;

  try {
    const r = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [
            { text: prompt },
            { inline_data: { mime_type: 'image/jpeg', data: imageB64 } }
          ]}],
          generationConfig: { temperature: 0.1 }
        })
      }
    );
    const data = await r.json();
    if (data.error) return sendError(res, 500, data.error.message);
    const raw = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!raw) return sendError(res, 500, 'OCR 결과 없음');

    // JSON 파싱 (코드블록 제거 포함)
    let cleaned = raw.replace(/```json\s*|```\s*/g, '').trim();
    const m = cleaned.match(/\{[\s\S]*\}/);
    if (!m) return sendError(res, 500, 'JSON 추출 실패');
    const parsed = JSON.parse(m[0]);
    if (parsed.error) return sendError(res, 400, parsed.error);

    return res.status(200).json(parsed);
  } catch(e) {
    console.error('[body-ocr]', e.message);
    return sendError(res, 500, e.message);
  }
};
