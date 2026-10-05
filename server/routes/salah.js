import express from 'express';
import { query } from '../db.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

router.use(requireAuth);

// Get all salah logs
// Returns formatted object: { 'YYYY-MM-DD': { fajr: { status, note }, ... } }
router.get('/', async (req, res) => {
  try {
    const result = await query('SELECT * FROM salah_logs WHERE user_id = $1', [req.userId]);
    
    const formattedLog = {};
    result.rows.forEach(row => {
      formattedLog[row.date] = {
        fajr: { status: row.fajr_status, note: row.fajr_note },
        dhuhr: { status: row.dhuhr_status, note: row.dhuhr_note },
        asr: { status: row.asr_status, note: row.asr_note },
        maghrib: { status: row.maghrib_status, note: row.maghrib_note },
        isha: { status: row.isha_status, note: row.isha_note },
      };
    });

    res.json(formattedLog);
  } catch (error) {
    console.error('Get salah error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update prayer status or note
router.post('/', async (req, res) => {
  try {
    const { date, prayerId, status, note } = req.body;
    
    // Validate prayerId
    const validPrayers = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'];
    if (!validPrayers.includes(prayerId)) {
      return res.status(400).json({ error: 'Invalid prayer ID' });
    }

    const statusCol = `${prayerId}_status`;
    const noteCol = `${prayerId}_note`;

    // Upsert this profile's row for the day, touching only the fields that were sent
    const setStatus = status !== undefined;
    const setNote = note !== undefined;
    await query(`
      INSERT INTO salah_logs (user_id, date, ${statusCol}, ${noteCol})
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (user_id, date) DO UPDATE SET
        ${statusCol} = CASE WHEN $5 THEN EXCLUDED.${statusCol} ELSE salah_logs.${statusCol} END,
        ${noteCol}   = CASE WHEN $6 THEN EXCLUDED.${noteCol}   ELSE salah_logs.${noteCol}   END,
        updated_at = NOW()
    `, [req.userId, date, setStatus ? status : null, setNote ? note : null, setStatus, setNote]);

    res.json({ success: true });
  } catch (error) {
    console.error('Update salah error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
