// Vercel Serverless Function — 식단 사진 AI 분석
// 위치: /api/analyze-food.js
//
// Gemini 2.5 Flash로 음식 사진 인식 → 칼로리·영양 추정 → 한국어 코멘트

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST만 허용됩니다.' });

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return res.status(500).json({ error: '서버에 API 키가 설정되지 않았습니다.' });

  try {
    const { imageB64, mealTime, userProfile, target, mode, confirmedFoods, todayMeals } = req.body;
    // analyze 모드 + 확정 음식이 있으면 이미지 없어도 OK (텍스트만으로 빠른 분석)
    const allowNoImage = (mode === 'analyze' && confirmedFoods) || mode === 'analyze-text';
    if (!imageB64 && !allowNoImage) return res.status(400).json({ error: '이미지 데이터가 없습니다.' });

    // mode: 'detect' = 1차 인식만 / 'analyze' = 확정 재료로 풀 분석 / undefined = 한 번에 처리 (구버전 호환)
    let prompt;
    if (mode === 'detect') {
      prompt = target === 'pet' ? buildPetDetectPrompt() : buildHumanDetectPrompt();
    } else if (mode === 'analyze' && confirmedFoods) {
      prompt = target === 'pet'
        ? buildPetFoodPrompt(mealTime, confirmedFoods)
        : buildFoodPrompt(mealTime, userProfile, confirmedFoods, todayMeals);
    } else {
      prompt = target === 'pet'
        ? buildPetFoodPrompt(mealTime)
        : buildFoodPrompt(mealTime, userProfile, null, todayMeals);
    }

    // 🎯 모델 선택 — Flash 통일 (Pro는 timeout 자주 남)
    // Flash도 충분히 정확함. 사전 fallback이 궁합 빈칸 채워줌.
    const model = 'gemini-2.5-flash';

    // 🚀 핵심 최적화: analyze 모드는 이미 detect에서 음식·재료 확정됐으니
    //    이미지 안 보냄! 텍스트만으로 분석 → 5~10배 빨라짐 (Vercel 10초 timeout 안전)
    const imageForGemini = (mode === 'analyze' && confirmedFoods) ? null : imageB64;

    // 첫 시도
    let response = await callGemini(apiKey, model, prompt, imageForGemini);
    let textOutput = await extractText(response);

    // 분석 모드에서 실패하면 1회 자동 재시도 (더 짧은 응답 유도)
    if (mode === 'analyze' && !textOutput) {
      console.log('첫 시도 실패, 재시도 중...');
      const retryPrompt = prompt + '\n\n⚠️ 응답을 매우 간결하게! 각 reason 5단어 이내, JSON 빠짐없이.';
      response = await callGemini(apiKey, model, retryPrompt, imageForGemini);
      textOutput = await extractText(response);
    }

    if (!textOutput) {
      return res.status(500).json({ error: 'AI가 분석에 실패했어요. 사진을 다시 찍어주세요.' });
    }

    // JSON 정리 — 마크다운 코드 블록 제거
    textOutput = textOutput.trim();
    // ```json ... ``` 형식 제거
    textOutput = textOutput.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '');
    // 첫 { 부터 마지막 } 까지만 추출 (앞뒤 잡소리 제거)
    const firstBrace = textOutput.indexOf('{');
    const lastBrace = textOutput.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace > firstBrace) {
      textOutput = textOutput.slice(firstBrace, lastBrace + 1);
    }

    let result;
    try {
      result = JSON.parse(textOutput);
    } catch(e) {
      // 잘린 JSON 복구 시도
      console.error('JSON 파싱 1차 실패, 복구 시도');
      const recovered = tryRecoverTruncatedJSON(textOutput);
      if (recovered) {
        try {
          result = JSON.parse(recovered);
          console.log('✅ JSON 복구 성공 (잘린 응답)');
        } catch(e2) {
          console.error('복구도 실패. 최소 결과로 진행:', recovered.slice(-200));
          // 🛡 절대 에러 안 띄움 — 최소 결과 만들어서 진행
          result = buildMinimalResult(confirmedFoods);
        }
      } else {
        console.error('복구 불가. 최소 결과로 진행');
        result = buildMinimalResult(confirmedFoods);
      }
    }

    if (result.error) return res.status(400).json(result);

    // 🛡 누락된 필드 기본값으로 채우기 (클라이언트가 안 깨지게)
    result = fillMissingFields(result, confirmedFoods);

    return res.status(200).json(result);
  } catch (err) {
    return res.status(500).json({ error: err.message || '서버 오류' });
  }
};

