// Vercel Serverless Function — 식품 성분표 AI 분석
// 위치: /api/analyze-ingredients.js
// v10 — AI는 이름만, 세부는 로컬 사전 매칭 (5-10초 목표) · safety 정렬 · 로컬 총평·점수 계산

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

    // ── 1차 호출 (이름만 짧게 요청 · 속도 최우선) ──
    const r1 = await tryAnalyze(apiKey, model, buildIngredientsFirstPrompt(), imageB64);
    if (r1.rawText) allRawTexts.push('### 1차 응답\n' + r1.rawText);
    let result = r1.result || {};

    // AI 응답이 names 형식이면 사전 매칭으로 ingredients 채움
    result.ingredients = normalizeAiResponse(result);

    // ── 완전 실패 시 2차 호출 ──
    if (!Array.isArray(result.ingredients) || result.ingredients.length < 3) {
      const r2 = await tryAnalyze(apiKey, model, buildForcePrompt(), imageB64);
      if (r2.rawText) allRawTexts.push('### 2차 응답\n' + r2.rawText);
      if (r2.result) {
        const r2ing = normalizeAiResponse(r2.result);
        if (r2ing.length > (result.ingredients?.length || 0)) {
          result = { ...r2.result, ingredients: r2ing, allergens: r2.result.allergens || result.allergens };
        }
      }
    }

    const combinedRaw = allRawTexts.join('\n\n');

    // 여전히 empty → raw text에서 사전 매칭
    if (!Array.isArray(result.ingredients) || result.ingredients.length === 0) {
      const extracted = extractIngredientsFromText(combinedRaw);
      if (extracted.length > 0) {
        result.ingredients = extracted;
        result._debug = { reason: 'extracted_from_raw_text', count: extracted.length, rawSample: combinedRaw.slice(0, 400) };
      } else {
        result._debug = { reason: 'all_methods_failed', rawText: combinedRaw.slice(0, 800) || '(빈 응답)' };
      }
    } else {
      // ✨ AI 응답 + raw text 사전 매칭 병합 (놓친 합성 첨가물 자동 보완)
      const fromDict = extractIngredientsFromText(combinedRaw);
      if (fromDict.length > 0) {
        const existingNames = new Set(result.ingredients.map(i => normalizeName(i?.name)));
        let added = 0;
        for (const item of fromDict) {
          const n = normalizeName(item.name);
          if (!existingNames.has(n)) {
            result.ingredients.push(item);
            existingNames.add(n);
            added++;
          }
        }
        if (added > 0) console.log(`[성분 병합] 사전 매칭으로 ${added}개 추가`);
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

// ── AI 응답의 names 배열 → 사전 매칭으로 ingredients 변환 ──
// (호환성: 옛 형식 ingredients 배열도 그대로 통과)
function normalizeAiResponse(result) {
  if (!result || typeof result !== 'object') return [];

  // 1) names 배열 있으면 사전 매칭
  if (Array.isArray(result.names) && result.names.length > 0) {
    return namesToIngredients(result.names);
  }

  // 2) ingredients 배열 있으면 그대로 사용 (구버전 호환)
  if (Array.isArray(result.ingredients) && result.ingredients.length > 0) {
    return result.ingredients;
  }

  return [];
}

// ── 성분 이름 배열 → 사전 매칭으로 세부정보 채움 ──
function namesToIngredients(names) {
  const dict = getIngredientDict();
  const sortedKeys = Object.keys(dict).sort((a, b) => b.length - a.length);

  return names.map(rawName => {
    const name = String(rawName || '').trim();
    if (!name) return null;

    // 사전 정확 매칭
    let info = dict[name];
    let matchedKey = name;

    // 사전 부분 매칭 (긴 이름 우선)
    if (!info) {
      for (const key of sortedKeys) {
        if (name.includes(key) || key.includes(name)) {
          info = dict[key];
          matchedKey = key;
          break;
        }
      }
    }

    if (info) {
      return {
        name,
        type: info.type,
        safety: info.safety,
        impact: info.impact,
        description: info.desc,
        dailyLimit: info.limit || '정해진 한도 없음'
      };
    }

    // 사전에 없음 → 기본값 (사용자에게 "정보 준비 중" 표시)
    return {
      name,
      type: '성분',
      safety: 'caution',
      impact: '정보 준비 중',
      description: '',
      dailyLimit: '정해진 한도 없음'
    };
  }).filter(Boolean);
}

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

// ── 프롬프트 1: 성분 이름만 짧게 요청 (속도 최우선) ──
function buildIngredientsFirstPrompt() {
  return `한국어 JSON만. 마크다운 X.

사진 "원재료명"의 모든 성분 이름만 배열로 추출. 세부 설명 X, 이름만!

★ 규칙 ★
- 괄호·중괄호 안 성분도 모두 별도로 분리 (예: "빵가루{소맥분, 효모, 정제소금}" → 빵가루, 소맥분, 효모, 정제소금)
- "혼합제제", "다크컴파운드", "코코아시즈닝", "향료제제" 등 그룹명 자체도 별도 항목
- 원산지 표시(미국산·호주산·국산) 제외
- 중복 없이
- 최소 15개
- 합성 첨가물·유화제·색소·산도조절제 반드시 포함: 아라비아검, 말토덱스트린, 프로필렌글리콜, 폴리글리세린축합리시놀레인산에스테르, 소르비탄지방산에스테르, 결정셀룰로스, 카카오색소, 안나토색소, 베타카로틴, 초산, 이산화규소, 탄산나트륨 등

allergens는 22종 중 해당만: 우유, 대두, 밀, 땅콩, 견과류, 달걀, 메밀, 복숭아, 토마토, 돼지고기, 쇠고기, 닭고기, 고등어, 게, 새우, 오징어, 조개류, 잣, 아황산류

응답 (JSON만, 짧게):
{
  "names": ["설탕", "코코아분말", "폴리글리세린축합리시놀레인산에스테르", ...],
  "allergens": ["우유", "대두"],
  "productName": ""
}`;
}

// ── 프롬프트 2: 백업 (이름만 · 더 짧게) ──
function buildForcePrompt() {
  return `한국어 JSON. 사진 원재료명 모든 성분 이름만 배열로.
- 괄호 안·그룹명 다 별도로
- 최소 15개, 중복 없이
- 합성 유화제(폴리글리세린…, 소르비탄…), 색소(카카오·안나토·베타카로틴), 증점제(아라비아검, 결정셀룰로스), 산도조절제(초산) 필수

응답: {"names":[15+개 이름],"allergens":["해당 22종"],"productName":""}`;
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
    '탄산': { type:'기체', safety:'safe', impact:'안전합니다', desc:'이산화탄소' },

    // 증점제·안정제 (추가)
    '아라비아검': { type:'증점제', safety:'safe', impact:'대체로 안전, 대량 섭취 시 복부 불편', desc:'아카시아 나무 수액에서 추출한 천연 증점제' },
    '잔탄검': { type:'증점제', safety:'safe', impact:'대체로 안전', desc:'미생물 발효 증점제' },
    '결정셀룰로스': { type:'증점제', safety:'safe', impact:'안전, 소화되지 않음', desc:'식이섬유 유래 증점제' },
    '카복시메틸셀룰로스': { type:'증점제', safety:'safe', impact:'대체로 안전', desc:'셀룰로스 유도체' },
    '펙틴': { type:'증점제', safety:'safe', impact:'식이섬유 역할', desc:'과일에서 추출' },

    // 당류·전분 유도체 (추가)
    '말토덱스트린': { type:'당류', safety:'caution', impact:'혈당 급상승 유발 가능', desc:'전분을 부분 가수분해한 당' },
    '포도당': { type:'당류', safety:'caution', impact:'혈당 직접 상승', desc:'단당류' },
    '과당': { type:'당류', safety:'caution', impact:'과다 시 지방간 위험', desc:'단당류' },

    // 유지류 (추가)
    '팜핵경화유': { type:'유지', safety:'warning', impact:'포화지방·트랜스지방 함유 가능', desc:'경화 처리된 팜핵유' },
    '경화유': { type:'유지', safety:'warning', impact:'트랜스지방 함유 가능', desc:'수소 첨가한 유지' },
    '코코넛오일': { type:'유지', safety:'caution', impact:'포화지방 다량, 소량은 무방', desc:'코코넛 열매 기름' },
    '미강유': { type:'유지', safety:'caution', impact:'대체로 안전, 오메가6 다량', desc:'쌀겨에서 추출한 기름' },
    '가공버터': { type:'유지', safety:'caution', impact:'포화지방 함유', desc:'가공된 버터' },

    // 유제품 (추가)
    '유청단백': { type:'유제품', safety:'safe', impact:'우유 알레르기 주의', desc:'유청 단백질' },
    '유청단백분말': { type:'유제품', safety:'safe', impact:'우유 알레르기 주의', desc:'유청 단백질 분말' },

    // 색소 (추가)
    '카카오색소': { type:'착색료', safety:'safe', impact:'천연 색소', desc:'카카오 추출 갈색 색소' },
    '안나토색소': { type:'착색료', safety:'safe', impact:'천연 색소', desc:'아치오테 씨앗에서 추출' },
    '베타카로틴': { type:'착색료', safety:'safe', impact:'비타민A 전구체', desc:'당근 등에서 추출한 천연 오렌지색' },
    'β-카로틴': { type:'착색료', safety:'safe', impact:'비타민A 전구체', desc:'베타카로틴' },
    '비타민E': { type:'비타민', safety:'safe', impact:'항산화 효과', desc:'토코페롤' },

    // 팽창제·산도조절제 (추가)
    '탄산나트륨': { type:'팽창제', safety:'safe', impact:'대체로 안전', desc:'베이킹 소다 계열' },
    '이산화규소': { type:'고결방지제', safety:'safe', impact:'대체로 안전', desc:'분말이 뭉치는 것을 방지' },
    '초산': { type:'산도조절제', safety:'caution', impact:'과다 시 위점막 자극 가능', desc:'식초의 주성분' },

    // 유화제 (합성 유화제 추가)
    '폴리글리세린축합리시놀레인산에스테르': { type:'유화제', safety:'warning', impact:'합성 유화제, EFSA는 일일 허용량 설정', desc:'초콜릿·마가린 흐름성 개선용' },
    '폴리글리세린': { type:'유화제', safety:'caution', impact:'대체로 안전', desc:'글리세린 중합체' },
    '리시놀레인산에스테르': { type:'유화제', safety:'warning', impact:'합성 유화제', desc:'피마자유 유래' },
    '카복시메틸': { type:'증점제', safety:'safe', impact:'대체로 안전', desc:'셀룰로스 유도체 계열' },

    // 그룹·복합 성분 (추가)
    '다크컴파운드': { type:'가공식품', safety:'caution', impact:'당분·지방 다량', desc:'초콜릿 대체 가공물' },
    '컴파운드': { type:'가공식품', safety:'caution', impact:'조합 가공품', desc:'복합 가공물' },
    '혼합제제': { type:'가공물', safety:'caution', impact:'여러 첨가물 혼합', desc:'복합 첨가물' },
    '향료제제': { type:'향료', safety:'caution', impact:'합성향료 포함 가능', desc:'혼합 향료' },
    '코코아시즈닝': { type:'가공물', safety:'caution', impact:'조합 가공품', desc:'코코아 시즈닝 혼합물' },
    '시즈닝': { type:'조미료', safety:'caution', impact:'조미료 혼합', desc:'시즈닝 혼합물' },

    // 기타
    '빵가루': { type:'천연성분', safety:'safe', impact:'밀 알레르기 주의', desc:'분쇄한 빵' },
    '콘밀': { type:'천연성분', safety:'safe', impact:'옥수수 분쇄물', desc:'옥수수 가루' },
    '대두분': { type:'천연성분', safety:'safe', impact:'대두 알레르기 주의', desc:'대두 분말' },
    '전지분유': { type:'유제품', safety:'safe', impact:'우유 알레르기 주의', desc:'전지 우유 분말' },
    '천일염': { type:'무기물', safety:'safe', impact:'미네랄 풍부, 과다 시 혈압↑', desc:'천연 소금' },
    '볶음천일염': { type:'무기물', safety:'safe', impact:'볶은 천연 소금', desc:'구운 천일염' },
    '해조칼슘': { type:'영양강화제', safety:'safe', impact:'칼슘 보충', desc:'해조류에서 추출한 칼슘' },
    '채종유': { type:'유지', safety:'safe', impact:'대체로 안전', desc:'유채씨 기름 (카놀라유 계열)' },
    '옥수수': { type:'천연성분', safety:'safe', impact:'안전합니다', desc:'옥수수' },
    '군옥수수맛시즈닝': { type:'조미료', safety:'caution', impact:'복합 조미료', desc:'구운 옥수수 맛 조미료' }
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
      maxOutputTokens: 2048,
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

// ── 로컬 점수 계산 (safety 카운트 기반) ──
function calculateScoreLocal(ingredients) {
  const counts = { safe: 0, caution: 0, warning: 0, danger: 0 };
  (ingredients || []).forEach(ing => {
    const s = (ing?.safety || 'caution').toLowerCase();
    if (counts[s] !== undefined) counts[s]++;
  });
  const total = counts.safe + counts.caution + counts.warning + counts.danger;
  if (total === 0) return 65;
  // 시작 82점에서 감가
  let score = 82;
  score += counts.safe * 1.5;
  score -= counts.caution * 2;
  score -= counts.warning * 7;
  score -= counts.danger * 14;
  return Math.max(20, Math.min(100, Math.round(score)));
}

// ── 로컬 총평 생성 ──
function generateSummaryLocal(ingredients) {
  const counts = { safe: 0, caution: 0, warning: 0, danger: 0 };
  (ingredients || []).forEach(ing => {
    const s = (ing?.safety || 'caution').toLowerCase();
    if (counts[s] !== undefined) counts[s]++;
  });
  const total = counts.safe + counts.caution + counts.warning + counts.danger;
  const parts = [`총 ${total}개 성분 중 안전 ${counts.safe}개, 유의 ${counts.caution}개`];
  if (counts.warning > 0) parts.push(`주의 ${counts.warning}개`);
  if (counts.danger > 0) parts.push(`절제 ${counts.danger}개`);
  const first = `분석된 ${parts.join(', ')}가 확인되었습니다.`;
  const second = counts.warning > 0 || counts.danger > 0
    ? '일부 성분은 다량·장기 섭취 시 인체 영향이 보고된 바 있으니 적정량 섭취가 권장됩니다.'
    : '전반적으로 안전한 성분 조합이며, 균형 잡힌 식단과 함께 드시길 권합니다.';
  return `${first} ${second}`;
}

// ── 로컬 권장사항 생성 ──
function generateRecommendationLocal(ingredients) {
  const counts = { safe: 0, caution: 0, warning: 0, danger: 0 };
  (ingredients || []).forEach(ing => {
    const s = (ing?.safety || 'caution').toLowerCase();
    if (counts[s] !== undefined) counts[s]++;
  });
  if (counts.danger > 0) {
    return '경고 등급 성분이 포함되어 있어 자주 섭취하는 것은 권장되지 않습니다. 일일 권장 섭취 한도를 반드시 준수해주세요.';
  }
  if (counts.warning >= 3) {
    return '합성 첨가물이 다수 포함되어 있어 매일 섭취보다는 가끔 즐기시는 것이 좋습니다. 균형 잡힌 식단과 함께 드세요.';
  }
  return '본 성분 구성을 기준으로 일일 권장 섭취 한도 내에서 적당량 드시는 것이 좋습니다. 균형 잡힌 식단과 함께 드시길 권합니다.';
}

// 성분명 정규화 (공백·괄호·특수문자 제거)
function normalizeName(name) {
  return String(name || '')
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/[()（）\[\]{}·・,、.]/g, '')
    .trim();
}

function fillMissingFields(r) {
  if (!r || typeof r !== 'object') r = {};

  // 🔒 법적 안전장치: productName 절대 노출 X (AI가 채워도 강제로 빈 값)
  r.productName = '';
  if (!Array.isArray(r.ingredients)) r.ingredients = [];

  // 🔁 name 기준 중복 제거
  const seen = new Set();
  const dedup = [];
  for (const ing of r.ingredients) {
    const key = normalizeName(ing?.name);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    dedup.push(ing);
  }
  r.ingredients = dedup.map(ing => ({
    name: ing?.name || '알 수 없음',
    type: ing?.type || '성분',
    safety: ['safe','caution','warning','danger'].includes((ing?.safety || '').toLowerCase())
      ? ing.safety.toLowerCase() : 'caution',
    impact: ing?.impact || '정보 준비 중',
    description: ing?.description || '',
    dailyLimit: ing?.dailyLimit || '정해진 한도 없음'
  }));

  // 🔽 safety 순 정렬: safe → caution → warning → danger
  const safetyOrder = { safe: 0, caution: 1, warning: 2, danger: 3 };
  r.ingredients.sort((a, b) => {
    const oa = safetyOrder[(a.safety || 'caution').toLowerCase()] ?? 1;
    const ob = safetyOrder[(b.safety || 'caution').toLowerCase()] ?? 1;
    return oa - ob;
  });

  // 📊 점수·등급 로컬 계산 (AI 값 무시 → 성분 조합 기반으로 항상 재계산)
  r.overallScore = calculateScoreLocal(r.ingredients);
  r.overallGrade = r.overallScore >= 90 ? 'A' : r.overallScore >= 75 ? 'B' : r.overallScore >= 60 ? 'C' : r.overallScore >= 40 ? 'D' : 'F';

  // 📝 총평·권장 문구 로컬 생성 (AI 값 없으면)
  if (!r.summary || r.summary.length < 20) r.summary = generateSummaryLocal(r.ingredients);
  if (!r.recommendation || r.recommendation.length < 20) r.recommendation = generateRecommendationLocal(r.ingredients);

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

