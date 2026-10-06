import express from 'express';
import { query } from '../db.js';
import { requireAuth } from '../middleware/auth.js';

// Password vault. Everything is encrypted in the browser with a key derived from
// the profile's vault password; this server only ever stores ciphertext and never
// sees the vault password, the data key, or any entry in plain text.
const router = express.Router();
router.use(requireAuth);

const B64 = /^[A-Za-z0-9+/]+={0,2}$/;
const isB64 = (value, maxLength) => typeof value === 'string' && value.length > 0 && value.length <= maxLength && B64.test(value);
const MAX_ITEM_CIPHERTEXT = 64 * 1024; // base64 chars
const MAX_ITEMS = 2000;

// key: { salt, iterations, wrapped_key, wrap_iv } — all base64 except iterations
function validateKey(body) {
  const { salt, iterations, wrapped_key, wrap_iv } = body;
  if (!isB64(salt, 64) || !isB64(wrapped_key, 256) || !isB64(wrap_iv, 64)) return 'Invalid vault key.';
  if (!Number.isInteger(iterations) || iterations < 100000 || iterations > 10000000) return 'Invalid key iterations.';
  return null;
}

router.get('/key', async (req, res) => {
  try {
    const result = await query(
      'SELECT salt, iterations, wrapped_key, wrap_iv, updated_at FROM vault_keys WHERE user_id = $1',
      [req.userId]
    );
    res.json(result.rows[0] || null);
  } catch (error) {
    console.error('Get vault key error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// First-time setup
router.post('/key', async (req, res) => {
  try {
    const error = validateKey(req.body);
    if (error) return res.status(400).json({ error });
    const { salt, iterations, wrapped_key, wrap_iv } = req.body;
    const result = await query(`
      INSERT INTO vault_keys (user_id, salt, iterations, wrapped_key, wrap_iv)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (user_id) DO NOTHING
      RETURNING salt, iterations, wrapped_key, wrap_iv, updated_at
    `, [req.userId, salt, iterations, wrapped_key, wrap_iv]);
    if (result.rows.length === 0) return res.status(409).json({ error: 'Your vault is already set up.' });
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Create vault key error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Vault password change: the same data key, re-wrapped with the new password
router.put('/key', async (req, res) => {
  try {
    const error = validateKey(req.body);
    if (error) return res.status(400).json({ error });
    const { salt, iterations, wrapped_key, wrap_iv } = req.body;
    const result = await query(`
      UPDATE vault_keys
      SET salt = $2, iterations = $3, wrapped_key = $4, wrap_iv = $5, updated_at = NOW()
      WHERE user_id = $1
      RETURNING salt, iterations, wrapped_key, wrap_iv, updated_at
    `, [req.userId, salt, iterations, wrapped_key, wrap_iv]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Set up your vault first.' });
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update vault key error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/items', async (req, res) => {
  try {
    const result = await query(
      'SELECT id, ciphertext, iv, created_at, updated_at FROM vault_items WHERE user_id = $1 ORDER BY created_at',
      [req.userId]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Get vault items error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/items', async (req, res) => {
  try {
    const { ciphertext, iv } = req.body;
    if (!isB64(ciphertext, MAX_ITEM_CIPHERTEXT) || !isB64(iv, 32)) return res.status(400).json({ error: 'Invalid entry.' });

    const count = await query('SELECT COUNT(*) FROM vault_items WHERE user_id = $1', [req.userId]);
    if (parseInt(count.rows[0].count, 10) >= MAX_ITEMS) return res.status(400).json({ error: 'Your vault is full.' });

    const result = await query(`
      INSERT INTO vault_items (user_id, ciphertext, iv) VALUES ($1, $2, $3)
      RETURNING id, ciphertext, iv, created_at, updated_at
    `, [req.userId, ciphertext, iv]);
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Create vault item error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/items/:id', async (req, res) => {
  try {
    const { ciphertext, iv } = req.body;
    if (!isB64(ciphertext, MAX_ITEM_CIPHERTEXT) || !isB64(iv, 32)) return res.status(400).json({ error: 'Invalid entry.' });
    const result = await query(`
      UPDATE vault_items SET ciphertext = $3, iv = $4, updated_at = NOW()
      WHERE id = $1 AND user_id = $2
      RETURNING id, ciphertext, iv, created_at, updated_at
    `, [req.params.id, req.userId, ciphertext, iv]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Entry not found' });
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update vault item error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/items/:id', async (req, res) => {
  try {
    const result = await query('DELETE FROM vault_items WHERE id = $1 AND user_id = $2 RETURNING id', [req.params.id, req.userId]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Entry not found' });
    res.json({ success: true });
  } catch (error) {
    console.error('Delete vault item error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
