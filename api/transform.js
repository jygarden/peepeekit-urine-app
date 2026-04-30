// ════════════════════════════════════════════════════════════
//  /api/transform.js  — Vercel Serverless Function
//  반려동물 → 사람 의인화 (웹툰풍 / 3D K-드라마풍)
//
//  요청 본문(JSON):
//    {
//      imageBase64: "<base64>",
//      mimeType:    "image/jpeg" 또는 "image/png" 등,
//      style:       "webtoon" | "kdrama"   (기본: webtoon)
//      petInfo: {
//        species:  "강아지" | "고양이" | "토끼" | ...,
//        breed:    "포메라니안",
//        mbti:     "ENTP",        // 4글자 (없으면 빈 문자열)
//        gender:   "남아" | "여아" | "중성화",
//        age:      "3살",
//        name:     "콩이"
//      }
//    }
//
//  응답: { imageBase64, mimeType }
//  환경변수: GEMINI_API_KEY (Vercel Dashboard에서 설정)
// ════════════════════════════════════════════════════════════

const MBTI_VIBE = {
  ENFJ: '따뜻하고 카리스마 있는, 사람들을 잘 챙기고 분위기를 부드럽게 만드는',
  ENFP: '활발하고 호기심 많은, 에너지가 넘치고 친화력이 좋은',
  ENTJ: '리더십 있고 자신감 넘치는, 결단력 있고 추진력 강한',
  ENTP: '재치 있고 장난기 많은, 호기심 가득하고 아이디어가 번뜩이는',
  ESFJ: '친절하고 사교적인, 정 많고 주변을 살뜰히 챙기는',
  ESFP: '밝고 흥 많은, 분위기 메이커 역할을 자처하는',
  ESTJ: '책임감 강하고 단정한, 신뢰감 주는 든든한',
  ESTP: '활동적이고 모험심 강한, 자유분방하고 즉흥적인',
  INFJ: '신비롭고 사려 깊은, 차분하고 통찰력 있는',
  INFP: '감성적이고 부드러운, 몽상가 같고 따뜻한',
  INTJ: '지적이고 시크한, 자기 주관이 뚜렷한 차가운 미인/미남상',
  INTP: '논리적이고 호기심 많은, 차분한 관찰자 분위기의',
  ISFJ: '온화하고 다정한, 조용히 챙기는 따뜻한',
  ISFP: '예술적이고 감성적인, 자유롭고 부드러운 분위기의',
  ISTJ: '성실하고 단정한, 믿음직하고 깔끔한',
  ISTP: '쿨하고 실용적인, 과묵하지만 매력적인 멋쟁이',
};

function buildPrompt(petInfo, style) {
  const { species = '강아지', breed = '믹스', mbti = '', gender = '', age = '', name = '' } = petInfo || {};

  const speciesKR =
    /고양이|cat/i.test(species) ? '고양이' :
    /토끼/.test(species)        ? '토끼' :
    /햄스터/.test(species)      ? '햄스터' :
                                  '강아지';

  const genderKR = gender === '남아' || gender === '수컷' ? '남성'
                 : gender === '여아' || gender === '암컷' ? '여성'
                 : '인물';

  const vibe = MBTI_VIBE[mbti] || '매력적이고 개성 있는';

  const styleBlock = style === 'kdrama'
    ? `[그림 스타일]
- 한국 드라마 주인공 / AI 프로필 사진 풍 3D 사실 렌더링
- 살짝 미화된 톤, 자연광 + 영화적 라이팅
- 깨끗하고 단정한 배경 (단색 그라데이션 또는 흐릿한 카페/거리)
- 상반신 정면 또는 약간 사선 구도, 어깨 위로 잘림
- 사실적이지만 너무 사실적이라 언캐니해 보이지 않을 만큼만`
    : `[그림 스타일]
- 한국 네이버웹툰 그림체 (예: 유미의 세포들, 여신강림, 외모지상주의 같은 결)
- 깔끔한 라인아트, 또렷한 큰 눈, 부드러운 셀 셰이딩
- 파스텔톤 배경 + 살짝 화사한 색감
- 상반신 정면 또는 약간 사선, 어깨 위로 잘림
- 캐릭터 디자인이 한눈에 보이는 만화/일러스트 톤`;

  return `이 반려동물 사진을 사람으로 의인화해주세요.

[원본 정보]
- 종류: ${speciesKR}
- 품종: ${breed}
- MBTI: ${mbti || '미상'} → ${vibe} 성격
- 성별: ${genderKR}
- 나이: ${age || '미상'}
${name ? `- 이름: ${name}` : ''}

[변환 핵심 규칙]
1. 외형 매핑: 품종의 특징을 사람의 외형으로 자연스럽게 변환
   • 털 색 → 머리 색
   • 체구(소형/중형/대형) → 체형/키 분위기
   • 얼굴 인상(귀 모양·주둥이·눈매) → 사람 얼굴의 인상
2. 성격 표현: 위 MBTI vibe를 표정·자세·옷차림에 자연스럽게 녹이기
3. 정체성 보존: 원본 동물의 분위기(품종·털색·표정)가 사람 모습에서도 한눈에 느껴져야 함
4. 연령대: 20대 중반~30대 초반의 ${genderKR}로 표현 (강아지가 어리든 노견이든 무관하게 매력 어필 연령대로)

${styleBlock}

[금기]
- 동물의 모습이 남아있으면 안 됨 (귀/털/주둥이 등 동물 요소 X) — 완전한 사람으로
- 너무 사실적인 사진처럼 그리지 말 것 (언캐니 밸리 방지)
- 여러 명 그리지 말 것 — 한 명만

이미지 단 1장만 생성해서 응답해주세요.`;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'POST만 지원합니다' });
  }

  try {
    const { imageBase64, mimeType, style = 'webtoon', petInfo = {} } = req.body || {};
    if (!imageBase64 || !mimeType) {
      return res.status(400).json({ error: 'imageBase64, mimeType 누락' });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'GEMINI_API_KEY 미설정' });
    }

    // 현재 사용 가능한 이미지 in/out 모델 (Nano Banana)
    const MODEL = 'gemini-2.5-flash-image-preview';
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${apiKey}`;

    const prompt = buildPrompt(petInfo, style);

    const body = {
      contents: [{
        parts: [
          { text: prompt },
          { inline_data: { mime_type: mimeType, data: imageBase64 } }
        ]
      }],
      generationConfig: {
        responseModalities: ['IMAGE'],
        temperature: 0.95
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
      return res.status(502).json({ error: `Gemini API 오류: ${errText.slice(0, 300)}` });
    }

    const data = await r.json();
    const parts = data?.candidates?.[0]?.content?.parts || [];
    const imgPart = parts.find(p => p.inline_data || p.inlineData);

    if (!imgPart) {
      // 안전 필터로 차단됐을 가능성 — promptFeedback 확인
      const block = data?.promptFeedback?.blockReason;
      const msg = block
        ? `안전 필터에 걸렸어요(${block}). 다른 사진으로 시도해주세요.`
        : '응답에 이미지가 없습니다. 잠시 후 다시 시도해주세요.';
      return res.status(502).json({ error: msg });
    }

    const inline = imgPart.inline_data || imgPart.inlineData;
    return res.status(200).json({
      imageBase64: inline.data,
      mimeType: inline.mime_type || inline.mimeType || 'image/png',
      style
    });

  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: e.message || '서버 오류' });
  }
}
