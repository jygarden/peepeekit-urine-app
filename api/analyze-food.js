// ════════════════════════════════════════════════════════════════
// 건강어때 2.0 · 식단 사진 분석 API
// 위치: /api/analyze-food.js
//
// 두 가지 모드:
//   1. detect  · 이미지 → 음식명 + 1인분 대비 양 추정 (수치 발명 X)
//   2. analyze · 확정된 음식 리스트 → 코칭 텍스트 (행동 중심 · 습관 코칭)
//
// 건강어때 3원칙:
//   ① 영양제를 추천하기 전에 음식을 추천한다
//   ② 숫자를 보여주기 전에 행동을 알려준다
//   ③ 한 끼를 평가하지 않고 식습관을 코칭한다
//
// 중요: AI는 인식·분류만. 실제 영양소 숫자는 프론트가 KOREAN_FOOD_DB에서 조회.
// ════════════════════════════════════════════════════════════════
module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST만 허용됩니다.' });

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return res.status(500).json({ error: '서버에 API 키가 설정되지 않았습니다.' });

  try {
    const { mode = 'detect', imageB64, target = 'human', confirmedFoods, mealTime, userProfile, todayMeals, userMemo } = req.body;
    const memo = String(userMemo || '').trim().slice(0, 200); // 최대 200자 안전 컷

    if (mode === 'detect') {
      if (!imageB64) return res.status(400).json({ error: '이미지 데이터가 없습니다.' });
      return await runDetect({ apiKey, imageB64, target, userMemo: memo, res });
    }

    if (mode === 'analyze') {
      if (!confirmedFoods || !confirmedFoods.length) return res.status(400).json({ error: '확정된 음식 리스트가 없습니다.' });
      return await runAnalyze({ apiKey, target, confirmedFoods, mealTime, userProfile, todayMeals, userMemo: memo, res });
    }

    return res.status(400).json({ error: `알 수 없는 mode: ${mode}` });
  } catch (err) {
    console.error('[analyze-food]', err);
    return res.status(500).json({ error: err.message || '서버 오류가 발생했습니다.' });
  }
};

// ═══ DETECT MODE · 음식 인식 + 양 추정 ═══
async function runDetect({ apiKey, imageB64, target, userMemo, res }) {
  const prompt = target === 'pet' ? buildPetFoodDetectPrompt() : buildHumanFoodDetectPrompt(userMemo);

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
  if (data.error) return res.status(500).json({ error: data.error.message });

  const raw = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!raw) return res.status(500).json({ error: '인식 결과를 받지 못했습니다.' });

  const parsed = parseJsonLoose(raw);
  if (!parsed) return res.status(500).json({ error: '응답 파싱 실패' });
  if (parsed.error) return res.status(400).json({ error: parsed.error });

  return res.status(200).json(parsed);
}

// ═══ ANALYZE MODE · 확정 음식 → 코칭 텍스트 ═══
async function runAnalyze({ apiKey, target, confirmedFoods, mealTime, userProfile, todayMeals, userMemo, res }) {
  const prompt = target === 'pet'
    ? buildPetFoodAnalyzePrompt({ confirmedFoods, userProfile, todayMeals })
    : buildHumanFoodAnalyzePrompt({ confirmedFoods, mealTime, userProfile, todayMeals, userMemo });

  const r = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }]}],
        generationConfig: { temperature: 0.4 }
      })
    }
  );

  const data = await r.json();
  if (data.error) return res.status(500).json({ error: data.error.message });

  const raw = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!raw) return res.status(500).json({ error: '분석 결과를 받지 못했습니다.' });

  const parsed = parseJsonLoose(raw);
  if (!parsed) return res.status(500).json({ error: '응답 파싱 실패' });
  if (parsed.error) return res.status(400).json({ error: parsed.error });

  parsed.subject = target;
  parsed.mealTime = mealTime || null;
  parsed.disclaimer = parsed.disclaimer ||
    '이 결과는 참고용이며 진단이 아닙니다. 지속되는 이상 증상은 전문가와 상담하세요.';

  return res.status(200).json(parsed);
}

