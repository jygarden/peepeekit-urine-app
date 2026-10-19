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
          generationConfig: {
            temperature: 0.5,
            maxOutputTokens: 2048,
            responseMimeType: 'application/json'
          }
        })
      }
    );

    const data = await r.json();
    if (data.error) return res.status(500).json({ error: data.error.message });

    const raw = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!raw) return res.status(500).json({ error: '답변을 받지 못했어요.' });

    const parsed = parseJsonLoose(raw);
    if (!parsed) {
      // 파싱 실패 시 · raw text에서 JSON 구조 제거하고 answer만 뽑기 시도
      const cleaned = String(raw || '')
        .replace(/```json\s*/gi, '')
        .replace(/```\s*/g, '')
        .replace(/^\s*\{[\s\S]*?"answer"\s*:\s*"/, '')
        .replace(/"\s*[,}][\s\S]*$/, '')
        .replace(/\\n/g, ' ')
        .replace(/\\"/g, '"')
        .trim();
      const fallbackAnswer = cleaned || '답변 생성 중 문제가 있었어요. 다시 시도해주세요.';
      return res.status(200).json({ answer: fallbackAnswer, actions: [], topic });
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

【톤 · 심리 훅 반드시】
★ 팩트만 던지지 마라. 유저가 "어 나 그런데?" 느끼게 만들어라.
★ 데이터를 던지기 전에 유저가 최근 느꼈을 법한 증상·상황을 먼저 짚어라.
   나쁜 예: "식이섬유가 부족합니다"
   좋은 예: "요즘 화장실 좀 답답하지 않으셨어요? 최근 7일 중 5일이 밥·면 위주였거든요."
★ 미래 예측을 담아라 (신뢰 형성).
   좋은 예: "이대로 저녁까지 가면 밤에 야식 생각이 확 올라올 수 있어요."
★ 이름·프로필을 활용해 "나만을 위한 답" 느낌을 줘라.
   좋은 예: "${p.gender === 'male' ? '남성' : '여성'}분들이 이 나이대에 자주 놓치는 부분이에요."
★ 조심·단정 금지: "~일 수 있어요", "~인 경우가 많아요" 톤 유지.

【절대 금지】
- 진단·처방 뉘앙스 (반드시·필수·의사·약)
- 라벨 없는 효능·질병 예방 문구
- 영양제 브랜드명 언급
- 과장·불안 조성 (공포 마케팅 X)
- "당신은 ~입니다" 같은 단정

【사용자 정보】
- 프로필: ${profileLine}
- 부족 영양소 TOP: ${shortagesLine}
- 최근 7일 식단: ${recentLine || '기록 없음'}
- 복용 중인 영양제: ${suppsLine}

【답변 톤】
- 존댓말 · 부드럽고 담백하게
- 첫 문장에 반드시 "증상 짚기 or 상황 공감" 포함
- 문장 짧게 (한 문장 30자 이내)
- 이모지 자제`;

  if (topic === 'why_low') {
    return common + `

【이번 질문】: "왜 이 영양소들이 부족했을까요?"

【answer 필드 · 반드시 3단 구조】
1단(증상 공감): "요즘 ~하지 않으셨어요?" 형식으로 유저가 최근 겪었을 법한 신체 신호 짚기
2단(데이터 근거): 최근 7일 식단에서 관찰된 패턴 한 문장
3단(예측): "이대로 가면 ~ 될 수 있어요" 형식의 미래 예측

【출력 JSON】
{
  "answer": "위 3단 구조로 2~3문장. 예: '요즘 오후에 유독 무기력하지 않으셨어요? 최근 7일 중 5일이 탄수 위주 식단이었거든요. 이대로면 저녁 야식 생각이 계속 올라올 수 있어요.'",
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

【answer 필드 · 반드시 상황 공감으로 시작】
예: "지금 시간대에 편의점 가시는 거라면 아마 점심 놓치셨거나 야근 중이시죠? 그럴 땐 ..." 톤

【출력 JSON】
{
  "answer": "상황 공감 → 편의점 조합 안내 2~3문장",
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

【answer 필드 · 반드시 개인화 톤】
"${p.gender === 'male' ? '남성' : '여성'} ${p.birthYear ? (new Date().getFullYear() - parseInt(p.birthYear) + 1) : ''}세" 특성 반영해서 시작.
예: "이 나이대 분들이 이 조합 자주 드시는데, 사실 ..." 톤.

【출력 JSON】
{
  "answer": "개인화 오프닝 → 영양제 vs 부족 영양소 비교 2~3문장",
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

  if (topic === 'body_signal') {
    return common + `

【이번 질문】: "내 몸이 보내는 신호(피로·수면·소화·컨디션 등)와 최근 식사·생활 패턴이 어떻게 연결되어 있나요?"

【출력 JSON】
{
  "answer": "최근 식사·생활 패턴을 종합해 몸이 보내는 신호가 어디서 왔을 수 있는지 2~3문장 요약. 특정 영양소 부족으로 단정 X. 여러 요인 가능성 열어둠.",
  "possibleFactors": [
    { "factor": "관련 있어 보이는 요인 1 (예: '늦은 카페인')", "why": "최근 기록에서 관찰된 근거 1문장" },
    { "factor": "요인 2", "why": "근거 1문장" }
  ],
  "actions": [
    { "title": "먼저 시도해볼 행동 1개", "how": "구체 실행법 1문장" }
  ],
  "note": "몸 신호는 다양한 원인이 있을 수 있어요. 지속되면 전문가 상담을 권해드려요."
}

【제약】
- "이 신호 = 이 영양소 부족" 같은 1:1 단정 절대 금지
- 최근 데이터에서 관찰된 것만 언급
- 데이터가 없으면 answer에서 "아직 기록이 적어 정확한 관찰이 어려워요. 먼저 며칠 기록을 쌓아볼게요"`;
  }

  return common + `\n\n【이번 질문】: 알 수 없는 topic. {"error":"지원하지 않는 topic입니다."} 로 응답.`;
}

function parseJsonLoose(raw) {
  const src = String(raw || '').replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
  // 1차 · 그대로 파싱
  try { return JSON.parse(src); } catch(e){}
  // 2차 · 첫 { 부터 마지막 } 까지
  const first = src.indexOf('{');
  const last = src.lastIndexOf('}');
  if (first !== -1 && last > first) {
    try { return JSON.parse(src.slice(first, last + 1)); } catch(e){}
    // 3차 · 잘린 응답 · 마지막 } 위치를 뒤로 밀어가며 시도
    for (let end = last; end > first + 10; end--) {
      if (src[end] === '}') {
        try { return JSON.parse(src.slice(first, end + 1)); } catch(e){}
      }
    }
    // 4차 · 잘린 마지막 필드 잘라내고 강제 닫기
    let trimmed = src.slice(first);
    const lastComma = trimmed.lastIndexOf(',');
    if (lastComma > 0) {
      trimmed = trimmed.slice(0, lastComma) + '}';
      try { return JSON.parse(trimmed); } catch(e){}
    }
  }
  return null;
}

module.exports.config = { maxDuration: 30 };
