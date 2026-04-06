module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST만 허용됩니다.' });

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return res.status(500).json({ error: '서버에 API 키가 설정되지 않았습니다.' });

  try {
    const { imageB64, petHint, recordData } = req.body;
    if (!imageB64) return res.status(400).json({ error: '이미지 데이터가 없습니다.' });

    // 반려동물 종합 프로필 구성
    const petProfile = buildPetProfile(recordData, petHint);

    const PROMPT = `당신은 반려동물 소변검사 전문 AI입니다. 제공된 소변검사 키트 이미지를 분석하고, 아래 반려동물 프로필 정보를 함께 종합하여 맞춤형 건강 분석을 제공하세요.

=== 반려동물 프로필 ===
${petProfile}

위 프로필을 바탕으로 소변검사 결과를 해석하세요:
- 나이, 성별, 품종에 따른 특이 건강 위험 요소를 반영하세요
- 사는 지역(도시/농촌)과 생활환경(실내/실외)에 따른 건강 위험 요소를 반영하세요
  * 도시 실내: 운동 부족, 비만, 요로결석, 스트레스성 질환 위험
  * 도시 실외: 대기오염, 아스팔트 열, 미세먼지 노출 위험
  * 지방 실내: 적정 체중 유지 가능, 환기 중요
  * 지방 실외/마당: 기생충, 외부 오염물질, 계절성 기후 노출 위험
- 암컷/수컷/중성화 여부에 따른 비뇨기 특성을 고려하세요
- 노령견(7세 이상)은 신장, 방광 기능 저하 가능성을 반영하세요
- 대형견과 소형견의 신진대사 차이를 고려하세요
- 단, 결과를 작성할 시에는 소변검사키트로만 결과를 분석한것처럼 반영하세요.
  * 계절, 노령견, 강아지 종, 나이 등등 언급 금지

아래 JSON 형식으로만 응답하세요. 설명 없이 순수 JSON만 반환하세요.

{
  "testItems": [
    {
      "name": "항목명(pH, 단백질, 포도당, 잠혈, 케톤, 백혈구, 아질산염, 비중 등 이미지에서 확인되는 모든 항목)",
      "value": "측정값 또는 색상 단계(예: 6.5, 음성, +1, 정상 등)",
      "status": "normal 또는 warning 또는 danger",
      "description": "이 항목에 대한 한국어 해석 1~2문장 (해당 반려동물의 나이/품종/환경을 고려한 해석)"
    }
  ],
  "overallStatus": "normal 또는 warning 또는 danger",
  "summary": "종합 건강 상태 평가 2~3문장 한국어 (반려동물의 모든 정보를 반영한 맞춤 분석)",
  "envAnalysis": "이 반려동물의 생활환경(지역+실내외)을 고려한 건강 위험 요소와 관리 포인트 2~3문장",
  "breedAgeAnalysis": "품종과 나이를 고려한 건강 특이사항 1~2문장",
  "tips": ["구체적인 맞춤 관리 팁1 한국어 (환경/나이/품종 반영)", "관리 팁2 한국어", "관리 팁3 한국어", "관리 팁4 한국어"],
  "supplements": [
    {
      "name": "영양제명 (예: 오메가3, 크랜베리 추출물, 유산균 등)",
      "reason": "이 반려동물에게 이 영양제가 필요한 이유 1문장 (소변검사 결과 + 품종/나이/환경 반영)",
      "priority": "필수 또는 권장 또는 선택"
    }
  ],
  "foodRecommendation": {
    "type": "권장 사료 유형 (예: 저단백 처방식, 비뇨기 건강 사료, 노령견 사료 등)",
    "ingredients": ["권장 성분1 (예: 저인산)", "권장 성분2", "권장 성분3"],
    "avoid": ["피해야 할 성분/음식1 (예: 고나트륨)", "피해야 할 것2"],
    "waterIntake": "하루 권장 수분 섭취 안내 1문장"
  },
  "exerciseRecommendation": {
    "frequency": "권장 운동 빈도 (예: 하루 2회, 30분씩)",
    "type": ["권장 운동 유형1 (예: 가벼운 산책)", "운동 유형2"],
    "caution": "이 반려동물의 운동 시 주의사항 1~2문장 (환경/나이/건강 상태 반영)",
    "indoorTips": "실내에서 할 수 있는 활동 팁 1문장 (실내 거주 시 특히 중요)"
  },
  "vetVisitRecommended": true,
  "urgency": "normal 또는 soon 또는 urgent"
}

소변검사 키트가 아닌 이미지라면: {"error": "소변검사 키트 이미지를 다시 업로드해 주세요."}`;

    // Gemini AI 분석
    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [
            { text: PROMPT },
            { inline_data: { mime_type: 'image/jpeg', data: imageB64 } }
          ]}],
          generationConfig: { temperature: 0.1 }
        })
      }
    );

    const geminiData = await geminiRes.json();
    if (geminiData.error) return res.status(500).json({ error: geminiData.error.message });

    const raw = geminiData.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!raw) return res.status(500).json({ error: '분석 결과를 받지 못했습니다.' });

    // JSON 부분만 추출 (마크다운 코드블록 등 제거)
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return res.status(500).json({ error: '결과 형식을 읽지 못했습니다.' });
    const result = JSON.parse(jsonMatch[0]);
    if (result.error) return res.status(400).json({ error: result.error });

    // Supabase에 기록 저장 (설정된 경우)
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_ANON_KEY;

    if (supabaseUrl && supabaseKey && recordData) {
      try {
        await fetch(`${supabaseUrl}/rest/v1/pet_records`, {
          method: 'POST',
          headers: {
            'apikey': supabaseKey,
            'Authorization': `Bearer ${supabaseKey}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=minimal'
          },
          body: JSON.stringify({
            owner_contact:      recordData.contact || null,
            marketing_consent:  recordData.marketing || false,
            pet_type:           recordData.petType || null,
            pet_name:           recordData.petName || null,
            pet_breed:          recordData.breed || null,
            pet_gender:         recordData.gender || null,
            pet_birth_year:     recordData.birthYear ? parseInt(recordData.birthYear) : null,
            pet_birth_month:    recordData.birthMonth ? parseInt(recordData.birthMonth) : null,
            region:             recordData.region || null,
            living_environment: recordData.environment || null,
            overall_status:     result.overallStatus || null,
            analysis_result:    result
          })
        });
      } catch (dbErr) {
        console.error('DB save error:', dbErr.message);
      }
    }

    return res.status(200).json(result);

  } catch (err) {
    return res.status(500).json({ error: err.message || '서버 오류가 발생했습니다.' });
  }
};

function buildPetProfile(recordData, petHint) {
  if (!recordData) return petHint || '정보 없음';

  const lines = [];

  // 반려동물 기본 정보
  if (recordData.petType) lines.push(`종류: ${recordData.petType}`);
  if (recordData.petName) lines.push(`이름: ${recordData.petName}`);
  if (recordData.breed) lines.push(`품종: ${recordData.breed}`);
  if (recordData.gender) {
    const genderLabel = recordData.gender === 'male' ? '수컷' : recordData.gender === 'female' ? '암컷' : '중성화';
    lines.push(`성별: ${genderLabel}`);
  }

  // 나이 계산
  if (recordData.birthYear) {
    const currentYear = new Date().getFullYear();
    const age = currentYear - parseInt(recordData.birthYear);
    const ageLabel = age <= 1 ? '1살 미만 (어린 강아지)' : age >= 7 ? `${age}살 (노령)` : `${age}살`;
    lines.push(`나이: ${ageLabel}`);
    if (recordData.birthMonth) lines.push(`생년월: ${recordData.birthYear}년 ${recordData.birthMonth}월생`);
  }

  // 생활 환경
  if (recordData.region) lines.push(`거주 지역: ${recordData.region}`);
  if (recordData.environment) {
    const envMap = { indoor: '실내', outdoor: '실외', both: '실내+실외' };
    const envLabel = envMap[recordData.environment] || recordData.environment;
    lines.push(`생활 환경: ${envLabel}`);

    // 환경별 특이사항 추가
    const region = recordData.region || '';
    const isUrban = ['서울', '부산', '대구', '인천', '광주', '대전', '울산', '세종'].some(c => region.includes(c));

    if (recordData.environment === 'indoor') {
      if (isUrban) {
        lines.push('환경 특이사항: 도시 실내 거주 → 운동량 부족, 비만/요로결석 위험, 실외배변 기회 제한, 스트레스 가능성');
      } else {
        lines.push('환경 특이사항: 지방 실내 거주 → 실내 공기 관리 중요, 적정 운동 필요');
      }
    } else if (recordData.environment === 'outdoor') {
      if (isUrban) {
        lines.push('환경 특이사항: 도시 실외 거주 → 대기오염, 미세먼지, 아스팔트 열 노출, 외부 세균/바이러스 접촉 위험');
      } else {
        lines.push('환경 특이사항: 지방 실외 거주 → 기생충(진드기, 회충 등), 외부 오염물 섭취, 계절 기후 영향 위험');
      }
    } else if (recordData.environment === 'both') {
      lines.push('환경 특이사항: 실내외 혼합 → 외부 오염물 실내 유입 주의, 위생 관리 철저 필요');
    }
  }

  return lines.join('\n');
}
