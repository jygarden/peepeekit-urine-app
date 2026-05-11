// api/transform.js
// Vercel Serverless Function — 반려동물 캐릭터화 (Disney 3D / Ghibli 일러스트)
// 핵심 원칙: 펫의 정체성(종·털색·귀모양·눈색)은 그대로 두고
//          MBTI 성격이 포즈·배경·소품으로 표현되도록 한다.

const MODEL = 'gemini-2.5-flash-image';
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;

// ─────────────────────────────────────────────
// MBTI별 시각적 단서 (포즈 / 배경 / 소품 / 무드)
// ─────────────────────────────────────────────
const VISUAL_CUES = {
  ENFJ: { pose: 'attentive sitting pose with warm focused gaze, head tilted slightly toward viewer', bg: 'soft sunset park with gentle bokeh, golden hour light', props: 'a small ribbon or scarf around the neck', mood: 'warm and caring' },
  ENFP: { pose: 'mid-air playful jump or excited running pose with tongue out / ears flying', bg: 'colorful confetti or bright outdoor adventure scene with balloons', props: 'a tiny party hat or floating balloons nearby', mood: 'bursting with joyful energy' },
  ENTJ: { pose: 'proud standing pose, chest forward, looking confidently into distance', bg: 'majestic mountaintop sunset or cozy throne-like spot', props: 'a small crown, cape, or regal collar', mood: 'commanding and confident' },
  ENTP: { pose: 'curious head tilt with one paw lifted, eyes sparkling with interest', bg: 'cozy workshop or library with floating magical idea-sparks', props: 'tiny round glasses or a small open book', mood: 'mischievous and inventive' },
  ESFJ: { pose: 'snuggling pose with kind smile, leaning gently toward warmth', bg: 'warm cottage interior with soft cushions, teapot and steam', props: 'a knit scarf or holding a tiny tea cup', mood: 'cozy and nurturing' },
  ESFP: { pose: 'dancing pose mid-spin, joyful expression', bg: 'beach sunset party with string lights or disco backdrop', props: 'sunglasses or a tropical flower lei', mood: 'celebratory and radiant' },
  ESTJ: { pose: 'sitting upright at attention, very proper and dignified', bg: 'organized desk in a classic library setting', props: 'a small bow tie or tiny planner notebook', mood: 'reliable and disciplined' },
  ESTP: { pose: 'sprinting action shot, dynamic motion, looking ready for adventure', bg: 'motion-blur skate park or mountain trail with wind', props: 'tiny sunglasses or a small helmet', mood: 'thrill-seeking and bold' },
  INFJ: { pose: 'thoughtful gaze out a window, calm and contemplative', bg: 'rainy window with warm lamp glow, soft indoor light', props: 'an open book or a single lit candle nearby', mood: 'serene and introspective' },
  INFP: { pose: 'curled up dreaming with eyes softly closed, peaceful smile', bg: 'soft watercolor field of wildflowers at dawn', props: 'a delicate flower crown or floating petals', mood: 'dreamy and gentle' },
  INTJ: { pose: 'elegant seated pose with slight head turn, slight smirk', bg: 'minimalist dark study with one focused spotlight', props: 'wire-frame glasses or a chess piece beside', mood: 'sharp and refined' },
  INTP: { pose: 'observing intently with paws tucked, head down in focus', bg: 'cluttered cozy study with stacks of books and scrolls', props: 'a small magnifying glass or scroll', mood: 'curious and contemplative' },
  ISFJ: { pose: 'gently nuzzled into a soft blanket, content sleepy eyes', bg: 'warm sunlit kitchen or bakery with morning light', props: 'a knit blanket draped over or a small warm bun', mood: 'tender and protective' },
  ISFP: { pose: 'relaxed lounging with serene face, lying on side gracefully', bg: 'spring meadow or art studio with watercolor brushes', props: 'a paintbrush or wildflower in soft focus', mood: 'free-spirited and gentle' },
  ISTJ: { pose: 'attentive sitting pose, neat and proper, alert eyes', bg: 'tidy workspace with organized shelves and clean lines', props: 'a tiny pocket watch or planner', mood: 'steadfast and trustworthy' },
  ISTP: { pose: 'casual leaning pose with cool, slightly squinted stare', bg: 'mechanic garage or mountain lookout at dusk', props: 'a tiny wrench or compass beside', mood: 'cool and resourceful' },
};

