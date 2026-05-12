// api/transform.js
// Vercel Serverless Function — 반려동물 포켓몬 도감 카드
// 핵심: 우리 강아지/고양이가 포켓몬이라면? 컨셉
//   1) 펫 정체성 보존 (종·털색·귀·눈)
//   2) 일본 RPG 몬스터 애니메이션 스타일 (크리처, 옷X)
//   3) MBTI별 속성(타입) 이펙트로 차별화

const MODEL = 'gemini-2.5-flash-image';
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;

// ─────────────────────────────────────────────
// MBTI별 포켓몬 타입 (이중 타입 시스템)
// ─────────────────────────────────────────────
const MBTI_TYPES = {
  ENFJ: ['Fairy','Psychic'],     ENFP: ['Electric','Fairy'],
  ENTJ: ['Steel','Dragon'],      ENTP: ['Dragon','Electric'],
  ESFJ: ['Fairy','Normal'],      ESFP: ['Electric','Fire'],
  ESTJ: ['Rock','Steel'],        ESTP: ['Fighting','Fire'],
  INFJ: ['Psychic','Ghost'],     INFP: ['Grass','Fairy'],
  INTJ: ['Dark','Steel'],        INTP: ['Psychic','Dragon'],
  ISFJ: ['Normal','Fairy'],      ISFP: ['Grass','Water'],
  ISTJ: ['Steel','Rock'],        ISTP: ['Steel','Ground'],
};

// ─────────────────────────────────────────────
// 속성별 시각 이펙트
// ─────────────────────────────────────────────
const TYPE_EFFECTS = {
  Electric:'crackling yellow lightning bolts around the body, electric sparks, glowing yellow energy aura',
  Fire:'small flame puffs around paws, warm orange-red glow, floating ember particles',
  Water:'water droplets swirling, soft blue mist, gentle splash effects',
  Grass:'leaves swirling in the air, green energy aura, small flower petals floating',
  Psychic:'pink-purple mystical aura, floating energy orbs around head, magical glow in eyes',
  Fairy:'pastel pink and white sparkles, magical glitter particles, soft pink halo',
  Steel:'metallic sheen on fur, polished surfaces catching light, sharp clean lines',
  Dragon:'deep purple-violet energy spiraling, scaled texture hints, powerful presence aura',
  Rock:'small floating rock fragments around, earth-toned dust, grounded firm pose',
  Fighting:'red impact lines radiating, intense crimson aura, dynamic motion streaks',
  Ice:'ice crystal particles, cool cyan-blue palette, frosty breath visible',
  Dark:'deep purple-black smoke aura, mysterious shadow edges, glowing eyes',
  Ghost:'wispy translucent edges fading into mist, ethereal purple glow, floating quality',
  Normal:'clean simple silhouette, soft warm cream-colored aura, gentle vibe',
  Flying:'wind streaks and feather motifs, sky-blue background hints, slight levitation',
  Poison:'purple smoke wisps, toxic-green glow, dripping energy',
  Ground:'dust clouds at paws, warm earth tones, solid grounded pose',
  Bug:'green-yellow palette, glowing antenna-like motifs, iridescent shimmer',
};

// ─────────────────────────────────────────────
// MBTI별 자세 / 표정 단서
// ─────────────────────────────────────────────
const POSE_CUES = {
  ENFJ:{ pose:'standing tall with one paw slightly forward in a protective gentle stance', expr:'warm caring eyes with soft confident smile, head tilted gently' },
  ENFP:{ pose:'mid-leap with all four paws spread wide, body twisted joyfully', expr:'huge sparkling eyes, mouth wide open in excited laugh, tongue lolling out' },
  ENTJ:{ pose:'proud commanding stance, chest forward, head raised in dominance', expr:'sharp intense eyes, confident half-smirk, ears perked forward' },
  ENTP:{ pose:'curious crouched pose, one paw raised mid-step, head tilted in question', expr:'wide curious eyes glinting with mischief, slight grin' },
  ESFJ:{ pose:'sitting nicely with paws together, leaning forward warmly', expr:'kind gentle eyes, soft welcoming smile, ears relaxed' },
  ESFP:{ pose:'dynamic dancing pose, body twisted in rhythm, one paw raised high', expr:'electric joyful expression, eyes squinted in laughter' },
  ESTJ:{ pose:'firm seated pose, very upright and proper, paws aligned precisely', expr:'steady serious eyes, no-nonsense expression, ears alert' },
  ESTP:{ pose:'crouched ready-to-pounce stance, body coiled with kinetic energy', expr:'fierce determined eyes, cocky grin, ears flat back ready for action' },
  INFJ:{ pose:'mysterious sitting pose, looking off into distance with knowing gaze', expr:'deep thoughtful eyes that seem to see through everything, faint serene smile' },
  INFP:{ pose:'gentle floating dreamy pose, paws relaxed, body softly tilted', expr:'soft dreamy eyes with faraway look, peaceful tender smile' },
  INTJ:{ pose:'elegant aloof sitting pose, slight head turn, observing coolly', expr:'sharp piercing intelligent eyes, calm calculated half-smile' },
  INTP:{ pose:'curious head-tilt with paw raised in thought, body leaning slightly', expr:'puzzled but fascinated wide eyes, eyebrows slightly raised' },
  ISFJ:{ pose:'gentle protective sitting pose, paws folded neatly, body softened', expr:'sweet caring eyes with soft eyelashes, tender motherly smile' },
  ISFP:{ pose:'relaxed natural lounging pose with serene presence', expr:'peaceful half-closed eyes, gentle soft smile, completely at ease' },
  ISTJ:{ pose:'proper attentive sitting pose, perfectly straight, alert and ready', expr:'steady reliable eyes, polite restrained expression, focused gaze' },
  ISTP:{ pose:'cool casual leaning pose with confident relaxed energy', expr:'cool unreadable eyes, slight smirk, ears slightly back' },
};