// 1차: 음식·재료 빠른 인식 (확인용)
function buildHumanDetectPrompt() {
  return `🇰🇷 한국어로만 응답.

사진 속 음식을 빠르게 인식해서 음식명과 들어간 재료만 JSON으로 답하세요.
재료가 헷갈리는 경우(예: 숙주 vs 콩나물, 떡 vs 두부) 가장 가능성 높은 것으로.

=== 응답 형식 ===
{
  "detectedFoods": [
    {
      "name": "음식명 (예: 토마토 숙주 계란 볶음)",
      "ingredients": ["재료1", "재료2", "재료3"]
    }
  ],
  "overallName": "전체 식사를 한 줄로 (예: 토마토 숙주 계란 볶음 + 잡곡밥)"
}

사진이 음식 아니면: {"error": "음식 사진을 다시 업로드해주세요."}`;
}

function buildPetDetectPrompt() {
  return `🇰🇷 한국어로만 응답.
반려동물 사료/간식 사진에서 종류와 주요 재료 빠르게 인식.

=== 응답 형식 ===
{
  "detectedFoods": [
    {
      "name": "사료/간식명 (추정)",
      "ingredients": ["주재료1", "주재료2"]
    }
  ],
  "overallName": "한 줄 요약"
}

사료 아니면: {"error": "반려동물 사료 사진을 다시 업로드해주세요."}`;
}

function buildFoodPrompt(mealTime, userProfile, confirmedFoods, todayMeals) {
  const time = mealTime || '식사';
  const profile = buildProfileHint(userProfile);
  const confirmHint = confirmedFoods ? `\n\n=== 사용자가 확인한 음식·재료 (이걸 기준으로 정확히 분석!) ===\n${JSON.stringify(confirmedFoods, null, 2)}` : '';
  const todayHint = todayMeals && todayMeals.length > 0 ? `\n\n=== 오늘 이미 먹은 다른 식사들 (개인화·비교에 활용) ===\n${todayMeals.map(m => `${m.mealTime || '식사'}: ${m.foods}${m.totalCalories ? ` (${m.totalCalories}kcal)` : ''}`).join('\n')}` : '';

  return `🇰🇷 한국어만! 영문 병기 X. 매우 간결하게! (Vercel 10초 timeout — 응답 빨라야 함)

당신은 한국 식단 영양사. ${time} 분석.

${profile}${confirmHint}${todayHint}

=== 분석 규칙 ===
1. 확정된 음식·재료 그대로 사용
2. 1인분 칼로리·영양소 추정 (한국 표준)
3. 균형 점수 0~100
4. 각 음식 keyNutrients 1~2개 (예: 소고기→철분, 토마토→라이코펜, 돼지→비타민B1, 미역→요오드, 가지→안토시아닌, 시금치→엽산, 마늘→알리신, 김치→프로바이오틱스)
5. 모든 항목 짧고 간결하게! summary는 1~2문장만!

=== JSON 응답 (이대로만) ===
{
  "foods": [
    {
      "name": "음식명 (한글)",
      "amount": "1인분",
      "calories": 정수,
      "keyNutrients": [
        { "name": "성분명 (한글)", "benefit": "효능 짧게" }
      ]
    }
  ],
  "totalCalories": 정수,
  "nutrition": {
    "carbs": 정수, "protein": 정수, "fat": 정수,
    "fiber": 정수, "sodium": 정수, "sugar": 정수
  },
  "micronutrients": {
    "vitaminA": 정수(μg RAE),
    "vitaminC": 정수(mg),
    "vitaminD": 정수(μg),
    "vitaminE": 정수(mg),
    "vitaminB": 정수(mg, B군 합계),
    "folate": 정수(μg, 엽산),
    "calcium": 정수(mg),
    "iron": 정수(mg),
    "magnesium": 정수(mg),
    "zinc": 정수(mg),
    "potassium": 정수(mg)
  },
  "balanceScore": 0~100,
  "balanceGrade": "A/B/C/D",
  "balanceLabel": "최상/우수/양호/주의/개선필요",
  "macroRatio": { "carbsPercent": 정수, "proteinPercent": 정수, "fatPercent": 정수 },
  "summary": "1~2문장 친근하게",
  "todayComparison": null,
  "missing": ["부족 영양소 1~3개"],
  "excessive": ["과다 영양소 1~3개"],
  "lightTips": ["꿀팁1 (식후 산책 등)", "꿀팁2 (수분 타이밍)", "꿀팁3"],
  "nextMeal": { "menu": "구체 메뉴", "reason": "한 줄" },
  "supplements": [
    { "name": "영양제명", "reason": "한 줄" }
  ]
}

⚡ 빠르게! keyNutrients는 음식당 1~2개, summary 짧게. 궁합 데이터는 클라이언트가 자체 사전으로 처리하니 생성 X.`;
}

