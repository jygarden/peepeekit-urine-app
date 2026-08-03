// ════════════════════════════════════════════════════════════════
// 영양제 라벨 OCR 전용 API
// 위치: /api/analyze-supplement.js
// v12: 성분·mg·%DV·1일 섭취량·제품명·복용 타이밍까지 다 추출
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
    const { imageB64 } = req.body;
    if (!imageB64) return res.status(400).json({ error: '이미지 데이터가 없습니다.' });

    const PROMPT = buildSupplementLabelPrompt();

    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [
            { text: PROMPT },
            { inline_data: { mime_type: 'image/jpeg', data: imageB64 } }
          ]}],
          generationConfig: { temperature: 0.1 }
        })
      }
    );

    const geminiData = await geminiRes.json();
    if (geminiData.error) return res.status(500).json({ error: geminiData.error.message });

    const raw = geminiData.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!raw) return res.status(500).json({ error: '분석 결과를 받지 못했습니다.' });

    let result;
    try {
      const cleaned = raw.replace(/```json\s*/gi, '').replace(/```\s*$/g, '').trim();
      const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
      if (!jsonMatch) return res.status(500).json({ error: '결과 형식을 읽지 못했습니다.' });
      result = JSON.parse(jsonMatch[0]);
    } catch (parseErr) {
      return res.status(500).json({ error: '결과 파싱 실패: ' + parseErr.message });
    }

    if (result.error) return res.status(400).json({ error: result.error });

    // 히어로 성분 자동 산정 (특수 성분 우선 → 그 다음 %DV 큰 것)
    if (Array.isArray(result.ingredients) && result.ingredients.length > 0 && !result.heroIngredient) {
      result.heroIngredient = pickHero(result.ingredients);
    }

    return res.status(200).json(result);
  } catch (err) {
    return res.status(500).json({ error: err.message || '서버 오류가 발생했습니다.' });
  }
};

function buildSupplementLabelPrompt() {
  return `당신은 한국 건강기능식품 라벨 OCR·해석 전문가입니다. 사진의 라벨에서 성분·함량·1일 섭취량·%영양성분기준치 정보를 정확히 뽑아 JSON으로만 응답하세요.

=== 추출 규칙 ===
1. 라벨의 "영양·기능정보" 영역에서 모든 기능성 원료·비타민·미네랄 성분을 놓치지 말고 뽑을 것.
2. 각 성분마다 amount(mg/μg/g/IU 단위 포함), dailyValuePercent(%영양성분기준치 · 없으면 null), category(특수성분/비타민/미네랄/오메가/유산균/식이섬유/기타) 를 채울 것.
3. "1일 섭취량" 문구를 그대로 servingSize에 담을 것 (예: "1캡슐(500mg)", "2정(2,002mg)").
4. 제품명(productName)은 라벨 상단 브랜드/제품명 또는 대표 성분명으로 추정. 확실하지 않으면 heroIngredient와 동일하게.
5. heroIngredient는 라벨의 "대표 원료"(제품 이름·앞줄·mg 가장 큰 특수 성분). 단순 비타민 조합보다 코엔자임Q10·오메가3·루테인·밀크씨슬·프로바이오틱스 같은 특수 성분이 있으면 그것을 우선.
6. suggestedTiming은 다음 규칙으로:
   - 지용성(오메가3, 비타민A/D/E/K, CoQ10, 루테인, 커큐민) → "식후 (지방과 함께 흡수)"
   - 수용성 비타민 B군/C → "아침 식후 또는 공복"
   - 마그네슘 글리시네이트/말산 → "저녁 식후 or 자기 전 (수면 도움)"
   - 프로바이오틱스/유산균 → "아침 공복 (기상 직후)"
   - 철분 → "공복 + 비타민C와 함께 (커피·차 X)"
   - 그 외 → "식후"
7. cautions에는 상호작용·금기 3~5개 나열. 임산부/항응고제/갑상선약 관련 있으면 명시.

=== 안전 지침 ===
- 라벨이 영양제가 아니거나 성분 판독 불가면: {"error": "영양제 라벨 이미지를 다시 촬영해주세요."}
- amount는 숫자와 단위를 붙여서 문자열로 (예: "100mg", "2,000IU", "16.5μg"). 파싱 실패 시 raw text 그대로.
- dailyValuePercent는 라벨의 (30%) 같은 표기에서 30만 숫자로 (문자열 "30" 또는 숫자 30 둘 다 허용).
- 라벨에 %DV 없는 특수 성분(오메가3·프로바이오틱스·글루코사민·CoQ10·루테인 등)은 dailyValuePercent = null.

=== JSON 형식 ===
{
  "productName": "제품명 또는 대표 성분명",
  "heroIngredient": "코엔자임Q10 (또는 오메가3, 루테인 등 대표 원료)",
  "servingSize": "1캡슐(500mg)",
  "dailyDose": "1캡슐",
  "ingredients": [
    {
      "name": "코엔자임Q10",
      "amount": "100mg",
      "dailyValuePercent": null,
      "category": "특수성분"
    },
    {
      "name": "비타민C",
      "amount": "30mg",
      "dailyValuePercent": 30,
      "category": "비타민"
    }
  ],
  "suggestedTiming": "식후 (지방과 함께 흡수)",
  "suggestedSlot": "lunch_after",
  "cautions": ["의약품 복용 중이면 의사와 상담", "임산부·수유부는 섭취 전 상담"],
  "functionSummary": "항산화 · 혈압 개선 · 에너지 대사 지원 등 라벨상 기능성"
}

suggestedSlot 값은 다음 중 하나로: morning_empty / morning_after / lunch_after / evening_after / bedtime`;
}

// 서버 측 hero 자동 산정 (프론트 fallback용)
function pickHero(ingredients) {
  const PRIORITY = [
    '코엔자임q10','코엔자임','q10','오메가3','오메가','밀크씨슬','실리마린',
    '루테인','지아잔틴','아스타잔틴','레스베라트롤','커큐민','글루타치온',
    '프로바이오틱스','유산균','콜라겐','글루코사민','콘드로이틴','msm',
    '크릴오일','크릴','스피루리나','클로렐라','노니','홍삼','흑마늘',
    '프로폴리스','로얄젤리','가바','테아닌','아쉬와간다','아세틸카르니틴',
    'nac','알파리포산','포스파티딜세린','ps','감마리놀렌산','gla',
    '은행잎','아로니아','크랜베리','디만노스','타우린','베타글루칸',
    '마리골드','히알루론산','피쉬오일','epa','dha',
    '엽산','칼슘','마그네슘','아연','철','철분','셀렌','셀레늄',
    '비타민d','비타민k','비타민b12','비타민b6','비타민a','비타민e','비타민b','비타민c'
  ];
  const normalize = s => String(s || '').toLowerCase().replace(/\s+/g,'').replace(/[()\[\]{}·,\-]/g,'');
  for (const key of PRIORITY) {
    const found = ingredients.find(i => normalize(i.name).includes(key));
    if (found) return found.name;
  }
  return ingredients[0].name;
}