// ─────────────────────────────────────────────
// 스타일 정의
// ─────────────────────────────────────────────
const STYLES = {
  pokemon: {
    label: 'Japanese RPG monster anime creature (Pokemon-style)',
    description: `Japanese RPG monster anime creature style — like classic creature collection anime:
- Cel-shaded 2D anime aesthetic with bold black outlines
- Bright saturated vibrant colors (high chroma, almost candy-like)
- Slightly oversized expressive eyes with multiple shine highlights
- Smooth simplified shapes, dynamic pose
- Cute but battle-ready creature companion vibe
- Speed lines, energy auras, dynamic effects in the composition
- 90s-2000s Japanese anime quality, hand-drawn feel`,
    isCreature: true,
  },
  labubu: {
    label: 'Designer vinyl collectible figurine (Labubu/Pop Mart-style)',
    description: `Designer vinyl toy / collectible figurine art style:
- Smooth rubbery vinyl surface with subtle plastic sheen
- Big oversized head, smaller body (chibi proportions for max cuteness)
- Soft pastel color palette with gentle gradients
- Slightly creepy-cute Pop Mart aesthetic (small fangs OK if it fits)
- Clean studio product-shot lighting, slight rim light
- Standalone figurine pose on subtle pedestal or floating against soft background
- Premium designer toy quality, collectible feel`,
    isCreature: true,
  },
};

// ─────────────────────────────────────────────
// 프롬프트 빌더
// ─────────────────────────────────────────────
function buildPrompt(petInfo, style) {
  const styleDef = STYLES[style] || STYLES.pokemon;
  const cues = POSE_CUES[petInfo.mbti] || {};
  const types = MBTI_TYPES[petInfo.mbti] || ['Normal'];
  const typeEffectsText = types.map(t => `- ${t}: ${TYPE_EFFECTS[t] || ''}`).join('\n');
  const species = petInfo.species || '강아지';
  const breed = petInfo.breed || 'mixed breed';

  const isPokemon = style === 'pokemon';

  return `Transform this photo of a ${breed} ${species} into a ${styleDef.label}.

═══ CRITICAL — CREATURE FORM (NOT anthropomorphic) ═══
${isPokemon ? `This is a MONSTER COMPANION CREATURE, like in a creature-collection RPG anime.
- The pet stays as a ${species} on FOUR legs (or natural creature posture for that species)
- NO clothing, NO bipedal human-like posture, NO accessories worn like a person
- This is a wild creature companion, not a person in animal form
- Think: classic JRPG monster designs — feral, expressive, full of energy` : `This is a designer COLLECTIBLE FIGURINE of the pet.
- The pet keeps its natural creature form (4 legs / natural posture)
- NO clothing — this is a plain toy figurine
- Standalone pose suitable for a display shelf`}

═══ PRESERVE PET IDENTITY (most important) ═══
- Still clearly a ${species} — keep recognizable
- EXACT same fur/coat color and markings as the original photo
- Same ear shape (floppy / pointed / cropped / fluffy)
- Same eye color
- Same breed silhouette and body proportions
- Owner must instantly think: "this is MY ${species}'s creature form!"

═══ STYLE ═══
${styleDef.description}

${isPokemon ? `═══ ELEMENTAL TYPE EFFECTS (most distinguishing visual) ═══
This creature has these types: ${types.join(' / ')}
Weave these visual effects into the scene NATURALLY (not as overlays — as part of the creature's aura):
${typeEffectsText}
The elemental effects should be CLEARLY visible and define the creature's overall color palette.
` : ''}

═══ PERSONALITY POSE ${petInfo.mbti ? `(MBTI: ${petInfo.mbti})` : ''} ═══
${petInfo.mbti && cues.pose ? `- Pose: ${cues.pose}
- Expression: ${cues.expr}` : `- Pose: dynamic natural creature pose
- Expression: expressive and alive`}

═══ CARICATURE / EXAGGERATION ═══
Push the pet's distinctive features for charm and recognizability:
- Fluffy fur → extra fluffy
- Big floppy ears → slightly bigger and more dynamic
- Cute snout → emphasized
- Eyes → bigger, more emotional, with anime sparkle highlights

═══ COMEDY BONUS — one charming twist ═══
Add ONE subtle unexpected fun detail to make the image memorable:
- A tiny exaggerated reaction beat (cartoon sweat drop, derp tongue, surprised eyebrow)
- A small environmental gag (a butterfly photobombing, a leaf landing on the head)
- Comic motion lines or anime sparkle effects
Keep it tasteful — just one small "ha!" moment.

═══ OUTPUT ═══
- Single creature character, centered, full body or 3/4 body
- Dynamic, share-worthy, instantly screenshot-able
- No text, no logos, no watermarks, no captions
- ${isPokemon ? 'Cinematic dynamic backdrop with elemental atmosphere matching the type' : 'Clean soft studio background with subtle pedestal'}

Make it feel like ${isPokemon ? `this pet just got a creature card in a classic monster anime — vibrant, alive, instantly recognizable as a ${types.join('/')} type creature.` : 'this pet got their own premium designer figurine — collectible, charming, totally Instagram-able.'}`;
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
          temperature: 0.95,
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
      style: style || 'pokemon',
    });

  } catch (err) {
    console.error('Transform handler error:', err);
    return res.status(500).json({ error: 'AI 서비스에 일시적 문제가 있어요. 잠시 후 다시 시도해주세요.' });
  }
}
