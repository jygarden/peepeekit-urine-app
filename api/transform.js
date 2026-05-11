// api/transform.js
// Vercel Serverless Function — 반려동물 의인화 캐리커처 (주토피아 스타일)
// 핵심 원칙:
//   1) 종(species)·털색·귀·눈은 원본 그대로 (보호자가 즉시 알아봄)
//   2) 두 발로 서있는 anthropomorphic 자세 + 옷 + 소품 (주토피아/토이스토리)
//   3) 캐리커처 — 시그니처 특징을 약간 과장해서 더 귀엽고 더 그 펫답게

const MODEL = 'gemini-2.5-flash-image';
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;

// ─────────────────────────────────────────────
// MBTI별 시각적 단서 (의상 / 포즈 / 활동 / 배경 / 소품 / 표정)
// 사람 직업·취미 컨셉을 동물 캐릭터에 입힘
// ─────────────────────────────────────────────
const VISUAL_CUES = {
  ENFJ: { outfit: 'cozy beige cardigan over a soft white shirt, with a small notebook', pose: 'standing upright with one paw warmly outstretched, head slightly tilted in caring attention', activity: 'listening empathetically to someone offscreen', bg: 'warm sunlit counseling room with plants and soft pastel walls', expr: 'gentle warm eyes, soft caring smile' },
  ENFP: { outfit: 'bright colorful t-shirt with paint splatters, suspenders, mismatched socks', pose: 'mid-jump with both paws raised in excitement, body slightly leaning forward', activity: 'throwing colorful confetti in the air, celebrating something', bg: 'vibrant party room with balloons, streamers and disco lights', expr: 'huge sparkly excited eyes, mouth wide open laughing' },
  ENTJ: { outfit: 'sharp dark business suit with a power tie, small briefcase under arm', pose: 'standing tall and confidently, one paw on hip, chin slightly raised', activity: 'leading a meeting, pointing at an invisible chart', bg: 'modern corporate office with floor-to-ceiling windows and city skyline', expr: 'sharp intense gaze, confident smirk' },
  ENTP: { outfit: 'rumpled lab coat over a graphic tee, round glasses pushed up on forehead', pose: 'standing with one paw scratching head, the other holding up a lightbulb', activity: 'having a brilliant eureka moment with an invention', bg: 'cluttered inventors workshop with gears, blueprints and floating idea sparks', expr: 'wide curious eyes, mischievous open-mouth grin' },
  ESFJ: { outfit: 'cute floral apron over a pastel dress shirt, oven mitts on paws', pose: 'standing in kitchen offering a fresh tray with both paws extended forward', activity: 'serving home-baked cookies, eager to share', bg: 'warm cozy kitchen with copper pots, fresh bread and afternoon sunlight', expr: 'kind crinkled eyes, generous welcoming smile' },
  ESFP: { outfit: 'sparkly stage outfit with sequins, oversized sunglasses on head, festival flower lei', pose: 'mid-dance pose, one paw up reaching for the sky, hips swaying', activity: 'dancing on a stage in front of an adoring crowd', bg: 'concert stage with stage lights, fog and silhouettes of cheering fans', expr: 'electric joyful expression, mouth wide singing' },
  ESTJ: { outfit: 'crisp white shirt, navy vest, glasses on the nose, clipboard in paw', pose: 'standing very straight and proper, one paw holding clipboard, the other pointing', activity: 'organizing schedules and giving precise directions', bg: 'clean tidy office with neat shelves, calendar grid on wall', expr: 'firm focused eyes, all-business expression' },
  ESTP: { outfit: 'leather jacket, ripped jeans, biker boots, sunglasses', pose: 'dynamic action pose mid-stride or about to leap, full body energy', activity: 'jumping off a small ledge or skateboarding', bg: 'urban skate park at sunset with motion blur and graffiti walls', expr: 'cocky grin, daring sideways glance' },
  INFJ: { outfit: 'oversized knit sweater, soft scarf, holding an open book against chest', pose: 'standing quietly by a window, paw resting on glass, gazing out thoughtfully', activity: 'reading and reflecting deeply', bg: 'rainy window with warm lamp light, stack of books, cup of steaming tea', expr: 'deep thoughtful eyes, faint contemplative smile' },
  INFP: { outfit: 'flowy artist smock with paint stains, beret tilted on head, paintbrush in paw', pose: 'standing in front of an easel, painting with dreamy focus', activity: 'painting a watercolor landscape', bg: 'sunlit art studio with canvases, wildflowers in a vase, soft warm light', expr: 'soft dreamy gaze, gentle slight smile' },
  INTJ: { outfit: 'sleek black turtleneck, fitted dark trousers, thin wire-frame glasses', pose: 'standing arms crossed, slight backward tilt of head, evaluating', activity: 'analyzing a complex chess position or strategy board', bg: 'minimalist dark study with one focused spotlight, chess board on table', expr: 'sharp piercing intelligent eyes, calm half-smile' },
  INTP: { outfit: 'wrinkled hoodie over a graphic shirt, jeans, slippers, magnifying glass in paw', pose: 'leaning slightly forward, paw scratching ear in deep thought', activity: 'examining a small curious object with intense focus', bg: 'cluttered research room with stacks of books, papers, glowing computer monitor', expr: 'puzzled but fascinated, eyebrows raised in curiosity' },
  ISFJ: { outfit: 'soft knit cardigan, frilly apron, holding a tray with warm cup', pose: 'standing gently offering tea with both paws, slight bow forward', activity: 'bringing warm tea and a blanket to comfort someone', bg: 'warm cottage interior at evening, fireplace glow, soft cushions and blankets', expr: 'sweet caring eyes, soft motherly smile' },
  ISFP: { outfit: 'loose bohemian linen shirt, woven sandals, flower tucked behind ear', pose: 'standing barefoot in grass, eyes closed, paws gently spread feeling the breeze', activity: 'enjoying nature, breathing in spring air', bg: 'wildflower meadow at golden hour with butterflies and soft sun rays', expr: 'serene closed eyes, peaceful gentle smile' },
  ISTJ: { outfit: 'neat librarian outfit, vest with pocket watch chain, glasses', pose: 'standing very orderly, both paws straight at sides, slight bow', activity: 'cataloging books with precise attention', bg: 'classic library with tall wooden bookshelves and warm reading lamps', expr: 'steady reliable gaze, polite restrained smile' },
  ISTP: { outfit: 'oil-stained mechanic jumpsuit, tool belt, wrench in paw, cap turned backward', pose: 'leaning casually against a workbench, one paw holding wrench up', activity: 'fixing a motorcycle or gadget with quiet skill', bg: 'industrial garage workshop with tools, sparks and sunlight through grimy windows', expr: 'cool unreadable expression, slight smirk' },
};