// ═══ HUMAN · DETECT PROMPT ═══
function buildHumanFoodDetectPrompt(userMemo) {
  const memoBlock = userMemo ? `

【사용자가 알려준 정보 · 최우선 참고】
"${userMemo}"

이 메모를 다음처럼 파싱해서 각 필드에 나눠 담는다:
- 브랜드/가게명(예: 서브웨이·김밥천국·백종원·슈퍼런·맘스터치) → **brand 필드**에만 담는다
- 실제 음식 종류(샐러드·김밥·버거·제육볶음 등) → **name 필드**에 담는다 (표준 카테고리명, KOREAN_FOOD_DB에 있을 법한 대표명)
- 양(1인분·2인분·라지·곱빼기) → **portion 필드** (2인분 → 2, 라지 → 1.5)

⚠️ 절대 금지: 브랜드명을 name에 그대로 넣지 마라.
  ❌ 잘못: name="슈퍼런 샐러드"  → DB 매칭 실패
  ✅ 올바름: name="샐러드", brand="슈퍼런"
  ❌ 잘못: name="맘스터치 싸이버거"
  ✅ 올바름: name="치킨버거", brand="맘스터치 싸이버거"

프랜차이즈면 그 브랜드의 실제 메뉴 특성(양·칼로리대·나트륨 편차)을 name·portion 추정에 반영한다.
사진과 메모가 모순되면 메모를 우선한다.
` : '';

  return `너는 한식 이미지 인식 전문가다. 사진 속 음식을 식별하고 1인분 대비 양을 추정한다.
JSON 하나만 응답한다. 마크다운 코드블록 금지.
${memoBlock}
【역할 · 절대 규칙】
1. 너는 음식 인식과 양 추정만 담당한다.
2. 칼로리·단백질·나트륨 같은 영양소 숫자는 절대 생성하지 않는다 (내가 별도 DB에서 조회함).
3. 확실하지 않으면 needsConfirmation=true 로 표시하고, 사용자에게 물어볼 옵션을 준다.
4. 음식이 아닌 이미지면 {"error":"음식 사진을 다시 찍어주세요."} 로 응답.

【추정 원칙】
- 한식 표준 용량 기준 (밥 1공기 = 200g, 국 1공기 = 300ml, 반찬 1접시 = 50~100g)
- 애매하면 "1", "0.5", "1.5" 세 단계 옵션으로 물어봄
- 이름은 KOREAN_FOOD_DB에 있을 법한 대표명 사용 (예: '순두부찌개', '고등어구이', '잡곡밥')
- 사용자 메모에 브랜드명이 있으면 name에 브랜드+메뉴로 표기 (예: '김밥천국 참치김밥')

【JSON 스키마】
{
  "detectedFoods": [
    {
      "name": "잡곡밥",
      "brand": "",
      "portion": 1,
      "portionLabel": "1공기",
      "needsConfirmation": false,
      "options": ["0.5공기", "1공기", "1.5공기"]
    },
    {
      "name": "샐러드",
      "brand": "슈퍼런",
      "portion": 1,
      "portionLabel": "1인분",
      "needsConfirmation": false,
      "options": ["작은 사이즈", "1인분", "라지"]
    }
  ],
  "sceneNote": "슈퍼런 샐러드 1인분"
}

★ name은 반드시 KOREAN_FOOD_DB 표준 카테고리명 (샐러드/김밥/버거/제육볶음/삼겹살…). brand는 별도 필드.

【톤】
- 한 끼를 평가하지 않는다. 그냥 인식만.
- "칼로리가 많아 보여요" 같은 판단성 코멘트 금지.
- sceneNote는 사실 관찰만 (예: "국·밥·반찬 3가지 구성" · "1인 도시락").`;
}

