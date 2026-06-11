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

    // ────────────────────────────────────────────────────────
    //  분석 대상에 따라 프로필 / 위험 / 프롬프트 분기
    // ────────────────────────────────────────────────────────
    const isHuman = subject === 'human';

    const profile  = isHuman
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

    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return res.status(500).json({ error: '결과 형식을 읽지 못했습니다.' });

    const result = JSON.parse(jsonMatch[0]);
    if (result.error) return res.status(400).json({ error: result.error });

    // subtleChangeNote 강제 설정 (AI가 빠뜨릴 경우 대비)
    result.subtleChangeNote = result.subtleChangeNote ||
      '미세한 수치 변화가 감지되었습니다. 아래 건강관리 내용을 주의 깊게 확인해 주세요.';

    // ── 분석 대상 라벨도 결과에 추가 ──
    result.subject = isHuman ? 'human' : 'pet';

    // Supabase에 기록 저장
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

// ════════════════════════════════════════════════════════════════
// ★ 반려동물용 프롬프트 (기존 그대로 — 함수로 감싸기만 함)
// ════════════════════════════════════════════════════════════════
function buildPetPrompt(petProfile, statRisk) {
  return `당신은 반려동물 소변검사 전문 AI이자 수의학 건강 분석 전문가입니다. 제공된 소변검사 키트 이미지를 분석하고, 아래 반려동물 프로필 및 통계적 위험 데이터를 내부 참고 자료로만 활용하여 깊이 있는 맞춤 분석을 제공하세요.
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
=== 영양제 추천 규칙 (수의사 수준 처방) ===
8. 당신은 20년 경력의 임상 수의사이자 반려동물 영양 전문가입니다. 단순 나열이 아닌 "수의사 처방전" 짜듯 추천하세요.

[8-1] 다층 구조 (Layered Stack) — 최소 5가지 추천
   - 기본(Base) 1~2개: 종·연령 기준 누구나 필요 (예: 강아지·고양이 종합비타민, 오메가3 EPA/DHA, 프로바이오틱스)
   - 타겟(Target) 2~3개: 검사 수치 약점 보완
      · 단백뇨→실리마린(밀크씨슬), 신장 보조(SDMA/BUN)
      · 잠혈→크랜베리 추출물·D-만노스(요로 보조)
      · 빌리루빈↑→실리마린·SAMe(간 보조)
      · pH 불균형→포타슘 시트레이트(결석 예방)
      · 백혈구↑→베타글루칸·비타민C(면역)
      · 비중↑→음수 촉진제(수분 부족 신호)
      · 케톤→타우린(에너지 대사)
   - 부스터(Boost) 1~2개: 품종·환경 보완
      · 노령(7세+)→글루코사민·콘드로이틴(관절), CoQ10(심장)
      · 실외→스피루리나·아연(해독)
      · 실내→오메가3(피부·털), L-카르니틴(비만 예방)
      · 소형견→덴탈케어(치석), 큰 품종→대형견 관절

[8-2] 시너지 조합 명시 (synergy 필드)
   - 오메가3 ↔ 비타민E (산화 방지)
   - 실리마린 ↔ SAMe (간 회복 시너지)
   - 크랜베리 ↔ D-만노스 (요로 박테리아 차단)
   - 글루코사민 ↔ 콘드로이틴 + MSM (관절 통합)
   - 프로바이오틱스 ↔ 프리바이오틱스 (장 건강)
   - 타우린 ↔ L-카르니틴 (심장·에너지)

[8-3] 복용 타이밍 (timing 필드)
   - 지용성(오메가3·비타민D·CoQ10): "식사와 함께 (사료에 섞어서)"
   - 수용성(B군·C): "사료와 별개로 가능"
   - 프로바이오틱스: "공복 (사료 1~2시간 전)"
   - 관절제(글루코사민): "사료와 함께 매일 같은 시간"

[8-4] 권장 용량 (dosage 필드)
   - 체중 kg당 용량으로 명시 (강아지·고양이 다름)
      · 오메가3 EPA+DHA: 강아지 20~55mg/kg, 고양이 10~30mg/kg
      · 글루코사민: 강아지 20mg/kg, 고양이 12~15mg/kg
      · 프로바이오틱스: 1~5억 CFU/일 (체중 무관)
      · 밀크씨슬: 50~250mg/일 (체중에 따라)
   - 또는 "소형견/중형견/대형견" 가이드로 표기

[8-5] 상호작용·안전성 주의 (caution 필드)
   - 고양이는 알리움(마늘·양파 추출물) 절대 금지
   - 강아지 자일리톨 금지
   - 신장 기능 약한 노령: 인·칼슘 과다 주의
   - 임신·수유 중인 모견: 비타민A 고용량 금기
   - 항응고제 복용 중: 오메가3·은행 주의
   - 만성질환자: 수의사 사전 상담 필수 표시

[8-6] 한국 시장 현실 (Practical)
   - 국내에서 구할 수 있는 반려동물 전용 제품 (사람용 영양제 금지!)
   - 흔한 국내 제품군: 오메가3(연어유), 프로바이오틱스(펫퍼블), 관절(코세콴·다솜본), 간(헤파포스), 요로(유로크린·크랜베리)
   - 동물병원 처방 vs 일반 펫샵 제품 구분 안내

[8-7] 조합 처방 (supplementCombo 필드 — 종합 정리)
   - morningStack: 아침 사료와 함께 줄 영양제 (식후/식간 구분)
   - eveningStack: 저녁 사료와 함께 줄 영양제
   - synergyNote: 왜 이 조합인지 수의사 관점 설명 2~3문장
   - estimatedMonthlyCost: 월 예상 비용 범위 (예: "월 2~4만원")
   - timingTip: 흡수율을 극대화하는 급여 팁 1문장 (예: "오메가3는 사료에 섞어 신선도 유지")
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
      "name": "반려동물 전용 영양제 성분명 (예: 연어유 오메가3 EPA+DHA, 글루코사민+콘드로이틴, 펫 프로바이오틱스, 밀크씨슬(실리마린), 크랜베리 추출물, 타우린 등)",
      "category": "기본 또는 타겟 또는 부스터",
      "reason": "이번 검사 수치에서 이 영양제가 필요한 이유 1문장",
      "constitutionBasis": "품종·연령·환경 기반 추천 근거 1문장",
      "dosage": "체중 기준 권장 용량 (예: 체중 1kg당 30mg, 소형견 1캡슐/일 등)",
      "timing": "급여 타이밍 (예: 아침 사료에 섞어서, 저녁 사료와 함께)",
      "synergy": "함께 급여하면 시너지가 좋은 영양제 (없으면 '단독 급여 OK')",
      "caution": "급여 시 주의사항 또는 금기 (없으면 '특별한 주의 사항 없음')",
      "priority": "필수 또는 권장 또는 선택"
    }
  ],
  "supplementCombo": {
    "morningStack": ["아침 사료와 함께 줄 영양제 (식후/식간 구분 표시)"],
    "eveningStack": ["저녁 사료와 함께 줄 영양제"],
    "synergyNote": "왜 이 조합인지 수의사 관점 설명 2~3문장",
    "estimatedMonthlyCost": "월 예상 비용 범위 (예: 월 2~4만원)",
    "timingTip": "흡수율을 극대화하는 급여 팁 1문장"
  },
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
2. 사주, 생년월일, 지역명, 직업, 생활 패턴, 나이 등을 설명문에 직접 언급하지 마세요.
3. 내부 참고 데이터에서 도출한 건강 인사이트는 자연스럽게 소변검사 결과 해석에 녹여서 표현하세요.
   예시(나쁜 예): "30대 사무직이라 운동 부족 위험이 있습니다"
   예시(좋은 예): "소변 비중과 pH 수치를 종합하면 수분 섭취량이 부족하고 활동량이 적은 패턴이 감지됩니다"
4. 권장 영양제·식단·운동도 모두 "이번 검사 수치를 바탕으로"라는 맥락으로 자연스럽게 제시하세요.
5. 내부 데이터(나이·성별·생활 패턴 등)를 반영해 실질적으로 더 정확하고 풍부한 내용을 담아야 합니다.
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
   - 기본(Base) 1~2개: 나이·성별 기준 누구나 필요 (예: 비타민D3+K2, 마그네슘, 종합비타민)
   - 타겟(Target) 2~3개: 검사 수치 약점 보완 (예: 단백뇨→타우린, 잠혈→크랜베리, 빌리루빈↑→밀크씨슬, 케톤→크롬, pH불균형→프로바이오틱스, 백혈구↑→비타민C+아연, 비중↑→수분+전해질)
   - 부스터(Boost) 1~2개: 생활 패턴 보완 (좌식→오메가3·CoQ10, 야간근무→테아닌·아슈와간다, 음주→NAC·밀크씨슬, 흡연→비타민C·셀레늄, 활동적→BCAA·마그네슘)

[8-2] 시너지 조합 명시 (synergy 필드)
   - 비타민D ↔ 칼슘+K2 (뼈·심혈관)
   - 오메가3 ↔ 비타민E (산화 방지)
   - 마그네슘 ↔ B6 (스트레스·수면)
   - 프로바이오틱스 ↔ 프리바이오틱스/식이섬유 (장)
   - 철분 ↔ 비타민C (흡수↑)
   - CoQ10 ↔ 셀레늄 (에너지·심장)

[8-3] 복용 타이밍 (timing 필드 — 흡수율 극대화)
   - 지용성(A,D,E,K, 오메가3, CoQ10): "아침 식후" (지방과 함께)
   - 수용성(B군, C): "아침 공복 or 식간"
   - 마그네슘 글리시네이트/말산: "저녁 식후 or 자기 전" (수면 도움)
   - 프로바이오틱스: "아침 공복 (기상 직후)"
   - 철분: "공복 + 비타민C와 함께 (커피·차 X)"

[8-4] 권장 용량 (dosage 필드)
   - 일반인 안전 용량으로 명시 (예: "비타민D3 2000IU/일", "오메가3 EPA+DHA 1000~2000mg/일", "마그네슘 글리시네이트 300~400mg/일")
   - 국내 식약처 권장량 기준

[8-5] 상호작용·안전성 주의 (caution 필드)
   - 항응고제(와파린) 복용 시: 오메가3·비타민K·은행잎 → "의사 상담 후"
   - 갑상선 약: 칼슘·철분 → "4시간 시간차 복용"
   - 혈압약: 칼륨·감초 주의
   - 임신·수유 중: 고용량 비타민A 금기 표시
   - 만성질환자: 신장 기능 약하면 마그네슘·칼륨 주의

[8-6] 한국 시장 현실
   - 국내에서 구할 수 있는 일반명/성분명만 (해외 직구 제품 X)
   - 흔한 제품 예: 종합비타민, 오메가3, 비타민D, 마그네슘, 프로바이오틱스, 밀크씨슬, 크랜베리, CoQ10, 루테인, 콜라겐

[8-7] 조합 처방 (supplementCombo 필드 — 종합 정리)
   - morningStack: 아침에 함께 먹을 영양제 리스트 (식후/공복 구분)
   - eveningStack: 저녁/자기 전 영양제 리스트
   - synergyNote: 왜 이 조합인지 약사 관점 설명 2~3문장
   - estimatedMonthlyCost: 월 예상 비용 범위 (예: "월 3~5만원")
   - timingTip: 흡수율 극대화 팁 1문장
=== 의료 면책 규칙 ⚠️ ===
9. 사용자는 일반인이므로 다음을 반드시 지키세요:
   - "질병 진단" 단정 금지 ("OO일 가능성이 있어요" 같은 가능성 어조)
   - 우려되는 수치는 반드시 "병원/의사 상담을 권장합니다"로 마무리
   - urgency가 'urgent'면 "가능한 빠른 시일 내 병원 방문 권장"
아래 JSON 형식으로만 응답하세요. 설명 없이 순수 JSON만 반환하세요.
{
  "testItems": [
    {
      "name": "항목명(pH, 단백질, 포도당, 잠혈, 케톤, 백혈구, 아질산염, 비중, 빌리루빈, 우로빌리노겐 등 이미지에서 확인되는 모든 항목)",
      "value": "측정값 또는 색상 단계(예: 6.5, 음성, +1, 정상 등)",
      "status": "normal 또는 warning 또는 danger",
      "description": "이 항목 수치에 대한 한국어 해석 1~2문장 (키트 수치 분석 맥락으로만 표현)",
      "focusNote": "이 항목에서 주목해야 할 미세한 변화나 잠재적 패턴 (정상이어도 관찰 포인트 제시, 없으면 null)"
    }
  ],
  "overallStatus": "normal 또는 warning 또는 danger",
  "subtleChangeNote": "미세한 수치 변화가 감지되었습니다. 아래 건강관리 내용을 주의 깊게 확인해 주세요.",
  "focusAreas": ["집중 관리가 필요한 수치 영역1", "영역2", "영역3"],
  "summary": "소변검사 수치를 종합한 건강 상태 평가 2~3문장. 정상이더라도 반드시 미세한 색상 변화 관찰 문구 포함",
  "envAnalysis": "이번 검사에서 감지된 생활 패턴 관련 건강 포인트 2문장 (지역·생활 직접 언급 없이, 수치에서 유추되는 것처럼 표현)",
  "breedAgeAnalysis": "수치 패턴에서 나타나는 체질·연령대별 건강 특이사항 1~2문장 (나이·성별 직접 언급 없이)",
  "constitutionHealthPoints": "검사기반 체질 건강포인트 - 통계적 위험 요소와 수치 패턴을 결합한 체질 분석 2~3문장",
  "statisticalRiskNote": "이 사용자의 통계적 취약 요소를 수치 패턴으로 표현한 관찰 사항 1~2문장",
  "tips": ["이번 검사 결과를 바탕으로 한 맞춤 관리 팁1", "관리 팁2", "관리 팁3", "관리 팁4"],
  "supplements": [
    {
      "name": "영양제 성분명 (예: 비타민D3 2000IU, 마그네슘 글리시네이트 300mg, 오메가3 EPA+DHA 1000mg, 크랜베리 추출물, 프로바이오틱스 100억 CFU 등)",
      "category": "기본 또는 타겟 또는 부스터",
      "reason": "이번 검사 수치에서 이 영양제가 필요한 이유 1문장",
      "constitutionBasis": "체질·연령·생활 패턴 기반 추천 근거 1문장",
      "dosage": "권장 용량 (예: 하루 2000IU, 300mg 1회 등)",
      "timing": "복용 타이밍 (예: 아침 식후, 저녁 자기 전 등)",
      "synergy": "함께 먹으면 시너지가 좋은 영양제 (없으면 '단독 복용 OK')",
      "caution": "복용 시 주의사항 또는 금기 (없으면 '특별한 주의 사항 없음')",
      "priority": "필수 또는 권장 또는 선택"
    }
  ],
  "supplementCombo": {
    "morningStack": ["아침에 함께 복용 (식후/공복 구분 표시)"],
    "eveningStack": ["저녁/자기 전 복용 영양제"],
    "synergyNote": "왜 이 조합인지 약사 관점 설명 2~3문장",
    "estimatedMonthlyCost": "월 예상 비용 범위 (예: 월 3~5만원)",
    "timingTip": "흡수율을 극대화하는 복용 팁 1문장"
  },
  "foodRecommendation": {
    "type": "이번 검사 결과에 맞는 권장 식단 유형 (예: 저나트륨 지중해식, 고섬유 식단 등)",
    "ingredients": ["권장 음식/성분1", "권장2", "권장3"],
    "avoid": ["검사 수치상 피해야 할 음식/성분1", "피해야 할 것2"],
    "waterIntake": "이번 수치 기준 하루 권장 수분 섭취 안내 1문장"
  },
  "exerciseRecommendation": {
    "frequency": "이번 검사 결과에 맞는 권장 운동 빈도",
    "type": ["권장 운동 유형1 (예: 걷기, 요가, 스트레칭)", "유형2"],
    "caution": "검사 수치를 고려한 운동 시 주의사항 1~2문장",
    "indoorTips": "검사 결과를 바탕으로 한 일상 생활 팁 1문장"
  },
  "vetVisitRecommended": true,
  "urgency": "normal 또는 soon 또는 urgent",
  "medicalDisclaimer": "본 결과는 의학적 진단이 아닌 일반 건강 정보입니다. 증상이 지속되거나 우려되는 경우 반드시 의료 전문가의 진료를 받으세요."
}
소변검사 키트가 아닌 이미지라면: {"error": "소변검사 키트 이미지를 다시 업로드해 주세요."}`;
}

