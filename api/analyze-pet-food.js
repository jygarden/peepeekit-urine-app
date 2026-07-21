// Vercel Serverless Function — 반려동물 사료·간식 성분 분석
// 위치: /api/analyze-pet-food.js
// v1 — 개·고양이 특화 프롬프트 · 독성 성분 우선 검출 · 영양 균형 평가

const { rateLimitMiddleware } = require('./_rateLimit');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST만 허용됩니다.' });

  if (!rateLimitMiddleware(req, res, { name: 'pet-food', limit: 10, window: 60000 })) return;

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return res.status(500).json({ error: '서버에 GEMINI_API_KEY가 설정되지 않았어요.' });

  try {
    const { imageB64, petType = 'dog' } = req.body || {};
    if (!imageB64) return res.status(400).json({ error: '이미지 데이터가 없습니다.' });

    const model = 'gemini-2.5-flash';
    const geminiRes = await callGemini(apiKey, model, buildPetFoodPrompt(petType), imageB64);
    const rawText = await extractText(geminiRes);
    if (!rawText) return res.status(500).json({ error: 'AI 응답 없음', debug: { rawText: '' } });

    let result;
    try {
      let cleaned = rawText.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '');
      const firstBrace = cleaned.indexOf('{');
      const lastBrace = cleaned.lastIndexOf('}');
      if (firstBrace !== -1 && lastBrace > firstBrace) cleaned = cleaned.slice(firstBrace, lastBrace + 1);
      result = JSON.parse(cleaned);
    } catch(e) {
      return res.status(500).json({ error: 'JSON 파싱 실패', debug: { rawText: rawText.slice(0, 400) } });
    }

    result = fillMissingFields(result, petType);
    return res.status(200).json(result);
  } catch (err) {
    return res.status(500).json({
      error: '서버 오류: ' + (err.message || '알 수 없음'),
      debug: { stack: err.stack?.slice(0, 300) }
    });
  }
};

function buildPetFoodPrompt(petType) {
  const petName = petType === 'cat' ? '고양이' : '강아지';
  const toxicList = petType === 'cat'
    ? '양파, 마늘, 파, 초콜릿, 카페인, 포도, 건포도, 자일리톨, 알코올, 마카다미아, 아보카도(단독), 백합, 참치(단독 대량), 우유(유당불내증), 날달걀, 뼈(닭)'
    : '초콜릿, 카페인, 포도, 건포도, 양파, 마늘, 파, 자일리톨, 알코올, 마카다미아, 아보카도, 견과류(다량), 자두씨, 살구씨, 날달걀, 익힌 뼈';

  return `한국어 JSON만. 마크다운 X.

사진의 반려동물 사료·간식을 분석. 대상: ${petName}.

★★★ 판단 순서 (하이브리드 인식) ★★★
1. 사진에 **원재료명·성분표가 명확히 보이면** → 그 텍스트를 OCR로 정확히 읽어 성분 추출 (source: "ocr", confidence 85~95)
2. 원재료명이 안 보이고 **제품 앞면·상표만 보이면** → 유명 브랜드일 때만 대표 성분 추정 (source: "product_recognition", confidence 최대 60. 낯설거나 확신 없으면 40 이하)
3. 둘 다 애매하면 → 보이는 정보로 최대한 (source: "partial", confidence 30~50)
4. 확신이 낮거나 잘 모르면 → ingredients 빈 배열 + summary에 "제품을 인식하지 못했어요. 원재료명이 있는 뒷면을 다시 찍어주세요" (source: "unknown", confidence 0)

★★★ 절대 규칙 ★★★
1. 성분 추출 최소 8개 이상 목표 (원재료명 사진일 때 특히)
2. ingredients 배열 원소마다 성분 정보
3. productName은 반드시 "" 빈 문자열 (제품명 노출 금지)
4. ${petName} 관점에서 안전성 평가 (사람 기준 X)
5. source 필드 필수 · confidence(0~100) 필수
6. **product_recognition일 때는 절대 상상하지 마세요.** 유명 브랜드가 확실할 때만 알려진 성분을 나열. 확신 없으면 unknown으로.

★★★ ${petName} 독성 성분 (danger 필수 표시) ★★★
${toxicList}

★★★ 성분 안전 분류 (${petName} 기준) ★★★
- safe: 닭고기, 소고기, 연어, 오리, 칠면조, 계란, 현미, 고구마, 당근, 호박, 블루베리, 사과(씨앗X), 시금치, 두부, 요거트(무당), 카놀라유, 어유, 프로바이오틱스
- caution: 옥수수, 밀, 콩, 소금, 설탕, 감자, 백미, 유청, 부산물(byproducts), 동물성지방(모호), 셀룰로스, 육분(meat meal)
- warning: 옥수수시럽, BHA/BHT/에톡시퀸(합성 산화방지제), 인공색소(적색40호·황색5호 등), 프로필렌글리콜, MSG, 아질산나트륨, 카라멜색소
- danger: (위 독성 성분 리스트) + 자일리톨, 초콜릿, 포도, 양파, 마늘, 카페인

allergens: ${petName} 흔한 알레르기 유발 성분 중 실제 확인된 것만

응답 (JSON):
{
  "source": "ocr|product_recognition|partial|unknown",
  "confidence": 0~100,
  "ingredients": [
    {"name":"성분명","type":"단백질|탄수화물|지방|비타민|미네랄|합성첨가물|보존료|기타","safety":"safe|caution|warning|danger","impact":"${petName} 관점 1문장","description":"1문장","dailyLimit":""}
  ],
  "allergens": ["해당 알레르기 성분들"],
  "productName": "",
  "overallScore": 0~100,
  "overallGrade": "A|B|C|D|F",
  "nutritionBalance": "단백질·탄수·지방 비율 한 줄 평가",
  "summary": "3문장 객관적 · ${petName} 관점",
  "recommendation": "적정 급여 량·빈도 권장 톤 2문장"
}`;
}

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
      maxOutputTokens: 4096,
      responseMimeType: 'application/json'
    }
  };
  return fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }
  );
}

