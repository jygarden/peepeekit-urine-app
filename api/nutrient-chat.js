// ════════════════════════════════════════════════════════════════
// 건강어때 2.0 · 영양 코치 챗 API (사람용)
// 위치: /api/nutrient-chat.js
//
// 홈 화면 하단 3개 chip 클릭 시 호출:
//   ① 왜 부족해?          · shortages 근거 · 최근 식단 히스토리 기반
//   ② 편의점에서는?       · 편의점 실전 조합 3가지
//   ③ 내 영양제 괜찮아?    · 현재 복용중 영양제와 지금 상태의 궁합 리뷰
//
// 건강어때 3원칙 반영:
//   ① 영양제 전에 음식
//   ② 숫자 전에 행동
//   ③ 한 끼 평가 X · 습관 코칭
// ════════════════════════════════════════════════════════════════
module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST만 허용됩니다.' });

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return res.status(500).json({ error: '서버에 API 키가 설정되지 않았어요.' });

  try {
    const { topic, userProfile, shortages, recent7Days, supplements } = req.body || {};
    if (!topic) return res.status(400).json({ error: 'topic이 필요합니다.' });

    const prompt = buildPrompt({ topic, userProfile, shortages, recent7Days, supplements });

    const r = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.5, maxOutputTokens: 800 }
        })
      }
    );

    const data = await r.json();
    if (data.error) return res.status(500).json({ error: data.error.message });

    const raw = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!raw) return res.status(500).json({ error: '답변을 받지 못했어요.' });

    const parsed = parseJsonLoose(raw);
    if (!parsed) {
      // 파싱 실패 시 raw text를 그대로 답변으로
      return res.status(200).json({ answer: raw, actions: [], topic });
    }
    return res.status(200).json({ ...parsed, topic });
  } catch (err) {
    console.error('[nutrient-chat]', err);
    return res.status(500).json({ error: err.message || '서버 오류' });
  }
};

