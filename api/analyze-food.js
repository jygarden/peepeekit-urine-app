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
    const { imageB64, mealTime, userProfile, target } = req.body;
    if (!imageB64) return res.status(400).json({ error: '이미지 데이터가 없습니다.' });

    const prompt = target === 'pet'
      ? buildPetFoodPrompt(mealTime)
      : buildFoodPrompt(mealTime, userProfile);

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
            responseMimeType: 'application/json'
          }
        })
      }
    );

    if (!response.ok) {
      const errText = await response.text();
      return res.status(response.status).json({ error: errText });
    }

    const data = await response.json();
    const textOutput = data.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
    let result;
    try { result = JSON.parse(textOutput); }
    catch(e) { return res.status(500).json({ error: 'AI 응답을 파싱하지 못했습니다.', raw: textOutput }); }

    if (result.error) return res.status(400).json(result);

    return res.status(200).json(result);
  } catch (err) {
    return res.status(500).json({ error: err.message || '서버 오류' });
  }
};

function buildFoodPrompt(mealTime, userProfile) {
  const time = mealTime || '식사';
  const profile = buildProfileHint(userProfile);
  return `🇰🇷 **언어 규칙 (절대 준수)**: 모든 JSON 응답값을 반드시 **한국어**로 작성. 영문 영양소명만 한국어와 병기 가능 (예: "단백질(Protein)").

당신은 20년 경력의 임상 영양사이자 한국 식단 전문가입니다. 사용자가 ${time}으로 먹은 음식 사진을 보고 깊이 있는 영양 분석을 제공하세요.

${profile}

=== 분석 규칙 ===
1. 사진 속 모든 음식을 한국어로 식별 (예: "김치찌개", "잡곡밥", "계란말이")
2. 각 음식의 1인분 기준 칼로리·영양소 추정 (한국 음식 표준 영양 DB 기준)
3. 사용자 프로필이 있으면 그에 맞춘 평가
4. 균형 점수 (0~100점) 산출:
   - 단백질·탄수화물·지방 비율 균형
   - 식이섬유, 비타민, 미네랄 충족도
   - 나트륨·당분 과다 여부
   - 한국인 권장 섭취량 기준
5. 잘된 점·개선점 모두 제시
6. 다음 식사 추천 (구체적으로)

=== 사진이 음식 아닐 때 ===
{"error": "음식 사진을 다시 업로드해주세요."} 만 반환.

=== JSON 응답 형식 (이대로만) ===
{
  "foods": [
    { "name": "음식명", "amount": "양 (예: 1공기, 1인분, 5조각)", "calories": 정수 }
  ],
  "totalCalories": 정수,
  "nutrition": {
    "carbs": 탄수화물g (정수),
    "protein": 단백질g (정수),
    "fat": 지방g (정수),
    "fiber": 식이섬유g (정수),
    "sodium": 나트륨mg (정수),
    "sugar": 당류g (정수)
  },
  "balanceScore": 0~100 정수,
  "balanceGrade": "A 또는 B 또는 C 또는 D",
  "balanceLabel": "한 단어 평가 (예: 최상/우수/양호/주의/개선필요)",
  "macroRatio": {
    "carbsPercent": 탄수화물 칼로리 비율,
    "proteinPercent": 단백질 칼로리 비율,
    "fatPercent": 지방 칼로리 비율
  },
  "highlights": [
    { "type": "good 또는 warning 또는 danger", "text": "한 줄 평가" }
  ],
  "summary": "전체 식단에 대한 종합 평가 2~3문장 (한국어)",
  "missing": ["부족한 영양소1", "영양소2"],
  "excessive": ["과다 영양소1 (예: 나트륨)"],
  "tips": ["맞춤 관리 팁1", "팁2", "팁3"],
  "nextMeal": "다음 식사로 추천하는 한식 메뉴와 이유 1~2문장",
  "supplements": [
    {
      "name": "추천 영양제 (예: 오메가3, 종합비타민)",
      "reason": "이 식단에서 부족한 영양소 보충 이유 1문장"
    }
  ]
}`;
}

// 반려동물 사료 분석 프롬프트
function buildPetFoodPrompt(mealTime) {
  return `🇰🇷 모든 응답값을 **한국어**로 작성하세요.

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
