// Vercel Serverless Function — 닥터 냐옹 · AI 수의영양사 챗봇
// 위치: /api/vet-chat.js

const { rateLimitMiddleware } = require('./_rateLimit');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST만 허용됩니다.' });

  if (!rateLimitMiddleware(req, res, { name: 'vet-chat', limit: 40, window: 60000 })) return;

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return res.status(500).json({ error: '서버 설정 오류' });

  try {
    const { history = [], petContext = null } = req.body || {};
    if (!Array.isArray(history) || history.length === 0) {
      return res.status(400).json({ error: '메시지가 비어있어요.' });
    }

    const systemPrompt = buildVetSystemPrompt(petContext);
    const geminiMessages = history.slice(-8).map(m => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: String(m.text || '').slice(0, 500) }]
    }));

    const body = {
      systemInstruction: { parts: [{ text: systemPrompt }] },
      contents: geminiMessages,
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 500,
        topP: 0.9
      }
    };

    const model = 'gemini-2.5-flash';
    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
      { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }
    );

    if (!geminiRes.ok) {
      const errText = await geminiRes.text();
      return res.status(500).json({ error: 'AI 응답 실패', debug: errText.slice(0, 200) });
    }
    const data = await geminiRes.json();
    const reply = data?.candidates?.[0]?.content?.parts?.map(p => p.text).filter(Boolean).join('\n');
    if (!reply) return res.status(500).json({ error: '답변이 비어있어요. 다시 물어봐주세요.' });

    return res.status(200).json({ reply });
  } catch (err) {
    return res.status(500).json({ error: '서버 오류: ' + (err.message || '알 수 없음') });
  }
};

function buildVetSystemPrompt(pet) {
  const petLine = pet ? `
[반려동물 정보]
- 이름: ${pet.name}
- 종: ${pet.species}${pet.breed ? ' · ' + pet.breed : ''}
- 나이: ${pet.age || '미상'} ${pet.gender ? '· ' + pet.gender : ''}
- 알레르기: ${pet.allergies}
- 현재 급여 중: ${pet.feeding}
- 최근 소변검사: ${pet.latestUrine}` : '[반려동물 정보 없음 · 일반적인 조언 위주로]';

  return `당신은 "닥터 냐옹"이라는 이름의 AI 수의영양사입니다. 건강어때 앱의 반려동물 상담 챗봇 역할입니다.

[페르소나]
- 따뜻하고 친근한 톤 (친구 같은 전문가). 존댓말 사용.
- 반려동물을 이름으로 부름 (예: "뚜뚜님이 요즘...")
- 이모지는 자연스럽게 1~2개만 사용 (👩‍⚕️ 🐾 💚 🥺 등). 과하게 사용 X.
- 답변은 짧고 명확하게 (3~5문장 · 최대 6문장 이내).
- 어려운 의학용어 최소화 · 쉽게 풀어 설명.

[전문 영역]
- 반려동물 영양학 (AAFCO · FEDIAF 기준)
- 사료·간식·영양제 성분 상담
- 견종·묘종별 유전적 특성 반영 조언
- 급여량·빈도 가이드
- 알레르기·독성 성분 경고

[규칙]
1. 절대 진단 · 처방 X (수의사만 가능). 이상 증상은 반드시 "동물병원 상담"으로 안내.
2. 확실하지 않으면 겸손하게 "이 부분은 수의사 진료 권해드려요"
3. 사용자 감정에 공감 우선 (불안·걱정 시 위로 먼저)
4. 답변 마지막에 다음 액션 힌트 1개 (예: "혹시 이 사료 궁금하시면 성분표 스캔해보세요")
5. 사람 건강 상담은 정중히 거절 ("저는 반려동물 전문이에요")
6. 반려동물 정보가 있으면 반드시 그 정보를 활용해 개인화

${petLine}

[예시 톤]
User: "우리 뚜뚜가 사료 잘 안 먹어요"
You: "뚜뚜님이 갑자기 잘 안 먹으면 걱정 많이 되시겠어요 🥺 며칠째 이런 상태인가요? 하루 이상 안 먹으면 컨디션 저하 신호일 수 있어서 병원 상담 권해드려요. 혹시 새 사료로 바꾸신 지 얼마 안 됐다면 전환 과정에서 흔한 반응일 수도 있어요."

지금부터 사용자와 대화하세요.`;
}

module.exports.config = { maxDuration: 30 };
