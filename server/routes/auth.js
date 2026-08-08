import express from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { query } from '../db.js';

const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_lifeos_key';

// Check if user exists
router.get('/status', async (req, res) => {
  try {
    const result = await query('SELECT COUNT(*) FROM users');
    const hasUser = parseInt(result.rows[0].count, 10) > 0;
    res.json({ hasUser });
  } catch (error) {
    console.error('Status error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Register first user
router.post('/register', async (req, res) => {
  try {
    const { password } = req.body;
    
    // Ensure only one user can exist
    const userCheck = await query('SELECT COUNT(*) FROM users');
    if (parseInt(userCheck.rows[0].count, 10) > 0) {
      return res.status(400).json({ error: 'User already exists. Registration closed.' });
    }

    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    const result = await query(
      'INSERT INTO users (password_hash) VALUES ($1) RETURNING id',
      [passwordHash]
    );

    const userId = result.rows[0].id;
    const token = jwt.sign({ userId }, JWT_SECRET, { expiresIn: '24h' });

    res.json({ token });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { password } = req.body;
    
    const result = await query('SELECT id, password_hash FROM users LIMIT 1');
    if (result.rows.length === 0) {
      return res.status(400).json({ error: 'No user exists. Please register.' });
    }

    const user = result.rows[0];
    const isMatch = await bcrypt.compare(password, user.password_hash);

    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid password' });
    }

    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '24h' });
    res.json({ token });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Verify token
router.get('/me', async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ valid: false });
  }

  const token = authHeader.split(' ')[1];
  try {
    jwt.verify(token, JWT_SECRET);
    res.json({ valid: true });
  } catch (err) {
    res.json({ valid: false });
  }
});

export default router;
