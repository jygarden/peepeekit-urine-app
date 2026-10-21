// ════════════════════════════════════════════════════════════════
// 건강어때 2.0 · 식단 사진 분석 API
// 위치: /api/analyze-food.js
//
// 두 가지 모드:
//   1. detect  · 이미지 → 음식명 + 1인분 대비 양 추정 (수치 발명 X)
//   2. analyze · 확정된 음식 리스트 → 코칭 텍스트 (행동 중심 · 습관 코칭)
//
// 건강어때 3원칙:
//   ① 영양제를 추천하기 전에 음식을 추천한다
//   ② 숫자를 보여주기 전에 행동을 알려준다
//   ③ 한 끼를 평가하지 않고 식습관을 코칭한다
//
// 중요: AI는 인식·분류만. 실제 영양소 숫자는 프론트가 KOREAN_FOOD_DB에서 조회.
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
    const { mode = 'detect', imageB64, target = 'human', confirmedFoods, mealTime, userProfile, todayMeals, userMemo, store } = req.body;
    const memo = String(userMemo || '').trim().slice(0, 200); // 최대 200자 안전 컷
    // 🏪 매장 태그 (선택) · 있으면 블로그 검색 정확도 UP
    const storeInfo = store && store.title ? {
      title: String(store.title).slice(0, 60),
      category: String(store.category || '').slice(0, 40),
      address: String(store.address || '').slice(0, 80)
    } : null;

    if (mode === 'detect') {
      if (!imageB64) return res.status(400).json({ error: '이미지 데이터가 없습니다.' });
      return await runDetect({ apiKey, imageB64, target, userMemo: memo, store: storeInfo, res });
    }

    if (mode === 'analyze') {
      if (!confirmedFoods || !confirmedFoods.length) return res.status(400).json({ error: '확정된 음식 리스트가 없습니다.' });
      return await runAnalyze({ apiKey, target, confirmedFoods, mealTime, userProfile, todayMeals, userMemo: memo, store: storeInfo, res });
    }

    return res.status(400).json({ error: `알 수 없는 mode: ${mode}` });
  } catch (err) {
    console.error('[analyze-food]', err);
    return res.status(500).json({ error: err.message || '서버 오류가 발생했습니다.' });
  }
};

// ═══ 크라우드소싱 조회 · Supabase에서 이전 수정 데이터 힌트 ═══
async function fetchCrowdHints(brand, foodName) {
  try {
    const url = process.env.SUPABASE_URL;
    const anon = process.env.SUPABASE_ANON_KEY;
    if (!url || !anon || !foodName) return null;
    const { createClient } = require('@supabase/supabase-js');
    const supabase = createClient(url, anon);
    let query = supabase
      .from('crowd_corrections')
      .select('ingredients, portion')
      .ilike('food_name', `%${foodName.trim()}%`);
    if (brand && brand.trim()) {
      query = query.ilike('brand', `%${brand.trim()}%`);
    }
    const { data, error } = await query.order('created_at', { ascending: false }).limit(50);
    if (error || !data || data.length === 0) return null;
    const ingCount = {};
    data.forEach(r => {
      (r.ingredients || []).forEach(ing => {
        const name = typeof ing === 'string' ? ing : (ing.name || '');
        if (name) ingCount[name] = (ingCount[name] || 0) + 1;
      });
    });
    const top = Object.entries(ingCount).sort((a,b)=>b[1]-a[1]).slice(0,8);
    return {
      confidence: data.length,
      topIngredients: top.map(([n,c]) => ({ name: n, count: c }))
    };
  } catch (e) {
    return null;
  }
}

// ═══ 카카오 블로그 검색 · 메뉴 힌트 추출용 (주력) ═══
// 2025년 네이버가 developers.naver.com에서 검색 API를 뺐음 → 카카오로 대체
// 기존 KAKAO_REST_API_KEY 그대로 사용 (추가 가입 불필요)
async function fetchKakaoBlogHints(query) {
  const key = process.env.KAKAO_REST_API_KEY;
  if (!query || !key) return null;
  try {
    const url = `https://dapi.kakao.com/v2/search/blog?query=${encodeURIComponent(query)}&size=10&sort=accuracy`;
    const r = await fetch(url, {
      headers: { 'Authorization': `KakaoAK ${key}` }
    });
    if (!r.ok) {
      console.error('[kakao-blog]', r.status, (await r.text()).slice(0, 200));
      return null;
    }
    const data = await r.json();
    if (!data.documents || !data.documents.length) return null;
    // 최근 2년 필터 · HTML 태그 제거 · 상위 10개
    const twoYearsAgo = Number(new Date().getFullYear()) - 2;
    return data.documents
      .filter(it => {
        const y = it.datetime ? Number(String(it.datetime).slice(0, 4)) : null;
        return !y || y >= twoYearsAgo;
      })
      .map(it => ({
        t: (it.title || '').replace(/<[^>]+>/g, '').slice(0, 80),
        d: (it.contents || '').replace(/<[^>]+>/g, '').slice(0, 220)
      }));
  } catch (e) {
    console.error('kakao blog hint fetch fail', e.message);
    return null;
  }
}