// ─── 반려동물 기본 프로필 생성 (기존) ──────────────────────────────────────
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

// ─── 반려동물 통계 기반 위험 요소 (기존) ────────────────────────────────────
function buildStatisticalRisk(recordData) {
  if (!recordData) return '통계 데이터 없음';
  const risks = [];
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
  if (recordData.gender === 'male') {
    risks.push('수컷: 전립선 비대/전립선염 → 요도 협착, 배뇨 어려움, 혈뇨 패턴 주의. 아질산염·백혈구·잠혈 수치 집중 확인');
  } else if (recordData.gender === 'female') {
    risks.push('암컷: 방광염(세균성), 자궁축농증 연관 요로감염 → 백혈구·아질산염·단백질 수치 집중 확인. 중성화 여부에 따라 호르몬성 요실금 패턴 주의');
  }
  if (recordData.environment === 'outdoor') {
    risks.push('실외 거주: 세균성 방광염(대장균 등), 기생충 연관 신장 손상, 독소 노출 → 아질산염·백혈구·단백질·잠혈 수치에서 감염 패턴 확인');
  } else if (recordData.environment === 'indoor') {
    risks.push('실내 거주: 수분 부족, 운동 부족, 비만 연관 요로결석(스트루바이트·수산칼슘) → 소변 비중·pH·잠혈 패턴 집중 확인');
  }
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

// ════════════════════════════════════════════════════════════════
// ★ 사람용 기본 프로필 생성
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
  return lines.length > 0 ? lines.join('\n') : '정보 없음';
}

