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

    // responseMimeType 제거 — 너무 strict해서 "string did not match pattern" 에러 자주 남
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
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
            temperature: 0.4,
            maxOutputTokens: 4000
          }
        })
      }
    );

    if (!response.ok) {
      const errText = await response.text();
      return res.status(response.status).json({ error: 'AI 분석 오류: ' + errText.slice(0, 150) });
    }

    const data = await response.json();
    let textOutput = data.candidates?.[0]?.content?.parts?.[0]?.text || '{}';

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
      console.error('JSON 파싱 실패:', textOutput.slice(0, 500));
      return res.status(500).json({
        error: 'AI 응답 형식 오류가 발생했어요. 다시 시도해주세요.',
        raw: textOutput.slice(0, 200)
      });
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
1. **음식 인식**: 사진 속 모든 음식 한국어로 식별 (사용자 확정 데이터 있으면 그대로 사용)
2. **칼로리·영양소**: 1인분 기준 추정 (한국 음식 표준 영양 DB)
3. **균형 점수 (0~100)**: 매크로 비율 + 식이섬유 + 비타민/미네랄 + 나트륨·당 + 한국인 권장량
4. **개인화**: 사용자 프로필 + 오늘 다른 식사 데이터 반영

=== ⭐ 영양소 강조 규칙 (중요) ===
탄수화물·단백질·지방 같은 기본 외에 **음식이 가진 고유 기능성 성분**을 더 강조하세요!
예시:
- 토마토 → 라이코펜 (강력한 항산화·전립선 건강)
- 생선/연어 → 오메가3·DHA (두뇌·심혈관)
- 시금치 → 엽산·철분 (빈혈·임산부)
- 견과류 → 비타민E·셀레늄 (피부·항산화)
- 마늘 → 알리신 (면역·혈압)
- 고구마 → 베타카로틴 (눈·피부)
- 콩 → 이소플라본 (호르몬 균형)
- 김치 → 프로바이오틱스 (장 건강)

→ \`keyNutrients\` 필드에 **음식별 기능성 성분 + 효능 한 줄**

=== ⭐ 음식 궁합·상극 규칙 (매우 중요!) ===
**음식별로 각각** 분석하세요. 단순히 식사 내 음식 간만 X.
각 음식이 **일반적으로 어떤 음식과 잘 맞는지 / 안 맞는지** 모두 알려주세요.

각 음식마다 다음 두 가지 제공:
1. **좋은 궁합** (함께 먹으면 좋은 음식·재료) — 2~3개
2. **상극** (함께 먹으면 안 좋은 음식·재료) — 1~2개

이유는 **간략하게 한 줄**로.

예시 (가지):
- 가지 + 마늘 → 알리신이 항산화 흡수 ↑
- 가지 + 들기름 → 지용성 영양소 흡수 시너지
- ⚠️ 가지 + 등푸른 생선 → 일부 사람에게 소화 부담

예시 (시금치):
- 시금치 + 참기름 → 비타민K·E 흡수↑
- 시금치 + 레몬 → 비타민C가 철분 흡수 ↑
- ⚠️ 시금치 + 두부 → 옥살산이 칼슘 흡수 방해
- ⚠️ 시금치 + 우유 → 옥살산이 칼슘과 결합

예시 (토마토):
- 토마토 + 올리브유 → 라이코펜 흡수율 ↑↑
- 토마토 + 모차렐라 치즈 → 항산화 + 칼슘 시너지
- ⚠️ 토마토 + 오이 → 비타민C 파괴 효소

예시 (돼지고기):
- 돼지고기 + 새우젓 → 단백질 분해↑·소화↑
- 돼지고기 + 마늘 → 비타민B1 흡수 시너지
- 돼지고기 + 양파 → 콜레스테롤 낮춤
- ⚠️ 돼지고기 + 도라지 → 일부 한방서 상극으로 봄

→ \`foodPairings\` 필드에 **각 음식별** 좋은 궁합 + 상극 정리

=== ⭐ 오늘 다른 식사 비교 (todayMeals 있을 때) ===
"오늘 점심에 ${'${고기를 드셨는데}'} 저녁에도 또 고기네요? OOO을 추가하면 더 좋아요" 같은 식의 **개인적 코멘트**.
- 같은 종류 반복이면 → 다른 영양소 보충 추천
- 다른 종류 잘 섞었으면 → 칭찬 + 인정

=== ⭐ 다음 식사 추천 — 현실적이고 센스있게 ===
교과서 같은 "단백질·채소 위주" X
실제 사람들이 쉽게 접하는 메뉴로!
좋은 예: "저녁엔 가볍게 김밥 한 줄 + 어묵국 어떨까요?" / "오늘 단백질 부족하니까 닭가슴살 샐러드 or 두부김밥 추천!" / "당 좀 떨어진 듯해요. 호두 한 줌이나 사과 반쪽 어때요?"
나쁜 예: "단백질이 풍부한 식단을 권장합니다"

=== ⭐ 관리 팁 — 라이트한 톤 ===
"~을 권장합니다" X (딱딱함)
실생활 꿀팁 톤으로!
좋은 예:
- "식사 후 바로 운동보다는 30분~1시간 후 가벼운 산책이 소화에 좋아요 🚶"
- "식사 직후 물 벌컥은 위산 묽어져서 소화↓ — 식사 30분 후가 베스트"
- "녹차나 커피는 식후 1시간 뒤에 — 철분 흡수에 방해될 수 있어요"
- "양치는 식후 30분 뒤! 바로 닦으면 치아 손상 ↑"
- "잠자기 3시간 전엔 식사 끝내기 — 위 부담↓"

=== JSON 응답 형식 (이대로만) ===
{
  "foods": [
    {
      "name": "음식명",
      "amount": "양 (예: 1공기, 1인분)",
      "calories": 정수,
      "keyNutrients": [
        { "name": "기능성 성분명 (예: 라이코펜)", "benefit": "효능 한 줄 (예: 강력한 항산화·전립선 건강)" }
      ]
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
      "food": "음식명 (예: 가지)",
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
}`;
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