// ═══ 네이버 블로그 검색 (폴백 · developers.naver.com 복구 시 자동 사용) ═══
async function fetchNaverBlogHints(query) {
  // 1차: 카카오 블로그 검색 (주력, 2025년 기준)
  const kakaoResult = await fetchKakaoBlogHints(query);
  if (kakaoResult && kakaoResult.length) return kakaoResult;

  // 2차 폴백: 네이버 (키 있을 때만 · 지금은 안 쓰이지만 유지)
  const keyId = process.env.NCP_API_KEY_ID;
  const key = process.env.NCP_API_KEY;
  const navId = process.env.NAVER_CLIENT_ID;
  const navSecret = process.env.NAVER_CLIENT_SECRET;
  if (!query) return null;
  const useNcp = !!(keyId && key);
  const useNav = !!(navId && navSecret);
  if (!useNcp && !useNav) return null;
  try {
    const url = useNcp
      ? `https://naveropenapi.apigw.ntruss.com/search/v1/blog?query=${encodeURIComponent(query)}&display=5&sort=sim`
      : `https://openapi.naver.com/v1/search/blog.json?query=${encodeURIComponent(query)}&display=5&sort=sim`;
    const headers = useNcp
      ? { 'X-NCP-APIGW-API-KEY-ID': keyId, 'X-NCP-APIGW-API-KEY': key }
      : { 'X-Naver-Client-Id': navId, 'X-Naver-Client-Secret': navSecret };
    const r = await fetch(url, { headers });
    if (!r.ok) return null;
    const data = await r.json();
    if (!data.items || !data.items.length) return null;
    const twoYearsAgo = Number(new Date().getFullYear()) - 2;
    return data.items
      .filter(it => {
        const y = it.postdate ? Number(String(it.postdate).slice(0, 4)) : null;
        return !y || y >= twoYearsAgo;
      })
      .map(it => ({
        t: (it.title || '').replace(/<[^>]+>/g, '').slice(0, 80),
        d: (it.description || '').replace(/<[^>]+>/g, '').slice(0, 220)
      }));
  } catch (e) {
    console.error('naver hint fetch fail', e.message);
    return null;
  }
}

// ═══ 블로그 후기에서 실제 메뉴명 추출 (매장별 메뉴 리스트) ═══
// 음식 suffix 패턴 매칭 + 매장 카테고리 교차 검증
function extractMenuCandidates(hints, store) {
  if (!hints || !hints.length) return [];
  const menuMap = {};
  const foodSuffixes = /(찌개|국밥|국수|냉면|짜장면|짬뽕|탕수육|우동|라면|파스타|피자|샐러드|버거|샌드위치|스테이크|리조또|타코|부리또|초밥|회덮밥|비빔밥|볶음밥|덮밥|도시락|한정식|정식|세트|콤보|메뉴|도리아|오므라이스|규동|가츠동|돈까스|포케|보울|플레이트|딤섬|쌀국수|마라탕|훠궈|족발|보쌈|곱창|막창|닭갈비|불고기|제육|삼겹살|목살|갈비|구이|볶음|조림|튀김|전|회|탕|죽|떡볶이|순대|어묵|김밥|토스트)/;
  const foodPattern = /([가-힣A-Za-z0-9&\s]{2,15}?(?:찌개|국밥|국수|냉면|짜장면|짬뽕|탕수육|우동|라면|파스타|피자|샐러드|버거|샌드위치|스테이크|리조또|타코|부리또|초밥|회덮밥|비빔밥|볶음밥|덮밥|도시락|정식|세트|콤보|도리아|오므라이스|규동|가츠동|돈까스|포케|보울|플레이트|딤섬|쌀국수|마라탕|훠궈|족발|보쌈|닭갈비|불고기|제육|삼겹살|목살|갈비|구이|볶음|조림|튀김|회|탕|죽|떡볶이|순대|어묵|김밥|토스트))/g;

  hints.forEach(h => {
    const text = (h.t || '') + ' ' + (h.d || '');
    const matches = text.match(foodPattern) || [];
    matches.forEach(m => {
      const clean = m.trim().replace(/^(이|그|저|먹었던|시킨|주문한|제가|우리는|친구가|여기|이집)\s*/, '');
      if (clean.length >= 2 && clean.length <= 15 && foodSuffixes.test(clean)) {
        menuMap[clean] = (menuMap[clean] || 0) + 1;
      }
    });
  });

  // 🎯 매장 카테고리로 교차 검증 (매장이 안 파는 음식 거절)
  const cat = ((store && store.category) || '').toLowerCase();
  const title = ((store && store.title) || '').toLowerCase();
  const combinedTag = cat + ' ' + title;

  // 카테고리 → 허용 음식 suffix 매핑
  // (매장이 '갈매기살 전문점'이면 '순대국' 같은 다른 카테고리 음식 제외)
  const categoryRules = [
    { keywords:['갈매기','삼겹살','목살','항정살','구이','고기구이','숯불','화로','그릴','바베큐','스테이크'],
      allow: /(갈매기|삼겹|목살|항정|구이|숯불|불고기|제육|갈비|스테이크|고기|냉면|된장|찌개|볶음|무침|쌈)/ },
    { keywords:['닭','치킨','통닭','후라이드'],
      allow: /(치킨|닭|후라이드|양념|파닭|순살|날개|다리|무|콜라)/ },
    { keywords:['국밥','국수','칼국수','설렁탕','곰탕','해장','순대'],
      allow: /(국밥|국수|칼국수|설렁|곰탕|해장|순대|탕|밥|찌개|볶음)/ },
    { keywords:['분식','떡볶이','김밥','토스트','만두'],
      allow: /(떡볶이|김밥|라면|우동|만두|튀김|순대|어묵|토스트|돈까스|오므라이스)/ },
    { keywords:['카페','베이커리','디저트','브런치'],
      allow: /(토스트|샌드위치|샐러드|파스타|피자|리조또|오믈렛|팬케이크|와플|브런치|스콘|머핀|케이크)/ },
    { keywords:['중식','차이니즈','중화'],
      allow: /(짜장면|짬뽕|탕수육|볶음밥|마라탕|훠궈|딤섬|양장피|기스면|우동)/ },
    { keywords:['일식','스시','초밥','라멘','우동','돈카츠','돈까스','돈부리'],
      allow: /(초밥|회덮밥|라멘|우동|규동|가츠동|돈까스|돈부리|사시미|회|튀김|덮밥)/ },
    { keywords:['양식','파스타','피자','스테이크','햄버거','버거'],
      allow: /(파스타|피자|스테이크|리조또|샐러드|버거|샌드위치|타코|부리또|스튜)/ },
    { keywords:['회','횟집','사시미','조개','해물','해산물'],
      allow: /(회|초밥|회덮밥|탕|조개|해물|조림|구이|튀김)/ },
    { keywords:['포케','샐러드','건강'],
      allow: /(포케|샐러드|보울|플레이트|샌드위치|도시락|덮밥|쌈)/ }
  ];

  // 매장 카테고리에 매칭되는 룰 찾기
  const matchedRule = categoryRules.find(r =>
    r.keywords.some(kw => combinedTag.includes(kw))
  );

  const filtered = Object.entries(menuMap)
    .filter(([name, count]) => {
      if (!matchedRule) return true;  // 룰 못 찾으면 필터 안 함 (허용)
      return matchedRule.allow.test(name);
    })
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([name, count]) => ({ name, count }));

  return filtered;
}