// ════════════════════════════════════════════════════════════════
// ★ 사람용 통계 기반 위험 요소
// ════════════════════════════════════════════════════════════════
function buildHumanStatisticalRisk(recordData) {
  if (!recordData) return '통계 데이터 없음';
  const risks = [];

  // ── 나이 기반 ──
  if (recordData.birthYear) {
    const age = new Date().getFullYear() - parseInt(recordData.birthYear);
    if (age >= 70) {
      risks.push('70대 이상: 만성 신질환, 당뇨, 전립선암(남)/호르몬성 요실금(여), 빈혈 고위험군 → 비중·단백질·포도당·잠혈 수치 집중 모니터링');
    } else if (age >= 60) {
      risks.push('60대: 만성 신질환 초기, 고혈압 연관 신기능 저하, 당뇨 위험 증가 → 비중·단백질·포도당 패턴 주목');
    } else if (age >= 50) {
      risks.push('50대: 갱년기 호르몬 변화, 대사증후군, 전립선 비대(남) → pH·단백질·잠혈 패턴 모니터링');
    } else if (age >= 40) {
      risks.push('40대: 대사증후군 초기, 요로결석, 만성 피로 관련 수치 변화 → pH·비중·케톤 패턴 주의');
    } else if (age >= 30) {
      risks.push('30대: 직업 스트레스성 피로, 수분 부족, 식습관 불균형 패턴 → 비중·pH 모니터링');
    } else if (age >= 20) {
      risks.push('20대: 급성 방광염(여), 식습관/수분 섭취 불균형 → 백혈구·아질산염·비중 수치 확인');
    } else {
      risks.push('20대 이하: 급성 감염, 식습관 불균형 → 백혈구·아질산염 패턴 주의');
    }
  }

  // ── 성별 기반 ──
  if (recordData.gender === 'male') {
    risks.push('남성: 전립선 비대/전립선염, 요도 협착 → 백혈구·아질산염·잠혈 패턴 주목. 50대 이후 전립선 위험 증가');
  } else if (recordData.gender === 'female') {
    risks.push('여성: 방광염(세균성) 다발, 갱년기 후 호르몬성 요로 변화, 임신·생리 관련 잠혈 패턴 → 백혈구·아질산염·단백질 집중 확인');
  }

  // ── 생활 패턴 기반 ──
  if (recordData.lifestyle === 'sedentary') {
    risks.push('좌식/사무직: 수분 섭취 부족, 운동 부족 연관 요로결석·비만 → 비중·pH·잠혈 패턴 집중 확인');
  } else if (recordData.lifestyle === 'active') {
    risks.push('활동적: 운동성 단백뇨(일시적), 탈수성 농축뇨 가능 → 단백질·비중·케톤 패턴 주의');
  } else if (recordData.lifestyle === 'shift') {
    risks.push('교대/불규칙: 수면 부족·호르몬 불균형 연관 신기능 영향 → 비중·pH·포도당 패턴 모니터링');
  }

  // ── 지역 기반 ──
  const region = recordData.region || '';
  const isUrban = ['서울','부산','대구','인천','광주','대전','울산','세종'].some(c => region.includes(c));
  if (isUrban) {
    risks.push('도시 거주: 스트레스, 가공식품 노출, 미세먼지 영향 가능 → 단백질·잠혈 패턴 주의');
  }

  return risks.length > 0 ? risks.join('\n') : '특별한 통계적 고위험 요소 없음 (일반 건강 관리 수준 유지)';
}
