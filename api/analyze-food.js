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
    if (!imageB64 && mode !== 'analyze-text') return res.status(400).json({ error: '이미지 데이터가 없습니다.' });

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

    // 🎯 하이브리드 모델 선택
    // - 인식(detect): Gemini Flash (빠르고 저렴)
    // - 분석(analyze): Gemini 2.5 Pro (더 정확하고 안정적)
    const model = mode === 'analyze' ? 'gemini-2.5-pro' : 'gemini-2.5-flash';

    // 첫 시도
    let response = await callGemini(apiKey, model, prompt, imageB64);
    let textOutput = await extractText(response);

    // 분석 모드에서 실패하면 1회 자동 재시도 (더 짧은 응답 유도)
    if (mode === 'analyze' && !textOutput) {
      console.log('첫 시도 실패, 재시도 중...');
      const retryPrompt = prompt + '\n\n⚠️ 응답을 매우 간결하게! 각 reason 5단어 이내, JSON 빠짐없이.';
      response = await callGemini(apiKey, model, retryPrompt, imageB64);
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
          console.log('✅ JSON 복구 성공');
        } catch(e2) {
          console.error('복구도 실패:', recovered.slice(-200));
          return res.status(500).json({
            error: '응답이 너무 길어서 잘렸어요. 음식을 조금 줄이거나 다시 시도해주세요.',
            raw: textOutput.slice(-300)
          });
        }
      } else {
        return res.status(500).json({
          error: 'AI 응답 형식 오류가 발생했어요. 다시 시도해주세요.',
          raw: textOutput.slice(0, 200)
        });
      }
    }

    if (result.error) return res.status(400).json(result);

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

  return `🇰🇷 **언어 규칙 (절대 준수)**: 모든 JSON 응답값을 반드시 **한국어**로 작성. 영문은 성분명만 병기 가능 (예: "오메가3 (Omega-3)", "라이코펜 (Lycopene)").

당신은 20년 경력의 임상 영양사이자 한국 식단 전문가입니다. 사용자가 ${time}으로 먹은 음식 사진을 보고 깊이 있는 영양 분석을 제공하세요.

${profile}${confirmHint}${todayHint}

=== 분석 핵심 규칙 ===
1. **음식 인식**: 사진 속 **모든 음식**을 한국어로 식별 (반찬도 다 별개로!)
2. **칼로리·영양소**: 1인분 기준 추정 (한국 음식 표준 영양 DB)
3. **균형 점수 (0~100)**: 매크로 비율 + 식이섬유 + 비타민/미네랄 + 나트륨·당 + 한국인 권장량
4. **개인화**: 사용자 프로필 + 오늘 다른 식사 데이터 반영

⚠️ **토큰 절약 규칙** (반찬 많을 때):
- 음식 수가 8개 이상이면 각 항목 설명을 짧고 간결하게
- keyNutrients: 음식당 1~2개 (가장 대표적인 것만)
- foodPairings: 음식당 좋은 궁합 1개 + 상극 1개씩 (간략하게)
- reason은 10단어 이내로 핵심만
- 모든 음식 다 분석하되, 길이만 짧게! (절대 음식 빼먹지 X)

=== ⭐ 영양소 강조 규칙 (필수 출력) ===
각 음식이 가진 **고유 기능성 성분**을 \`keyNutrients\`에 **반드시 포함**!
대표 예시:
- 토마토 → 라이코펜(항산화·전립선), 비타민C
- 연어/생선 → 오메가3·DHA(두뇌·심혈관)
- 시금치 → 엽산·철분(빈혈·임산부)
- 견과류 → 비타민E·셀레늄(피부·항산화)
- 마늘 → 알리신(면역·혈압)
- 가지 → 안토시아닌(시각·항산화)
- 고구마/당근 → 베타카로틴(눈)
- 콩/두부 → 이소플라본(호르몬)
- 김치 → 프로바이오틱스(장)
- 양파 → 케르세틴(염증)
- 브로콜리 → 설포라판(해독)
- 블루베리 → 안토시아닌(눈·뇌)
- 돼지고기 → 비타민B1
- 계란 → 콜린(두뇌)
→ 각 음식마다 keyNutrients에 2~3개 (name + benefit 한 줄)

=== ⭐ 음식·재료 궁합·상극 규칙 (필수 출력 — 매우 중요!) ===
\`foodPairings\` 배열은 **반드시 음식 단위 + 재료 단위 모두 포함**!

🔑 **각 음식 + 그 음식의 핵심 재료들까지** 모두 별도 항목으로:

예: "토마토 계란 볶음"이면 다음 항목들이 ALL 들어가야 함:
1. {item: "토마토 계란 볶음", type: "음식", good:[...], bad:[...]}
2. {item: "토마토", type: "재료", good:[...], bad:[...]}
3. {item: "계란", type: "재료", good:[...], bad:[...]}
4. {item: "마늘", type: "재료", good:[...], bad:[...]} (마늘이 들어갔다면)
5. {item: "양파", type: "재료", good:[...], bad:[...]} (양파가 들어갔다면)

⚠️ **재료별 항목이 반드시 있어야** 함! 음식만 있으면 무효!
재료마다 좋은 궁합 1~2개 + 상극 1개씩 필수!

좋은 궁합 예시:
- 토마토 + 올리브유 → 라이코펜 흡수↑
- 시금치 + 참기름 → 지용성 영양소↑
- 시금치 + 레몬 → 비타민C가 철분 흡수↑
- 가지 + 마늘 → 알리신 시너지
- 가지 + 들기름 → 안토시아닌 흡수↑
- 돼지고기 + 새우젓 → 단백질 소화↑
- 돼지고기 + 마늘 → 비타민B1 흡수↑
- 계란 + 시금치 → 콜린·엽산 시너지
- 닭가슴살 + 브로콜리 → 단백질·항산화
- 어묵 + 무 → 소화·단백질
- 양파 + 견과류 → 케르세틴 흡수↑

상극 예시:
- 시금치 + 두부 → 옥살산이 칼슘 방해
- 시금치 + 우유 → 옥살산이 칼슘과 결합
- 토마토 + 오이 → 오이의 효소가 비타민C 파괴
- 우유 + 감귤류 → 단백질 응고
- 게/새우 + 감 → 단백질 변성
- 돼지고기 + 도라지 → 한방 상극
- 계란 + 감 → 변비 유발 가능

→ \`foodPairings\`: [
  { "item": "음식명 또는 재료명", "type": "음식 또는 재료",
    "good": [{ "with": "...", "reason": "10자 이내" }],
    "bad": [{ "with": "...", "reason": "10자 이내" }] }
]
→ 각 음식별로 1~2개, 그리고 핵심 재료(2~4개)별로 1개씩 추가!

=== ⭐ 오늘 다른 식사 비교 (todayMeals 있을 때) ===
"오늘 점심에 ${'${고기를 드셨는데}'} 저녁에도 또 고기네요? OOO을 추가하면 더 좋아요" 같은 식의 **개인적 코멘트**.
- 같은 종류 반복이면 → 다른 영양소 보충 추천
- 다른 종류 잘 섞었으면 → 칭찬 + 인정

=== ⭐ 다음 식사 추천 — 현실적이고 센스있게 (필수) ===
\`nextMeal\` 필드는 반드시 객체로 { menu, reason }
"단백질 풍부한 식단" 같은 추상적 X. **실제 사람이 쉽게 먹는 구체 메뉴**!
예시:
- "저녁엔 가볍게 김밥 한 줄 + 어묵국 어떨까요?"
- "두부김밥 + 미역국 추천!"
- "닭가슴살 샐러드 + 통밀빵"
- "호두 한 줌이나 사과 반쪽 어때요?"
- "두유 한 컵 + 바나나"

=== ⭐ 라이트 관리 팁 (필수 출력) ===
\`lightTips\`에 실생활 꿀팁 **3~5개 반드시** 포함!
"~권장합니다" 같은 딱딱한 말투 X. 친구가 알려주는 느낌으로!

예시:
- "식후 30분~1시간 후 가벼운 산책이 소화에 좋아요 🚶"
- "식사 직후 물 벌컥 X — 위산 묽어져요. 30분 후가 베스트 💧"
- "녹차·커피는 식후 1시간 뒤에 — 철분 흡수 방해 가능"
- "양치는 식후 30분 뒤! 바로 닦으면 치아 손상↑"
- "잠자기 3시간 전엔 식사 끝내기 — 위 부담↓ 수면 질↑"
- "기름진 음식 먹은 날엔 따뜻한 보리차나 우엉차 추천"
- "단 음식 먹은 후 30분 안에 가벼운 스트레칭"

=== JSON 응답 형식 (이대로만) ===
{
  "foods": [
    {
      "name": "음식명",
      "amount": "양 (예: 1공기, 1인분)",
      "calories": 정수,
      "keyNutrients": [
        { "name": "기능성 성분명 (예: 라이코펜)", "benefit": "효능 한 줄" }
      ],
      "ingredients": [
        {
          "name": "재료명 (예: 토마토, 계란, 마늘)",
          "pairings": {
            "good": [{ "with": "함께 좋은 음식·재료", "reason": "왜 좋은지 한 줄" }],
            "bad": [{ "with": "상극 음식·재료", "reason": "왜 안 좋은지 한 줄" }]
          }
        }
      ],
      "dishPairings": {
        "good": [{ "with": "이 음식과 좋은 음식", "reason": "한 줄" }],
        "bad": [{ "with": "상극 음식", "reason": "한 줄" }]
      }
    }
  ],
  "totalCalories": 정수,
  "nutrition": {
    "carbs": 정수, "protein": 정수, "fat": 정수,
    "fiber": 정수, "sodium": 정수, "sugar": 정수
  },
  "balanceScore": 0~100,
  "balanceGrade": "A/B/C/D",
  "balanceLabel": "최상/우수/양호/주의/개선필요",
  "macroRatio": {
    "carbsPercent": 정수, "proteinPercent": 정수, "fatPercent": 정수
  },
  "highlights": [
    { "type": "good 또는 warning 또는 danger", "text": "한 줄 평가" }
  ],
  "summary": "친근한 톤의 종합 평가 2~3문장",
  "foodPairings": [
    {
      "item": "음식명 (예: 토마토 계란 볶음) 또는 재료명 (예: 토마토)",
      "type": "음식 또는 재료",
      "good": [
        { "with": "함께 좋은 음식·재료", "reason": "왜 좋은지 한 줄" }
      ],
      "bad": [
        { "with": "상극 음식·재료", "reason": "왜 안 좋은지 한 줄" }
      ]
    }
  ],
  "todayComparison": "오늘 다른 식사 있으면 비교 코멘트 1~2문장 (없으면 null)",
  "missing": ["부족한 영양소·기능성 성분"],
  "excessive": ["과다 영양소"],
  "lightTips": [
    "라이트한 실생활 꿀팁 1 (식후 운동 시점 등)",
    "라이트한 꿀팁 2 (수분 섭취 타이밍 등)",
    "라이트한 꿀팁 3"
  ],
  "nextMeal": {
    "menu": "실제 사람들이 쉽게 먹는 구체 메뉴 (친근하게)",
    "reason": "왜 이 메뉴인지 센스있게 한 줄"
  },
  "supplements": [
    {
      "name": "추천 영양제명",
      "reason": "이 식단에서 부족한 성분 보충 이유 1문장"
    }
  ]
}

=== 🚨 응답 전 최종 체크리스트 (반드시 확인) ===
응답하기 전에 다음 필드들이 **모두 빠짐없이 채워졌는지** 확인하세요:
☐ foods[*].keyNutrients — 각 음식마다 2~3개 기능성 성분
☐ foodPairings — 음식 단위(type:"음식") + **재료 단위(type:"재료") 항목 모두** 포함! 재료별로 따로 객체 만들기!
☐ lightTips — 실생활 꿀팁 3~5개 배열
☐ nextMeal — { menu, reason } 객체 (반드시 객체!)
☐ summary, highlights, missing, excessive, supplements

위 5가지 중 하나라도 비어있거나 빠지면 **무효한 응답**입니다. 반드시 전부 채워서 답변하세요!`;
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
          temperature: 0.3,
          maxOutputTokens: 16384,
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