// ═══ 블로그 리뷰에서 영양 주장 크로스체크 ═══
// 저칼로리·저염·저지방·저당·고단백·양많음 등 검증 가능한 클레임만 추출
function extractNutritionClaims(hints) {
  if (!hints || !hints.length) return [];
  const claims = { low_kcal: 0, low_sodium: 0, low_fat: 0, low_sugar: 0, high_protein: 0, high_fiber: 0, big_portion: 0, small_portion: 0 };
  const patterns = {
    low_kcal: /저\s*칼로리|저칼/,
    low_sodium: /저\s*염|나트륨\s*(적|낮|없)|싱거/,
    low_fat: /저\s*지방|기름\s*(적|없)|담백/,
    low_sugar: /저\s*당|무\s*설탕/,
    high_protein: /고\s*단백|단백질\s*(많|풍부)/,
    high_fiber: /(식이섬유|섬유질).{0,5}(많|풍부)/,
    big_portion: /양\s*(많|푸짐|넉넉)|(1\.5|1\.3|두\s*배|2인)/,
    small_portion: /양\s*(적|부족|아쉬)/
  };
  hints.forEach(h => {
    const text = (h.t || '') + ' ' + (h.d || '');
    for (const k in patterns) {
      if (patterns[k].test(text)) claims[k]++;
    }
  });
  const out = [];
  for (const k in claims) {
    if (claims[k] >= 2) out.push({ claim: k, count: claims[k] });
  }
  return out;
}

// ═══ 근거(evidence) 뱃지 데이터 생성 ═══
// 결과 페이지 "✨ 정확도 근거" 카드에 표시할 사유 목록
function buildEvidence({ naverHints, crowdHints, storeInfo, claims, menuCandidates }) {
  const evidence = [];
  if (storeInfo) {
    evidence.push({ type: 'store', chip: storeInfo.category || '매장', text: `매장 태그 반영: <b>${storeInfo.title}</b>` });
  }
  // 🍽 매장 메뉴 리스트 (블로그에서 추출)
  if (menuCandidates && menuCandidates.length) {
    const list = menuCandidates.slice(0, 4).map(m => m.name).join('·');
    evidence.push({ type: 'menu', chip: `매장 메뉴 ${menuCandidates.length}개`, text: `블로그 추출 메뉴 중 매칭: <b>${list}</b>` });
  }
  if (crowdHints && crowdHints.topIngredients && crowdHints.topIngredients.length) {
    const names = crowdHints.topIngredients.slice(0, 3).map(t => t.name).join('·');
    evidence.push({ type: 'ing', chip: '재료', text: `이전 사용자 <b>${crowdHints.confidence}명</b> 확인 재료 반영: <b>${names}</b>` });
  }
  if (naverHints && naverHints.length) {
    const ingWords = ['참치','마요','우엉','단무지','들기름','참기름','고춧가루','다시마','멸치','사골','대파','당근','양파','마늘','청양고추','간장','고추장','된장','두부','계란','치즈','베이컨'];
    const foundIngs = new Set();
    naverHints.forEach(h => {
      const text = (h.t || '') + ' ' + (h.d || '');
      ingWords.forEach(w => { if (text.includes(w)) foundIngs.add(w); });
    });
    if (foundIngs.size >= 2) {
      const list = [...foundIngs].slice(0, 4).join('·');
      evidence.push({ type: 'ing', chip: `블로그 ${naverHints.length}건`, text: `블로그에서 확인된 재료 반영: <b>${list}</b>` });
    }
  }
  (claims || []).forEach(c => {
    const map = {
      low_kcal: { chip: '저칼로리', chipClass: 'g', dir: 'down', text: `리뷰 <b>${c.count}건</b> 저칼로리 언급 → 칼로리 하향 조정` },
      low_sodium: { chip: '저염', chipClass: 'g', dir: 'down', text: `리뷰 <b>${c.count}건</b> 저염 언급 → 나트륨 하향 조정` },
      low_fat: { chip: '저지방', chipClass: 'g', dir: 'down', text: `리뷰 <b>${c.count}건</b> 저지방 언급 → 지방 하향 조정` },
      low_sugar: { chip: '저당', chipClass: 'g', dir: 'down', text: `리뷰 <b>${c.count}건</b> 저당 언급 → 당 하향 조정` },
      high_protein: { chip: '고단백', chipClass: 'y', dir: 'up', text: `리뷰 <b>${c.count}건</b> 고단백 언급 → 단백질 상향` },
      high_fiber: { chip: '고섬유', chipClass: 'g', dir: 'up', text: `리뷰 <b>${c.count}건</b> 식이섬유 풍부 언급 → 섬유질 상향` },
      big_portion: { chip: '양많음', chipClass: 'y', dir: 'up', text: `리뷰 <b>${c.count}건</b> 양많음 언급 → 1인분 상향 (1.3배)` },
      small_portion: { chip: '양적음', chipClass: 'y', dir: 'down', text: `리뷰 <b>${c.count}건</b> 양적음 언급 → 1인분 하향 (0.8배)` }
    };
    if (map[c.claim]) evidence.push({ type: 'claim', dir: map[c.claim].dir, chip: map[c.claim].chip, chipClass: map[c.claim].chipClass, text: map[c.claim].text });
  });
  return evidence;
}