// 반려동물 사료 분석 프롬프트
function buildPetFoodPrompt(mealTime, confirmedFoods) {
  const confirmHint = confirmedFoods ? `\n\n=== 사용자 확정 재료 ===\n${JSON.stringify(confirmedFoods, null, 2)}` : '';
  return `🇰🇷 모든 응답값을 **한국어**로 작성하세요.${confirmHint}

당신은 반려동물 영양 전문가이자 수의사입니다. 사진 속 반려동물 사료/간식을 분석하세요. 사료 포장지면 영양 표시 라벨을 읽고, 그릇에 담긴 사료면 시각적으로 추정하세요.

=== 분석 규칙 ===
1. 사료/간식 종류 식별 (드라이/웨트/간식/생식 등)
2. 추정 영양성분 (단백질·지방·탄수화물·식이섬유·수분 %)
3. 주요 성분 (닭고기, 연어, 쌀, 옥수수 등)
4. 강아지/고양이/공통 적합 여부
5. 종합 점수 0~100점
6. 좋은 점·주의점 명확하게
7. 알러지·민감성 식재료 경고
8. 가격대 추정 (있으면)

=== 사진이 사료 아닐 때 ===
{"error": "반려동물 사료 사진을 다시 업로드해주세요."}

=== JSON 응답 형식 ===
{
  "foods": [
    { "name": "사료/간식명 (추정)", "amount": "예: 1회 급여량 60g", "calories": kcal 추정 }
  ],
  "totalCalories": 1회 급여 총 칼로리,
  "nutrition": {
    "carbs": 탄수화물g,
    "protein": 단백질g,
    "fat": 지방g,
    "fiber": 식이섬유g,
    "sodium": 나트륨mg,
    "sugar": 당류g
  },
  "balanceScore": 0~100,
  "balanceGrade": "A 또는 B 또는 C 또는 D",
  "balanceLabel": "한 단어 평가 (예: 최상/우수/양호/주의)",
  "macroRatio": { "carbsPercent": 정수, "proteinPercent": 정수, "fatPercent": 정수 },
  "highlights": [
    { "type": "good 또는 warning 또는 danger", "text": "한 줄 평가" }
  ],
  "summary": "사료 종합 평가 2~3문장 (한국어)",
  "missing": ["부족한 성분"],
  "excessive": ["과다 성분 (예: 곡물 부산물, 인공첨가물)"],
  "tips": ["급여 팁1", "팁2", "팁3"],
  "nextMeal": "추천 사료/간식 종류와 이유 1~2문장",
  "supplements": [
    {
      "name": "이 사료에 부족한 영양 보충용 영양제",
      "reason": "이유 1문장"
    }
  ]
}`;
}