// ─────────────────────────────────────────────
// 스타일 정의 (둘 다 의인화 anthropomorphic)
// ─────────────────────────────────────────────
const STYLES = {
  pixar: {
    label: 'Pixar / Disney 3D animated anthropomorphic character (Zootopia / Toy Story style)',
    description: `Pixar/Disney 3D animation style — like Zootopia, Robin Hood (1973), or Madagascar:
- Smooth 3D rendered character with cinematic Pixar-quality lighting
- Slightly oversized expressive eyes with sparkle reflections (signature Pixar look)
- Soft stylized features, polished surfaces, subtle ambient occlusion
- Warm vibrant saturated color palette
- Cinematic depth-of-field with slightly blurred background
- Full body shot showing the character standing on two legs with clothing
- Single character centered, share-worthy movie-poster quality`,
  },
  webtoon: {
    label: 'Korean webtoon-style 2D anthropomorphic caricature illustration',
    description: `Korean webtoon / cartoon 2D illustration style:
- Clean bold outlines with flat or cel-shaded coloring
- Slightly exaggerated cute caricature proportions (big head, smaller body, expressive eyes)
- Bright pop colors with simple gradients
- Hand-drawn feel, playful and graphic
- Full body standing pose showing clothes and props clearly
- Single character, comic-panel quality, instantly readable and shareable`,
  },
};

// ─────────────────────────────────────────────
// 프롬프트 빌더 — 의인화 + 캐리커처 핵심
// ─────────────────────────────────────────────
function buildPrompt(petInfo, style) {
  const styleDef = STYLES[style] || STYLES.pixar;
  const cues = VISUAL_CUES[petInfo.mbti] || {};
  const species = petInfo.species || '강아지';
  const breed = petInfo.breed || 'mixed breed';

  return `Transform this photo of a ${breed} ${species} into a ${styleDef.label}.

═══ CRITICAL — ANTHROPOMORPHIC CARICATURE ═══
This is the most important instruction:
- The character MUST be bipedal — standing or posing on TWO legs like a human, NOT on all fours
- The character wears CLOTHING (like Zootopia's Judy Hopps or Robin Hood, or Toy Story characters)
- Human-like body proportions and posture, BUT with the animal's head, fur, ears, eyes, snout, tail kept intact
- Think: Disney's Zootopia, Robin Hood (1973), Madagascar, BoJack Horseman — animals living human lives

═══ PRESERVE PET IDENTITY (so owner recognizes it) ═══
- Same species (${species}) — keep as a ${species}
- EXACT same fur/coat color and unique markings as the original photo
- Same ear shape (floppy / pointed / cropped / fluffy)
- Same eye color
- Same breed characteristics (snout length, body type, etc.)
- The owner must instantly think: "this is MY ${species}!"

═══ CARICATURE EXAGGERATION (make it more fun) ═══
- Slightly EXAGGERATE the pet's most distinctive features for charm
  • If the pet has fluffy fur → make it extra fluffy
  • If big floppy ears → make them slightly bigger and more expressive
  • If a stubby tail → emphasize the cuteness of the stub
  • If wide eyes → make them sparkle and feel even more emotional
- Push the personality through facial expression — eyes and mouth should be very readable
- Cartoon-friendly proportions: head can be slightly larger than realistic for cuteness

═══ STYLE ═══
${styleDef.description}

═══ PERSONALITY SCENE ${petInfo.mbti ? `(MBTI: ${petInfo.mbti})` : ''} ═══
${petInfo.mbti && cues.outfit ? `- Outfit: ${cues.outfit}
- Pose: ${cues.pose}
- Activity: ${cues.activity}
- Background: ${cues.bg}
- Facial expression: ${cues.expr}` : `- Outfit: simple casual clothing fitting the pet's character
- Pose: confident bipedal standing pose
- Background: warm soft setting
- Expression: friendly, recognizable, charming`}

═══ OUTPUT REQUIREMENTS ═══
- Single character only (the anthropomorphic pet)
- Full body or 3/4 body shot showing the bipedal stance and outfit clearly
- No text, no logos, no watermarks, no captions
- Vibrant, share-worthy, movie-character quality

Make this feel like the pet got cast as the main character in a Pixar movie — bipedal, dressed, expressive, and instantly recognizable as THIS specific pet with their unique vibe.`;
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
          temperature: 0.9,
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
      style: style || 'pixar',
    });

  } catch (err) {
    console.error('Transform handler error:', err);
    return res.status(500).json({ error: 'AI 서비스에 일시적 문제가 있어요. 잠시 후 다시 시도해주세요.' });
  }
}
