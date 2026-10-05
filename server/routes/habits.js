import express from 'express';
import { query } from '../db.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

router.use(requireAuth);

// Get all habits
router.get('/', async (req, res) => {
  try {
    const result = await query('SELECT * FROM habits WHERE user_id = $1 ORDER BY created_at DESC', [req.userId]);
    res.json(result.rows);
  } catch (error) {
    console.error('Get habits error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create habit
router.post('/', async (req, res) => {
  try {
    const { name, emoji, frequency_type, frequency_days, color, goal_description } = req.body;
    
    const result = await query(`
      INSERT INTO habits (user_id, name, emoji, frequency_type, frequency_days, color, goal_description)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `, [req.userId, name, emoji, frequency_type, frequency_days, color, goal_description]);

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Post habit error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update habit
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, emoji, frequency_type, frequency_days, color, goal_description } = req.body;
    
    const result = await query(`
      UPDATE habits 
      SET name = $1, emoji = $2, frequency_type = $3, frequency_days = $4, color = $5, goal_description = $6, updated_at = NOW()
      WHERE id = $7 AND user_id = $8
      RETURNING *
    `, [name, emoji, frequency_type, frequency_days, color, goal_description, id, req.userId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Habit not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update habit error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete habit
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await query('DELETE FROM habits WHERE id = $1 AND user_id = $2', [id, req.userId]);
    res.json({ success: true });
  } catch (error) {
    console.error('Delete habit error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── HABIT LOGS ─────────────────────────────────────────────────────────────

// Get all logs
router.get('/logs', async (req, res) => {
  try {
    const result = await query('SELECT * FROM habit_logs WHERE user_id = $1', [req.userId]);
    res.json(result.rows);
  } catch (error) {
    console.error('Get habit logs error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Toggle log completion
router.post('/logs/toggle', async (req, res) => {
  try {
    const { habit_id, date, completed } = req.body;
    
    const owned = await query('SELECT 1 FROM habits WHERE id = $1 AND user_id = $2', [habit_id, req.userId]);
    if (owned.rows.length === 0) {
      return res.status(404).json({ error: 'Habit not found' });
    }

    const result = await query(`
      INSERT INTO habit_logs (user_id, habit_id, date, completed)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (habit_id, date)
      DO UPDATE SET completed = EXCLUDED.completed
      RETURNING *
    `, [req.userId, habit_id, date, completed]);

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Toggle habit log error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