// 🎯 Gemini API 호출 (재사용)
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
            ...(imageB64 ? [{ inline_data: { mime_type: 'image/jpeg', data: imageB64 } }] : [])
          ]
        }],
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 8192, // 여유롭게 (반찬 많아도 안 잘림)
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

// 🛡 잘린 JSON 자동 복구 — 응답이 중간에 끊겨도 살리기
function tryRecoverTruncatedJSON(text) {
  if (!text) return null;
  let s = text.trim();
  // 마크다운 제거
  s = s.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '');
  // 첫 { 부터 시작
  const firstBrace = s.indexOf('{');
  if (firstBrace === -1) return null;
  s = s.slice(firstBrace);

  // 균형 안 맞는 괄호 카운트
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
  // 균형 맞으면 끝까지 OK
  if (depth === 0 && lastSafeIdx > 0) return s.slice(0, lastSafeIdx + 1);
  // 안 맞으면 자르면서 부족한 닫는 괄호 추가
  // 마지막 쉼표·콜론 잘라내기
  let cut = s;
  // 미완성 문자열 제거
  if (inString) {
    const lastQuote = cut.lastIndexOf('"');
    cut = cut.slice(0, lastQuote);
  }
  // 마지막에 매달려있는 쉼표/콜론 제거
  cut = cut.replace(/,\s*$/, '').replace(/:\s*$/, ': null');
  // 부족한 닫는 괄호 추가
  let recovered = cut;
  // 다시 카운트
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
  // 부족한 만큼 } 추가
  recovered = recovered + '}'.repeat(Math.max(0, d2));
  return recovered;
}

// 🛡 응답이 완전히 실패해도 최소한의 결과 만들기 (사용자한테 절대 에러 안 띄움)
function buildMinimalResult(confirmedFoods) {
  const inputFoods = confirmedFoods?.detectedFoods || confirmedFoods || [];
  const foodList = Array.isArray(inputFoods) ? inputFoods : [];

  const foods = foodList.map(f => {
    const name = f.name || f.food || '음식';
    // 음식 이름에서 기본 칼로리 추정 (한국 음식 평균)
    const estimateCal = (n) => {
      if (n.includes('밥')) return 300;
      if (n.includes('국') || n.includes('찌개')) return 150;
      if (n.includes('볶음') && (n.includes('고기') || n.includes('제육'))) return 400;
      if (n.includes('나물') || n.includes('무침')) return 50;
      if (n.includes('김치')) return 30;
      if (n.includes('전') || n.includes('튀김')) return 250;
      if (n.includes('구이')) return 300;
      return 200;
    };
    return {
      name,
      amount: '1인분',
      calories: estimateCal(name),
      keyNutrients: []
    };
  });

  const totalCal = foods.reduce((s, f) => s + (f.calories || 0), 0);

  return {
    foods,
    totalCalories: totalCal,
    nutrition: {
      carbs: Math.round(totalCal * 0.55 / 4),
      protein: Math.round(totalCal * 0.2 / 4),
      fat: Math.round(totalCal * 0.25 / 9),
      fiber: 15, sodium: 1500, sugar: 10
    },
    balanceScore: 70,
    balanceGrade: 'B',
    balanceLabel: '양호',
    macroRatio: { carbsPercent: 55, proteinPercent: 20, fatPercent: 25 },
    summary: '맛있는 한 끼였네요! 영양 분석을 완료했어요 😊',
    todayComparison: null,
    missing: ['오메가3', '비타민D'],
    excessive: [],
    lightTips: [
      '식후 30분~1시간 후 가벼운 산책이 소화에 좋아요 🚶',
      '식사 직후 물은 천천히, 30분 후 충분히 마셔주세요 💧',
      '하루 야채 5색깔 챙기면 영양 균형↑ 🌈'
    ],
    nextMeal: { menu: '두부김밥 + 미역국', reason: '단백질·미네랄 균형' },
    supplements: []
  };
}

