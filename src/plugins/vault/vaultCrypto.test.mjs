// Run: npm run test:vault
import * as v from './vaultCrypto.js';
const ok = (n, c) => console.log(`${c ? 'PASS' : 'FAIL'}  ${n}`);
const t0 = Date.now();
const { record, dataKey } = await v.createVault('correct horse battery');
console.log(`  createVault took ${Date.now() - t0} ms`);
ok('record has no plaintext key fields', Object.keys(record).sort().join() === 'iterations,salt,wrap_iv,wrapped_key');
const enc = await v.encryptEntry(dataKey, { title: 'Gmail', password: 's3cret!' });
ok('ciphertext does not contain plaintext', !atob(enc.ciphertext).includes('s3cret'));
const key2 = await v.unlockVault('correct horse battery', record);
ok('unlock + decrypt round trip', (await v.decryptEntry(key2, enc)).password === 's3cret!');
let wrong = false; try { await v.unlockVault('wrong', record); } catch (e) { wrong = e instanceof v.WrongPasswordError; }
ok('wrong password rejected', wrong);
const rec2 = await v.rewrapVault(key2, 'new password');
const key3 = await v.unlockVault('new password', rec2);
ok('re-wrapped key still decrypts old entries', (await v.decryptEntry(key3, enc)).title === 'Gmail');
let old = false; try { await v.unlockVault('correct horse battery', rec2); } catch { old = true; }
ok('old password no longer works after change', old);
const enc2 = await v.encryptEntry(dataKey, { title: 'Gmail', password: 's3cret!' });
ok('same entry encrypts differently (fresh IV)', enc2.ciphertext !== enc.ciphertext && enc2.iv !== enc.iv);
let tampered = false; const bad = { ...enc, ciphertext: btoa(atob(enc.ciphertext).slice(0, -1) + 'x') };
try { await v.decryptEntry(key2, bad); } catch { tampered = true; }
ok('tampered ciphertext rejected', tampered);
const pws = Array.from({ length: 200 }, () => v.generatePassword({ length: 16 }));
ok('generator: length + all classes', pws.every(p => p.length === 16 && /[a-z]/.test(p) && /[A-Z]/.test(p) && /\d/.test(p) && /[^a-zA-Z0-9]/.test(p)));
ok('generator: no repeats in 200', new Set(pws).size === 200);
ok('strength: weak vs strong', v.passwordStrength('password123').score === 1 && v.passwordStrength(pws[0]).score >= 3);
