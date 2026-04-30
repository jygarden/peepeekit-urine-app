// api/transform.js — Vercel 서버리스 함수
// 반려동물 사진 → 픽사 스타일 AI 변환

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { imageBase64, mimeType } = req.body;
  if (!imageBase64) return res.status(400).json({ error: '이미지 데이터가 없어요' });

  const API_KEY = process.env.GEMINI_API_KEY;
  if (!API_KEY) return res.status(500).json({ error: 'API 키가 설정되지 않았어요' });

  const prompt = `이 반려동물 사진을 귀여운 픽사(Pixar)/디즈니 스타일의 3D 애니메이션 캐릭터로 변환해줘.
규칙:
- 원본 동물의 종류(강아지/고양이 등)와 털 색상을 유지할 것
- 크고 반짝이는 눈, 작고 오동통한 몸, 부드럽고 풍성한 털 표현
- 픽사 영화 속 동물 캐릭터처럼 귀엽고 사랑스러운 표정
- 배경은 밝고 따뜻한 파스텔 그라디언트 (연보라/연핑크/하늘색)
- 고화질, 선명하고 깔끔한 스타일
반드시 이미지만 출력할 것.`;

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [
              { text: prompt },
              { inline_data: { mime_type: mimeType || 'image/jpeg', data: imageBase64 } }
            ]
          }],
          generationConfig: {
            responseModalities: ['IMAGE', 'TEXT'],
            temperature: 1,
          }
        })
      }
    );

    if (!response.ok) {
      const err = await response.json();
      return res.status(500).json({ error: 'Gemini API 오류: ' + (err?.error?.message || response.status) });
    }

    const data = await response.json();
    const imagePart = data?.candidates?.[0]?.content?.parts?.find(p => p.inlineData);

    if (!imagePart) {
      return res.status(500).json({ error: '이미지 생성 실패. 다시 시도해주세요.' });
    }

    res.status(200).json({
      imageBase64: imagePart.inlineData.data,
      mimeType: imagePart.inlineData.mimeType || 'image/png'
    });

  } catch (e) {
    res.status(500).json({ error: '서버 오류: ' + e.message });
  }
}
