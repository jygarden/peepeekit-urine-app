// 🛡️ 간단한 IP 기반 Rate Limit (in-memory, Vercel warm 인스턴스에서만 유지)
// 각 API 파일에서 import 해서 사용

const rateLimitStore = new Map();

// 남용 방지: 클린업 (500개 이상이면 오래된 것 삭제)
function cleanupIfNeeded() {
  if (rateLimitStore.size < 500) return;
  const now = Date.now();
  for (const [key, val] of rateLimitStore) {
    if (val.resetAt < now) rateLimitStore.delete(key);
  }
}

/**
 * IP 기반 rate limit 체크
 * @param {string} ip - 클라이언트 IP
 * @param {object} opts - { limit: 회당 최대 요청 수, window: 시간 창(ms) }
 * @returns {object} { ok: boolean, remaining, resetAt }
 */
function checkRateLimit(ip, opts = {}) {
  const limit = opts.limit || 20;      // 기본 20회
  const window = opts.window || 60000; // 기본 1분
  const now = Date.now();
  const key = `${ip}:${opts.name || 'default'}`;

  cleanupIfNeeded();

  const record = rateLimitStore.get(key);
  if (!record || now > record.resetAt) {
    rateLimitStore.set(key, { count: 1, resetAt: now + window });
    return { ok: true, remaining: limit - 1, resetAt: now + window };
  }
  if (record.count >= limit) {
    return { ok: false, remaining: 0, resetAt: record.resetAt };
  }
  record.count++;
  return { ok: true, remaining: limit - record.count, resetAt: record.resetAt };
}

// req 객체에서 IP 추출
function getClientIP(req) {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) return forwarded.split(',')[0].trim();
  return req.headers['x-real-ip'] || req.socket?.remoteAddress || 'unknown';
}

// Vercel serverless 함수 미들웨어
function rateLimitMiddleware(req, res, opts = {}) {
  const ip = getClientIP(req);
  const result = checkRateLimit(ip, opts);

  res.setHeader('X-RateLimit-Limit', String(opts.limit || 20));
  res.setHeader('X-RateLimit-Remaining', String(result.remaining));
  res.setHeader('X-RateLimit-Reset', String(Math.ceil(result.resetAt / 1000)));

  if (!result.ok) {
    const retryAfter = Math.ceil((result.resetAt - Date.now()) / 1000);
    res.setHeader('Retry-After', String(retryAfter));
    res.status(429).json({
      error: `너무 많은 요청이 있었어요. ${retryAfter}초 후에 다시 시도해주세요.`,
      retryAfter
    });
    return false;
  }
  return true;
}

module.exports = { checkRateLimit, getClientIP, rateLimitMiddleware };
