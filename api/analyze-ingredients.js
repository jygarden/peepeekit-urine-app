// Vercel Serverless Function — 식품 성분표 AI 분석
// 위치: /api/analyze-ingredients.js
// v7 — 속도 최적화 (2차 호출 조건 완화 + maxDuration 25초)

const { rateLimitMiddleware } = require('./_rateLimit');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST만 허용됩니다.' });

  // 🛡️ Rate Limit: IP당 1분에 10회, 시간당 60회
  if (!rateLimitMiddleware(req, res, { name: 'ingredients', limit: 10, window: 60000 })) return;

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return res.status(500).json({ error: '서버에 GEMINI_API_KEY가 설정되지 않았어요.' });

  try {
    const { imageB64 } = req.body || {};
    if (!imageB64) return res.status(400).json({ error: '이미지 데이터가 없습니다.' });

    const model = 'gemini-2.5-flash';
    const allRawTexts = [];

    // ── 1차 호출 (속도 최우선) ──
    const r1 = await tryAnalyze(apiKey, model, buildIngredientsFirstPrompt(), imageB64);
    if (r1.rawText) allRawTexts.push('### 1차 응답\n' + r1.rawText);
    let result = r1.result;

    // ── 완전히 실패했을 때만 2차 호출 (속도 UP: 1개라도 뽑히면 넘어감) ──
    const has1st = result && Array.isArray(result.ingredients) && result.ingredients.length > 0;
    if (!has1st) {
      const r2 = await tryAnalyze(apiKey, model, buildForcePrompt(), imageB64);
      if (r2.rawText) allRawTexts.push('### 2차 응답\n' + r2.rawText);
      if (r2.result && Array.isArray(r2.result.ingredients) && r2.result.ingredients.length > 0) {
        result = r2.result;
      } else {
        result = result || r2.result || {};
      }
    }

    const combinedRaw = allRawTexts.join('\n\n');

    // ── 그래도 빈 ingredients면 전체 raw text에서 추출 ──
    if (!result || !Array.isArray(result.ingredients) || result.ingredients.length === 0) {
      if (!result) result = {};
      const extracted = extractIngredientsFromText(combinedRaw);
      if (extracted.length > 0) {
        result.ingredients = extracted;
        result._debug = {
          reason: 'extracted_from_raw_text',
          count: extracted.length,
          rawSample: combinedRaw.slice(0, 400)
        };
      } else {
        // 정말 0개면 raw text 전체를 디버그에 노출
        result._debug = {
          reason: 'all_methods_failed',
          rawText: combinedRaw.slice(0, 800) || '(빈 응답)'
        };
      }
    }

    if (result.error) return res.status(400).json(result);

    result = fillMissingFields(result);
    return res.status(200).json(result);
  } catch (err) {
    return res.status(500).json({
      error: '서버 오류: ' + (err.message || '알 수 없음'),
      debug: { stack: err.stack?.slice(0, 300) }
    });
  }
};