// ═══ HUMAN · ANALYZE PROMPT ═══
function buildHumanFoodAnalyzePrompt({ confirmedFoods, mealTime, userProfile, todayMeals, userMemo }) {
  const p = userProfile || {};
  const profileLine = [
    p.gender === 'male' ? '남성' : p.gender === 'female' ? '여성' : '',
    p.birthYear ? `${new Date().getFullYear() - parseInt(p.birthYear) + 1}세` : '',
    p.height ? `${p.height}cm` : '',
    p.weight ? `${p.weight}kg` : '',
    p.lifestyle ? `활동:${p.lifestyle}` : ''
  ].filter(Boolean).join(' · ');

  const foodsLine = (confirmedFoods || []).map(f => {
    const items = (f.ingredients && f.ingredients.length) ? ` [${f.ingredients.map(x => x.name || x).join(',')}]` : '';
    return `${f.name}${f.portion ? ` × ${f.portion}` : ''}${items}`;
  }).join(' + ') || '(없음)';

  const todayLine = (todayMeals || []).map(m => `${m.time || ''}:${(m.items || m.foodName || '')}`).join(' | ') || '(오늘 첫 기록)';

  return `너는 건강어때의 AI 영양 코치다. 이번 한 끼가 아니라 오늘 하루 식습관을 코칭한다.
JSON 하나만 응답. 마크다운 금지.

【건강어때 3원칙 · 반드시 지킬 것】
① 영양제 언급 최소화. 자연 식품이 우선이다.
② 숫자를 나열하지 말고 행동을 알려준다. (예: X "칼슘 42%" · O "저녁에 우유 한 잔 어때요")
③ 이번 한 끼를 판단하지 않는다. 오늘 하루의 밸런스만 코칭한다.

【절대 금지】
- 칼로리·영양소 절대 수치를 생성하지 말 것 (프론트에서 DB로 계산함).
- "이번 식사는 나트륨이 높습니다" 같은 개별 식사 평가.
- 영양제 이름 나열. "○○ 영양제를 드세요" 금지.
- 진단·처방 뉘앙스 (반드시·필수·의사·약).

【입력 정보】
- 프로필: ${profileLine || '정보 없음'}
- 이번 식사(${mealTime || '식사'}): ${foodsLine}
- 오늘 앞 식사들: ${todayLine}
${userMemo ? `- 사용자 메모(브랜드·가게·양): "${userMemo}"` : ''}
${userMemo ? `※ 사용자 메모가 있으면 프랜차이즈의 실제 영양 특성(예: 배달 음식은 나트륨↑, 프랜차이즈 버거는 지방↑)을 반영해 코칭한다.` : ''}

【출력 스키마】
{
  "mealSummary": "이번 식사의 특징 1문장 (평가 X · 관찰만)",
  "todayBalance": {
    "coverage": ["오늘 잘 채워지고 있는 것 1~2개 (예: 단백질)"],
    "gaps": ["오늘 아직 부족해 보이는 것 1~2개 (예: 식이섬유)"]
  },
  "nextAction": {
    "title": "다음 한 끼 · 이렇게 챙겨보세요",
    "suggestions": [
      { "food": "사골곰탕 or 순대국", "reason": "따뜻한 국물 + 단백질·미네랄 보충" },
      { "food": "들기름막국수", "reason": "오메가3 + 담백하게 저염" }
    ]
  },
  "coachMessage": "친근한 한 줄 코칭. 판단·강요 X. 잘한 부분 인정 + 다음 행동 제안. (예: '오늘 단백질은 잘 챙기고 있어요. 저녁엔 국물 있는 걸로 미네랄 채워볼까요?')",
  "foodPairings": [
    { "with": "콩나물국밥", "why": "가볍게 속풀이·수분 보충" }
  ],
  "supplementHint": "OPTIONAL · 음식으로 채우기 어려운 경우에만 언급. 이번 한 끼 기준이 아니라 최근 7일 반복 부족일 때만.",
  "disclaimer": "본 결과는 참고용이며 진단이 아닙니다."
}

【톤】
- 존댓말 · 부드러운 코칭 · 판단 X
- 한글로 자연스럽게
- 문장은 짧게 (한 문장 20자 이내 지향)

【추천 음식 가이드 · 매우 중요】
- "고등어 한 접시", "샐러드", "오이", "브로콜리" 같은 재료 나열 X.
- 진짜 주변 밥집·배달앱에서 시켜 먹을 수 있는 **일상 메뉴**로 제안할 것.
- 좋은 예: 순대국, 사골곰탕, 설렁탕, 갈비탕, 해장국, 콩나물국밥, 육개장, 감자탕, 순두부찌개, 돼지김치찌개, 부대찌개, 뚝배기불고기, 들기름막국수, 잔치국수, 비빔국수, 냉면, 김치볶음밥, 카레라이스, 오므라이스, 돈까스, 제육덮밥, 회덮밥, 초밥세트, 연어회, 삼겹살, 갈비, 아구찜, 낙지볶음, 알탕.
- "이 국밥집 가서 순대국 한 그릇 추가하기" 같은 실행 언어 지향.

【시간대별 적절한 메뉴 · 반드시 지킬 것】
- **아침**: 담백·가벼움 · 콩나물국밥·순두부찌개·미역국·잔치국수·계란·요거트·바나나·죽 · **회·삼겹살·족발·부대찌개 X**
- **점심**: 든든하지만 무겁지 않게 · 제육덮밥·회덮밥·초밥세트·돈까스·비빔밥·김치찌개·순두부·국밥·갈비탕 · **회 단품·삼겹살 X** (덮밥·정식으로 순화)
- **오후 간식**: 정말 가볍게 · 요거트·바나나·견과류·삶은계란·고구마 · 식사류 X
- **저녁**: 대부분 OK · 회식·삼겹살·회·안주류·감자탕·해장국·부대찌개 모두 자유

지금 시각은 mealTime 인자로 전달됨. 그 시간대에 어울리지 않는 메뉴는 절대 추천하지 말 것.`;
}

