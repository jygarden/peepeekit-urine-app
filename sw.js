// =========================================================
// 새 버전 배포할 때마다 이 숫자만 올리세요 (v2 → v3 → v4 ...)
// 이게 바뀌면 모든 사용자가 자동으로 새 버전을 받습니다.
const CACHE_VERSION = 'v2';
// =========================================================

const CACHE_NAME = `pet-urine-${CACHE_VERSION}`;
const STATIC = ['/', '/index.html', '/manifest.json', '/icon-192.png', '/icon-512.png'];

// 설치: 새 SW가 다운로드되면 즉시 활성화 대기열로
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(c => c.addAll(STATIC))
  );
  // 기존 SW가 페이지를 잡고 있어도 새 버전이 바로 대기 끝내고 활성화되게 함
  self.skipWaiting();
});

// 활성화: 옛 버전 캐시 전부 청소 + 즉시 모든 탭 장악
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys =>
        Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
      )
      .then(() => self.clients.claim())
  );
});

// 요청 처리 — 핵심: HTML은 무조건 네트워크 우선!
self.addEventListener('fetch', e => {
  const req = e.request;

  // 1) API 요청은 항상 네트워크 (AI 분석 등)
  if (req.url.includes('/api/')) {
    e.respondWith(fetch(req));
    return;
  }

  // 2) HTML 문서(페이지 이동, .html 파일)는 네트워크 우선
  //    -> 새 배포가 즉시 반영됨. 오프라인이면 캐시로 폴백.
  if (req.mode === 'navigate' ||
      req.destination === 'document' ||
      req.url.endsWith('.html')) {
    e.respondWith(
      fetch(req)
        .then(res => {
          // 성공하면 최신 버전을 캐시에도 넣어둠 (오프라인 대비)
          const copy = res.clone();
          caches.open(CACHE_NAME).then(c => c.put(req, copy));
          return res;
        })
        .catch(() => caches.match(req).then(r => r || caches.match('/index.html')))
    );
    return;
  }

  // 3) 그 외 정적 리소스(이미지, 아이콘, manifest 등)는 캐시 우선
  e.respondWith(
    caches.match(req).then(cached => cached || fetch(req).then(res => {
      // 새 리소스도 캐시에 저장해서 다음번엔 즉시 응답
      const copy = res.clone();
      caches.open(CACHE_NAME).then(c => c.put(req, copy));
      return res;
    }))
  );
});

// 클라이언트(페이지)에서 보내는 메시지로 강제 업데이트 가능
self.addEventListener('message', e => {
  if (e.data === 'SKIP_WAITING') self.skipWaiting();
});