// ═══ DETECT MODE · 음식 인식 + 양 추정 (+ 매장·브랜드 시 네이버 · 크라우드 힌트) ═══
async function runDetect({ apiKey, imageB64, target, userMemo, store, res }) {
  // 매장 태그가 있으면 매장 상호명 우선, 없으면 memo 사용
  const searchQuery = store ? store.title : userMemo;
  // 브랜드·메뉴 힌트가 있으면 병렬로 네이버 블로그 (일반 후기 + 메뉴 전용) + 크라우드 조회
  let naverHints = null, menuHints = null, crowdHints = null;
  if (searchQuery && searchQuery.length >= 2 && target !== 'pet') {
    // 매장이면 메뉴 전용 쿼리 추가 ("{매장명} 메뉴")
    const menuQuery = store ? `${store.title} 메뉴 추천` : null;
    [naverHints, menuHints, crowdHints] = await Promise.all([
      fetchNaverBlogHints(searchQuery),
      menuQuery ? fetchNaverBlogHints(menuQuery) : Promise.resolve(null),
      fetchCrowdHints(searchQuery, searchQuery)
    ]);
  }
  const claims = extractNutritionClaims(naverHints);
  // 🎯 메뉴 후보 추출 (일반 후기 + 메뉴 전용 쿼리 결과 통합)
  const combinedHints = [...(naverHints || []), ...(menuHints || [])];
  const menuCandidates = store ? extractMenuCandidates(combinedHints, store) : [];
  const evidence = buildEvidence({ naverHints, crowdHints, storeInfo: store, claims, menuCandidates });

  const prompt = target === 'pet' ? buildPetFoodDetectPrompt() : buildHumanFoodDetectPrompt(userMemo, naverHints, crowdHints, store, claims, menuCandidates);

  const r = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [
          { text: prompt },
          { inline_data: { mime_type: 'image/jpeg', data: imageB64 } }
        ]}],
        generationConfig: { temperature: 0.1 }
      })
    }
  );

  const data = await r.json();
  if (data.error) return res.status(500).json({ error: data.error.message });

  const raw = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!raw) return res.status(500).json({ error: '인식 결과를 받지 못했습니다.' });

  const parsed = parseJsonLoose(raw);
  if (!parsed) return res.status(500).json({ error: '응답 파싱 실패' });
  if (parsed.error) return res.status(400).json({ error: parsed.error });

  // 매장 태그·근거 뱃지 데이터 첨부 (프론트 결과 페이지가 활용)
  if (store) parsed.storeTag = store;
  if (evidence && evidence.length) parsed.evidence = evidence;
  return res.status(200).json(parsed);
}

// ═══ ANALYZE MODE · 확정 음식 → 코칭 텍스트 ═══
async function runAnalyze({ apiKey, target, confirmedFoods, mealTime, userProfile, todayMeals, userMemo, store, res }) {
  // analyze 단계에서도 매장 있으면 블로그 크로스체크 → evidence 재생성
  const searchQuery = store ? store.title : userMemo;
  let naverHints = null, crowdHints = null, claims = [];
  if (searchQuery && searchQuery.length >= 2 && target !== 'pet') {
    [naverHints, crowdHints] = await Promise.all([
      fetchNaverBlogHints(searchQuery),
      fetchCrowdHints(searchQuery, searchQuery)
    ]);
    claims = extractNutritionClaims(naverHints);
  }
  const evidence = buildEvidence({ naverHints, crowdHints, storeInfo: store, claims });

  const prompt = target === 'pet'
    ? buildPetFoodAnalyzePrompt({ confirmedFoods, userProfile, todayMeals })
    : buildHumanFoodAnalyzePrompt({ confirmedFoods, mealTime, userProfile, todayMeals, userMemo, store, claims });

  const r = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }]}],
        generationConfig: { temperature: 0.4 }
      })
    }
  );

  const data = await r.json();
  if (data.error) return res.status(500).json({ error: data.error.message });

  const raw = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!raw) return res.status(500).json({ error: '분석 결과를 받지 못했습니다.' });

  const parsed = parseJsonLoose(raw);
  if (!parsed) return res.status(500).json({ error: '응답 파싱 실패' });
  if (parsed.error) return res.status(400).json({ error: parsed.error });

  parsed.subject = target;
  parsed.mealTime = mealTime || null;
  parsed.disclaimer = parsed.disclaimer ||
    '이 결과는 참고용이며 진단이 아닙니다. 지속되는 이상 증상은 전문가와 상담하세요.';

  // 매장 태그·근거 뱃지 데이터 첨부
  if (store) parsed.storeTag = store;
  if (evidence && evidence.length) parsed.evidence = evidence;

  return res.status(200).json(parsed);
}

