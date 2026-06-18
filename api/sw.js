// 건강어때 PWA Service Worker
// 버전 올리면 모든 클라이언트가 자동 업데이트됨
const SW_VERSION = 'v36-settings-gear-icon-2026-06-15';

// install: 즉시 활성화
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

// activate: 옛 캐시 비우고 즉시 컨트롤
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(keys.map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// fetch: API 호출(/api/*)은 절대 가로채지 않음!
// HTML/CSS/JS는 network-first (실패 시 무시 — 캐시 안 함)
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // 🔥 API 호출은 SW가 완전히 무시 — 브라우저가 직접 처리
  if (url.pathname.startsWith('/api/')) {
    return; // respondWith 호출 안 함 → 브라우저 기본 동작
  }

  // POST/PUT/DELETE는 가로채지 않음
  if (event.request.method !== 'GET') {
    return;
  }

  // 그 외(HTML, CSS, JS, 이미지)는 network-first
  event.respondWith(
    fetch(event.request).catch(() => {
      // 네트워크 실패 시 그냥 에러 던지기 (캐시 안 함 → 항상 최신)
      return new Response('오프라인', { status: 503, statusText: 'Service Unavailable' });
    })
  );
});
