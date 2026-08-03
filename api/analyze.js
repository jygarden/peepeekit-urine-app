// ════════════════════════════════════════════════════════════════
// 소변검사 이미지 분석 API — 사람 / 반려동물 분기
// 위치: /api/analyze.js
// v12: 키·몸무게·알레르기·복용중 영양제·사주 체질 반영
// ════════════════════════════════════════════════════════════════
module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST만 허용됩니다.' });

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return res.status(500).json({ error: '서버에 API 키가 설정되지 않았습니다.' });

  try {
    const { imageB64, petHint, recordData, subject = 'pet' } = req.body;
    if (!imageB64) return res.status(400).json({ error: '이미지 데이터가 없습니다.' });

    const isHuman = subject === 'human';
    const profile = isHuman
      ? buildHumanProfile(recordData)
      : buildPetProfile(recordData, petHint);
    const statRisk = isHuman
      ? buildHumanStatisticalRisk(recordData)
      : buildStatisticalRisk(recordData);
    const PROMPT = isHuman
      ? buildHumanPrompt(profile, statRisk)
      : buildPetPrompt(profile, statRisk);

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

    // v12: 더 견고한 JSON 파싱 (```json 블록 · 이모지 prefix 대응)
    let result;
    try {
      const cleaned = raw.replace(/```json\s*/g, '').replace(/```\s*$/g, '').trim();
      const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
      if (!jsonMatch) return res.status(500).json({ error: '결과 형식을 읽지 못했습니다.' });
      result = JSON.parse(jsonMatch[0]);
    } catch (parseErr) {
      return res.status(500).json({ error: '결과 파싱 실패: ' + parseErr.message });
    }

    if (result.error) return res.status(400).json({ error: result.error });

    result.subtleChangeNote = result.subtleChangeNote ||
      '미세한 수치 변화가 감지되었습니다. 아래 건강관리 내용을 주의 깊게 확인해 주세요.';
    result.subject = isHuman ? 'human' : 'pet';

    // v12: 사람 결과에도 medicalDisclaimer 강제, vet 표현 정리
    if (isHuman) {
      result.medicalDisclaimer = result.medicalDisclaimer ||
        '본 결과는 의학적 진단이 아닌 일반 건강 정보입니다. 증상이 지속되거나 우려되는 경우 반드시 의료 전문가의 진료를 받으세요.';
      // vetVisitRecommended → hospitalVisitRecommended 로 이관
      if (result.vetVisitRecommended != null && result.hospitalVisitRecommended == null) {
        result.hospitalVisitRecommended = result.vetVisitRecommended;
      }
    } else {
      result.medicalDisclaimer = result.medicalDisclaimer ||
        '본 결과는 수의학적 진단이 아닌 일반 건강 관찰 정보입니다. 이상 징후가 지속되면 반드시 수의사 진료를 받으세요.';
    }

    // Supabase 기록 저장 (기존 로직 그대로)
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_ANON_KEY;
    if (supabaseUrl && supabaseKey && recordData) {
      try {
        await fetch(`${supabaseUrl}/rest/v1/${isHuman ? 'human_records' : 'pet_records'}`, {
          method: 'POST',
          headers: {
            'apikey': supabaseKey,
            'Authorization': `Bearer ${supabaseKey}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=minimal'
          },
          body: JSON.stringify(
            isHuman ? {
              contact:           recordData.contact || null,
              marketing_consent: recordData.marketing || false,
              name:              recordData.name || null,
              gender:            recordData.gender || null,
              birth_year:        recordData.birthYear ? parseInt(recordData.birthYear) : null,
              birth_month:       recordData.birthMonth ? parseInt(recordData.birthMonth) : null,
              region:            recordData.region || null,
              lifestyle:         recordData.lifestyle || null,
              overall_status:    result.overallStatus || null,
              analysis_result:   result
            } : {
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
            }
          )
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

// ────────────────────────────────────────────────────────────────
// v12 공통 헬퍼 · 알레르기 / 복용중 영양제 / 사주 체질 블록 렌더
// ────────────────────────────────────────────────────────────────
function renderAllergyBlock(recordData) {
  const a = recordData?.allergies;
  if (!a || (Array.isArray(a) && a.length === 0)) return '';
  const list = Array.isArray(a) ? a.join(', ') : String(a);
  return `\n알레르기 (필수 회피): ${list}`;
}
function renderCurrentSupplementsBlock(recordData) {
  const s = recordData?.currentSupplements;
  if (!s || !Array.isArray(s) || s.length === 0) return '';
  const names = s.map(x => (x && (x.name || x)) || '').filter(Boolean);
  if (!names.length) return '';
  return `\n현재 복용 중인 영양제 (중복 회피): ${names.join(', ')}`;
}
function renderSajuBlock(recordData) {
  const saju = recordData?.sajuHealth;
  if (!saju) return '';
  const parts = [];
  if (saju.element) parts.push(`오행 우세: ${saju.element}`);
  if (saju.organ) parts.push(`취약 장기 계열: ${saju.organ}`);
  if (Array.isArray(saju.tips) && saju.tips.length) parts.push(`체질 관리 팁 (내부 참고): ${saju.tips.slice(0,2).join(' / ')}`);
  if (saju.monthInfo) parts.push(`생월 특성: ${saju.monthInfo}`);
  return parts.length ? `\n체질 특성 (내부 참고): ${parts.join(' · ')}` : '';
}

// ════════════════════════════════════════════════════════════════
// ★ 반려동물용 프롬프트
// ════════════════════════════════════════════════════════════════
function buildPetPrompt(petProfile, statRisk) {
  return `당신은 반려동물 소변검사 전문 AI이자 수의학 건강 분석 전문가입니다. 제공된 소변검사 키트 이미지를 분석하고, 아래 반려동물 프로필 및 통계적 위험 데이터를 내부 참고 자료로만 활용하여 깊이 있는 맞춤 분석을 제공하세요.
=== 내부 참고 데이터 (출력에 직접 언급 금지) ===
${petProfile}
=== 통계적 취약 요소 (출력에 직접 언급 금지) ===
${statRisk}
=== 핵심 규칙 ===
1. 모든 분석 결과는 반드시 "소변검사 키트 수치 분석 결과"로만 표현하세요.
2. 사주, 생년월일, 지역명, 실내/실외, 품종명, 나이, 체중 kg 숫자 등을 설명문에 직접 언급하지 마세요.
3. 내부 참고 데이터에서 도출한 건강 인사이트는 자연스럽게 소변검사 결과 해석에 녹여서 표현하세요.
   예시(나쁜 예): "10kg 포메라니안이라 관절이 약합니다"
   예시(좋은 예): "소변 비중과 pH 수치를 종합하면 수분 섭취량이 부족하고 소형 체형 특유의 관절 부담이 감지됩니다"
4. 권장 영양제·사료·운동도 모두 "이번 검사 수치를 바탕으로"라는 맥락으로 자연스럽게 제시하세요.
5. 내부 데이터(나이·품종·체중·환경 등)를 반영해 실질적으로 더 정확하고 풍부한 내용을 담아야 합니다.
=== v12 · 알레르기 · 복용중 · 체질 활용 규칙 ===
5-1. 알레르기 정보가 있으면 영양제·사료 추천에서 해당 성분을 반드시 배제하세요.
5-2. "현재 복용 중인 영양제"에 있는 성분과 겹치는 새 영양제는 추천하지 마세요. 대신 시너지 성분 추천 or 용량 조정 안내.
5-3. 체질(오행·취약 장기) 정보는 소변 수치 해석에 자연스럽게 녹이세요. "사주상~" "몇 년생이라~" 같은 근거 언급 금지.
   예시(나쁜 예): "1990년생이라 폐 기운이 약해 기관지가 예민합니다"
   예시(좋은 예): "호흡기 계열이 예민한 체질 패턴이 감지되어 수분 균형이 특히 중요합니다"
5-4. 체중 정보가 있으면 사료 급여량·영양제 dosage를 반드시 체중 기준으로 구체적으로 계산해서 넣으세요.
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
=== 영양제 추천 규칙 (수의사 수준 처방) ===
8. 당신은 20년 경력의 임상 수의사이자 반려동물 영양 전문가입니다. 단순 나열이 아닌 "수의사 처방전" 짜듯 추천하세요.
[8-1] 다층 구조 (Layered Stack) — 최소 5가지 추천
   - 기본(Base) 1~2개: 종·연령 기준 누구나 필요 (예: 종합비타민, 오메가3 EPA/DHA, 프로바이오틱스)
   - 타겟(Target) 2~3개: 검사 수치 약점 보완
      · 단백뇨→실리마린(밀크씨슬), 신장 보조
      · 잠혈→크랜베리 추출물·D-만노스
      · 빌리루빈↑→실리마린·SAMe
      · pH 불균형→포타슘 시트레이트
      · 백혈구↑→베타글루칸·비타민C
      · 비중↑→음수 촉진제
      · 케톤→타우린
   - 부스터(Boost) 1~2개: 품종·환경·체중 보완
      · 노령(7세+)→글루코사민·콘드로이틴, CoQ10
      · 실외→스피루리나·아연
      · 실내→오메가3, L-카르니틴
      · 소형견→덴탈케어, 대형견→관절 통합
[8-2] 시너지 조합 명시 (synergy 필드)
[8-3] 복용 타이밍 (timing 필드) — 지용성 식후, 프로바이오틱스 공복 등
[8-4] 권장 용량 (dosage 필드) — 반드시 체중 기준 (예: 오메가3 EPA+DHA 강아지 20~55mg/kg, 고양이 10~30mg/kg)
[8-5] 상호작용·안전성 주의 (caution 필드) — 고양이 알리움 금지, 강아지 자일리톨 금지
[8-6] 한국 시장 현실 — 국내 반려동물 전용 제품 (사람용 X)
[8-7] 조합 처방 (supplementCombo 필드)
아래 JSON 형식으로만 응답하세요. 설명 없이 순수 JSON만 반환하세요.
{
  "testItems": [
    {
      "name": "항목명",
      "value": "측정값",
      "status": "normal 또는 warning 또는 danger",
      "description": "이 항목 수치에 대한 한국어 해석 1~2문장",
      "focusNote": "미세한 변화 또는 관찰 포인트 (없으면 null)"
    }
  ],
  "overallStatus": "normal 또는 warning 또는 danger",
  "subtleChangeNote": "미세한 수치 변화가 감지되었습니다. 아래 건강관리 내용을 주의 깊게 확인해 주세요.",
  "focusAreas": ["영역1", "영역2", "영역3"],
  "summary": "종합 평가 2~3문장",
  "envAnalysis": "생활 패턴 관련 건강 포인트 2문장",
  "breedAgeAnalysis": "체질·연령대 특이사항 1~2문장",
  "constitutionHealthPoints": "체질 건강포인트 2~3문장",
  "statisticalRiskNote": "통계적 취약 요소 수치 패턴 표현 1~2문장",
  "tips": ["관리 팁1", "관리 팁2", "관리 팁3", "관리 팁4"],
  "supplements": [
    {
      "name": "반려동물 전용 영양제 성분명",
      "category": "기본 또는 타겟 또는 부스터",
      "reason": "이번 검사 수치 근거 1문장",
      "constitutionBasis": "품종·연령·환경·체질 근거 1문장",
      "dosage": "체중 기준 권장 용량",
      "timing": "급여 타이밍",
      "synergy": "시너지 영양제 (없으면 '단독 급여 OK')",
      "caution": "주의사항 (없으면 '특별한 주의 사항 없음')",
      "priority": "필수 또는 권장 또는 선택"
    }
  ],
  "supplementCombo": {
    "morningStack": ["아침 급여 영양제"],
    "eveningStack": ["저녁 급여 영양제"],
    "synergyNote": "조합 근거 2~3문장",
    "estimatedMonthlyCost": "월 예상 비용 범위",
    "timingTip": "흡수율 극대화 급여 팁 1문장"
  },
  "foodRecommendation": {
    "type": "권장 사료 유형",
    "ingredients": ["권장 성분1", "권장 성분2", "권장 성분3"],
    "avoid": ["피해야 할 성분1", "피해야 할 것2"],
    "waterIntake": "하루 권장 수분 섭취 안내",
    "dailyAmount": "체중 기준 하루 권장 급여량 (예: 체중 5kg 기준 하루 100~130g)"
  },
  "exerciseRecommendation": {
    "frequency": "권장 운동 빈도",
    "type": ["운동 유형1", "운동 유형2"],
    "caution": "운동 시 주의사항",
    "indoorTips": "실내 활동 팁"
  },
  "vetVisitRecommended": true,
  "urgency": "normal 또는 soon 또는 urgent",
  "medicalDisclaimer": "본 결과는 수의학적 진단이 아닌 일반 건강 관찰 정보입니다. 이상 징후가 지속되면 반드시 수의사 진료를 받으세요."
}
소변검사 키트가 아닌 이미지라면: {"error": "소변검사 키트 이미지를 다시 업로드해 주세요."}`;
}

// ════════════════════════════════════════════════════════════════
// ★ 사람(인체)용 프롬프트
// ════════════════════════════════════════════════════════════════
function buildHumanPrompt(humanProfile, statRisk) {
  return `당신은 인체 소변검사 전문 AI이자 의학 건강 분석 전문가입니다. 제공된 소변검사 키트 이미지를 분석하고, 아래 사용자 프로필 및 통계적 위험 데이터를 내부 참고 자료로만 활용하여 깊이 있는 맞춤 분석을 제공하세요.
=== 내부 참고 데이터 (출력에 직접 언급 금지) ===
${humanProfile}
=== 통계적 취약 요소 (출력에 직접 언급 금지) ===
${statRisk}
=== 핵심 규칙 ===
1. 모든 분석 결과는 반드시 "소변검사 키트 수치 분석 결과"로만 표현하세요.
2. 사주, 생년월일, 지역명, 직업, 생활 패턴, 나이, 키·체중 숫자 등을 설명문에 직접 언급하지 마세요.
3. 내부 참고 데이터에서 도출한 건강 인사이트는 자연스럽게 소변검사 결과 해석에 녹여서 표현하세요.
   예시(나쁜 예): "30대 사무직이라 운동 부족 위험이 있습니다"
   예시(좋은 예): "소변 비중과 pH 수치를 종합하면 수분 섭취량이 부족하고 활동량이 적은 패턴이 감지됩니다"
4. 권장 영양제·식단·운동도 모두 "이번 검사 수치를 바탕으로"라는 맥락으로 자연스럽게 제시하세요.
5. 내부 데이터(나이·성별·키·체중·생활 패턴 등)를 반영해 실질적으로 더 정확하고 풍부한 내용을 담아야 합니다.
=== v12 · 알레르기 · 복용중 · 체질 활용 규칙 ===
5-1. 알레르기 정보가 있으면 영양제·식단 추천에서 해당 성분을 반드시 배제하세요.
5-2. "현재 복용 중인 영양제"에 있는 성분과 겹치는 새 영양제는 추천하지 마세요. 대신 시너지 성분 or 용량 조정 안내.
5-3. 체질(오행·취약 장기) 정보는 소변 수치 해석에 자연스럽게 녹이세요. "사주상~" "몇 년생이라~" 같은 근거 언급은 절대 금지.
   예시(나쁜 예): "1990년생이라 폐 기운이 약해 기관지가 예민합니다"
   예시(좋은 예): "호흡기 계열이 예민한 체질 패턴이 감지되어 수분 균형이 특히 중요합니다"
5-4. 키·체중 정보가 있으면 BMI 기반 권장 칼로리·수분 섭취량을 자연스럽게 반영. 단, 숫자 kg/cm는 직접 언급하지 말고 "체형에 맞는" 식으로 표현.
=== 통계 기반 위험 분석 규칙 ===
6. 통계적 취약 요소를 반드시 소변검사 수치 패턴으로 자연스럽게 녹여서 표현하세요:
   - 50대 이상: 만성 신질환, 당뇨, 전립선(남), 호르몬성 요실금(여) 관련 수치 패턴을 중점 분석
   - 30~40대: 대사증후군 초기, 요로결석, 만성 피로 관련 수치 패턴 반영
   - 20대 이하: 급성 방광염, 식습관 불균형 관련 패턴 반영
   - 남성: 전립선·요도 관련 수치 패턴 반영
   - 여성: 방광염·호르몬성 수치 패턴 반영
   - 좌식 생활: 비만·요로결석·수분 부족 패턴 반영
   - 야외/활동적 생활: 탈수·전해질 불균형 패턴 반영
=== 종합결과 작성 규칙 ===
7. overallStatus가 "normal"이더라도 반드시 다음을 포함:
   - summary에 "검사 수치상 미세한 색상 변화가 감지되어 지속적인 관심과 관찰이 권장됩니다" 유형의 문구 포함
   - 정상 범위 내에서도 관리가 필요한 수치 2가지 이상 언급
   - subtleChangeNote 필드에 항상 고정 문구 포함
=== 영양제 추천 규칙 (약사 수준 처방) ===
8. 당신은 20년 경력의 임상약사이자 영양제 전문가입니다. 단순 나열이 아닌 "처방전" 짜듯 추천하세요.
[8-1] 다층 구조 (Layered Stack) — 최소 5가지 추천
   - 기본(Base) 1~2개: 나이·성별 기준 (예: 비타민D3+K2, 마그네슘, 종합비타민)
   - 타겟(Target) 2~3개: 검사 수치 약점 보완 (단백뇨→타우린, 잠혈→크랜베리, 빌리루빈↑→밀크씨슬, 케톤→크롬, pH불균형→프로바이오틱스, 백혈구↑→비타민C+아연, 비중↑→수분+전해질)
   - 부스터(Boost) 1~2개: 생활 패턴·체질 보완 (좌식→오메가3·CoQ10, 야간근무→테아닌, 음주→NAC·밀크씨슬, 흡연→비타민C·셀레늄)
[8-2] 시너지 조합 명시 (synergy 필드) — 비타민D↔K2, 오메가3↔E, 마그네슘↔B6 등
[8-3] 복용 타이밍 (timing 필드) — 지용성 아침 식후, 마그네슘 저녁, 프로바이오틱스 공복 등
[8-4] 권장 용량 (dosage 필드) — 국내 식약처 권장량 기준
[8-5] 상호작용·안전성 주의 (caution 필드) — 항응고제·갑상선약·혈압약·임신 등
[8-6] 한국 시장 현실 — 국내 흔한 제품
[8-7] 조합 처방 (supplementCombo 필드)
=== 의료 면책 규칙 ⚠️ ===
9. 사용자는 일반인이므로:
   - "질병 진단" 단정 금지 (가능성 어조 유지)
   - 우려되는 수치는 반드시 "병원/의사 상담 권장"으로 마무리
   - urgency가 'urgent'면 "가능한 빠른 시일 내 병원 방문 권장"
   - "vet(수의사)" 단어 사용 금지. 의사·의료진·병원으로 표현.
아래 JSON 형식으로만 응답하세요. 설명 없이 순수 JSON만 반환하세요.
{
  "testItems": [
    {
      "name": "항목명",
      "value": "측정값",
      "status": "normal 또는 warning 또는 danger",
      "description": "해석 1~2문장",
      "focusNote": "관찰 포인트 (없으면 null)"
    }
  ],
  "overallStatus": "normal 또는 warning 또는 danger",
  "subtleChangeNote": "미세한 수치 변화가 감지되었습니다. 아래 건강관리 내용을 주의 깊게 확인해 주세요.",
  "focusAreas": ["영역1", "영역2", "영역3"],
  "summary": "종합 평가 2~3문장. 정상이더라도 반드시 미세한 색상 변화 관찰 문구 포함",
  "envAnalysis": "생활 패턴 관련 건강 포인트 2문장",
  "breedAgeAnalysis": "체질·연령대 특이사항 1~2문장 (나이·성별 직접 언급 없이)",
  "constitutionHealthPoints": "체질 건강포인트 2~3문장",
  "statisticalRiskNote": "통계적 취약 요소 수치 패턴 표현 1~2문장",
  "tips": ["관리 팁1", "관리 팁2", "관리 팁3", "관리 팁4"],
  "supplements": [
    {
      "name": "영양제 성분명 (예: 비타민D3 2000IU)",
      "category": "기본 또는 타겟 또는 부스터",
      "reason": "이번 검사 수치 근거 1문장",
      "constitutionBasis": "체질·연령·생활 패턴 근거 1문장",
      "dosage": "권장 용량",
      "timing": "복용 타이밍",
      "synergy": "시너지 영양제 (없으면 '단독 복용 OK')",
      "caution": "주의사항 (없으면 '특별한 주의 사항 없음')",
      "priority": "필수 또는 권장 또는 선택"
    }
  ],
  "supplementCombo": {
    "morningStack": ["아침 복용"],
    "eveningStack": ["저녁 복용"],
    "synergyNote": "조합 근거 2~3문장",
    "estimatedMonthlyCost": "월 예상 비용 범위",
    "timingTip": "흡수율 극대화 팁 1문장"
  },
  "foodRecommendation": {
    "type": "권장 식단 유형",
    "ingredients": ["권장 음식/성분1", "권장2", "권장3"],
    "avoid": ["피해야 할 음식/성분1", "피해야 할 것2"],
    "waterIntake": "하루 권장 수분 섭취",
    "dailyCalorie": "체형·활동량 기반 하루 권장 칼로리 범위 (예: 1800~2100kcal)"
  },
  "exerciseRecommendation": {
    "frequency": "권장 운동 빈도",
    "type": ["운동 유형1", "유형2"],
    "caution": "운동 시 주의사항",
    "indoorTips": "일상 생활 팁"
  },
  "hospitalVisitRecommended": true,
  "urgency": "normal 또는 soon 또는 urgent",
  "medicalDisclaimer": "본 결과는 의학적 진단이 아닌 일반 건강 정보입니다. 증상이 지속되거나 우려되는 경우 반드시 의료 전문가의 진료를 받으세요."
}
소변검사 키트가 아닌 이미지라면: {"error": "소변검사 키트 이미지를 다시 업로드해 주세요."}`;
}

// ────────────────────────────────────────────────────────────────
// 반려동물 프로필 (v12: 체중·알레르기·복용중·사주 추가)
// ────────────────────────────────────────────────────────────────
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
  if (recordData.neutered != null) lines.push(`중성화: ${recordData.neutered ? '완료' : '미완료'}`);
  if (recordData.birthYear) {
    const currentYear = new Date().getFullYear();
    const age = currentYear - parseInt(recordData.birthYear);
    const ageLabel = age <= 1 ? '1살 미만 (어린 개체)'
      : age >= 7 ? `${age}살 (노령)` : `${age}살`;
    lines.push(`나이: ${ageLabel}`);
    if (recordData.birthMonth) lines.push(`생년월: ${recordData.birthYear}년 ${recordData.birthMonth}월생`);
  } else if (recordData.ageYears) {
    lines.push(`나이: ${recordData.ageYears}살${recordData.ageYears >= 7 ? ' (노령)' : ''}`);
  }
  // v12: 체중 (사료 급여량·영양제 dosage 계산에 필수)
  if (recordData.weight) lines.push(`체중: ${recordData.weight}kg`);
  if (recordData.region) lines.push(`거주 지역: ${recordData.region}`);
  if (recordData.environment) {
    const envMap = { indoor: '실내', outdoor: '실외', both: '실내+실외' };
    const envLabel = envMap[recordData.environment] || recordData.environment;
    lines.push(`생활 환경: ${envLabel}`);
    const region = recordData.region || '';
    const isUrban = ['서울','부산','대구','인천','광주','대전','울산','세종'].some(c => region.includes(c));
    if (recordData.environment === 'indoor') {
      lines.push(isUrban
        ? '환경 특이사항: 도시 실내 → 운동량 부족, 비만/요로결석 위험, 스트레스 가능'
        : '환경 특이사항: 지방 실내 → 실내 공기 관리, 적정 운동 필요');
    } else if (recordData.environment === 'outdoor') {
      lines.push(isUrban
        ? '환경 특이사항: 도시 실외 → 대기오염·미세먼지·아스팔트 열, 외부 세균 접촉'
        : '환경 특이사항: 지방 실외 → 기생충, 외부 오염물 섭취 위험');
    } else if (recordData.environment === 'both') {
      lines.push('환경 특이사항: 실내외 혼합 → 위생 관리 철저 필요');
    }
  }
  // v12 신규: 알레르기 · 복용중 영양제 · 체질
  const extra = renderAllergyBlock(recordData) + renderCurrentSupplementsBlock(recordData) + renderSajuBlock(recordData);
  return lines.join('\n') + extra;
}

// ────────────────────────────────────────────────────────────────
// 반려동물 통계 위험 (기존 + 품종 DB 확장)
// ────────────────────────────────────────────────────────────────
function buildStatisticalRisk(recordData) {
  if (!recordData) return '통계 데이터 없음';
  const risks = [];
  const currentYear = new Date().getFullYear();
  const age = recordData.birthYear
    ? currentYear - parseInt(recordData.birthYear)
    : (recordData.ageYears || 0);
  if (age >= 10) risks.push('고령(10세+): 만성신부전, 당뇨병, 방광종양, 쿠싱증후군 고위험군 → 비중·포도당·단백질·잠혈 집중 모니터링');
  else if (age >= 7) risks.push('노령(7~9세): 초기 신기능 저하, 방광결석, 전립선 비대(수컷), 요실금(암컷) → 비중·pH·단백질 주목');
  else if (age > 0 && age <= 1) risks.push('어린 개체: 세균성 방광염, 선천성 신장 이상, 기생충 감염 패턴 주의');

  if (recordData.gender === 'male') risks.push('수컷: 전립선 비대/전립선염 → 요도 협착, 배뇨 어려움, 혈뇨 패턴. 아질산염·백혈구·잠혈 집중');
  else if (recordData.gender === 'female') risks.push('암컷: 방광염(세균성), 자궁축농증 연관 요로감염 → 백혈구·아질산염·단백질 집중. 중성화 여부에 따라 호르몬성 요실금');

  if (recordData.environment === 'outdoor') risks.push('실외: 세균성 방광염, 기생충 연관 신장 손상 → 아질산염·백혈구·단백질·잠혈');
  else if (recordData.environment === 'indoor') risks.push('실내: 수분 부족, 운동 부족, 비만 연관 요로결석 → 비중·pH·잠혈 집중');

  // v12: 체중 기반 위험
  if (recordData.weight) {
    const w = parseFloat(recordData.weight);
    if (recordData.petType === 'dog') {
      if (w < 5) risks.push('소형견(5kg 미만): 저혈당·치석·기관허탈·슬개골 탈구 위험 → 대사·활동량 패턴 주의');
      else if (w > 25) risks.push('대형견(25kg+): 관절·심장 부담, 고관절 이형성증 → 운동 강도·체중 관리 중요');
    } else if (recordData.petType === 'cat') {
      if (w > 6) risks.push('과체중 고양이(6kg+): 당뇨·간지방증·요로결석 고위험 → 수분·포도당·비중 집중');
    }
  }

  // 품종별 (v12 확장 — 인기 견종·묘종 추가)
  const breed = (recordData.breed || '').toLowerCase();
  const breedRules = [
    { keys:['달마시안','불독','잉글리시 불독'],   note:'요산결석 고위험군 → pH·비중·잠혈 집중 모니터링' },
    { keys:['미니어처 슈나우저','슈나우저'],       note:'스트루바이트·수산칼슘 결석, 고지혈증 → pH·비중·단백질 주의' },
    { keys:['시추','페키니즈','퍼그','프렌치 불독','불도그','시츄'], note:'단두종 → 스트레스·호흡 관련 산증, 비만 연관 방광 압박 → pH·케톤 주의' },
    { keys:['사모예드','허스키','말라뮤트'],       note:'신장이형성증, 아연 흡수 이상 → 비중·단백질 집중' },
    { keys:['코커 스패니얼','코커'],               note:'신장 기능 이상, 면역 매개 용혈성 빈혈 → 잠혈 주의' },
    { keys:['포메라니안','포메'],                  note:'소형견 특성 → 슬개골·기관허탈, 저혈당 → 대사 지표 관찰' },
    { keys:['말티즈','말티즈'],                    note:'간문맥단락, 저혈당 소인 → 빌리루빈·포도당 주의' },
    { keys:['비숑','비숑프리제'],                  note:'요로결석·방광염 소인 → pH·비중·잠혈 집중' },
    { keys:['치와와'],                            note:'요로결석·저혈당·수두증 → 비중·포도당 관찰' },
    { keys:['웰시코기','코기'],                    note:'추간판 질환, 비만 소인 → 체중 대비 활동량 관찰' },
    { keys:['닥스훈트'],                          note:'추간판 질환, 방광결석 → pH·비중 주의' },
    { keys:['시바','시바이누','진돗개'],           note:'알레르기·자가면역 소인 → 잠혈·단백질 패턴 관찰' },
    { keys:['골든 리트리버','골든','래브라도','라브라도'], note:'대형견 관절·심장, 방광암 소인 → 잠혈·단백질 집중' },
    { keys:['페르시안'],                          note:'다낭성 신장질환(PKD) 고위험 → 비중·단백질 집중 모니터링' },
    { keys:['러시안블루','러블'],                   note:'스트레스성 방광염 소인 → pH·잠혈 주의' },
    { keys:['스코티시 폴드','스코티시','스코티쉬'],  note:'골연골 이상, 신장 이상 소인 → 관절·비중 관찰' },
    { keys:['먼치킨'],                            note:'짧은 다리로 관절·척추 부담, 요로 이상 소인 → pH·비중 관찰' },
    { keys:['벵갈','뱅갈'],                       note:'심근증(HCM), 조기 신부전 소인 → 단백질·비중 집중' },
    { keys:['코리안 숏헤어','코숏','한국 숏헤어'],  note:'국내 개체군 흔한 요로결석·비만 → pH·비중·포도당 관찰' },
  ];
  for (const b of breedRules) {
    if (b.keys.some(k => breed.includes(k.toLowerCase()))) {
      risks.push(`품종 특이: ${b.note}`);
      break;
    }
  }

  return risks.length > 0 ? risks.join('\n') : '특별한 통계적 고위험 요소 없음 (일반 건강 관리 수준 유지)';
}

// ════════════════════════════════════════════════════════════════
// ★ 사람용 프로필 (v12: 키·체중·알레르기·복용중·사주 추가)
// ════════════════════════════════════════════════════════════════
function buildHumanProfile(recordData) {
  if (!recordData) return '정보 없음';
  const lines = [];
  if (recordData.name) lines.push(`이름: ${recordData.name}`);
  if (recordData.gender) {
    const g = recordData.gender === 'male' ? '남성'
      : recordData.gender === 'female' ? '여성' : recordData.gender;
    lines.push(`성별: ${g}`);
  }
  if (recordData.birthYear) {
    const currentYear = new Date().getFullYear();
    const age = currentYear - parseInt(recordData.birthYear);
    let ageGroup;
    if (age < 20)       ageGroup = `${age}세 (10대 이하)`;
    else if (age < 30)  ageGroup = `${age}세 (20대)`;
    else if (age < 40)  ageGroup = `${age}세 (30대)`;
    else if (age < 50)  ageGroup = `${age}세 (40대)`;
    else if (age < 60)  ageGroup = `${age}세 (50대)`;
    else if (age < 70)  ageGroup = `${age}세 (60대)`;
    else                ageGroup = `${age}세 (70대 이상)`;
    lines.push(`나이: ${ageGroup}`);
    if (recordData.birthMonth) lines.push(`생년월: ${recordData.birthYear}년 ${recordData.birthMonth}월생`);
  }
  // v12: 키·체중 → BMI 계산 · 체형 태그
  if (recordData.height) lines.push(`키: ${recordData.height}cm`);
  if (recordData.weight) lines.push(`체중: ${recordData.weight}kg`);
  if (recordData.height && recordData.weight) {
    const h = parseFloat(recordData.height) / 100;
    const w = parseFloat(recordData.weight);
    if (h > 0.5 && w > 0) {
      const bmi = w / (h * h);
      let bmiLabel;
      if (bmi < 18.5) bmiLabel = '저체중';
      else if (bmi < 23) bmiLabel = '정상';
      else if (bmi < 25) bmiLabel = '과체중';
      else if (bmi < 30) bmiLabel = '비만 1단계';
      else bmiLabel = '비만 2단계 이상';
      lines.push(`BMI: ${bmi.toFixed(1)} (${bmiLabel})`);
    }
  }
  if (recordData.region) lines.push(`거주 지역: ${recordData.region}`);
  if (recordData.lifestyle) {
    const lsMap = {
      sedentary: '좌식/사무직 위주 (활동량 적음)',
      active:    '활동적 (운동 자주, 외부 활동 많음)',
      mixed:     '혼합 (적당한 활동량)',
      shift:     '교대근무/불규칙 생활',
    };
    lines.push(`생활 패턴: ${lsMap[recordData.lifestyle] || recordData.lifestyle}`);
  }
  // v12 신규
  const extra = renderAllergyBlock(recordData) + renderCurrentSupplementsBlock(recordData) + renderSajuBlock(recordData);
  return (lines.length > 0 ? lines.join('\n') : '정보 없음') + extra;
}

// ────────────────────────────────────────────────────────────────
// 사람 통계 위험 (v12: BMI 리스크 추가)
// ────────────────────────────────────────────────────────────────
function buildHumanStatisticalRisk(recordData) {
  if (!recordData) return '통계 데이터 없음';
  const risks = [];
  if (recordData.birthYear) {
    const age = new Date().getFullYear() - parseInt(recordData.birthYear);
    if (age >= 70) risks.push('70대 이상: 만성 신질환, 당뇨, 전립선(남)/호르몬성 요실금(여), 빈혈 고위험 → 비중·단백질·포도당·잠혈 집중');
    else if (age >= 60) risks.push('60대: 만성 신질환 초기, 고혈압 연관 신기능 저하, 당뇨 위험 → 비중·단백질·포도당 주목');
    else if (age >= 50) risks.push('50대: 갱년기 호르몬 변화, 대사증후군, 전립선 비대(남) → pH·단백질·잠혈 모니터링');
    else if (age >= 40) risks.push('40대: 대사증후군 초기, 요로결석, 만성 피로 관련 → pH·비중·케톤 주의');
    else if (age >= 30) risks.push('30대: 직업 스트레스성 피로, 수분 부족, 식습관 불균형 → 비중·pH 모니터링');
    else if (age >= 20) risks.push('20대: 급성 방광염(여), 식습관/수분 섭취 불균형 → 백혈구·아질산염·비중 확인');
    else risks.push('20대 이하: 급성 감염, 식습관 불균형 → 백혈구·아질산염 주의');
  }
  if (recordData.gender === 'male') risks.push('남성: 전립선 비대/전립선염, 요도 협착 → 백혈구·아질산염·잠혈. 50대 이후 위험 증가');
  else if (recordData.gender === 'female') risks.push('여성: 방광염(세균성) 다발, 갱년기 후 호르몬성 요로 변화, 임신·생리 관련 잠혈 → 백혈구·아질산염·단백질 집중');

  if (recordData.lifestyle === 'sedentary') risks.push('좌식/사무직: 수분 섭취 부족, 요로결석·비만 → 비중·pH·잠혈 집중');
  else if (recordData.lifestyle === 'active') risks.push('활동적: 운동성 단백뇨(일시적), 탈수성 농축뇨 → 단백질·비중·케톤 주의');
  else if (recordData.lifestyle === 'shift') risks.push('교대/불규칙: 수면 부족·호르몬 불균형 → 비중·pH·포도당 모니터링');

  // v12: BMI 위험
  if (recordData.height && recordData.weight) {
    const h = parseFloat(recordData.height) / 100;
    const bmi = parseFloat(recordData.weight) / (h * h);
    if (bmi >= 30) risks.push('비만 2단계 이상: 대사증후군·당뇨·고혈압·지방간 고위험 → 포도당·단백질·비중 집중');
    else if (bmi >= 25) risks.push('비만 1단계: 대사증후군 소인, 지방간·요로결석 위험 → 포도당·pH·비중 주의');
    else if (bmi < 18.5) risks.push('저체중: 면역력 저하, 영양 결핍성 빈혈 → 단백질·케톤 주의');
  }

  const region = recordData.region || '';
  const isUrban = ['서울','부산','대구','인천','광주','대전','울산','세종'].some(c => region.includes(c));
  if (isUrban) risks.push('도시 거주: 스트레스, 가공식품 노출, 미세먼지 영향 → 단백질·잠혈 주의');

  return risks.length > 0 ? risks.join('\n') : '특별한 통계적 고위험 요소 없음 (일반 건강 관리 수준 유지)';
}