// ═══ HUMAN · DETECT PROMPT ═══
function buildHumanFoodDetectPrompt(userMemo, naverHints, crowdHints, store, claims, menuCandidates) {
  // 🏪 매장 태그 (선택) · 카테고리·주소로 조리 스타일 힌트
  const storeBlock = store ? `

【매장 정보 · 조리 스타일·양 추정에만 사용 (음식 이름 결정 금지)】
- 매장: ${store.title}
- 카테고리: ${store.category || '-'}
- 주소: ${store.address || '-'}

⚠️ 매장 정보는 양(portion)·조리법·재료 추정 보조용이다.
   음식 이름(name)은 반드시 **사진에 실제로 보이는 것**으로 정한다.
   매장이 '갈매기살 전문점'이어도 사진이 제육볶음이면 name="제육볶음".
` : '';

  // 🍽 매장 메뉴 후보 (블로그에서 추출) · 참고용 (강제 아님)
  const menuBlock = (menuCandidates && menuCandidates.length) ? `

【매장의 자주 언급되는 메뉴 (블로그 ${menuCandidates.length}개) · 참고용】
${menuCandidates.map(m => `- ${m.name} (리뷰 ${m.count}회 언급)`).join('\n')}

🎯 사용 원칙 (중요):
1. **사진이 명백히 식별 가능한 흔한 한식(제육볶음·김치찌개·비빔밥·불고기·돈까스 등)이면 사진 그대로 인식한다**
   - 매장이 '갈매기살 전문점'이라도 사진이 제육볶음이면 → name="제육볶음"
   - 매장이 블로그에 안 적힌 사이드메뉴·새 메뉴를 팔 수 있다
2. **사진이 애매하거나 매장의 대표 메뉴와 비슷하면 위 리스트에서 골라라**
   - 예: 매장이 '김밥천국'이고 사진이 참치김밥처럼 생겼으면 → "참치김밥"
3. **사진이 위 메뉴 중 어떤 것과도 다르고 흔한 한식도 아니면 needsConfirmation=true**
   - options에 위 메뉴 상위 4개 + "기타(직접입력)" 추가
4. 메뉴명 가공: 긴 상호+메뉴명은 공통 음식명으로 뽑기
   - 예: "매콤왕비빔국수" → name="비빔국수", brand="매콤왕비빔국수"
5. ⚠️ 블로그 메뉴 리스트는 **힌트일 뿐 강제 아님** · 사진이 우선
` : '';

  // 📊 블로그 크로스체크 · 검증 가능한 영양 주장만
  const claimsBlock = (claims && claims.length) ? `

【블로그 다수 언급 · 영양 주장 (${claims.length}건 검증)】
${claims.map(c => {
  const map = {
    low_kcal: '저칼로리', low_sodium: '저염', low_fat: '저지방', low_sugar: '저당',
    high_protein: '고단백', high_fiber: '고섬유', big_portion: '양많음(1.3배)', small_portion: '양적음(0.8배)'
  };
  return `- "${map[c.claim] || c.claim}" (${c.count}건 언급)`;
}).join('\n')}

⚠️ 위 주장은 여러 리뷰가 공통으로 언급한 것이라 신뢰도 있음.
   재료·portion 추정에 반영하되, "담백한·건강한·부담없는" 같은 감상어는 무시.
   사진과 명백히 모순되면 사진 우선.
` : '';

  // 네이버 블로그 검색 힌트가 있으면 프롬프트에 컨텍스트 추가
  const naverBlock = (naverHints && naverHints.length) ? `

【네이버 블로그 실제 후기 (${naverHints.length}건) · 정확도 크게 상승】
${naverHints.map((h, i) => `${i+1}. ${h.t}\n   → ${h.d}`).join('\n')}

⚠️ 위 블로그 후기를 참고해서 이 메뉴의 실제 양·재료·조리법을 추정하라.
   - 후기에 "밥 200g · 목살 80g" 이런 식으로 나오면 그대로 반영
   - 여러 후기에서 공통 언급되는 재료를 ingredients에 넣기
   - 나트륨·기름·양념 강도도 후기 언급대로
` : '';

  // 크라우드소싱 힌트 (이전 사용자들이 확인·수정한 재료)
  const crowdBlock = (crowdHints && crowdHints.topIngredients && crowdHints.topIngredients.length) ? `

【이전 사용자 ${crowdHints.confidence}명이 확인한 실제 재료 (신뢰도 높음)】
${crowdHints.topIngredients.map(t => `- ${t.name} (${t.count}명이 확인)`).join('\n')}

⚠️ 이 재료들을 우선적으로 ingredients에 포함시켜라. 사진에서 안 보여도 이 브랜드 표준 재료면 넣기.
` : '';

  const memoBlock = userMemo ? `

【사용자가 알려준 정보 · 최우선 참고】
"${userMemo}"

이 메모를 다음처럼 파싱해서 각 필드에 나눠 담는다:
- 브랜드/가게명(예: 서브웨이·김밥천국·백종원·슈퍼런·맘스터치) → **brand 필드**에만 담는다
- 실제 음식 종류(샐러드·김밥·버거·제육볶음 등) → **name 필드**에 담는다 (표준 카테고리명, KOREAN_FOOD_DB에 있을 법한 대표명)
- 양(1인분·2인분·라지·곱빼기) → **portion 필드** (2인분 → 2, 라지 → 1.5)

⚠️ 절대 금지: 브랜드명을 name에 그대로 넣지 마라.
  ❌ 잘못: name="슈퍼런 샐러드"  → DB 매칭 실패
  ✅ 올바름: name="샐러드", brand="슈퍼런"
  ❌ 잘못: name="맘스터치 싸이버거"
  ✅ 올바름: name="치킨버거", brand="맘스터치 싸이버거"

프랜차이즈면 그 브랜드의 실제 메뉴 특성(양·칼로리대·나트륨 편차)을 name·portion 추정에 반영한다.
사진과 메모가 모순되면 메모를 우선한다.
` : '';

  return `너는 한식 이미지 인식 전문가다. 사진 속 음식을 식별하고 1인분 대비 양을 추정한다.
JSON 하나만 응답한다. 마크다운 코드블록 금지.
${storeBlock}${menuBlock}${memoBlock}${naverBlock}${crowdBlock}${claimsBlock}
【역할 · 절대 규칙】
1. 너는 음식 인식과 양 추정만 담당한다.
2. 칼로리·단백질·나트륨 같은 영양소 숫자는 절대 생성하지 않는다 (내가 별도 DB에서 조회함).
3. 확실하지 않으면 needsConfirmation=true 로 표시하고, 사용자에게 물어볼 옵션을 준다.
4. 음식이 아닌 이미지면 {"error":"음식 사진을 다시 찍어주세요."} 로 응답.

🚨🚨🚨 가장 중요한 규칙 (이것만은 어기면 안 됨):
- **사진에 눈으로 직접 보이는 음식만** detectedFoods에 넣어라.
- 매장이 '갈매기살 전문점'이어도, **사진에 갈매기살이 안 보이면 넣지 마라**.
- 매장 블로그에 "불맛 갈매기 구이"가 많이 언급돼도, **접시에 그 음식이 없으면 넣지 마라**.
- "이 매장이면 보통 함께 나올 거야" 같은 추측으로 **없는 음식을 추가하지 마라**.
- 메인 1개 + 반찬 2~5개가 보이면 → 보이는 것만 리스트.
- 접시 하나에 한 종류 음식만 있으면 → 1개만 리스트. 억지로 여러 개 만들지 마라.

【추정 원칙】
- 한식 표준 용량 기준 (밥 1공기 = 200g, 국 1공기 = 300ml, 반찬 1접시 = 50~100g)
- 애매하면 "1", "0.5", "1.5" 세 단계 옵션으로 물어봄
- 이름은 KOREAN_FOOD_DB에 있을 법한 대표명 사용 (예: '순두부찌개', '고등어구이', '잡곡밥')
- 사용자 메모에 브랜드명이 있으면 name에 브랜드+메뉴로 표기 (예: '김밥천국 참치김밥')

【JSON 스키마】
{
  "detectedFoods": [
    {
      "name": "잡곡밥",
      "brand": "",
      "portion": 1,
      "portionLabel": "1공기",
      "needsConfirmation": false,
      "options": ["0.5공기", "1공기", "1.5공기"],
      "ingredients": [{"name":"쌀"},{"name":"현미"},{"name":"보리"}]
    },
    {
      "name": "계란말이",
      "brand": "",
      "portion": 1,
      "portionLabel": "1접시",
      "needsConfirmation": false,
      "options": ["반접시","1접시","2접시"],
      "ingredients": [{"name":"계란"},{"name":"당근"},{"name":"파"},{"name":"소금"}]
    }
  ],
  "sceneNote": "계란말이 · 반찬 위주"
}

★ name은 반드시 KOREAN_FOOD_DB 표준 카테고리명 (샐러드/김밥/버거/제육볶음/삼겹살…). brand는 별도 필드.
★ ingredients는 필수. 각 재료마다 **name과 grams (그램)** 반드시 포함. 눈에 보이는 주요 재료 3~10개.
  형식: [{"name":"쌀", "grams":150}, {"name":"계란", "grams":50}]
  예시:
  - 계란말이 (1접시) → [{"name":"계란","grams":100},{"name":"당근","grams":15},{"name":"파","grams":5}]
  - 김밥 (1줄) → [{"name":"쌀","grams":150},{"name":"김","grams":3},{"name":"계란","grams":30},{"name":"시금치","grams":20},{"name":"당근","grams":15},{"name":"단무지","grams":25},{"name":"참치","grams":40}]
  - 슈퍼런 포케 → [{"name":"현미","grams":120},{"name":"돼지목살","grams":80},{"name":"양상추","grams":40},{"name":"방울토마토","grams":40},{"name":"블랙올리브","grams":15},{"name":"아보카도","grams":30},{"name":"올리브오일","grams":10}]
  - 샐러드 → [{"name":"양상추","grams":80},{"name":"토마토","grams":40},{"name":"오이","grams":30},{"name":"올리브오일","grams":10}]
★ grams 추정: 사진의 양·기본 1인분·프랜차이즈 표준 · 확실치 않으면 대략적 값이라도 필수
★ 소스·양념도 필수: 마요네즈·간장·고추장·올리브오일 등 눈에 안 보여도 조리법상 있으면 포함

【톤】
- 한 끼를 평가하지 않는다. 그냥 인식만.
- "칼로리가 많아 보여요" 같은 판단성 코멘트 금지.
- sceneNote는 사실 관찰만 (예: "국·밥·반찬 3가지 구성" · "1인 도시락").`;
}