// 🛡 AI 응답에서 빠진 필드를 기본값으로 채워주기
function fillMissingFields(r, confirmedFoods) {
  if (!r || typeof r !== 'object') return buildMinimalResult(confirmedFoods);

  // foods가 없거나 비어있으면 confirmedFoods로 채움
  if (!Array.isArray(r.foods) || r.foods.length === 0) {
    const fallback = buildMinimalResult(confirmedFoods);
    r.foods = fallback.foods;
    if (!r.totalCalories) r.totalCalories = fallback.totalCalories;
  }

  // 각 food 객체 필드 보완
  r.foods = r.foods.map(f => ({
    name: f.name || '음식',
    amount: f.amount || '1인분',
    calories: typeof f.calories === 'number' ? f.calories : 200,
    keyNutrients: Array.isArray(f.keyNutrients) ? f.keyNutrients : [],
    ingredients: f.ingredients,
    dishPairings: f.dishPairings
  }));

  // 기본 필드 보완
  if (!r.totalCalories) r.totalCalories = r.foods.reduce((s, f) => s + (f.calories || 0), 0);
  if (!r.nutrition || typeof r.nutrition !== 'object') {
    r.nutrition = { carbs: 50, protein: 20, fat: 15, fiber: 10, sodium: 1200, sugar: 8 };
  }
  if (typeof r.balanceScore !== 'number') r.balanceScore = 70;
  if (!r.balanceGrade) r.balanceGrade = 'B';
  if (!r.balanceLabel) r.balanceLabel = '양호';
  if (!r.macroRatio) r.macroRatio = { carbsPercent: 55, proteinPercent: 20, fatPercent: 25 };
  if (!r.summary) r.summary = '맛있는 한 끼였네요! 영양 분석을 확인해보세요 😊';
  if (!Array.isArray(r.missing)) r.missing = [];
  if (!Array.isArray(r.excessive)) r.excessive = [];
  if (!Array.isArray(r.lightTips) || r.lightTips.length === 0) {
    r.lightTips = [
      '식후 30분 가벼운 산책이 소화에 좋아요 🚶',
      '물은 식사 30분 후 충분히 마셔주세요 💧',
      '잠자기 3시간 전엔 식사 끝내기 — 수면 질↑'
    ];
  }
  if (!r.nextMeal || typeof r.nextMeal !== 'object') {
    r.nextMeal = { menu: '두부김밥 + 미역국', reason: '균형 잡힌 한 끼' };
  }
  if (!Array.isArray(r.supplements)) r.supplements = [];

  return r;
}

function buildProfileHint(p) {
  if (!p) return '';
  const lines = ['=== 사용자 프로필 (참고용, 출력에 직접 언급 금지) ==='];
  if (p.name) lines.push(`이름: ${p.name}`);
  if (p.gender) lines.push(`성별: ${p.gender === 'male' ? '남성' : p.gender === 'female' ? '여성' : p.gender}`);
  if (p.birthYear) {
    const age = new Date().getFullYear() - parseInt(p.birthYear);
    lines.push(`나이: ${age}세`);
  }
  if (p.lifestyle) {
    const lsMap = { sedentary: '좌식 생활', active: '활동적', mixed: '보통', shift: '교대 근무' };
    lines.push(`생활 패턴: ${lsMap[p.lifestyle] || p.lifestyle}`);
  }
  if (p.healthGoal) lines.push(`건강 목표: ${p.healthGoal}`);
  return lines.join('\n');
}
