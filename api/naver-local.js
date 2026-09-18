// 🗺 NAVER 지역 검색 API (매장 자동완성)
// 상호명 → 매장 후보 리스트 (주소·카테고리·좌표·전화)
//
// 📌 2026-06-29 이관: Naver Developers의 Search API → NCP NAVER API HUB
//   · 정식 호스트: naverapihub.apigw.ntruss.com
//   · 경로: /search/v1/local
//   · 헤더: X-NCP-APIGW-API-KEY-ID / X-NCP-APIGW-API-KEY
//   · 키는 기존 NCP_API_KEY_ID / NCP_API_KEY 그대로 사용 가능
//   ⚠️ HUB 콘솔에서 "지역(Local)" 검색 서비스를 개별 이용신청하고
//      Application에 체크해야 함 (블로그만 신청돼 있으면 지역은 403)
//
// 시도 순서:
//   1. NAVER API HUB (정식)
//   2. 구 NCP APIGW 호스트들 (이관 전 계정이 남아있는 경우)
//   3. Naver Developers openapi.naver.com (구 앱이 살아있는 경우)

const TIMEOUT_MS = 4000;   // 호스트당 최대 대기
const MAX_DISPLAY = 5;     // 네이버 지역검색 상한

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  const body = req.body || {};
  const q = String(body.query || '').trim();
  if (!q) return res.status(400).json({ error: 'query required' });

  // display · sort 안전 처리 (지역검색은 random | comment 만 허용)
  const display = Math.min(MAX_DISPLAY, Math.max(1, Number(body.display) || MAX_DISPLAY));
  const sort = body.sort === 'comment' ? 'comment' : 'random';

  // 좌표는 문자열로 올 수 있어 숫자로 변환 (거리 계산·정렬에 필요)
  const lat = Number(body.lat);
  const lng = Number(body.lng);
  const hasCoords = Number.isFinite(lat) && Number.isFinite(lng);

  const ncpId     = process.env.NCP_API_KEY_ID;
  const ncpKey    = process.env.NCP_API_KEY;
  const navId     = process.env.NAVER_CLIENT_ID;
  const navSecret = process.env.NAVER_CLIENT_SECRET;

  if (!ncpId && !navId) {
    return res.status(500).json({
      error: 'API 자격증명 미설정',
      detail: 'Vercel 환경변수에 NCP_API_KEY_ID + NCP_API_KEY 를 추가해주세요.',
      hint: 'NAVER API HUB 콘솔 → Application 등록 → "지역(Local)" 검색 체크 → 발급된 Client ID/Secret 을 넣습니다.'
    });
  }

  const qs = `query=${encodeURIComponent(q)}&display=${display}&sort=${sort}`;

  const attempts = [];
  if (ncpId && ncpKey) {
    const h = { 'X-NCP-APIGW-API-KEY-ID': ncpId, 'X-NCP-APIGW-API-KEY': ncpKey };
    attempts.push(
      // ✅ 이관 후 정식 주소
      { name: 'apihub',      url: `https://naverapihub.apigw.ntruss.com/search/v1/local?${qs}`,        headers: h },
      // 구 호스트 (이관 전 계정 잔존 대비)
      { name: 'ncp-legacy',  url: `https://naveropenapi.apigw.ntruss.com/search/v1/local?${qs}`,       headers: h },
      { name: 'ncp-json',    url: `https://naveropenapi.apigw.ntruss.com/search/v1/local.json?${qs}`,  headers: h },
      { name: 'ncp-search',  url: `https://naversearchapi.apigw.ntruss.com/search/v1/local?${qs}`,     headers: h }
    );
  }
  if (navId && navSecret) {
    attempts.push({
      name: 'developers',
      url: `https://openapi.naver.com/v1/search/local.json?${qs}`,
      headers: { 'X-Naver-Client-Id': navId, 'X-Naver-Client-Secret': navSecret }
    });
  }

  const tried = [];
  let lastErr = null;

  for (const a of attempts) {
    try {
      const r = await fetch(a.url, { headers: a.headers, signal: timeoutSignal(TIMEOUT_MS) });
      tried.push(`${a.name}:${r.status}`);

      if (r.ok) {
        const data = await r.json();
        let items = (data.items || []).map(it => normalizeItem(it, hasCoords ? lat : null, hasCoords ? lng : null));
        if (items.some(x => x.distance != null)) {
          items.sort((x, y) => (x.distance ?? Infinity) - (y.distance ?? Infinity));
        }
        return res.status(200).json({
          query: q,
          total: data.total ?? items.length,
          items,
          source: a.name
        });
      }

      const txt = await r.text().catch(() => '');
      lastErr = { status: r.status, detail: txt.slice(0, 300), source: a.name };
      console.error(`[naver-local] ${a.name} ${r.status}:`, txt.slice(0, 200));

      // 자격증명 자체가 틀린 경우 → 다른 호스트도 똑같이 실패하므로 즉시 중단
      if (r.status === 401) break;

    } catch (err) {
      const isTimeout = err.name === 'AbortError' || err.name === 'TimeoutError';
      tried.push(`${a.name}:${isTimeout ? 'timeout' : 'err'}`);
      lastErr = { status: 0, detail: isTimeout ? `${TIMEOUT_MS}ms 초과` : err.message, source: a.name };
      console.error(`[naver-local] ${a.name} exception:`, err.message);
    }
  }

  return res.status(502).json({
    error: '네이버 지역 검색 실패',
    detail: lastErr ? `${lastErr.source}(${lastErr.status}): ${lastErr.detail}` : '알 수 없는 오류',
    tried,
    hint: diagnose(lastErr)
  });
};

