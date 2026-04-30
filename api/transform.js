// ════════════════════════════════════════════════════════════
// /api/transform.js  — Vercel Serverless Function
// 픽사 스타일 변환 (Gemini 2.5 Flash Image / "Nano Banana")
// ════════════════════════════════════════════════════════════
//
// 기존: gemini-2.0-flash-exp  → ❌ deprecated, v1beta에서 제거됨
// 수정: gemini-2.5-flash-image-preview  → ✅ 현재 이미지 in/out 가능 모델
//
// 환경변수 GEMINI_API_KEY 가 Vercel 프로젝트에 설정되어 있어야 합니다.
// (Vercel Dashboard → Settings → Environment Variables)

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'POST만 지원합니다' });
  }

  try {
    const { imageBase64, mimeType } = req.body || {};
    if (!imageBase64 || !mimeType) {
      return res.status(400).json({ error: 'imageBase64, mimeType 누락' });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'GEMINI_API_KEY 미설정' });
    }

    // ★ 변경 포인트 ① — 현재 사용 가능한 이미지 생성 모델로 교체
    const MODEL = 'gemini-2.5-flash-image-preview';
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${apiKey}`;

    const prompt = `이 반려동물 사진을 픽사(Pixar) 애니메이션 스타일로 변환해주세요.
- 따뜻하고 부드러운 라이팅
- 큰 눈, 풍부한 표정
- 3D 렌더링 느낌의 매끄러운 털 텍스처
- 파스텔톤 배경, 동화 같은 분위기
- 동물의 원래 종/품종/색상은 유지
이미지 하나만 생성해서 응답해주세요.`;

    const body = {
      contents: [{
        parts: [
          { text: prompt },
          { inline_data: { mime_type: mimeType, data: imageBase64 } }
        ]
      }],
      // ★ 변경 포인트 ② — 이미지 모달리티를 명시적으로 요청
      generationConfig: {
        responseModalities: ['IMAGE']   // 또는 ['IMAGE','TEXT']
      }
    };

    const r = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    if (!r.ok) {
      const errText = await r.text();
      console.error('Gemini API error:', errText);
      return res.status(502).json({ error: `Gemini API 오류: ${errText}` });
    }

    const data = await r.json();

    // 응답에서 이미지 part 추출
    const parts = data?.candidates?.[0]?.content?.parts || [];
    const imgPart = parts.find(p => p.inline_data || p.inlineData);
    if (!imgPart) {
      return res.status(502).json({ error: '응답에 이미지가 없습니다. 다시 시도해주세요.' });
    }

    // 키 이름이 inline_data 또는 inlineData 둘 다 올 수 있음
    const inline = imgPart.inline_data || imgPart.inlineData;
    return res.status(200).json({
      imageBase64: inline.data,
      mimeType: inline.mime_type || inline.mimeType || 'image/png'
    });

  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: e.message || '서버 오류' });
  }
}
