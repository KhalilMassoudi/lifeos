/**
 * Crypto utilities using the Web Crypto API
 * No external dependencies — pure browser crypto
 */

/**
 * Hash a password using SHA-256
 * Returns a hex string
 */
export async function hashPassword(password) {
  const encoder = new TextEncoder();
  const data = encoder.encode(password + 'lifeos-salt-v1');
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Derive a signing key from a password hash using PBKDF2
 * Used to sign/verify JWT tokens client-side
 */
export async function deriveSigningKey(passwordHash) {
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(passwordHash),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: encoder.encode('lifeos-jwt-salt-2024'),
      iterations: 100_000,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify']
  );
}

/**
 * Create an HMAC-SHA256 signature for the given data
 */
export async function signData(key, data) {
  const encoder = new TextEncoder();
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(data));
  return btoa(String.fromCharCode(...new Uint8Array(signature)));
}

/**
 * Verify an HMAC-SHA256 signature
 */
export async function verifySignature(key, data, signature) {
  try {
    const encoder = new TextEncoder();
    const sigBuffer = Uint8Array.from(atob(signature), c => c.charCodeAt(0));
    return await crypto.subtle.verify('HMAC', key, sigBuffer, encoder.encode(data));
  } catch {
    return false;
  }
}
