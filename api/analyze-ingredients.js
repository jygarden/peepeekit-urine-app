// Vercel Serverless Function — 식품 성분표 AI 분석
// 위치: /api/analyze-ingredients.js
// v4 — required ingredients + 강제 재시도 + JSON 순서 변경

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST만 허용됩니다.' });

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: '서버에 GEMINI_API_KEY가 설정되지 않았어요.' });
  }

  try {
    const { imageB64 } = req.body || {};
    if (!imageB64) return res.status(400).json({ error: '이미지 데이터가 없습니다.' });

    const model = 'gemini-2.5-flash';

    // ── 1차 호출: ingredients-first 프롬프트 ──
    let result = await tryAnalyze(apiKey, model, buildIngredientsFirstPrompt(), imageB64);

    // ── ingredients 빈 배열이면 더 강한 prompt로 재시도 ──
    if (!result || !Array.isArray(result.ingredients) || result.ingredients.length === 0) {
      console.log('[성분분석] 1차 빈 결과, 강제 재시도');
      result = await tryAnalyze(apiKey, model, buildForcePrompt(), imageB64);
    }

    // ── 그래도 빈 배열이면 summary에서 성분명 강제 추출 ──
    if (result && (!Array.isArray(result.ingredients) || result.ingredients.length === 0)) {
      const extracted = extractIngredientsFromText(result.summary || '');
      if (extracted.length > 0) {
        result.ingredients = extracted;
        result._debug = { reason: 'extracted_from_summary', count: extracted.length };
      }
    }

    if (!result) {
      return res.status(500).json({ error: 'AI 응답을 받지 못했어요.' });
    }
    if (result.error) return res.status(400).json(result);

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

// ── tryAnalyze: 호출 + 파싱 한 사이클 ──
async function tryAnalyze(apiKey, model, prompt, imageB64) {
  let geminiRes = await callGemini(apiKey, model, prompt, imageB64);
  let rawText = await extractText(geminiRes);
  if (!rawText) return null;

  // 정리
  let cleaned = rawText.trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```\s*$/i, '');
  const firstBrace = cleaned.indexOf('{');
  const lastBrace = cleaned.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    cleaned = cleaned.slice(firstBrace, lastBrace + 1);
  }

  try { return JSON.parse(cleaned); }
  catch(e) {
    const recovered = tryRecoverTruncatedJSON(cleaned);
    if (recovered) {
      try { return JSON.parse(recovered); } catch(e2) {}
    }
    // 파싱 다 실패해도 raw 텍스트 정보는 남겨두기
    return { _rawTextHead: rawText.slice(0, 300), _parseError: true };
  }
}

// ── 프롬프트 1: ingredients 먼저 작성하도록 ──
function buildIngredientsFirstPrompt() {
  return `🇰🇷 한국어 JSON. 마크다운 X.

당신은 식품 성분 전문가. 사진의 식품 성분표를 분석.

★ 매우 중요 ★
1. ingredients 배열을 **반드시 먼저** 작성 (최소 3개, 보통 10~25개)
2. summary에는 **성분명 절대 나열 X** (3문장 이내 짧게)
3. summary는 ingredients 작성 끝난 후 마지막에

=== 분석 규칙 ===
사진에서 "원재료명:" 또는 성분 나열을 찾아 모두 추출.
괄호 안 부속 성분도 별도로 추가.
예: "준초콜릿(설탕, 가공유지, 혼합분유, 코코아분말, 유당)" → 6개 성분으로 분리.

각 성분 분류:
- safe: 정제수, 비타민, 천연재료 (밀가루, 찹쌀, 정제소금 등)
- caution: 일반 첨가물 (정제소금 다량, 설탕, 올리고당, 카페인, 카라멜색소, 식이섬유 등)
- warning: 합성첨가물 (아스파탐, 합성착색료, 적색40호, 안식향산나트륨, MSG, 글리세린, 폴리글리세린지방산에스테르, 프로필렌글리콜 등)
- danger: 알려진 유해성분 (트랜스지방, 아질산나트륨 등)

=== JSON (이 순서 그대로!) ===
{
  "ingredients": [
    {"name": "올리고당", "type": "당류", "safety": "caution", "impact": "혈당 영향 적음 / 과다 섭취 시 복부 불편감", "description": "포도당이 결합된 당. 설탕 대체용", "dailyLimit": "정해진 한도 없음"},
    {"name": "준초콜릿", "type": "혼합 가공품", "safety": "caution", "impact": "당분·지방 함량 높아 과다 섭취 주의", "description": "코코아 분말과 가공유지를 혼합한 초콜릿", "dailyLimit": "정해진 한도 없음"}
  ],
  "productName": "제품명",
  "overallScore": 정수,
  "overallGrade": "A|B|C|D|F",
  "summary": "3문장 이내 종합 평가 (성분명 X)",
  "recommendation": "섭취 가이드 2~3문장"
}

⚡ ingredients 빈 배열은 절대 금지! 최소 3개 이상.`;
}

// ── 프롬프트 2: 더 강한 재시도용 ──
function buildForcePrompt() {
  return `🇰🇷 한국어 JSON만.

★ ingredients 배열에 사진에 보이는 성분명을 모두 적으세요. 빈 배열 절대 금지! ★

각 성분: {"name": "성분명", "type": "분류", "safety": "safe|caution|warning|danger", "impact": "영향 1줄", "description": "설명 1줄", "dailyLimit": "한도"}

성분이 안 보이면 제품 이름으로 일반적 성분을 추정해서 작성 (예: 초콜릿 과자 → 밀가루, 설탕, 코코아, 식물성유지, 우유, 유화제 등).

⚠️ summary에 성분명 나열 절대 금지. summary 짧게 (2~3문장).

JSON 응답:
{
  "ingredients": [최소 5개 객체],
  "productName": "...",
  "overallScore": 정수,
  "overallGrade": "A|B|C|D|F",
  "summary": "3문장 이내",
  "recommendation": "2~3문장"
}`;
}

// ── summary 텍스트에서 성분명 추출 (백업) ──
function extractIngredientsFromText(text) {
  if (!text) return [];

  // 알려진 성분명 사전
  const knownIngredients = {
    '정제수': { type:'천연성분', safety:'safe', impact:'안전합니다', desc:'물입니다' },
    '올리고당': { type:'당류', safety:'caution', impact:'혈당 영향 적음, 과다 시 복부 불편', desc:'설탕 대체 당류' },
    '설탕': { type:'당류', safety:'caution', impact:'과다 섭취 시 혈당·체중 증가', desc:'정제 당류' },
    '말티톨': { type:'당알코올', safety:'caution', impact:'과다 시 설사·복부 팽만', desc:'당알코올 감미료' },
    '말티톨액': { type:'당알코올', safety:'caution', impact:'과다 시 설사·복부 팽만', desc:'당알코올 감미료' },
    '준초콜릿': { type:'가공식품', safety:'caution', impact:'당분·지방 함량 높음', desc:'코코아+가공유지 혼합' },
    '가공유지': { type:'유지', safety:'caution', impact:'트랜스지방 가능성, 과다 시 심혈관 위험', desc:'가공된 식물성 기름' },
    '혼합분유': { type:'유제품', safety:'safe', impact:'우유 알레르기 주의', desc:'우유 가공품' },
    '코코아분말': { type:'천연성분', safety:'safe', impact:'카페인 미량 포함', desc:'카카오 분말' },
    '유당': { type:'당류', safety:'caution', impact:'유당불내증인 경우 소화 불편', desc:'우유 속 당분' },
    '옥수수전분': { type:'천연성분', safety:'safe', impact:'안전합니다', desc:'옥수수에서 추출한 전분' },
    '찰옥수수전분': { type:'천연성분', safety:'safe', impact:'안전합니다', desc:'찰옥수수 전분' },
    '쇼트닝': { type:'유지', safety:'warning', impact:'트랜스지방 가능, 심혈관 영향', desc:'반고체 식용유' },
    '팜유': { type:'유지', safety:'caution', impact:'포화지방 다량, 과다 시 콜레스테롤 영향', desc:'팜 열매 기름' },
    '토코페롤': { type:'비타민', safety:'safe', impact:'항산화 효과', desc:'비타민E' },
    '레시틴': { type:'유화제', safety:'safe', impact:'안전합니다', desc:'대두/계란 유화제' },
    '구연산': { type:'산도조절제', safety:'safe', impact:'안전합니다', desc:'산미·보존제' },
    '식물성크림': { type:'가공식품', safety:'caution', impact:'가공 지방·당분 함유', desc:'식물성 유지 기반 크림' },
    '물엿': { type:'당류', safety:'caution', impact:'당분 다량', desc:'옥수수·전분 시럽' },
    '유청분말': { type:'유제품', safety:'safe', impact:'우유 알레르기 주의', desc:'유청 단백질' },
    '제이인산칼륨': { type:'산도조절제', safety:'caution', impact:'과다 시 신장 부담', desc:'완충제·안정제' },
    '덱스트린': { type:'당류', safety:'safe', impact:'안전합니다', desc:'전분 분해물' },
    '시클로덱스트린': { type:'당류', safety:'safe', impact:'안전합니다', desc:'고리 모양 당류' },
    '찹쌀분말': { type:'천연성분', safety:'safe', impact:'안전합니다', desc:'찹쌀 분쇄' },
    '찹쌀': { type:'천연성분', safety:'safe', impact:'안전합니다', desc:'찹쌀' },
    '피스타치오': { type:'천연성분', safety:'safe', impact:'견과류 알레르기 주의', desc:'피스타치오 견과' },
    '글리세린': { type:'유화제', safety:'caution', impact:'과다 시 두통·메스꺼움', desc:'보습·감미용 가공물' },
    '옥수수기름': { type:'유지', safety:'caution', impact:'오메가6 다량', desc:'옥수수 추출 기름' },
    '정제소금': { type:'무기물', safety:'caution', impact:'과다 섭취 시 혈압 영향', desc:'정제된 소금' },
    '밀가루': { type:'천연성분', safety:'safe', impact:'밀 알레르기·글루텐 주의', desc:'밀 분쇄' },
    '주정': { type:'알코올', safety:'caution', impact:'알코올 미량 함유', desc:'식용 알코올' },
    '폴리글리세린지방산에스테르': { type:'유화제', safety:'warning', impact:'합성 유화제, 과다 시 소화 불편', desc:'합성 유화제' },
    '글리세린에스테르': { type:'유화제', safety:'warning', impact:'합성 유화제', desc:'글리세롤 에스테르' },
    '프로필렌글리콜에스테르': { type:'유화제', safety:'warning', impact:'합성 유화제, 일부 민감 반응', desc:'합성 유화제' },
    '프로필렌글리콜': { type:'용매', safety:'warning', impact:'다량 시 알레르기·간 부담', desc:'합성 용매·보습제' },
    '향료': { type:'향료', safety:'caution', impact:'합성향료일 수 있음', desc:'풍미 첨가물' },
    '유화제': { type:'유화제', safety:'caution', impact:'종류에 따라 영향 다름', desc:'유지 안정화제' },
    '홍화황색소': { type:'착색료', safety:'safe', impact:'천연 색소 (홍화)', desc:'홍화에서 추출' },
    '치자청색소': { type:'착색료', safety:'safe', impact:'천연 색소 (치자)', desc:'치자 추출' },
    '아스파탐': { type:'인공감미료', safety:'warning', impact:'페닐알라닌 다량, 페닐케톤뇨증 환자 금지', desc:'합성 감미료' },
    '카페인': { type:'각성제', safety:'caution', impact:'과다 시 불면·심박 증가', desc:'카페인' },
    '카라멜색소': { type:'착색료', safety:'caution', impact:'4-MEI 함유 가능', desc:'갈색 합성 착색료' },
    '인산': { type:'산도조절제', safety:'caution', impact:'과다 시 칼슘 흡수 방해', desc:'산미료' },
    '액상과당': { type:'당류', safety:'warning', impact:'비만·지방간 위험 ↑', desc:'고과당 옥수수 시럽' },
    '안식향산나트륨': { type:'보존료', safety:'warning', impact:'비타민C와 반응 시 벤젠 가능', desc:'합성 보존제' },
    'MSG': { type:'조미료', safety:'caution', impact:'민감 시 두통·홍조', desc:'L-글루탐산나트륨' }
  };

  const found = [];
  const lowerText = text.toLowerCase();
  for (const [name, info] of Object.entries(knownIngredients)) {
    if (text.includes(name)) {
      found.push({
        name,
        type: info.type,
        safety: info.safety,
        impact: info.impact,
        description: info.desc,
        dailyLimit: '정해진 한도 없음'
      });
    }
  }
  return found;
}

// ── Gemini 호출 + responseSchema (ingredients required) ──
async function callGemini(apiKey, model, prompt, imageB64) {
  const body = {
    contents: [{
      parts: [
        { text: prompt },
        { inline_data: { mime_type: 'image/jpeg', data: imageB64 } }
      ]
    }],
    generationConfig: {
      temperature: 0.1,
      maxOutputTokens: 8192,
      responseMimeType: 'application/json',
      responseSchema: {
        type: 'OBJECT',
        properties: {
          ingredients: {
            type: 'ARRAY',
            minItems: 3,
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
          productName: { type: 'STRING' },
          overallScore: { type: 'INTEGER' },
          overallGrade: { type: 'STRING' },
          summary: { type: 'STRING' },
          recommendation: { type: 'STRING' },
          error: { type: 'STRING' }
        },
        required: ['ingredients']
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
