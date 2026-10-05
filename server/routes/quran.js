import express from 'express';
import { query } from '../db.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

router.use(requireAuth);

// ─── Sessions ───────────────────────────────────────────────────────────────

router.get('/sessions', async (req, res) => {
  try {
    const result = await query('SELECT * FROM quran_sessions WHERE user_id = $1 ORDER BY date DESC, created_at DESC', [req.userId]);
    res.json(result.rows);
  } catch (error) {
    console.error('Get quran sessions error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/sessions', async (req, res) => {
  try {
    const { surahNumber, fromAyah, toAyah, duration, sessionType, difficulty, notes, date } = req.body;
    
    const result = await query(`
      INSERT INTO quran_sessions (user_id, surah_number, from_ayah, to_ayah, duration, session_type, difficulty, notes, date)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `, [req.userId, surahNumber, fromAyah, toAyah, duration, sessionType, difficulty, notes, date]);

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Post quran session error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/sessions/:id', async (req, res) => {
  try {
    await query('DELETE FROM quran_sessions WHERE id = $1 AND user_id = $2', [req.params.id, req.userId]);
    res.json({ success: true });
  } catch (error) {
    console.error('Delete quran session error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── Memorization ───────────────────────────────────────────────────────────

// Get all memorization map
// Returns { surahNumber: { ayahNumber: status } }
router.get('/memorization', async (req, res) => {
  try {
    const result = await query('SELECT surah_number, ayah_number, status FROM quran_memorization WHERE user_id = $1', [req.userId]);
    
    const map = {};
    result.rows.forEach(row => {
      const s = row.surah_number;
      const a = row.ayah_number;
      if (!map[s]) map[s] = {};
      map[s][a] = row.status;
    });

    res.json(map);
  } catch (error) {
    console.error('Get quran memorization error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/memorization/toggle', async (req, res) => {
  try {
    const { surahNumber, ayahNumber, status } = req.body;
    
    if (status === 'notstarted') {
      // Delete from DB to keep it clean
      await query('DELETE FROM quran_memorization WHERE user_id = $1 AND surah_number = $2 AND ayah_number = $3', [req.userId, surahNumber, ayahNumber]);
    } else {
      await query(`
        INSERT INTO quran_memorization (user_id, surah_number, ayah_number, status)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (user_id, surah_number, ayah_number)
        DO UPDATE SET status = EXCLUDED.status, updated_at = NOW()
      `, [req.userId, surahNumber, ayahNumber, status]);
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Toggle quran memorization error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