// ─────────────────────────────────────────────
// 실패 원인별 안내 문구
// ─────────────────────────────────────────────
function diagnose(err) {
  if (!err) return '알 수 없는 오류입니다.';
  switch (err.status) {
    case 401:
      return '인증 실패 · NCP_API_KEY_ID / NCP_API_KEY 값이 맞는지, NAVER API HUB에서 발급받은 키가 맞는지 확인해주세요.';
    case 403:
      return '권한 없음 · 키는 유효하지만 "지역(Local)" 검색 서비스가 신청되지 않았습니다. HUB 콘솔 → Application → 지역 검색 체크 후 저장해주세요. (블로그 신청과 별개입니다)';
    case 404:
      return '엔드포인트를 찾을 수 없습니다 · 네이버가 주소를 또 변경했을 수 있으니 HUB 문서를 확인해주세요.';
    case 429:
      return '호출 한도 초과 · 잠시 후 다시 시도하거나 HUB 콘솔에서 사용량을 확인해주세요.';
    case 0:
      return '네트워크 오류 또는 응답 지연입니다. 잠시 후 다시 시도해주세요.';
    default:
      return 'NAVER API HUB 콘솔에서 "지역(Local)" 검색 이용신청 여부와 키 값을 먼저 확인해주세요.';
  }
}

// AbortSignal.timeout 미지원 런타임 대비
function timeoutSignal(ms) {
  if (typeof AbortSignal !== 'undefined' && typeof AbortSignal.timeout === 'function') {
    return AbortSignal.timeout(ms);
  }
  const c = new AbortController();
  setTimeout(() => c.abort(), ms);
  return c.signal;
}

// ─────────────────────────────────────────────
// 응답 아이템 정규화
// ─────────────────────────────────────────────
function normalizeItem(it, lat, lng) {
  const mx = Number(it.mapx) || 0;
  const my = Number(it.mapy) || 0;

  // WGS84 × 10^7 형식 (현행 Local API 응답)
  const isWgsScaled = mx > 100000000 || my > 100000000;
  const wgsLng = isWgsScaled ? mx / 10000000 : null;
  const wgsLat = isWgsScaled ? my / 10000000 : null;

  const clean = s => String(s || '').replace(/<[^>]+>/g, '').trim();

  let distance = null;
  if (wgsLat != null && wgsLng != null && Number.isFinite(lat) && Number.isFinite(lng)) {
    const R = 6371000;
    const toRad = d => d * Math.PI / 180;
    const dLat = toRad(wgsLat - lat);
    const dLng = toRad(wgsLng - lng);
    const h = Math.sin(dLat / 2) ** 2
            + Math.cos(toRad(lat)) * Math.cos(toRad(wgsLat)) * Math.sin(dLng / 2) ** 2;
    distance = Math.round(2 * R * Math.asin(Math.min(1, Math.sqrt(h))));
  }

  return {
    title: clean(it.title),
    category: clean(it.category),
    address: clean(it.address),
    roadAddress: clean(it.roadAddress),
    telephone: clean(it.telephone),
    link: it.link || '',
    mapx: mx, mapy: my,
    lat: wgsLat, lng: wgsLng,
    distance
  };
}
