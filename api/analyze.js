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

    const PROMPT = `당신은 반려동물 소변검사 전문 AI입니다. 제공된 소변검사 키트 이미지를 분석하고, 아래 반려동물 프로필 정보를 내부 참고 데이터로만 활용하여 깊이 있는 맞춤 분석을 제공하세요.

=== 내부 참고 데이터 (출력에 직접 언급 금지) ===
${petProfile}

=== 핵심 규칙 ===
1. 모든 분석 결과는 반드시 "소변검사 키트 수치 분석 결과"로만 표현하세요.
2. 사주, 생년월일, 지역명, 실내/실외, 품종명, 나이 등을 설명문에 직접 언급하지 마세요.
3. 위 내부 참고 데이터에서 도출한 건강 인사이트는 자연스럽게 소변검사 결과 해석에 녹여서 표현하세요.
   예시(나쁜 예): "서울 실내 거주로 인해 운동 부족 위험이 있습니다"
   예시(좋은 예): "소변 비중과 pH 수치를 종합하면 수분 섭취량이 부족하고 운동량이 적은 패턴이 감지됩니다"
   예시(나쁜 예): "사주 분석 결과 신장이 약한 체질입니다"
   예시(좋은 예): "검사 수치에서 신장·방광 기능을 집중 관리할 필요성이 나타납니다"
4. 권장 영양제·사료·운동도 모두 "이번 검사 수치를 바탕으로"라는 맥락으로 자연스럽게 제시하세요.
5. 단, 내부 데이터(나이·품종·환경 등)를 반영해 실질적으로 더 정확하고 풍부한 내용을 담아야 합니다.

아래 JSON 형식으로만 응답하세요. 설명 없이 순수 JSON만 반환하세요.

{
  "testItems": [
    {
      "name": "항목명(pH, 단백질, 포도당, 잠혈, 케톤, 백혈구, 아질산염, 비중 등 이미지에서 확인되는 모든 항목)",
      "value": "측정값 또는 색상 단계(예: 6.5, 음성, +1, 정상 등)",
      "status": "normal 또는 warning 또는 danger",
      "description": "이 항목 수치에 대한 한국어 해석 1~2문장 (키트 수치 분석 맥락으로만 표현)"
    }
  ],
  "overallStatus": "normal 또는 warning 또는 danger",
  "summary": "소변검사 수치를 종합한 건강 상태 평가 2~3문장. 실질적으로는 나이·품종·환경을 반영하되, 표현은 모두 수치 분석 결과처럼 자연스럽게 작성",
  "envAnalysis": "이번 검사에서 감지된 생활 패턴 관련 건강 포인트 2문장 (지역·환경 직접 언급 없이, 수치에서 유추되는 것처럼 표현)",
  "breedAgeAnalysis": "수치 패턴에서 나타나는 체질·연령대별 건강 특이사항 1~2문장 (품종·나이 직접 언급 없이)",
  "tips": ["이번 검사 결과를 바탕으로 한 맞춤 관리 팁1", "관리 팁2", "관리 팁3", "관리 팁4"],
  "supplements": [
    {
      "name": "영양제명 (예: 오메가3, 크랜베리 추출물, 유산균 등)",
      "reason": "이번 검사 수치에서 이 영양제가 필요한 이유 1문장 (키트 수치 분석 맥락으로 표현)",
      "priority": "필수 또는 권장 또는 선택"
    }
  ],
  "foodRecommendation": {
    "type": "이번 검사 결과에 맞는 권장 사료 유형",
    "ingredients": ["권장 성분1", "권장 성분2", "권장 성분3"],
    "avoid": ["검사 수치상 피해야 할 성분1", "피해야 할 것2"],
    "waterIntake": "이번 수치 기준 하루 권장 수분 섭취 안내 1문장"
  },
  "exerciseRecommendation": {
    "frequency": "이번 검사 결과에 맞는 권장 운동 빈도",
    "type": ["권장 운동 유형1", "운동 유형2"],
    "caution": "검사 수치를 고려한 운동 시 주의사항 1~2문장",
    "indoorTips": "검사 결과를 바탕으로 한 실내 활동 팁 1문장"
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