// ─────────────────────────────────────────────
// 스타일 정의
// ─────────────────────────────────────────────
const STYLES = {
  disney: {
    label: 'Disney-Pixar 3D animated character',
    description: `Disney-Pixar 3D animation style:
- Smooth 3D rendered look with cinematic lighting (like Bolt, Dug from Up, or the cats in Luca)
- Slightly oversized expressive eyes with sparkle reflections
- Soft stylized facial features (NOT photorealistic)
- Warm, saturated, vibrant color palette
- Subtle ambient occlusion, soft rim lighting, polished surfaces
- Full body or 3/4 body shot, single character centered`,
  },
  ghibli: {
    label: 'Studio Ghibli hand-painted illustration',
    description: `Studio Ghibli illustration style:
- Soft watercolor / gouache hand-painted look
- Gentle, nostalgic color palette (muted earth tones, warm pastels)
- Slightly simplified rounded friendly shapes with hand-drawn outlines
- Visible paper texture and brush strokes
- Atmospheric soft natural lighting, dappled sunlight where appropriate
- Painted illustration aesthetic, calm and peaceful`,
  },
};

// ─────────────────────────────────────────────
// 프롬프트 빌더
// ─────────────────────────────────────────────
function buildPrompt(petInfo, style) {
  const styleDef = STYLES[style] || STYLES.disney;
  const cues = VISUAL_CUES[petInfo.mbti] || {};
  const species = petInfo.species || '강아지';
  const breed = petInfo.breed || 'mixed breed';

  return `Transform this photo of a ${breed} ${species} into a ${styleDef.label}.

═══ CRITICAL — PRESERVE PET IDENTITY ═══
The output MUST clearly be the SAME pet shown in the input photo, just stylized.
- Keep as a ${species} — DO NOT change to a human, person, or different animal species
- Exact same fur/coat color and markings as the original photo
- Same ear shape (floppy / pointed / cropped / fluffy)
- Same eye color
- Same body proportions and breed characteristics
- The owner must instantly recognize "this is MY pet!"

═══ STYLE ═══
${styleDef.description}

═══ PERSONALITY EXPRESSION ${petInfo.mbti ? `(MBTI: ${petInfo.mbti})` : ''} ═══
${petInfo.mbti && cues.pose ? `- Pose: ${cues.pose}
- Background: ${cues.bg}
- Props/Accessories: ${cues.props}
- Overall Mood: ${cues.mood}` : `- Pose: natural friendly pose
- Background: warm soft setting matching the pet's character
- Mood: heartwarming and recognizable`}

═══ OUTPUT REQUIREMENTS ═══
- Single character only (the pet)
- No text, no logos, no watermarks, no captions
- High quality, vibrant, share-worthy result
- Composition should fit well in a square or vertical format

Make this pet character feel like a beloved animated movie protagonist — recognizable, expressive, and instantly shareable.`;
}

// ─────────────────────────────────────────────
// Vercel Serverless Handler
// ─────────────────────────────────────────────
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { imageBase64, mimeType, style, petInfo } = req.body || {};

  if (!imageBase64 || !petInfo) {
    return res.status(400).json({ error: '사진이나 펫 정보가 누락되었어요.' });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error('GEMINI_API_KEY env var not set');
    return res.status(500).json({ error: '서버 설정 오류예요. 잠시 후 다시 시도해주세요.' });
  }

  const prompt = buildPrompt(petInfo, style);

  try {
    const response = await fetch(`${API_URL}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [
            { text: prompt },
            { inlineData: { mimeType: mimeType || 'image/jpeg', data: imageBase64 } }
          ]
        }],
        generationConfig: {
          responseModalities: ['IMAGE'],
          temperature: 0.85,
        }
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Gemini API error:', response.status, errorText);
      return res.status(500).json({ error: 'AI 변환에 실패했어요. 잠시 후 다시 시도해주세요.' });
    }

    const data = await response.json();
    const candidate = data.candidates?.[0];

    if (!candidate) {
      console.error('No candidate in response:', JSON.stringify(data));
      return res.status(500).json({ error: '결과를 생성하지 못했어요. 다른 사진으로 시도해주세요.' });
    }

    const imagePart = candidate.content?.parts?.find(p => p.inlineData);
    if (!imagePart) {
      const reason = candidate.finishReason;
      if (reason === 'SAFETY' || reason === 'IMAGE_SAFETY') {
        return res.status(500).json({ error: '안전 필터에 걸렸어요. 다른 사진으로 시도해주세요.' });
      }
      console.error('No image in response. Finish reason:', reason);
      return res.status(500).json({ error: '이미지 생성에 실패했어요. 다시 시도해주세요.' });
    }

    return res.status(200).json({
      imageBase64: imagePart.inlineData.data,
      mimeType: imagePart.inlineData.mimeType || 'image/png',
      style: style || 'disney',
    });

  } catch (err) {
    console.error('Transform handler error:', err);
    return res.status(500).json({ error: 'AI 서비스에 일시적 문제가 있어요. 잠시 후 다시 시도해주세요.' });
  }
}