// ── tryAnalyze: result + rawText 같이 반환 ──
async function tryAnalyze(apiKey, model, prompt, imageB64) {
  let geminiRes = await callGemini(apiKey, model, prompt, imageB64);
  let rawText = await extractText(geminiRes);
  if (!rawText) return { result: null, rawText: null };

  let cleaned = rawText.trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```\s*$/i, '');
  const firstBrace = cleaned.indexOf('{');
  const lastBrace = cleaned.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    cleaned = cleaned.slice(firstBrace, lastBrace + 1);
  }

  try {
    return { result: JSON.parse(cleaned), rawText };
  } catch(e) {
    const recovered = tryRecoverTruncatedJSON(cleaned);
    if (recovered) {
      try { return { result: JSON.parse(recovered), rawText }; } catch(e2) {}
    }
    return { result: null, rawText };
  }
}

// ── 프롬프트 1: 완전 추출 우선 ──
function buildIngredientsFirstPrompt() {
  return `한국어 JSON만. 마크다운 X.

사진의 "원재료명"에 있는 모든 성분을 하나도 빠짐없이 추출.

★★★ 절대 규칙 ★★★
1. 괄호·중괄호 안 성분은 모두 별도로 분리
   예: "빵가루{소맥분(밀:미국산,호주산), 효모, 정제소금, 대두분, 유화제}"
   → 빵가루, 소맥분, 효모, 정제소금, 대두분, 유화제 (6개로 분리)
2. "혼합제제1", "혼합제제2", "다크컴파운드" 같은 그룹명 자체도 별도 성분으로
   그 안에 든 성분들도 각각 별도로
3. 원산지 표시(미국산·호주산·국산 등)는 제외, 성분명만 추출
4. **ingredients 배열 최소 15개 이상** — 부족하면 다시 훑어봐라
5. productName은 반드시 "" 빈 문자열
6. summary/recommendation은 객관적·중립적 톤 (제품 비판 금지)

safety 분류:
- safe: 정제수, 비타민(E/C 등), 천연 색소(파프리카·베타카로틴·안나토), 천연 유화제(레시틴), 밀가루/소맥분, 옥수수, 효모, 정제소금, 코코아분말, 코코아버터
- caution: 설탕, 원당, 팜유, 팜핵경화유, 가공유지, 식물성유지, 정제소금(과다), 카페인, 유당, 분유, 유청단백, MSG, 향료, 물엿
- warning: 프로필렌글리콜, 폴리글리세린축합리시놀레인산에스테르, 소르비탄지방산에스테르, 아스파탐, 적색40호, 카라멜색소, 안식향산나트륨, 합성향료
- danger: 트랜스지방, 아질산나트륨, 부틸히드록시아니솔(BHA)

allergens: 사진 성분 중 아래 22종 해당만 한국어로
[우유, 대두, 밀, 땅콩, 견과류, 달걀, 메밀, 복숭아, 토마토, 돼지고기, 쇠고기, 닭고기, 고등어, 게, 새우, 오징어, 조개류(굴/전복/홍합), 잣, 아황산류]

응답 형식 (JSON만):
{
  "ingredients": [
    {"name":"성분명","type":"분류","safety":"safe|caution|warning|danger","impact":"1문장 객관적","description":"1문장","dailyLimit":""}
  ],
  "allergens": ["해당 알레르기명들"],
  "productName": "",
  "overallScore": 0~100,
  "overallGrade": "A|B|C|D|F",
  "summary": "객관적 3문장",
  "recommendation": "적정량 권장 톤 2문장"
}`;
}

// ── 프롬프트 2: 백업 (더 강력) ──
function buildForcePrompt() {
  return `한국어 JSON. 사진 원재료명 모든 성분 추출. 괄호 안도 각각 별도로.
★ ingredients 최소 15개 필수 — 다크컴파운드, 혼합제제, 향료제제 등 그룹명도 별도 항목
★ productName은 "" 빈 문자열
★ summary 객관적 톤

각 성분: {name,type,safety(safe|caution|warning|danger),impact,description,dailyLimit}
allergens: 우유/대두/밀/땅콩/견과/달걀/조개/새우/게 해당만.
응답: {ingredients:[15+개],allergens:[],productName:"",overallScore:0~100,overallGrade:"A|B|C|D|F",summary:"객관 3문장",recommendation:"객관 2문장"}`;
}

// ── 텍스트에서 알려진 성분 추출 (확장 사전) ──
function extractIngredientsFromText(text) {
  if (!text) return [];
  const found = [];
  const seenNames = new Set();

  const dict = getIngredientDict();
  // 긴 이름부터 매칭 (예: "준초콜릿"이 "초콜릿"보다 먼저 매칭되도록)
  const sortedNames = Object.keys(dict).sort((a, b) => b.length - a.length);

  for (const name of sortedNames) {
    if (seenNames.has(name)) continue;
    // 정규식: 띄어쓰기 0개~1개 변형 허용
    const flexPattern = name.split('').join('\\s*');
    const regex = new RegExp(flexPattern, 'i');
    if (regex.test(text)) {
      const info = dict[name];
      found.push({
        name,
        type: info.type,
        safety: info.safety,
        impact: info.impact,
        description: info.desc,
        dailyLimit: info.limit || '정해진 한도 없음'
      });
      seenNames.add(name);
    }
  }
  return found;
}

// ── 성분 사전 (확장) ──
function getIngredientDict() {
  return {
    // 천연 / 안전
    '정제수': { type:'천연성분', safety:'safe', impact:'안전합니다', desc:'물' },
    '물': { type:'천연성분', safety:'safe', impact:'안전합니다', desc:'물' },
    '밀가루': { type:'천연성분', safety:'safe', impact:'밀 알레르기 주의', desc:'밀 분쇄물' },
    '찹쌀': { type:'천연성분', safety:'safe', impact:'안전합니다', desc:'찹쌀' },
    '찹쌀분말': { type:'천연성분', safety:'safe', impact:'안전합니다', desc:'찹쌀 가루' },
    '쌀가루': { type:'천연성분', safety:'safe', impact:'안전합니다', desc:'쌀 가루' },
    '옥수수전분': { type:'천연성분', safety:'safe', impact:'안전합니다', desc:'옥수수 전분' },
    '찰옥수수전분': { type:'천연성분', safety:'safe', impact:'안전합니다', desc:'찰옥수수 전분' },
    '피스타치오': { type:'천연성분', safety:'safe', impact:'견과류 알레르기 주의', desc:'피스타치오 견과' },
    '아몬드': { type:'천연성분', safety:'safe', impact:'견과류 알레르기 주의', desc:'아몬드' },
    '코코아분말': { type:'천연성분', safety:'safe', impact:'카페인 미량', desc:'카카오 분말' },
    '코코아매스': { type:'천연성분', safety:'safe', impact:'안전합니다', desc:'카카오 원료' },
    '코코아버터': { type:'유지', safety:'safe', impact:'안전합니다', desc:'카카오에서 추출한 지방' },
    '토코페롤': { type:'비타민', safety:'safe', impact:'항산화 효과', desc:'비타민E' },
    '비타민C': { type:'비타민', safety:'safe', impact:'항산화', desc:'아스코르브산' },
    '레시틴': { type:'유화제', safety:'safe', impact:'안전합니다', desc:'대두/계란 유화제' },
    '구연산': { type:'산도조절제', safety:'safe', impact:'안전합니다', desc:'산미료' },
    '홍화황색소': { type:'착색료', safety:'safe', impact:'천연 색소', desc:'홍화 추출' },
    '치자청색소': { type:'착색료', safety:'safe', impact:'천연 색소', desc:'치자 추출' },
    '치자황색소': { type:'착색료', safety:'safe', impact:'천연 색소', desc:'치자 추출' },
    '파프리카추출색소': { type:'착색료', safety:'safe', impact:'천연 색소', desc:'파프리카 추출' },

    // 당류
    '올리고당': { type:'당류', safety:'caution', impact:'혈당 영향 적음, 과다 시 복부 불편', desc:'설탕 대체 당' },
    '설탕': { type:'당류', safety:'caution', impact:'과다 섭취 시 혈당·체중↑', desc:'정제당' },
    '원당': { type:'당류', safety:'caution', impact:'정제 안 된 설탕', desc:'사탕수수 원당' },
    '말티톨': { type:'당알코올', safety:'caution', impact:'과다 시 설사·복부 팽만', desc:'당알코올' },
    '말티톨액': { type:'당알코올', safety:'caution', impact:'과다 시 설사·복부 팽만', desc:'당알코올 액상' },
    '에리스리톨': { type:'당알코올', safety:'caution', impact:'칼로리 없음, 과다 시 가스', desc:'당알코올' },
    '자일리톨': { type:'당알코올', safety:'caution', impact:'과다 시 설사. 개에게 독성', desc:'당알코올' },
    '물엿': { type:'당류', safety:'caution', impact:'당분 다량', desc:'전분 시럽' },
    '액상과당': { type:'당류', safety:'warning', impact:'비만·지방간 위험 ↑', desc:'고과당 옥수수 시럽' },
    '덱스트린': { type:'당류', safety:'safe', impact:'안전합니다', desc:'전분 분해물' },
    '시클로덱스트린': { type:'당류', safety:'safe', impact:'안전합니다', desc:'고리형 당' },
    '시클로덱스트린액': { type:'당류', safety:'safe', impact:'안전합니다', desc:'시클로덱스트린 액' },

    // 유지
    '준초콜릿': { type:'가공식품', safety:'caution', impact:'당분·지방 함량 높음', desc:'코코아+가공유지' },
    '가공유지': { type:'유지', safety:'caution', impact:'트랜스지방 가능, 과다 시 심혈관 위험', desc:'가공된 식물성 기름' },
    '식물성유지': { type:'유지', safety:'caution', impact:'종류에 따라 영향 다름', desc:'식물성 기름' },
    '식물성크림': { type:'가공식품', safety:'caution', impact:'가공 지방·당분 함유', desc:'식물성 크림' },
    '쇼트닝': { type:'유지', safety:'warning', impact:'트랜스지방 가능', desc:'반고체 식용유' },
    '팜유': { type:'유지', safety:'caution', impact:'포화지방 다량', desc:'팜 열매 기름' },
    '팜핵유': { type:'유지', safety:'caution', impact:'포화지방 다량', desc:'팜 핵 기름' },
    '대두유': { type:'유지', safety:'caution', impact:'오메가6 다량', desc:'콩 기름' },
    '카놀라유': { type:'유지', safety:'safe', impact:'비교적 안전', desc:'유채 기름' },
    '옥수수기름': { type:'유지', safety:'caution', impact:'오메가6 다량', desc:'옥수수 추출유' },
    '해바라기유': { type:'유지', safety:'safe', impact:'비교적 안전', desc:'해바라기 기름' },

    // 유제품
    '혼합분유': { type:'유제품', safety:'safe', impact:'우유 알레르기 주의', desc:'우유 가공품' },
    '전지분유': { type:'유제품', safety:'safe', impact:'우유 알레르기 주의', desc:'전지 우유 분말' },
    '탈지분유': { type:'유제품', safety:'safe', impact:'우유 알레르기 주의', desc:'지방 제거 우유 분말' },
    '유당': { type:'당류', safety:'caution', impact:'유당불내증 시 소화 불편', desc:'우유 속 당' },
    '유청분말': { type:'유제품', safety:'safe', impact:'우유 알레르기 주의', desc:'유청 단백질' },
    '카제인': { type:'유제품', safety:'safe', impact:'우유 알레르기 주의', desc:'우유 단백질' },

    // 가공/첨가물
    '제이인산칼륨': { type:'산도조절제', safety:'caution', impact:'과다 시 신장 부담', desc:'완충제' },
    '글리세린': { type:'유화제', safety:'caution', impact:'과다 시 두통·메스꺼움', desc:'보습·감미제' },
    '글리세롤': { type:'유화제', safety:'caution', impact:'과다 시 두통·메스꺼움', desc:'보습제' },
    '폴리글리세린지방산에스테르': { type:'유화제', safety:'warning', impact:'합성 유화제', desc:'합성 유화제' },
    '글리세린에스테르': { type:'유화제', safety:'warning', impact:'합성 유화제', desc:'글리세롤 에스테르' },
    '프로필렌글리콜에스테르': { type:'유화제', safety:'warning', impact:'합성 유화제', desc:'합성 유화제' },
    '프로필렌글리콜': { type:'용매', safety:'warning', impact:'다량 시 알레르기·간 부담', desc:'합성 보습제·용매' },
    '소르비탄지방산에스테르': { type:'유화제', safety:'warning', impact:'합성 유화제', desc:'합성 유화제' },
    '향료': { type:'향료', safety:'caution', impact:'합성향료 가능', desc:'풍미 첨가물' },
    '합성향료': { type:'향료', safety:'warning', impact:'합성 향료', desc:'합성 풍미료' },
    '천연향료': { type:'향료', safety:'safe', impact:'천연 추출', desc:'천연 풍미료' },
    '유화제': { type:'유화제', safety:'caution', impact:'종류에 따라 다름', desc:'유지 안정제' },
    '정제소금': { type:'무기물', safety:'caution', impact:'과다 시 혈압↑', desc:'정제 소금' },
    '소금': { type:'무기물', safety:'caution', impact:'과다 시 혈압↑', desc:'염화나트륨' },
    '주정': { type:'알코올', safety:'caution', impact:'알코올 미량 함유', desc:'식용 알코올' },
    '효모': { type:'천연성분', safety:'safe', impact:'안전합니다', desc:'효모균' },
    '베이킹파우더': { type:'팽창제', safety:'safe', impact:'안전합니다', desc:'팽창제' },
    '탄산수소나트륨': { type:'팽창제', safety:'safe', impact:'안전합니다', desc:'베이킹소다' },

    // 위험 첨가물
    '아스파탐': { type:'인공감미료', safety:'warning', impact:'페닐알라닌 함유, PKU 환자 금지', desc:'합성 감미료' },
    '수크랄로스': { type:'인공감미료', safety:'warning', impact:'장내 미생물 영향 우려', desc:'합성 감미료' },
    '아세설팜칼륨': { type:'인공감미료', safety:'warning', impact:'합성 감미료', desc:'합성 감미료' },
    '사카린': { type:'인공감미료', safety:'warning', impact:'합성 감미료', desc:'합성 감미료' },
    '안식향산나트륨': { type:'보존료', safety:'warning', impact:'비타민C와 반응 시 벤젠 가능', desc:'합성 보존제' },
    '소르빈산칼륨': { type:'보존료', safety:'warning', impact:'알레르기 반응 가능', desc:'합성 보존제' },
    '아질산나트륨': { type:'보존료', safety:'danger', impact:'발암 가능성', desc:'육가공 보존제' },
    '카라멜색소': { type:'착색료', safety:'caution', impact:'4-MEI 함유 가능', desc:'갈색 합성 착색료' },
    '적색40호': { type:'착색료', safety:'warning', impact:'어린이 과잉행동 연관 보고', desc:'합성 적색 색소' },
    '황색4호': { type:'착색료', safety:'warning', impact:'알레르기 반응 가능', desc:'합성 황색 색소' },
    '황색5호': { type:'착색료', safety:'warning', impact:'알레르기 반응 가능', desc:'합성 황색 색소' },
    '청색1호': { type:'착색료', safety:'warning', impact:'합성 색소', desc:'합성 청색 색소' },
    'MSG': { type:'조미료', safety:'caution', impact:'민감 시 두통·홍조', desc:'글루탐산나트륨' },
    '글루탐산나트륨': { type:'조미료', safety:'caution', impact:'민감 시 두통·홍조', desc:'MSG' },
    '인산': { type:'산도조절제', safety:'caution', impact:'과다 시 칼슘 흡수 방해', desc:'산미료' },
    '카페인': { type:'각성제', safety:'caution', impact:'과다 시 불면·심박↑', desc:'카페인' },
    '탄산': { type:'기체', safety:'safe', impact:'안전합니다', desc:'이산화탄소' }
  };
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
      maxOutputTokens: 8192,
      responseMimeType: 'application/json'
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
  // 🔒 법적 안전장치: productName 절대 노출 X (AI가 채워도 강제로 빈 값)
  r.productName = '';
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

  // 알레르기 표기 자동 추출 (AI가 누락한 경우 백업)
  if (!Array.isArray(r.allergens)) r.allergens = [];
  if (r.allergens.length === 0 && r.ingredients.length > 0) {
    const allergenKeywords = {
      '우유': ['우유', '분유', '혼합분유', '전지분유', '탈지분유', '유당', '유청', '카제인'],
      '대두': ['대두', '콩', '대두유', '레시틴'],
      '땅콩': ['땅콩', '낙화생'],
      '견과류': ['아몬드', '호두', '잣', '캐슈넛', '피스타치오', '헤이즐넛', '브라질너트'],
      '밀': ['밀', '밀가루', '글루텐'],
      '달걀': ['난백', '난황', '계란', '달걀'],
      '메밀': ['메밀'],
      '복숭아': ['복숭아'],
      '토마토': ['토마토'],
      '돼지고기': ['돼지고기', '돼지'],
      '쇠고기': ['쇠고기', '소고기'],
      '닭고기': ['닭고기'],
      '고등어': ['고등어'],
      '게': ['게'],
      '새우': ['새우'],
      '오징어': ['오징어'],
      '조개류': ['굴', '홍합', '전복', '조개', '바지락'],
      '아황산류': ['아황산']
    };
    const ingredientText = r.ingredients.map(i => (i.name||'') + ' ' + (i.description||'')).join(' ');
    for (const [allergen, keywords] of Object.entries(allergenKeywords)) {
      if (keywords.some(kw => ingredientText.includes(kw))) {
        r.allergens.push(allergen);
      }
    }
  }
  return r;
}

// ⏱ Vercel 함수 실행 시간 (Pro plan: 60초 지원, Hobby: 최대 10초에 잘림)
module.exports.config = { maxDuration: 60 };

