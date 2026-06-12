// Vercel Serverless Function — AI 영양사·약사 채팅
// 위치: /api/chat-nutritionist.js
//
// 검사 결과 기반 맞춤 답변. Gemini 2.5 Flash 사용.

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST만 허용됩니다.' });

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return res.status(500).json({ error: '서버 설정 오류' });

  try {
    const { message, context } = req.body;
    if (!message) return res.status(400).json({ error: '메시지가 비어있어요.' });

    const systemPrompt = buildChatSystemPrompt(context);
    const history = (context?.history || []).slice(-6);

    const contents = [{
      role: 'user',
      parts: [{ text: systemPrompt + '\n\n사용자: ' + message }]
    }];

    // 이전 대화 추가
    history.forEach(h => {
      if (h.role === 'user') {
        contents.push({ role: 'user', parts: [{ text: h.text }] });
      } else {
        contents.push({ role: 'model', parts: [{ text: h.text }] });
      }
    });

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents,
          generationConfig: { temperature: 0.7, maxOutputTokens: 800 }
        })
      }
    );

    if (!response.ok) {
      const errText = await response.text();
      return res.status(response.status).json({ error: 'AI 응답 오류: ' + errText.slice(0, 100) });
    }

    const data = await response.json();
    const reply = data.candidates?.[0]?.content?.parts?.[0]?.text || '죄송해요, 답변을 만들지 못했어요.';

    return res.status(200).json({ reply });
  } catch (err) {
    return res.status(500).json({ error: err.message || '서버 오류' });
  }
};

function buildChatSystemPrompt(context) {
  const isHuman = context?.subject === 'human';
  const persona = isHuman
    ? '당신은 20년 경력의 임상 영양사이자 약사입니다.'
    : '당신은 20년 경력의 수의사이자 반려동물 영양 전문가입니다.';

  let resultContext = '';
  if (context?.result) {
    const r = context.result;
    const score = calcScore(r.testItems);
    const items = (r.testItems || []).slice(0, 8).map(i => `- ${i.name}: ${i.value} (${i.status})`).join('\n');
    resultContext = `\n=== 사용자의 최근 소변검사 결과 ===
종합 점수: ${score}/100
종합 평가: ${r.summary || ''}
주의 영역: ${(r.focusAreas || []).join(', ') || '특이사항 없음'}
검사 수치:
${items}
긴급도: ${r.urgency || 'normal'}

이 결과를 기반으로 답변하세요.`;
  }

  return `🇰🇷 모든 답변을 **한국어**로, 친근하고 따뜻한 톤으로 작성하세요. 답변은 3~6문장으로 간결하게.

${persona}
사용자 이름: ${context?.userName || '고객님'}
${resultContext}

=== 답변 규칙 ===
1. 검사 결과가 있으면 항상 그 데이터를 반영해 답변
2. 일반론 X, 사용자 맞춤 답변 ✅
3. 의학적 진단 단정 금지, "가능성", "권장합니다" 어조
4. 우려되는 수치는 "병원 상담 권장"으로 마무리
5. 음식 추천 시 한국 음식 위주
6. 영양제 추천 시 국내 구매 가능 제품으로
7. 친구처럼 친근하게, 그러나 전문가답게
8. 너무 길지 않게, 핵심만 명확하게
9. 이모티콘 적절히 활용 (1~3개 정도)
10. 답변 마지막에 "더 궁금한 거 있으면 물어보세요!" 같은 자연스러운 마무리

이제 사용자 질문에 답변하세요.`;
}

function calcScore(items) {
  if (!items || items.length === 0) return 0;
  const scores = { normal: 100, warning: 60, danger: 20 };
  const total = items.reduce((sum, item) => sum + (scores[item.status] || 60), 0);
  return Math.round(total / items.length);
}