// ═══ HUMAN · ANALYZE PROMPT ═══
function buildHumanFoodAnalyzePrompt({ confirmedFoods, mealTime, userProfile, todayMeals, userMemo, store, claims }) {
  // 매장 힌트는 이미 detect에서 반영됐지만 analyze에서도 카테고리 컨텍스트 유지
  const storeAnalyzeBlock = store ? `\n【매장】${store.title} · ${store.category || ''}` : '';
  const claimsAnalyzeBlock = (claims && claims.length) ? `\n【블로그 크로스체크】${claims.map(c => {
    const m = { low_kcal:'저칼로리', low_sodium:'저염', low_fat:'저지방', low_sugar:'저당', high_protein:'고단백', high_fiber:'고섬유', big_portion:'양많음', small_portion:'양적음' };
    return m[c.claim] || c.claim;
  }).join('·')} 반영` : '';
  const _analyzeHintTail = storeAnalyzeBlock + claimsAnalyzeBlock;
  const p = userProfile || {};
  const profileLine = [
    p.gender === 'male' ? '남성' : p.gender === 'female' ? '여성' : '',
    p.birthYear ? `${new Date().getFullYear() - parseInt(p.birthYear) + 1}세` : '',
    p.height ? `${p.height}cm` : '',
    p.weight ? `${p.weight}kg` : '',
    p.lifestyle ? `활동:${p.lifestyle}` : ''
  ].filter(Boolean).join(' · ');

  const foodsLine = (confirmedFoods || []).map(f => {
    const items = (f.ingredients && f.ingredients.length) ? ` [${f.ingredients.map(x => x.name || x).join(',')}]` : '';
    return `${f.name}${f.portion ? ` × ${f.portion}` : ''}${items}`;
  }).join(' + ') || '(없음)';

  const todayLine = (todayMeals || []).map(m => `${m.time || ''}:${(m.items || m.foodName || '')}`).join(' | ') || '(오늘 첫 기록)';

  return `너는 건강어때의 AI 영양 코치다. 이번 한 끼가 아니라 오늘 하루 식습관을 코칭한다.
JSON 하나만 응답. 마크다운 금지.

【건강어때 3원칙 · 반드시 지킬 것】
① 영양제 언급 최소화. 자연 식품이 우선이다.
② 숫자를 나열하지 말고 행동을 알려준다. (예: X "칼슘 42%" · O "저녁에 우유 한 잔 어때요")
③ 이번 한 끼를 판단하지 않는다. 오늘 하루의 밸런스만 코칭한다.

【톤 · 심리 훅 반드시 (앵커링 효과)】
★ 노출 순서 반드시: 1) 잘 챙긴 것 → 2) 예측·아쉬운 부분 → 3) 다음 행동
   - todayBalance.coverage(잘 챙긴 것)에 반드시 1~2개 채우기 (없으면 "밥·기본은 잘 드셨어요" 톤이라도)
   - "부족합니다" 대신 "조금 낮은 편"·"조금 더 채우면 좋아요" 완곡 톤
★ coachMessage는 반드시 "긍정 인정 + 예측형" 2문장:
   나쁜 예: "오늘 단백질이 부족합니다"
   좋은 예: "밥·국물은 잘 챙기셨어요. 이 조합이면 오후 2~3시쯤 확 졸리실 수 있어요."
★ predictedEffect · when·what·why 필수 · 3개 이내
★ 부정어 순화 · "부족" 대신 "조금 낮은 편" / "위험" 대신 "관심 필요"

【절대 금지】
- 칼로리·영양소 절대 수치를 생성하지 말 것 (프론트에서 DB로 계산함).
- "이번 식사는 나트륨이 높습니다" 같은 개별 식사 평가.
- 영양제 이름 나열. "○○ 영양제를 드세요" 금지.
- 진단·처방 뉘앙스 (반드시·필수·의사·약).
- 공포 마케팅 · "이대로면 병 걸립니다" X

【입력 정보】
- 프로필: ${profileLine || '정보 없음'}
- 이번 식사(${mealTime || '식사'}): ${foodsLine}
- 오늘 앞 식사들: ${todayLine}
${userMemo ? `- 사용자 메모(브랜드·가게·양): "${userMemo}"` : ''}
${userMemo ? `※ 사용자 메모가 있으면 프랜차이즈의 실제 영양 특성(예: 배달 음식은 나트륨↑, 프랜차이즈 버거는 지방↑)을 반영해 코칭한다.` : ''}

【출력 스키마】
{
  "mealSummary": "이번 식사의 특징 1문장 (평가 X · 관찰만)",
  "todayBalance": {
    "coverage": ["오늘 잘 채워지고 있는 것 1~2개 (예: 단백질)"],
    "gaps": ["오늘 아직 부족해 보이는 것 1~2개 (예: 식이섬유)"]
  },
  "nextAction": {
    "title": "다음 한 끼 · 이렇게 챙겨보세요",
    "suggestions": [
      { "food": "사골곰탕 or 순대국", "reason": "따뜻한 국물 + 단백질·미네랄 보충" },
      { "food": "들기름막국수", "reason": "오메가3 + 담백하게 저염" }
    ]
  },
  "coachMessage": "예측형 코칭 1~2문장. '이 조합이면 ~하실 수 있어요' → '다음 끼 ~하면 ~로 회복돼요' 형식. (예: '이 조합이면 오후 2~3시쯤 확 졸리실 수 있어요. 다음 끼에 단백질 챙기면 저녁까지 든든해요.')",
  "predictedEffect": [
    { "when": "오후 3시경", "what": "약간의 무기력·집중력 저하 가능", "why": "탄수 위주라 혈당 급락 흐름" },
    { "when": "밤", "what": "야식 생각 올라올 수 있음", "why": "단백질 부족으로 포만감 짧음" }
  ],
  "foodPairings": [
    { "with": "콩나물국밥", "why": "가볍게 속풀이·수분 보충" }
  ],
  "supplementHint": "OPTIONAL · 음식으로 채우기 어려운 경우에만 언급. 이번 한 끼 기준이 아니라 최근 7일 반복 부족일 때만.",
  "disclaimer": "본 결과는 참고용이며 진단이 아닙니다."
}

【톤】
- 존댓말 · 부드러운 코칭 · 판단 X
- 한글로 자연스럽게
- 문장은 짧게 (한 문장 20자 이내 지향)

【추천 음식 가이드 · 매우 중요】
- "고등어 한 접시", "샐러드", "오이", "브로콜리" 같은 재료 나열 X.
- 진짜 주변 밥집·배달앱에서 시켜 먹을 수 있는 **일상 메뉴**로 제안할 것.
- 좋은 예: 순대국, 사골곰탕, 설렁탕, 갈비탕, 해장국, 콩나물국밥, 육개장, 감자탕, 순두부찌개, 돼지김치찌개, 부대찌개, 뚝배기불고기, 들기름막국수, 잔치국수, 비빔국수, 냉면, 김치볶음밥, 카레라이스, 오므라이스, 돈까스, 제육덮밥, 회덮밥, 초밥세트, 연어회, 삼겹살, 갈비, 아구찜, 낙지볶음, 알탕.
- "이 국밥집 가서 순대국 한 그릇 추가하기" 같은 실행 언어 지향.

【시간대별 적절한 메뉴 · 반드시 지킬 것】
- **아침**: 담백·가벼움 · 콩나물국밥·순두부찌개·미역국·잔치국수·계란·요거트·바나나·죽 · **회·삼겹살·족발·부대찌개 X**
- **점심**: 든든하지만 무겁지 않게 · 제육덮밥·회덮밥·초밥세트·돈까스·비빔밥·김치찌개·순두부·국밥·갈비탕 · **회 단품·삼겹살 X** (덮밥·정식으로 순화)
- **오후 간식**: 정말 가볍게 · 요거트·바나나·견과류·삶은계란·고구마 · 식사류 X
- **저녁**: 대부분 OK · 회식·삼겹살·회·안주류·감자탕·해장국·부대찌개 모두 자유

지금 시각은 mealTime 인자로 전달됨. 그 시간대에 어울리지 않는 메뉴는 절대 추천하지 말 것.`;
}

