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

    // 반려동물 종합 프로필 구성 (DB 저장용 및 AI 참고용)
    const petProfile = buildPetProfile(recordData, petHint);

    // ============================================================
    // 수정된 PROMPT: 키트 만능주의 컨셉 적용
    // ============================================================
    const PROMPT = `당신은 세계 최고의 반려동물 스마트 소변검사 전문 AI입니다.
당신의 임무는 제공된 소변검사 키트 이미지를 정밀 분석하는 것입니다.

=== [가장 중요한 분석 원칙 - 필수 준수] ===
1. **분석 과정**: 아래 제공된 [반려동물 프로필] 정보(나이, 품종, 환경, 계절 등)를 배경지식으로 삼아 소변검사 키트의 색상 변화를 해석하세요. (예: 노령견 프로필을 보고 비중 항목의 미세한 색상 변화를 '신장 기능 저하 징후'로 해석)
2. **설명 방식 (사용자에게 보여지는 부분)**: 응답 JSON의 "description", "summary", "breedAgeAnalysis" 등 모든 설명 텍스트에서는 **반드시 이 모든 건강 상태를 오직 '소변검사 키트의 색상 변화와 반응'만으로 알아낸 것처럼 기술**해야 합니다.
   * **나쁜 예:** "품종 특성상 슬개골이 약한데, 나이도 많으셔서 관리가 필요합니다." (프로필 정보 언급)
   * **좋은 예:** "**키트의 특정 항목 반응**을 보니, 현재 관절과 신진대사 에너지가 많이 떨어져 있는 상태입니다. 마치 노령의 소형견에서 흔히 보이는 반응이군요." (키트 반응을 통한 추론 형식)
3. **'사주' 컨셉 반영:** 소변의 상태(pH, 비중 등)를 동양 철학의 오행(木, 火, 土, 金, 水)이나 체질 개념과 연결하여, 키트가 반려동물의 타고난 기운이나 선천적 체질까지 맞춘 것처럼 신비로운 느낌을 한 스푼 더하세요. (예: "pH 반응이 '木'의 기운이 강해 간 기능에 주의가 필요해 보입니다.")

=== 반려동물 프로필 (배경지식으로만 활용) ===
${petProfile}
* 현재 계절: ${new Date().getMonth() + 1}월 (계절적 요인 반영)

위 원칙을 바탕으로 소변검사 결과를 해석하고, 아래 JSON 형식으로만 응답하세요. 설명 없이 순수 JSON만 반환하세요.

{
  "testItems": [
    {
      "name": "항목명(pH, 단백질, 포도당, 잠혈, 케톤, 백혈구, 아질산염, 비중 등 이미지에서 확인되는 모든 항목)",
      "value": "측정값 또는 색상 단계(예: 6.5, 음성, +1, 정상 등)",
      "status": "normal 또는 warning 또는 danger",
      "description": "이 항목에 대한 한국어 해석 1~2문장. (원칙에 따라, 키트의 색상 변화가 어떻게 이 반려동물의 특정 체질이나 노화 상태를 보여주는지 설명하세요. 사주/체질 개념을 섞어도 좋습니다.)"
    }
  ],
  "overallStatus": "normal 또는 warning 또는 danger",
  "summary": "종합 건강 상태 평가 2~3문장 한국어. (모든 키트 반응을 종합하여, 선천적 체질(사주)과 현재 노화 정도, 환경적 영향이 어떻게 소변 색상으로 나타났는지 신비롭고 전문적으로 기술하세요.)",
  "envAnalysis": "키트 반응 중 비중이나 pH 등의 미세한 변화를 통해, 이 아이가 현재 도시의 실내에 있는지, 혹은 외부 오염 물질에 노출되었는지 '맞춘 것처럼' 설명하세요.",
  "breedAgeAnalysis": "키트의 특정 항목 반응이 '노령견'이나 '특정 품종'의 전형적인 패턴을 보인다는 식으로 기술하세요.",
  "tips": ["구체적인 맞춤 관리 팁1 한국어 (키트가 제안하는 체질 개선법)", "관리 팁2 한국어", "관리 팁3 한국어", "관리 팁4 한국어"],
  "supplements": [
    {
      "name": "영양제명",
      "reason": "키트 결과로 나타난 부족한 기운이나 기능을 보완하기 위한 이유.",
      "priority": "필수 또는 권장 또는 선택"
    }
  ],
  "foodRecommendation": {
    "type": "권장 사료 유형",
    "ingredients": ["권장 성분1", "권장 성분2"],
    "avoid": ["피해야 할 것1"],
    "waterIntake": "하루 권장 수분 섭취 안내 1문장"
  },
  "exerciseRecommendation": {
    "frequency": "권장 운동 빈도",
    "type": ["권장 운동 유형"],
    "caution": "운동 시 주의사항",
    "indoorTips": "실내 활동 팁"
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
          generationConfig: { temperature: 0.1 } // 결과의 일관성을 위해 낮은 온도로 유지
        })
      }
    );

    const geminiData = await geminiRes.json();
    if (geminiData.error) return res.status(500).json({ error: geminiData.error.message });

    const raw = geminiData.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!raw) return res.status(500).json({ error: '분석 결과를 받지 못했습니다.' });

    // JSON 부분만 추출
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
            pet_type:            recordData.petType || null,
            pet_name:            recordData.petName || null,
            pet_breed:          recordData.breed || null,
            pet_gender:          recordData.gender || null,
            pet_birth_year:      recordData.birthYear ? parseInt(recordData.birthYear) : null,
            pet_birth_month:    recordData.birthMonth ? parseInt(recordData.birthMonth) : null,
            region:              recordData.region || null,
            living_environment: recordData.environment || null,
            overall_status:      result.overallStatus || null,
            analysis_result:    result // AI가 생성한 '키트 만능' 컨셉의 JSON 저장
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

// buildPetProfile 함수는 변경 없음 (AI가 배경지식으로 읽는 용도)
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
