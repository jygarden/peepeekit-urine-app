// 🔐 PT 트레이너 인증 공통 헬퍼
//
// JWT 발급·검증 · 비밀번호 해싱 · 미들웨어
//
// 환경변수:
//   COACH_JWT_SECRET  · JWT 서명 비밀 (최소 32자)

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const BCRYPT_ROUNDS = 12;
const JWT_TTL_DAYS = 7;

function getJwtSecret() {
  const s = process.env.COACH_JWT_SECRET;
  if (!s || s.length < 32) {
    throw new Error('COACH_JWT_SECRET 미설정 또는 너무 짧음 (최소 32자)');
  }
  return s;
}

async function hashPassword(plain) {
  if (!plain || plain.length < 8) throw new Error('비밀번호는 8자 이상');
  return bcrypt.hash(plain, BCRYPT_ROUNDS);
}

async function verifyPassword(plain, hash) {
  if (!plain || !hash) return false;
  try { return await bcrypt.compare(plain, hash); } catch { return false; }
}

function issueTrainerToken(trainer) {
  return jwt.sign(
    { sub: trainer.id, email: trainer.email, name: trainer.name, role: 'trainer' },
    getJwtSecret(),
    { expiresIn: `${JWT_TTL_DAYS}d` }
  );
}

/**
 * Authorization: Bearer <token> 헤더에서 트레이너 ID 추출
 * @returns {object|null} { trainerId, email, name } 또는 null
 */
function verifyTrainerToken(req) {
  const auth = req.headers['authorization'] || '';
  const m = auth.match(/^Bearer\s+(.+)$/i);
  if (!m) return null;
  try {
    const payload = jwt.verify(m[1], getJwtSecret());
    if (payload.role !== 'trainer' || !payload.sub) return null;
    return { trainerId: payload.sub, email: payload.email, name: payload.name };
  } catch(e) { return null; }
}

/**
 * API 핸들러를 "로그인된 트레이너"만 통과시키는 래퍼
 */
function requireTrainer(handler) {
  return async function(req, res) {
    const auth = verifyTrainerToken(req);
    if (!auth) return res.status(401).json({ error: '로그인 필요' });
    req.trainer = auth;
    return handler(req, res);
  };
}

module.exports = {
  hashPassword, verifyPassword,
  issueTrainerToken, verifyTrainerToken, requireTrainer,
  JWT_TTL_DAYS
};