// ═══ PET · DETECT PROMPT ═══
function buildPetFoodDetectPrompt() {
  return `너는 반려동물 사료 라벨/사료 이미지 인식 전문가다. 사진에서 다음을 뽑는다.
JSON 하나만 응답. 마크다운 금지.

【역할】
- 라벨 텍스트 (제품명, 원재료명, 등록성분량, 열량, 급여 안내표) OCR.
- 사료 그릇 사진이면 사료 종류/양 추정.
- 확신 없으면 needsConfirmation=true.

【JSON 스키마】
{
  "detectedFoods": [
    {
      "name": "브랜드명 사료",
      "portion": 1,
      "portionLabel": "1회 급여량",
      "needsConfirmation": true,
      "options": ["소량", "1회 급여", "듬뿍"],
      "ingredients": [
        { "name": "닭고기" }, { "name": "현미" }
      ]
    }
  ],
  "labelData": {
    "productName": "라벨상 제품명 or null",
    "guaranteedAnalysis": {"protein":"22.0% 이상","fat":"12.0% 이상","fiber":"5.0% 이하","moisture":"10.0% 이하","ash":"8.0% 이하"},
    "kcalPerKg": 3600,
    "feedingTable": [{"weightKg":"1-5","gPerDay":"30-90"}],
    "ingredients": ["닭고기","현미","귀리","..."]
  },
  "sceneNote": "사료 뒷면 라벨 · 등록성분량·열량 판독 가능"
}

【금지】
- 라벨에 없는 수치는 절대 만들지 말 것. 없으면 null.
- 사료 종류 진단 X · 관찰만.`;
}

