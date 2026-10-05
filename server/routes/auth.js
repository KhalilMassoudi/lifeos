import express from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { query } from '../db.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_lifeos_key';
const SALT_ROUNDS = 10;
const MAX_PROFILES = 4;
const MIN_PASSWORD_LENGTH = 6;

const PROFILE_COLUMNS = 'id, name, avatar, color, created_at';

const signToken = (userId) => jwt.sign({ userId }, JWT_SECRET, { expiresIn: '24h' });

// Validates name/avatar/color from a request body. Returns an error message or null.
function validateProfileFields({ name, avatar, color }, { requireName }) {
  if (requireName || name !== undefined) {
    if (typeof name !== 'string' || !name.trim()) return 'Please enter a name.';
    if (name.trim().length > 100) return 'Name is too long.';
  }
  if (avatar !== undefined && avatar !== null && (typeof avatar !== 'string' || avatar.length > 20)) return 'Invalid avatar.';
  if (color !== undefined && color !== null && (typeof color !== 'string' || color.length > 20)) return 'Invalid color.';
  return null;
}

function validatePassword(password) {
  if (typeof password !== 'string' || password.length < MIN_PASSWORD_LENGTH) {
    return `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`;
  }
  return null;
}

async function createProfile({ name, avatar, color, password }) {
  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  const result = await query(
    `INSERT INTO users (name, avatar, color, password_hash) VALUES ($1, $2, $3, $4) RETURNING ${PROFILE_COLUMNS}`,
    [name.trim(), avatar || null, color || null, passwordHash]
  );
  return result.rows[0];
}

// Public: which profiles exist (shown on the lock screen)
router.get('/status', async (req, res) => {
  try {
    const result = await query(`SELECT ${PROFILE_COLUMNS} FROM users ORDER BY created_at`);
    res.json({ hasUser: result.rows.length > 0, profiles: result.rows });
  } catch (error) {
    console.error('Status error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Public, first run only: create the very first profile
router.post('/register', async (req, res) => {
  try {
    const error = validateProfileFields(req.body, { requireName: true }) || validatePassword(req.body.password);
    if (error) return res.status(400).json({ error });

    const userCheck = await query('SELECT COUNT(*) FROM users');
    if (parseInt(userCheck.rows[0].count, 10) > 0) {
      return res.status(400).json({ error: 'LifeOS is already set up. Add more profiles from inside the app.' });
    }

    const user = await createProfile(req.body);
    res.json({ token: signToken(user.id), user });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Public: unlock one profile
router.post('/login', async (req, res) => {
  try {
    const { userId, password } = req.body;
    if (typeof password !== 'string' || !password) {
      return res.status(400).json({ error: 'Password is required.' });
    }

    const result = userId
      ? await query(`SELECT ${PROFILE_COLUMNS}, password_hash FROM users WHERE id = $1`, [userId])
      : await query(`SELECT ${PROFILE_COLUMNS}, password_hash FROM users ORDER BY created_at LIMIT 1`);
    if (result.rows.length === 0) {
      return res.status(400).json({ error: 'Profile not found.' });
    }

    const { password_hash: passwordHash, ...user } = result.rows[0];
    if (!(await bcrypt.compare(password, passwordHash))) {
      return res.status(401).json({ error: 'Invalid password' });
    }

    res.json({ token: signToken(user.id), user });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Verify the current token and return its profile
router.get('/me', async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.json({ valid: false });
  }

  try {
    const { userId } = jwt.verify(authHeader.split(' ')[1], JWT_SECRET);
    const result = await query(`SELECT ${PROFILE_COLUMNS} FROM users WHERE id = $1`, [userId]);
    if (result.rows.length === 0) return res.json({ valid: false });
    res.json({ valid: true, user: result.rows[0] });
  } catch (err) {
    res.json({ valid: false });
  }
});

// Signed in: add another profile (e.g. your partner)
router.post('/profiles', requireAuth, async (req, res) => {
  try {
    const error = validateProfileFields(req.body, { requireName: true }) || validatePassword(req.body.password);
    if (error) return res.status(400).json({ error });

    const count = await query('SELECT COUNT(*) FROM users');
    if (parseInt(count.rows[0].count, 10) >= MAX_PROFILES) {
      return res.status(400).json({ error: `LifeOS supports up to ${MAX_PROFILES} profiles.` });
    }

    const user = await createProfile(req.body);
    res.json(user);
  } catch (error) {
    console.error('Create profile error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Signed in: edit your own name/avatar/color
router.patch('/me', requireAuth, async (req, res) => {
  try {
    const error = validateProfileFields(req.body, { requireName: false });
    if (error) return res.status(400).json({ error });

    const { name, avatar, color } = req.body;
    const result = await query(`
      UPDATE users
      SET name   = COALESCE($1, name),
          avatar = COALESCE($2, avatar),
          color  = COALESCE($3, color),
          updated_at = NOW()
      WHERE id = $4
      RETURNING ${PROFILE_COLUMNS}
    `, [name?.trim() ?? null, avatar ?? null, color ?? null, req.userId]);

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Signed in: change your own password
router.post('/me/password', requireAuth, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const error = validatePassword(newPassword);
    if (error) return res.status(400).json({ error });

    const result = await query('SELECT password_hash FROM users WHERE id = $1', [req.userId]);
    if (!result.rows[0] || !(await bcrypt.compare(currentPassword || '', result.rows[0].password_hash))) {
      return res.status(401).json({ error: 'Current password is incorrect.' });
    }

    const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
    await query('UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2', [passwordHash, req.userId]);
    res.json({ success: true });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
