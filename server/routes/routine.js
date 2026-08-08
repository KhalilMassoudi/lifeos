import express from 'express';
import { query } from '../db.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

router.use(requireAuth);

// ==========================================
// ROUTINE BLOCKS
// ==========================================

router.get('/blocks', async (req, res) => {
  try {
    const result = await query('SELECT * FROM routine_blocks ORDER BY time ASC');
    res.json(result.rows);
  } catch (error) {
    console.error('Get routine blocks error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/blocks', async (req, res) => {
  try {
    const { time, title, duration_minutes, label, emoji, color_category } = req.body;
    
    const result = await query(`
      INSERT INTO routine_blocks (time, title, duration_minutes, label, emoji, color_category)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `, [time, title, duration_minutes, label, emoji, color_category]);

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Post routine block error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/blocks/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await query('DELETE FROM routine_blocks WHERE id = $1', [id]);
    res.json({ success: true });
  } catch (error) {
    console.error('Delete routine block error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ==========================================
// ROUTINE LOGS (Daily Check-ins)
// ==========================================

router.get('/logs', async (req, res) => {
  try {
    const result = await query('SELECT * FROM routine_logs');
    res.json(result.rows.map(r => ({
      ...r,
      date: r.date.toISOString().split('T')[0]
    })));
  } catch (error) {
    console.error('Get routine logs error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/logs/toggle', async (req, res) => {
  try {
    const { block_id, date, completed } = req.body;
    
    const result = await query(`
      INSERT INTO routine_logs (block_id, date, completed)
      VALUES ($1, $2, $3)
      ON CONFLICT (block_id, date)
      DO UPDATE SET completed = EXCLUDED.completed, created_at = NOW()
      RETURNING *
    `, [block_id, date, completed]);

    res.json({
      ...result.rows[0],
      date: result.rows[0].date.toISOString().split('T')[0]
    });
  } catch (error) {
    console.error('Toggle routine log error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ==========================================
// ONE-OFF TASKS
// ==========================================

router.get('/tasks', async (req, res) => {
  try {
    const result = await query('SELECT * FROM one_off_tasks ORDER BY completed ASC, due_time ASC NULLS LAST, created_at DESC');
    res.json(result.rows.map(r => ({
      ...r,
      date: r.date.toISOString().split('T')[0]
    })));
  } catch (error) {
    console.error('Get one-off tasks error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/tasks', async (req, res) => {
  try {
    const { title, priority, due_time, date } = req.body;
    
    const result = await query(`
      INSERT INTO one_off_tasks (title, priority, due_time, date)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `, [title, priority, due_time || null, date]);

    res.json({
      ...result.rows[0],
      date: result.rows[0].date.toISOString().split('T')[0]
    });
  } catch (error) {
    console.error('Post one-off task error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/tasks/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { completed } = req.body;
    
    const result = await query(`
      UPDATE one_off_tasks
      SET completed = $1, updated_at = NOW()
      WHERE id = $2
      RETURNING *
    `, [completed, id]);

    res.json({
      ...result.rows[0],
      date: result.rows[0].date.toISOString().split('T')[0]
    });
  } catch (error) {
    console.error('Update one-off task error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/tasks/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await query('DELETE FROM one_off_tasks WHERE id = $1', [id]);
    res.json({ success: true });
  } catch (error) {
    console.error('Delete one-off task error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