function buildPrompt({ topic, userProfile, shortages, recent7Days, supplements }) {
  const p = userProfile || {};
  const profileLine = [
    p.gender === 'male' ? '남성' : p.gender === 'female' ? '여성' : '',
    p.birthYear ? `${new Date().getFullYear() - parseInt(p.birthYear) + 1}세` : '',
    p.height ? `${p.height}cm` : '',
    p.weight ? `${p.weight}kg` : '',
    p.lifestyle ? `활동:${p.lifestyle}` : ''
  ].filter(Boolean).join(' · ') || '정보 없음';

  const shortagesLine = (shortages || []).map(s => `${s.label}(${s.pct}%)`).join(' · ') || '없음';
  const recentLine = (recent7Days || []).slice(-7).map((d, i) => {
    if (!d || !d.foods || d.foods.length === 0) return `D-${6-i}: 기록 없음`;
    return `D-${6-i}: ${d.foods.slice(0,4).join(', ')}${d.foods.length > 4 ? '...' : ''}`;
  }).join(' | ');
  const suppsLine = (supplements || []).map(s => `${s.name}${s.dosage ? '('+s.dosage+')' : ''}`).join(' · ') || '없음';

  const common = `너는 건강어때의 AI 영양 코치다. 한국어 JSON 하나로만 응답한다. 마크다운 X.

【건강어때 3원칙 · 반드시】
① 영양제·처방식 언급을 자제. 먼저 음식으로 채우는 법을 제안.
② 숫자 나열 X · 실행 언어로 (예: "오늘 저녁에 두부 반 모")
③ 이번 한 끼 평가 X · 습관 관점

【절대 금지】
- 진단·처방 뉘앙스 (반드시·필수·의사·약)
- 라벨 없는 효능·질병 예방 문구
- 영양제 브랜드명 언급
- 과장·불안 조성

【사용자 정보】
- 프로필: ${profileLine}
- 부족 영양소 TOP: ${shortagesLine}
- 최근 7일 식단: ${recentLine || '기록 없음'}
- 복용 중인 영양제: ${suppsLine}

【답변 톤】
- 존댓말 · 부드럽고 담백하게
- 문장 짧게 (한 문장 25자 이내)
- 이모지 자제`;

  if (topic === 'why_low') {
    return common + `

【이번 질문】: "왜 이 영양소들이 부족했을까요?"

【출력 JSON】
{
  "answer": "부족 영양소가 왜 발생했는지 최근 7일 식단 근거로 2~3문장 요약 (예: '최근 7일 중 5일이 밥·면 위주였고 채소·유제품 반찬이 거의 없었어요.')",
  "reasons": [
    { "point": "핵심 원인 1", "detail": "구체 근거 1문장" },
    { "point": "핵심 원인 2", "detail": "구체 근거 1문장" }
  ],
  "actions": [
    { "title": "다음 행동 1", "how": "언제·어디서·뭘 실행 (예: '내일 아침 요거트 or 우유 한 잔')" },
    { "title": "다음 행동 2", "how": "실행 가능한 1문장" }
  ]
}`;
  }

  if (topic === 'convenience') {
    return common + `

【이번 질문】: "편의점에서 부족한 영양소를 어떻게 채울까요?"

【출력 JSON】
{
  "answer": "편의점에서 지금 부족 영양소를 채울 수 있는 방법 2~3문장 요약",
  "combos": [
    { "title": "부족 영양소명 채우기", "items": ["편의점 상품 1", "편의점 상품 2"], "why": "이유 1문장" },
    { "title": "다른 부족 영양소 채우기", "items": ["상품 1", "상품 2"], "why": "이유" },
    { "title": "가벼운 한 끼 조합", "items": ["샌드위치+삶은계란+우유"], "why": "이유" }
  ],
  "actions": [
    { "title": "지금 편의점 갈 때", "how": "'삶은계란 2개 + 저지방 우유 200ml' 같은 즉시 실행 조합 1개" }
  ]
}

【제약】
- 한국 편의점(GS25·CU·세븐일레븐) 실제 판매 상품만.
- 아보카도·연어 스테이크·홈메이드 샐러드 X. 편의점에서 실제 살 수 있는 것만.`;
  }

  if (topic === 'supplement_check') {
    return common + `

【이번 질문】: "지금 복용중인 영양제가 내 상태에 맞나요?"

【출력 JSON】
{
  "answer": "현재 영양제 리스트와 부족 영양소를 비교한 종합 코멘트 2~3문장. 영양제로 이미 커버되는 부분 / 음식으로 더 채워야 할 부분 언급.",
  "reviews": [
    { "supplement": "영양제 이름", "status": "겹침|보완|불필요", "note": "1문장 이유" }
  ],
  "gaps": [
    { "nutrient": "부족한데 영양제로도 안 커버되는 영양소", "food_first": "음식으로 채우는 법 1문장" }
  ],
  "actions": [
    { "title": "이번 주 조정", "how": "실행 가능한 1문장 (예: '저녁에 우유 한 잔 추가하기')" }
  ]
}

【제약】
- 영양제 중단/시작을 명령형으로 말하지 말고 "고려해볼 수 있어요" 톤.
- 의약품·질병 관련 문구 금지.
- 복용 중 영양제가 없으면 reviews를 빈 배열로 두고 answer에서 "아직 복용중인 영양제가 없다면 음식으로 우선 채우는 것을 추천한다"고 안내.`;
  }

  return common + `\n\n【이번 질문】: 알 수 없는 topic. {"error":"지원하지 않는 topic입니다."} 로 응답.`;
}

function parseJsonLoose(raw) {
  try {
    const cleaned = String(raw || '').replace(/```json\s*/gi, '').replace(/```\s*$/g, '').trim();
    const m = cleaned.match(/\{[\s\S]*\}/);
    if (!m) return null;
    return JSON.parse(m[0]);
  } catch(e) { return null; }
}

module.exports.config = { maxDuration: 30 };