// ═══ PET · ANALYZE PROMPT ═══
function buildPetFoodAnalyzePrompt({ confirmedFoods, userProfile, todayMeals }) {
  const p = userProfile || {};
  const petLine = [
    p.name ? `${p.name}` : '',
    p.petType === 'dog' ? '강아지' : p.petType === 'cat' ? '고양이' : '',
    p.breed ? p.breed : '',
    p.weight ? `${p.weight}kg` : '',
    p.birthYear ? `${new Date().getFullYear() - parseInt(p.birthYear)}살` : ''
  ].filter(Boolean).join(' · ');

  const foodsLine = (confirmedFoods || []).map(f => `${f.name}${f.portion ? ` × ${f.portion}` : ''}`).join(' + ');

  return `너는 반려동물 사료·영양 코치다. AAFCO·NRC 기준을 기본으로 하되 진단은 하지 않는다.
JSON 하나만 응답. 마크다운 금지.

【원칙】
- 사료 자체가 균형 사료면 그 사실을 인정하고 간식·급여량만 코칭.
- 사료·간식 조합의 흐름을 코치. 한 끼로 평가 금지.
- 영양제 언급 최소화. 필요한 경우에만 "수의사 상담" 권유.

【절대 금지】
- 진단·처방 (반드시·필수·병원·약).
- 라벨에 없는 수치 생성.

【입력】
- 반려동물: ${petLine || '정보 없음'}
- 이번 사료·간식: ${foodsLine}
- 오늘 급여 기록: ${(todayMeals || []).map(m => m.foodName || (m.items||'')).join(' | ') || '(첫 기록)'}

【출력 스키마】
{
  "mealSummary": "이번 급여 관찰 1문장",
  "dailyCoverage": {
    "adequate": ["잘 채워진 부분 1~2"],
    "watchouts": ["신경 쓰면 좋을 부분 1~2 (예: '급수량')"]
  },
  "nextAction": {
    "title": "다음 급여 · 이렇게 챙겨보세요",
    "suggestions": [
      { "action": "물그릇 한번 갈아주기", "why": "수분 · 여름철" }
    ]
  },
  "coachMessage": "부드러운 코칭 1~2문장",
  "disclaimer": "참고용 정보이며 수의학적 진단이 아닙니다."
}

【톤】
- 부드럽고 따뜻하게. 반려인 마음 헤아리기.
- 한 문장 짧게.`;
}

// ═══ UTIL ═══
function parseJsonLoose(raw) {
  try {
    const cleaned = String(raw || '')
      .replace(/```json\s*/gi, '')
      .replace(/```\s*$/g, '')
      .trim();
    const m = cleaned.match(/\{[\s\S]*\}/);
    if (!m) return null;
    return JSON.parse(m[0]);
  } catch(e) {
    return null;
  }
}
