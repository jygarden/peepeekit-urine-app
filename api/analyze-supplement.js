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
    const { imageB64, currentSupplements, productHint } = req.body;
    if (!imageB64) return res.status(400).json({ error: '이미지 데이터가 없습니다.' });

    // 🔍 제품명 힌트가 있으면 · 네이버 블로그 검색으로 사용법·시너지 정보 수집
    let naverInfo = null;
    if (productHint && productHint.trim()) {
      try {
        const keyId = process.env.NCP_API_KEY_ID;
        const key = process.env.NCP_API_KEY;
        if (keyId && key) {
          const q = encodeURIComponent(productHint.trim() + ' 효능 복용법');
          const nr = await fetch(`https://naveropenapi.apigw.ntruss.com/search/v1/blog?query=${q}&display=5&sort=sim`, {
            headers: { 'X-NCP-APIGW-API-KEY-ID': keyId, 'X-NCP-APIGW-API-KEY': key }
          });
          if (nr.ok) {
            const nd = await nr.json();
            if (nd.items && nd.items.length) {
              naverInfo = nd.items.map(it => ({
                t: (it.title || '').replace(/<[^>]+>/g, '').slice(0, 80),
                d: (it.description || '').replace(/<[^>]+>/g, '').slice(0, 200)
              }));
            }
          }
        }
      } catch(e){ console.error('naver supplement search', e.message); }
    }

    const PROMPT = buildSupplementLabelPrompt(currentSupplements, naverInfo);

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

function buildSupplementLabelPrompt(currentSupplements, naverInfo) {
  const naverBlock = (naverInfo && naverInfo.length) ? `

=== 네이버 블로그 실제 사용자 후기 (${naverInfo.length}건 · 정확도 크게 상승) ===
${naverInfo.map((h, i) => `${i+1}. ${h.t}\n   → ${h.d}`).join('\n')}

⚠️ 위 후기를 참고해서 · benefits (효능·언제 좋음)·userExperience (실제 사용자 경험)·bestTimeToTake (최적 복용 시간) 를 채워라.
` : '';

  const currentBlock = (currentSupplements && currentSupplements.length) ? `

=== 사용자가 이미 먹고 있는 영양제 목록 ===
${currentSupplements.map((s, i) => `${i+1}. ${s.name}${s.dose ? ` (${s.dose})` : ''}`).join('\n')}

⚠️ 이번 새 영양제를 분석하면서 · 위 목록과 성분 겹침/상호작용/과다 우려를 반드시 체크하고 · combinationWarnings 필드에 담아라.
- 같은 성분 중복 (예: 종합비타민 + 비타민B복합 = B군 중복)
- 흡수 방해 조합 (칼슘 + 철분 · 동시 복용 시 흡수 저하)
- 시너지 조합 (비타민D + 칼슘 · 비타민C + 철분 · 함께 좋음)
- 상한량 초과 우려 (같은 미네랄 총합이 UL 넘김)
` : '';

  return `당신은 한국 건강기능식품 라벨 OCR·해석 전문가입니다. 사진의 라벨에서 성분·함량·1일 섭취량·%영양성분기준치 정보를 정확히 뽑아 JSON으로만 응답하세요.
${naverBlock}${currentBlock}

=== 건강어때 2.0 · 영양제 관련 대전제 ===
- 이 앱은 "영양제를 먹기 전에 음식을 먹자"를 원칙으로 한다.
- 라벨 정보는 정확히 뽑되, 영양제를 강권하는 마케팅 문구는 절대 만들지 말 것.
- functionSummary는 라벨상 기능성만 담담하게 요약. "꼭 드세요", "효과가 뛰어납니다" 같은 판매 문구 금지.
- 라벨에 없는 효능·질병 예방·치료 문구는 절대 추가하지 말 것 (건기식법 위반 소지).

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
  "functionSummary": "항산화 · 혈압 개선 · 에너지 대사 지원 등 라벨상 기능성",
  "combinationWarnings": [
    {"type":"duplicate","level":"warning","message":"이미 종합비타민에 B6가 25mg 있음 · 이번 제품 50mg 추가 시 합 75mg (UL 100mg 근접)"},
    {"type":"absorption","level":"info","message":"철분과 칼슘은 2시간 이상 간격 두고 복용"},
    {"type":"synergy","level":"positive","message":"비타민D와 함께 먹으면 칼슘 흡수 상승"}
  ],
  "benefits": ["관절 통증 완화 도움", "피부 탄력 유지", "혈관 건강 지원"],
  "bestTimeToTake": "저녁 식후 · 지방과 함께 흡수 · 자기 전 2시간 전 완료",
  "userExperience": "실제 사용자 후기 기반 · 3~4주 꾸준히 섭취 시 관절 부드러워짐 후기 다수",
  "notRecommendedFor": ["임산부·수유부", "항응고제 복용자", "출산 예정 6개월 이내"]
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
