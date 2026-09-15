const crypto = require('crypto');

// Shared peppered-hash OTP primitives — used by routes/verify.js (checkout
// contact verification) and routes/auth.js (password reset). Plaintext
// codes are NEVER stored, only this hash; the pepper (JWT_SECRET) means a
// stolen DB dump alone can't be brute-forced offline against known codes.
function hashCode(code, channel, target, purpose) {
  const pepper = process.env.JWT_SECRET || '';
  return crypto.createHash('sha256').update(`${code}|${channel}|${target}|${purpose}|${pepper}`).digest('hex');
}

function randomCode() {
  return String(crypto.randomInt(100000, 1000000));
}

function codeMatches(guess, hash) {
  const a = Buffer.from(guess, 'hex');
  const b = Buffer.from(hash, 'hex');
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

module.exports = { hashCode, randomCode, codeMatches };
