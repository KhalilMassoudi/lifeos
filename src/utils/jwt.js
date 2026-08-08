/**
 * Client-side JWT implementation using Web Crypto API (HMAC-SHA256)
 * Tokens are signed with a key derived from the user's hashed password.
 * Without the correct password, tokens cannot be forged or verified.
 */

import { deriveSigningKey, signData, verifySignature } from './crypto';

const JWT_HEADER = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
const TOKEN_KEY = 'lifeos_session_token';
const SESSION_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Create a signed JWT token
 */
export async function createToken(passwordHash) {
  const now = Date.now();
  const payload = {
    sub: 'lifeos_owner',
    iat: Math.floor(now / 1000),
    exp: Math.floor((now + SESSION_DURATION_MS) / 1000),
    ver: '1.0',
  };

  const encodedPayload = btoa(JSON.stringify(payload));
  const signingInput = `${JWT_HEADER}.${encodedPayload}`;
  const key = await deriveSigningKey(passwordHash);
  const signature = await signData(key, signingInput);

  const token = `${signingInput}.${signature}`;
  sessionStorage.setItem(TOKEN_KEY, token);
  return token;
}

/**
 * Verify a stored JWT token against the given password hash
 * Returns { valid: boolean, expired: boolean }
 */
export async function verifyToken(passwordHash) {
  try {
    const token = sessionStorage.getItem(TOKEN_KEY);
    if (!token) return { valid: false, expired: false };

    const parts = token.split('.');
    if (parts.length !== 3) return { valid: false, expired: false };

    const [header, encodedPayload, signature] = parts;
    const signingInput = `${header}.${encodedPayload}`;

    const key = await deriveSigningKey(passwordHash);
    const isValid = await verifySignature(key, signingInput, signature);
    if (!isValid) return { valid: false, expired: false };

    // Check expiry
    const payload = JSON.parse(atob(encodedPayload));
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp < now) {
      clearToken();
      return { valid: false, expired: true };
    }

    return { valid: true, expired: false };
  } catch {
    return { valid: false, expired: false };
  }
}

/**
 * Get token expiry time as a Date object
 */
export function getTokenExpiry() {
  try {
    const token = sessionStorage.getItem(TOKEN_KEY);
    if (!token) return null;
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payload = JSON.parse(atob(parts[1]));
    return new Date(payload.exp * 1000);
  } catch {
    return null;
  }
}

/**
 * Remove the stored token (logout / lock)
 */
export function clearToken() {
  sessionStorage.removeItem(TOKEN_KEY);
}

/**
 * Check if a raw token string exists in sessionStorage
 */
export function hasToken() {
  return !!sessionStorage.getItem(TOKEN_KEY);
}
