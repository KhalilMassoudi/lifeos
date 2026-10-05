import express from 'express';
import { query } from '../db.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

router.use(requireAuth);

// Get all salah logs
// Returns formatted object: { 'YYYY-MM-DD': { fajr: { status, note }, ... } }
router.get('/', async (req, res) => {
  try {
    const result = await query('SELECT * FROM salah_logs');
    
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

    // Fetch existing row to merge updates if needed, but we can do an UPSERT
    // The tricky part: we only want to update one prayer's status/note and leave others alone.
    // Using COALESCE during INSERT isn't straightforward because we don't have existing values.
    // Let's do a SELECT first.
    
    const existResult = await query('SELECT * FROM salah_logs WHERE date = $1', [date]);
    
    if (existResult.rows.length === 0) {
      // Insert new
      await query(`
        INSERT INTO salah_logs (date, ${statusCol}, ${noteCol})
        VALUES ($1, $2, $3)
      `, [date, status, note]);
    } else {
      // Update existing
      // Only update fields that were provided in the request
      let updateQuery = `UPDATE salah_logs SET updated_at = NOW()`;
      const params = [date];
      let paramIndex = 2;

      if (status !== undefined) {
        updateQuery += `, ${statusCol} = $${paramIndex}`;
        params.push(status);
        paramIndex++;
      }
      if (note !== undefined) {
        updateQuery += `, ${noteCol} = $${paramIndex}`;
        params.push(note);
        paramIndex++;
      }

      updateQuery += ` WHERE date = $1`;
      
      await query(updateQuery, params);
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Update salah error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
