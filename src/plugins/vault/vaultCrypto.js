// Client-side encryption for the password vault (Web Crypto API only).
//
//   vault password ──PBKDF2-SHA256 (600k, random salt)──► wrapping key (AES-GCM 256)
//   random data key (AES-GCM 256) ── wrapped with the wrapping key ──► stored on server
//   each entry (JSON) ── AES-GCM with the data key, fresh 96-bit IV ──► stored on server
//
// The server never receives the vault password or an unwrapped key. Changing the
// vault password only re-wraps the data key, so entries don't need re-encrypting.

export const PBKDF2_ITERATIONS = 600_000; // OWASP recommendation for PBKDF2-HMAC-SHA256
const SALT_BYTES = 16;
const IV_BYTES = 12;

const subtle = () => {
  if (!globalThis.crypto?.subtle) {
    throw new Error('The vault needs a secure connection (https or localhost) to use encryption.');
  }
  return globalThis.crypto.subtle;
};

export const isCryptoAvailable = () => Boolean(globalThis.crypto?.subtle);

const toB64 = (bytes) => {
  let binary = '';
  for (const b of new Uint8Array(bytes)) binary += String.fromCharCode(b);
  return btoa(binary);
};
const fromB64 = (b64) => Uint8Array.from(atob(b64), c => c.charCodeAt(0));
const randomBytes = (n) => globalThis.crypto.getRandomValues(new Uint8Array(n));

async function deriveWrappingKey(password, salt, iterations) {
  const material = await subtle().importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveKey']);
  return subtle().deriveKey(
    { name: 'PBKDF2', hash: 'SHA-256', salt, iterations },
    material,
    { name: 'AES-GCM', length: 256 },
    false,
    ['wrapKey', 'unwrapKey']
  );
}

async function wrapDataKey(dataKey, password) {
  const salt = randomBytes(SALT_BYTES);
  const iv = randomBytes(IV_BYTES);
  const wrappingKey = await deriveWrappingKey(password, salt, PBKDF2_ITERATIONS);
  const wrapped = await subtle().wrapKey('raw', dataKey, wrappingKey, { name: 'AES-GCM', iv });
  return { salt: toB64(salt), iterations: PBKDF2_ITERATIONS, wrapped_key: toB64(wrapped), wrap_iv: toB64(iv) };
}

// New vault: a fresh random data key, wrapped with the vault password.
// Returns the record to store on the server and the usable (in-memory) key.
export async function createVault(password) {
  const dataKey = await subtle().generateKey({ name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt']);
  return { record: await wrapDataKey(dataKey, password), dataKey };
}

// Unlock: returns the data key, or throws WrongPasswordError
export class WrongPasswordError extends Error {
  constructor() { super('Wrong vault password.'); }
}

export async function unlockVault(password, record) {
  const wrappingKey = await deriveWrappingKey(password, fromB64(record.salt), record.iterations);
  try {
    return await subtle().unwrapKey(
      'raw', fromB64(record.wrapped_key), wrappingKey, { name: 'AES-GCM', iv: fromB64(record.wrap_iv) },
      { name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt']
    );
  } catch {
    throw new WrongPasswordError(); // AES-GCM authentication failed
  }
}

// Same data key, new vault password
export const rewrapVault = (dataKey, newPassword) => wrapDataKey(dataKey, newPassword);

export async function encryptEntry(dataKey, entry) {
  const iv = randomBytes(IV_BYTES);
  const plaintext = new TextEncoder().encode(JSON.stringify(entry));
  const ciphertext = await subtle().encrypt({ name: 'AES-GCM', iv }, dataKey, plaintext);
  return { ciphertext: toB64(ciphertext), iv: toB64(iv) };
}

export async function decryptEntry(dataKey, { ciphertext, iv }) {
  const plaintext = await subtle().decrypt({ name: 'AES-GCM', iv: fromB64(iv) }, dataKey, fromB64(ciphertext));
  return JSON.parse(new TextDecoder().decode(plaintext));
}

// ── Password generator & strength ──────────────────────────────────────────

const SETS = {
  lower: 'abcdefghijkmnopqrstuvwxyz', // no l (looks like 1)
  upper: 'ABCDEFGHJKLMNPQRSTUVWXYZ',  // no I, O
  digits: '23456789',                 // no 0, 1
  symbols: '!@#$%^&*-_=+?',
};

// Uniform random index without modulo bias
function randomIndex(max) {
  const limit = Math.floor(0x100000000 / max) * max;
  const buf = new Uint32Array(1);
  do { globalThis.crypto.getRandomValues(buf); } while (buf[0] >= limit);
  return buf[0] % max;
}

export function generatePassword({ length = 20, upper = true, digits = true, symbols = true } = {}) {
  const groups = [SETS.lower, upper && SETS.upper, digits && SETS.digits, symbols && SETS.symbols].filter(Boolean);
  const all = groups.join('');
  // At least one character from each chosen group, then shuffle
  const chars = groups.map(g => g[randomIndex(g.length)]);
  while (chars.length < length) chars.push(all[randomIndex(all.length)]);
  for (let i = chars.length - 1; i > 0; i--) {
    const j = randomIndex(i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join('');
}

// Rough strength from length and character variety (bits of entropy)
export function passwordStrength(password) {
  if (!password) return { score: 0, label: 'Empty' };
  let pool = 0;
  if (/[a-z]/.test(password)) pool += 26;
  if (/[A-Z]/.test(password)) pool += 26;
  if (/\d/.test(password)) pool += 10;
  if (/[^a-zA-Z0-9]/.test(password)) pool += 32;
  let bits = password.length * Math.log2(pool || 1);
  if (/^(.)\1+$/.test(password) || /^(?:123|abc|qwerty|password)/i.test(password)) bits = Math.min(bits, 20);
  if (bits < 40) return { score: 1, label: 'Weak', bits };
  if (bits < 60) return { score: 2, label: 'Okay', bits };
  if (bits < 80) return { score: 3, label: 'Strong', bits };
  return { score: 4, label: 'Very strong', bits };
}