// ═══ PET · DETECT PROMPT ═══
function buildPetFoodDetectPrompt() {
  return `너는 반려동물 사료 라벨/사료 이미지 인식 전문가다. 사진에서 다음을 뽑는다.
JSON 하나만 응답. 마크다운 금지.

【역할】
- 라벨 텍스트 (제품명, 원재료명, 등록성분량, 열량, 급여 안내표) OCR.
- 사료 그릇 사진이면 사료 종류/양 추정.
- 확신 없으면 needsConfirmation=true.

【JSON 스키마】
{
  "detectedFoods": [
    {
      "name": "브랜드명 사료",
      "portion": 1,
      "portionLabel": "1회 급여량",
      "needsConfirmation": true,
      "options": ["소량", "1회 급여", "듬뿍"],
      "ingredients": [
        { "name": "닭고기" }, { "name": "현미" }
      ]
    }
  ],
  "labelData": {
    "productName": "라벨상 제품명 or null",
    "guaranteedAnalysis": {"protein":"22.0% 이상","fat":"12.0% 이상","fiber":"5.0% 이하","moisture":"10.0% 이하","ash":"8.0% 이하"},
    "kcalPerKg": 3600,
    "feedingTable": [{"weightKg":"1-5","gPerDay":"30-90"}],
    "ingredients": ["닭고기","현미","귀리","..."]
  },
  "sceneNote": "사료 뒷면 라벨 · 등록성분량·열량 판독 가능"
}

【금지】
- 라벨에 없는 수치는 절대 만들지 말 것. 없으면 null.
- 사료 종류 진단 X · 관찰만.`;
}

// ═══ PET · ANALYZE PROMPT ═══
function buildPetFoodAnalyzePrompt({ confirmedFoods, userProfile, todayMeals }) {
  const p = userProfile || {};
  const petLine = [
    p.name ? `${p.name}` : '',
    p.petType === 'dog' ? '강아지' : p.petType === 'cat' ? '고양이' : '',
    p.breed ? p.breed : '',
    p.weight ? `${p.weight}kg` : '',
    p.birthYear ? `${new Date().getFullYear() - parseInt(p.birthYear)}살` : ''
  ].filter(Boolean).join(' · ');

  const foodsLine = (confirmedFoods || []).map(f => `${f.name}${f.portion ? ` × ${f.portion}` : ''}`).join(' + ');

  return `너는 반려동물 사료·영양 코치다. AAFCO·NRC 기준을 기본으로 하되 진단은 하지 않는다.
JSON 하나만 응답. 마크다운 금지.

【원칙】
- 사료 자체가 균형 사료면 그 사실을 인정하고 간식·급여량만 코칭.
- 사료·간식 조합의 흐름을 코치. 한 끼로 평가 금지.
- 영양제 언급 최소화. 필요한 경우에만 "수의사 상담" 권유.

【절대 금지】
- 진단·처방 (반드시·필수·병원·약).
- 라벨에 없는 수치 생성.

【입력】
- 반려동물: ${petLine || '정보 없음'}
- 이번 사료·간식: ${foodsLine}
- 오늘 급여 기록: ${(todayMeals || []).map(m => m.foodName || (m.items||'')).join(' | ') || '(첫 기록)'}

【출력 스키마】
{
  "mealSummary": "이번 급여 관찰 1문장",
  "dailyCoverage": {
    "adequate": ["잘 채워진 부분 1~2"],
    "watchouts": ["신경 쓰면 좋을 부분 1~2 (예: '급수량')"]
  },
  "nextAction": {
    "title": "다음 급여 · 이렇게 챙겨보세요",
    "suggestions": [
      { "action": "물그릇 한번 갈아주기", "why": "수분 · 여름철" }
    ]
  },
  "coachMessage": "부드러운 코칭 1~2문장",
  "disclaimer": "참고용 정보이며 수의학적 진단이 아닙니다."
}

【톤】
- 부드럽고 따뜻하게. 반려인 마음 헤아리기.
- 한 문장 짧게.`;
}

// ═══ UTIL ═══
function parseJsonLoose(raw) {
  try {
    const cleaned = String(raw || '')
      .replace(/```json\s*/gi, '')
      .replace(/```\s*$/g, '')
      .trim();
    const m = cleaned.match(/\{[\s\S]*\}/);
    if (!m) return null;
    return JSON.parse(m[0]);
  } catch(e) {
    return null;
  }
}