async function extractText(response) {
  if (!response || !response.ok) return null;
  try {
    const data = await response.json();
    return data?.candidates?.[0]?.content?.parts?.[0]?.text || null;
  } catch(e) { return null; }
}

function fillMissingFields(r, petType) {
  if (!r || typeof r !== 'object') r = {};
  r.productName = '';
  if (!Array.isArray(r.ingredients)) r.ingredients = [];

  // 중복 제거 (name 기준)
  const seen = new Set();
  r.ingredients = r.ingredients.filter(ing => {
    const key = String(ing?.name || '').toLowerCase().replace(/\s+/g, '');
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  }).map(ing => ({
    name: ing?.name || '알 수 없음',
    type: ing?.type || '기타',
    safety: ['safe','caution','warning','danger'].includes((ing?.safety || '').toLowerCase())
      ? ing.safety.toLowerCase() : 'caution',
    impact: ing?.impact || '정보 준비 중',
    description: ing?.description || '',
    dailyLimit: ing?.dailyLimit || ''
  }));

  // safety 순 정렬 (safe → caution → warning → danger)
  const order = { safe: 0, caution: 1, warning: 2, danger: 3 };
  r.ingredients.sort((a, b) => (order[a.safety] ?? 1) - (order[b.safety] ?? 1));

  // 점수·등급 로컬 계산 (safety 카운트 기반)
  const counts = { safe: 0, caution: 0, warning: 0, danger: 0 };
  r.ingredients.forEach(i => { counts[i.safety]++; });
  let score = 85;
  score += counts.safe * 1.5;
  score -= counts.caution * 2;
  score -= counts.warning * 8;
  score -= counts.danger * 20; // 반려동물은 danger 페널티 크게
  r.overallScore = Math.max(10, Math.min(100, Math.round(score)));
  r.overallGrade = r.overallScore >= 90 ? 'A' : r.overallScore >= 75 ? 'B' : r.overallScore >= 60 ? 'C' : r.overallScore >= 40 ? 'D' : 'F';

  if (!Array.isArray(r.allergens)) r.allergens = [];
  if (!r.summary) r.summary = '분석을 완료했어요.';
  if (!r.recommendation) r.recommendation = '적정량 급여를 권장합니다. 새 사료로 전환 시 7~10일에 걸쳐 서서히 바꿔주세요.';
  if (!r.nutritionBalance) r.nutritionBalance = '';

  // 하이브리드 인식: source / confidence 정규화
  const validSources = ['ocr', 'product_recognition', 'partial', 'unknown'];
  r.source = validSources.includes(r.source) ? r.source : (r.ingredients.length > 5 ? 'ocr' : 'partial');
  let conf = Number(r.confidence);
  if (!Number.isFinite(conf)) conf = r.source === 'ocr' ? 90 : r.source === 'product_recognition' ? 50 : 35;
  // source별 confidence 상한 강제 (환각 방지)
  if (r.source === 'product_recognition') conf = Math.min(conf, 60);
  if (r.source === 'partial') conf = Math.min(conf, 50);
  if (r.source === 'ocr') conf = Math.max(conf, 75);
  r.confidence = Math.max(0, Math.min(100, Math.round(conf)));

  // 인식 실패 시 안내 메시지 보정
  if (r.source === 'unknown' || r.ingredients.length === 0) {
    r.summary = '제품을 정확히 인식하지 못했어요. 봉투 뒷면의 원재료명이 잘 보이도록 다시 촬영하면 정확한 분석이 가능해요.';
    r.recommendation = '봉투 뒷면 · 원재료명 부분을 크게 찍어주세요.';
  } else if (r.source === 'product_recognition') {
    // 앞면 인식은 참고용임을 명시
    r.summary = '앞면 사진 기반 추정 분석입니다. 결과가 실제와 다를 수 있으니, 정확한 분석을 원하시면 뒷면의 원재료명을 촬영해주세요. ' + (r.summary || '');
  }

  r.petType = petType;
  return r;
}

module.exports.config = { maxDuration: 60 };
