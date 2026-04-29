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
    const petProfile = buildPetProfile(recordData, petHint);
    const statRisk = buildStatisticalRisk(recordData);

    const PROMPT = `당신은 반려동물 소변검사 전문 AI이자 수의학 건강 분석 전문가입니다. 제공된 소변검사 키트 이미지를 분석하고, 아래 반려동물 프로필 및 통계적 위험 데이터를 내부 참고 자료로만 활용하여 깊이 있는 맞춤 분석을 제공하세요.

=== 내부 참고 데이터 (출력에 직접 언급 금지) ===
${petProfile}

=== 통계적 취약 요소 (출력에 직접 언급 금지) ===
${statRisk}

=== 핵심 규칙 ===
1. 모든 분석 결과는 반드시 "소변검사 키트 수치 분석 결과"로만 표현하세요.
2. 사주, 생년월일, 지역명, 실내/실외, 품종명, 나이 등을 설명문에 직접 언급하지 마세요.
3. 내부 참고 데이터에서 도출한 건강 인사이트는 자연스럽게 소변검사 결과 해석에 녹여서 표현하세요.
   예시(나쁜 예): "서울 실내 거주로 인해 운동 부족 위험이 있습니다"
   예시(좋은 예): "소변 비중과 pH 수치를 종합하면 수분 섭취량이 부족하고 운동량이 적은 패턴이 감지됩니다"
4. 권장 영양제·사료·운동도 모두 "이번 검사 수치를 바탕으로"라는 맥락으로 자연스럽게 제시하세요.
5. 내부 데이터(나이·품종·환경 등)를 반영해 실질적으로 더 정확하고 풍부한 내용을 담아야 합니다.

=== 통계 기반 위험 분석 규칙 ===
6. 통계적 취약 요소를 반드시 소변검사 수치 패턴으로 자연스럽게 녹여서 표현하세요:
   - 노령(7세 이상): 신장기능 저하, 당뇨, 쿠싱증후군, 방광종양 관련 수치 패턴을 중점 분석
   - 수컷: 전립선 문제, 요도 협착 관련 수치 패턴 반영
   - 암컷: 방광염, 호르몬성 요실금 관련 패턴 반영
   - 실외 거주: 세균성 방광염, 기생충 연관 수치 패턴 반영
   - 실내 거주: 비만, 요로결석, 수분 부족 패턴 반영
   - 품종별 취약 질환을 수치 패턴으로 서술

=== 종합결과 작성 규칙 ===
7. overallStatus가 "normal"이더라도 반드시 다음을 포함:
   - summary에 "검사 수치상 미세한 색상 변화가 감지되어 지속적인 관심과 관찰이 권장됩니다" 유형의 문구 포함
   - 정상 범위 내에서도 관리가 필요한 수치 2가지 이상 언급
   - subtleChangeNote 필드에 항상 고정 문구 포함

=== 영양제 추천 규칙 ===
8. focusAreas(집중 관리 수치 영역)와 constitutionHealthPoints(체질 건강포인트)를 기반으로:
   - 소변검사 수치 패턴 + 통계적 취약 요소를 결합하여 영양제 추천
   - constitutionBasis(체질 근거) 함께 제시
   - 최소 4가지 이상 구체적 영양제 추천

아래 JSON 형식으로만 응답하세요. 설명 없이 순수 JSON만 반환하세요.
{
  "testItems": [
    {
      "name": "항목명(pH, 단백질, 포도당, 잠혈, 케톤, 백혈구, 아질산염, 비중 등 이미지에서 확인되는 모든 항목)",
      "value": "측정값 또는 색상 단계(예: 6.5, 음성, +1, 정상 등)",
      "status": "normal 또는 warning 또는 danger",
      "description": "이 항목 수치에 대한 한국어 해석 1~2문장 (키트 수치 분석 맥락으로만 표현)",
      "focusNote": "이 항목에서 주목해야 할 미세한 변화나 잠재적 패턴 (정상이어도 관찰 포인트 제시, 없으면 null)"
    }
  ],
  "overallStatus": "normal 또는 warning 또는 danger",
  "subtleChangeNote": "미세한 수치 변화가 감지되었습니다. 아래 건강관리 내용을 주의 깊게 확인해 주세요.",
  "focusAreas": ["집중 관리가 필요한 수치 영역1", "영역2", "영역3"],
  "summary": "소변검사 수치를 종합한 건강 상태 평가 2~3문장. 정상이더라도 반드시 미세한 색상 변화 관찰 문구 포함. 실질적으로는 나이·품종·환경 반영",
  "envAnalysis": "이번 검사에서 감지된 생활 패턴 관련 건강 포인트 2문장 (지역·환경 직접 언급 없이, 수치에서 유추되는 것처럼 표현)",
  "breedAgeAnalysis": "수치 패턴에서 나타나는 체질·연령대별 건강 특이사항 1~2문장 (품종·나이 직접 언급 없이)",
  "constitutionHealthPoints": "검사기반 체질 건강포인트 - 통계적 위험 요소와 수치 패턴을 결합한 체질 분석 2~3문장 (직접 언급 없이 수치 패턴으로 표현)",
  "statisticalRiskNote": "이 반려동물의 통계적 취약 요소를 수치 패턴으로 표현한 관찰 사항 1~2문장",
  "tips": ["이번 검사 결과를 바탕으로 한 맞춤 관리 팁1", "관리 팁2", "관리 팁3", "관리 팁4"],
  "supplements": [
    {
      "name": "영양제명 (예: 오메가3, 크랜베리 추출물, 유산균 등)",
      "reason": "이번 검사 수치에서 이 영양제가 필요한 이유 1문장 (키트 수치 분석 맥락으로 표현)",
      "constitutionBasis": "체질 건강포인트 및 통계적 취약 요소 기반 추천 근거 1문장",
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

    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
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
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return res.status(500).json({ error: '결과 형식을 읽지 못했습니다.' });
    const result = JSON.parse(jsonMatch[0]);
    if (result.error) return res.status(400).json({ error: result.error });

    // subtleChangeNote 강제 설정 (AI가 빠뜨릴 경우 대비)
    result.subtleChangeNote = result.subtleChangeNote ||
      '미세한 수치 변화가 감지되었습니다. 아래 건강관리 내용을 주의 깊게 확인해 주세요.';

    // Supabase에 기록 저장
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

// ─── 반려동물 기본 프로필 생성 ───────────────────────────────────────────────
function buildPetProfile(recordData, petHint) {
  if (!recordData) return petHint || '정보 없음';
  const lines = [];
  if (recordData.petType) lines.push(`종류: ${recordData.petType}`);
  if (recordData.petName) lines.push(`이름: ${recordData.petName}`);
  if (recordData.breed) lines.push(`품종: ${recordData.breed}`);
  if (recordData.gender) {
    const genderLabel = recordData.gender === 'male' ? '수컷'
      : recordData.gender === 'female' ? '암컷' : '중성화';
    lines.push(`성별: ${genderLabel}`);
  }
  if (recordData.birthYear) {
    const currentYear = new Date().getFullYear();
    const age = currentYear - parseInt(recordData.birthYear);
    const ageLabel = age <= 1 ? '1살 미만 (어린 강아지)'
      : age >= 7 ? `${age}살 (노령)` : `${age}살`;
    lines.push(`나이: ${ageLabel}`);
    if (recordData.birthMonth) lines.push(`생년월: ${recordData.birthYear}년 ${recordData.birthMonth}월생`);
  }
  if (recordData.region) lines.push(`거주 지역: ${recordData.region}`);
  if (recordData.environment) {
    // ★ 수정: outdoor → 실외 정확히 매핑
    const envMap = { indoor: '실내', outdoor: '실외', both: '실내+실외' };
    const envLabel = envMap[recordData.environment] || recordData.environment;
    lines.push(`생활 환경: ${envLabel}`);
    const region = recordData.region || '';
    const isUrban = ['서울','부산','대구','인천','광주','대전','울산','세종'].some(c => region.includes(c));
    if (recordData.environment === 'indoor') {
      lines.push(isUrban
        ? '환경 특이사항: 도시 실내 거주 → 운동량 부족, 비만/요로결석 위험, 스트레스 가능성'
        : '환경 특이사항: 지방 실내 거주 → 실내 공기 관리 중요, 적정 운동 필요');
    } else if (recordData.environment === 'outdoor') {
      lines.push(isUrban
        ? '환경 특이사항: 도시 실외 거주 → 대기오염·미세먼지·아스팔트 열 노출, 외부 세균/바이러스 접촉 위험'
        : '환경 특이사항: 지방 실외 거주 → 기생충(진드기·회충 등), 외부 오염물 섭취, 계절 기후 영향 위험');
    } else if (recordData.environment === 'both') {
      lines.push('환경 특이사항: 실내외 혼합 → 외부 오염물 실내 유입 주의, 위생 관리 철저 필요');
    }
  }
  return lines.join('\n');
}

// ─── 통계 기반 위험 요소 생성 ────────────────────────────────────────────────
function buildStatisticalRisk(recordData) {
  if (!recordData) return '통계 데이터 없음';
  const risks = [];

  // 나이 기반 위험
  if (recordData.birthYear) {
    const age = new Date().getFullYear() - parseInt(recordData.birthYear);
    if (age >= 10) {
      risks.push('고령(10세+): 만성신부전, 당뇨병, 방광종양, 쿠싱증후군 고위험군 → 소변 비중·포도당·단백질·잠혈 수치 집중 모니터링 필요');
    } else if (age >= 7) {
      risks.push('노령(7~9세): 초기 신기능 저하, 방광결석, 전립선 비대(수컷), 요실금(암컷) 위험 증가 → 비중·pH·단백질 패턴 주목');
    } else if (age <= 1) {
      risks.push('어린 강아지: 세균성 방광염, 선천성 신장 이상, 기생충 감염 패턴 주의');
    }
  }

  // 성별 기반 위험
  if (recordData.gender === 'male') {
    risks.push('수컷: 전립선 비대/전립선염 → 요도 협착, 배뇨 어려움, 혈뇨 패턴 주의. 아질산염·백혈구·잠혈 수치 집중 확인');
  } else if (recordData.gender === 'female') {
    risks.push('암컷: 방광염(세균성), 자궁축농증 연관 요로감염 → 백혈구·아질산염·단백질 수치 집중 확인. 중성화 여부에 따라 호르몬성 요실금 패턴 주의');
  }

  // 환경 기반 위험
  if (recordData.environment === 'outdoor') {
    risks.push('실외 거주: 세균성 방광염(대장균 등), 기생충 연관 신장 손상, 독소 노출 → 아질산염·백혈구·단백질·잠혈 수치에서 감염 패턴 확인');
  } else if (recordData.environment === 'indoor') {
    risks.push('실내 거주: 수분 부족, 운동 부족, 비만 연관 요로결석(스트루바이트·수산칼슘) → 소변 비중·pH·잠혈 패턴 집중 확인');
  }

  // 품종별 위험 (주요 품종)
  const breed = (recordData.breed || '').toLowerCase();
  if (['달마시안','불독','잉글리시 불독'].some(b => breed.includes(b))) {
    risks.push('품종 특이: 요산결석 고위험군 → pH·비중·잠혈 수치 집중 모니터링');
  } else if (['미니어처 슈나우저','슈나우저'].some(b => breed.includes(b))) {
    risks.push('품종 특이: 스트루바이트·수산칼슘 결석 고위험군, 고지혈증 연관 패턴 → pH·비중·단백질 주의');
  } else if (['시추','페키니즈','퍼그','프렌치 불독','불도그'].some(b => breed.includes(b))) {
    risks.push('품종 특이: 단두종 → 스트레스·호흡 관련 산증 패턴, 비만 연관 방광 압박 → pH·케톤 주의');
  } else if (['사모예드','허스키','말라뮤트'].some(b => breed.includes(b))) {
    risks.push('품종 특이: 신장이형성증 위험, 아연 흡수 이상 연관 신장 패턴 → 비중·단백질 집중 확인');
  } else if (['코커 스패니얼'].some(b => breed.includes(b))) {
    risks.push('품종 특이: 신장 기능 이상, 면역 매개 용혈성 빈혈 연관 잠혈 패턴 주의');
  }

  return risks.length > 0 ? risks.join('\n') : '특별한 통계적 고위험 요소 없음 (일반 건강 관리 수준 유지)';
}
