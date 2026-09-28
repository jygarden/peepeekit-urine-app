// 🔮 오늘의 운세 API · Gemini 기반
// 사주 정보 + 오늘 날짜 → 개인화된 운세 + 행동 제안
//
// 캐시: 같은 날 같은 사주면 동일 결과 (temperature: 0.7 + 시드)
// 프론트에서 localStorage로 한 번 더 캐시 (API 절약)

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'GEMINI_API_KEY 미설정' });

  try {
    const { date, birthYear, birthMonth, birthDay, gender, dayOfWeek } = req.body || {};
    if (!date) return res.status(400).json({ error: 'date 필수 (YYYY-MM-DD)' });

    const birthInfo = birthYear
      ? `${birthYear}년 ${birthMonth || '?'}월 ${birthDay || '?'}일생${gender === 'female' ? ' 여성' : gender === 'male' ? ' 남성' : ''}`
      : '(생년월일 미입력 · 일반 운세)';

    const prompt = `너는 한국 전통 사주·명리 전문가이자 오늘의 운세 큐레이터다.

【대상】
- ${birthInfo}
- 오늘 날짜: ${date} (${dayOfWeek || ''})

【요구사항】
아래 스키마 그대로 JSON 하나만 반환. 마크다운·코드블록·설명 금지.
사주가 있으면 오행(木火土金水) 흐름과 12운성을 반영해 개인 맞춤.
사주가 없으면 오늘 날짜의 60갑자·요일 에너지 기반으로.

【톤 · 매우 중요】
- 친근하고 세련된 · 애매한 점술 X · 티저 스타일 함축
- "미뤄둔 시작, 오늘 해볼까?" 같은 말 걸기 어투
- 티켓 헤드라인은 ? 나 , 로 리듬감
- 부정적 표현 지양 · 조심할 것도 부드럽게 · 존댓말

【각 탭 headline 예시】
- 총운: "미뤄둔 시작, 오늘 해볼까?"
- 연애: "말하지 않으면 몰라요"
- 돈: "충동은 잠시 미뤄두기"
- 일: "완벽보다 완료가 먼저"
- 관계: "먼저 안부 한 번 물어봐요"
- 건강: "몸의 작은 신호에 귀 기울여요"

【JSON 스키마 · 정확히 이대로】
{
  "level": "大吉|吉|中吉|小吉|平",
  "levelLabel": "기운 좋은 하루 등 · 8자 이내",
  "summary": "오늘 흐름 요약 · 40자 이내",
  "ticket": {
    "headline": "티켓 대문 · 20자 이내 · 물음표/쉼표 리듬 · 예: 미뤄둔 시작, 오늘 해볼까?",
    "sub": "티켓 서브 · 30자 이내 · 작은 시도가 반가운 변화를 만드는 날.",
    "emoji": "티켓 오른쪽 큰 이모지 1개 · 🍀 🌱 ☀️ 🌸 🎯 ✨ 중 하나",
    "keywords": ["키워드1", "키워드2", "키워드3"]
  },
  "luck": {
    "total":    { "stars": 1-5, "headline": "총운 헤드라인 · 20자 이내 (예: 완벽한 준비는 잠깐 미뤄도 돼요)", "body": "총운 본문 · 3줄 · 각 줄 25자 이내 · \\n 로 구분 · 존댓말 · 실용적 조언" },
    "love":     { "stars": 1-5, "headline": "연애 헤드라인 · 20자 이내", "body": "연애 본문 · 3줄 · \\n 구분" },
    "money":    { "stars": 1-5, "headline": "돈 헤드라인 · 20자 이내",   "body": "돈 본문 · 3줄" },
    "career":   { "stars": 1-5, "headline": "일 헤드라인 · 20자 이내",   "body": "일 본문 · 3줄" },
    "relation": { "stars": 1-5, "headline": "관계 헤드라인 · 20자 이내", "body": "관계 본문 · 3줄" },
    "health":   { "stars": 1-5, "headline": "건강 헤드라인 · 20자 이내", "body": "건강 본문 · 3줄" }
  },
  "lucky": {
    "color":     { "name": "빨강|주황|노랑|초록|파랑|보라|분홍|검정|흰색 중 하나", "hex": "#22C55E", "why": "왜 이 컬러 · 10자 이내" },
    "number":    { "value": 1, "why": "10자 이내" },
    "direction": { "value": "동쪽|서쪽|남쪽|북쪽|동남|서북|남동|북서 중 하나", "why": "10자 이내" },
    "item":      { "emoji": "☕", "name": "커피|열쇠|책 등 짧은 이름", "why": "10자 이내" }
  },
  "time": {
    "good": { "range": "오전 9-11시", "desc": "이 시간 뭐하면 좋은지 · 15자 이내" },
    "bad":  { "range": "오후 3-5시", "desc": "왜 조심 · 15자 이내" }
  },
  "compat": {
    "good":  [{ "zodiac": "토끼", "emoji": "🐰" }, { "zodiac": "개", "emoji": "🐕" }],
    "avoid": [{ "zodiac": "말", "emoji": "🐎" }, { "zodiac": "닭", "emoji": "🐔" }]
  },
  "food": {
    "recommend": "오늘 잘 맞는 음식 3가지 (쉼표 구분)",
    "avoid":     "조금만 즐길 것 · 30자 이내"
  },
  "quote": "오늘의 한 마디 · 50자 이내 · 따뜻하고 힘 되는 문장"
}

반드시 위 스키마 그대로. 필드 누락 X. JSON 하나만. 모든 body는 존댓말.`;

    const r = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.85, maxOutputTokens: 2048 }
        })
      }
    );
    const data = await r.json();
    if (data.error) return res.status(500).json({ error: data.error.message });

    let raw = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    // 마크다운 코드블록 제거
    raw = raw.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '').trim();
    // 첫 { 부터 마지막 } 까지만
    const first = raw.indexOf('{');
    const last = raw.lastIndexOf('}');
    if (first >= 0 && last > first) raw = raw.slice(first, last + 1);

    let parsed;
    try { parsed = JSON.parse(raw); }
    catch (e) {
      console.error('[fortune-daily] JSON 파싱 실패:', raw.slice(0, 500));
      return res.status(500).json({ error: '운세 파싱 실패', raw: raw.slice(0, 300) });
    }

    return res.status(200).json({ date, ...parsed });
  } catch (err) {
    console.error('[fortune-daily]', err);
    return res.status(500).json({ error: err.message || '운세 생성 실패' });
  }
};
