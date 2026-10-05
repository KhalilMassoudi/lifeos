import express from 'express';
import { query } from '../db.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();
router.use(requireAuth);

// Helper to parse dates in local timezone to avoid timezone shifts
function parseLocalDate(dateVal) {
  if (!dateVal) return null;
  if (dateVal instanceof Date) {
    const year = dateVal.getFullYear();
    const month = String(dateVal.getMonth() + 1).padStart(2, '0');
    const day = String(dateVal.getDate()).padStart(2, '0');
    return {
      dateStr: `${year}-${month}-${day}`,
      date: new Date(year, dateVal.getMonth(), dateVal.getDate())
    };
  }
  
  if (typeof dateVal === 'string') {
    const cleanStr = dateVal.split('T')[0];
    const [y, m, d] = cleanStr.split('-');
    return {
      dateStr: cleanStr,
      date: new Date(parseInt(y, 10), parseInt(m, 10) - 1, parseInt(d, 10))
    };
  }
  
  const d = new Date(dateVal);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return {
    dateStr: `${year}-${month}-${day}`,
    date: new Date(year, d.getMonth(), d.getDate())
  };
}

// Helper to format Date objects as YYYY-MM-DD local string
function formatLocalDate(dateVal) {
  if (!dateVal) return null;
  if (dateVal instanceof Date) {
    const year = dateVal.getFullYear();
    const month = String(dateVal.getMonth() + 1).padStart(2, '0');
    const day = String(dateVal.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
  if (typeof dateVal === 'string') {
    return dateVal.split('T')[0];
  }
  return formatLocalDate(new Date(dateVal));
}

// Whole calendar days from one YYYY-MM-DD string to another. Uses UTC so the
// result never depends on the server timezone or daylight-saving changes.
function daysBetween(fromStr, toStr) {
  const toUtc = (s) => {
    const [y, m, d] = s.split('-').map(Number);
    return Date.UTC(y, m - 1, d);
  };
  return Math.round((toUtc(toStr) - toUtc(fromStr)) / (1000 * 60 * 60 * 24));
}

// This profile's settings row, created with defaults on first use
async function getSettings(userId) {
  await query(`
    INSERT INTO period_settings (user_id)
    SELECT $1 WHERE NOT EXISTS (SELECT 1 FROM period_settings WHERE user_id = $1)
  `, [userId]);
  const result = await query('SELECT * FROM period_settings WHERE user_id = $1 LIMIT 1', [userId]);
  return result.rows[0];
}

// Helper: Recalculate period_cycles based on period_logs
async function recalculateCycles(userId) {
  const logsRes = await query(`
    SELECT log_date, is_period_day, is_period_start, is_period_end 
    FROM period_logs 
    WHERE user_id = $1 AND (is_period_day = TRUE OR is_period_start = TRUE OR is_period_end = TRUE)
    ORDER BY log_date ASC
  `, [userId]);
  
  const logs = logsRes.rows.map(r => {
    return {
      dateStr: formatLocalDate(r.log_date),
      isPeriodDay: r.is_period_day,
      isStart: r.is_period_start,
      isEnd: r.is_period_end
    };
  });

  if (logs.length === 0) {
    await query('DELETE FROM period_cycles WHERE user_id = $1', [userId]);
    return;
  }

  const cycles = [];
  let currentCycle = null;

  for (let i = 0; i < logs.length; i++) {
    const log = logs[i];
    
    let startsNew = log.isStart;
    if (!startsNew && log.isPeriodDay) {
      if (!currentCycle) {
        startsNew = true;
      } else {
        if (daysBetween(currentCycle.lastPeriodDate, log.dateStr) > 3) {
          startsNew = true;
        }
      }
    }

    if (startsNew) {
      if (currentCycle) {
        currentCycle.cycle_length = daysBetween(currentCycle.start_date, log.dateStr);
        cycles.push(currentCycle);
      }
      currentCycle = {
        start_date: log.dateStr,
        end_date: log.dateStr,
        lastPeriodDate: log.dateStr,
        period_duration: 1
      };
    } else if (currentCycle && log.isPeriodDay) {
      currentCycle.end_date = log.dateStr;
      currentCycle.lastPeriodDate = log.dateStr;
      
      currentCycle.period_duration = daysBetween(currentCycle.start_date, currentCycle.end_date) + 1;
    }

    if (log.isEnd && currentCycle) {
      currentCycle.end_date = log.dateStr;
      currentCycle.period_duration = daysBetween(currentCycle.start_date, currentCycle.end_date) + 1;
    }
  }

  if (currentCycle) {
    cycles.push(currentCycle);
  }

  // Delete all and write recalculated cycles
  await query('DELETE FROM period_cycles WHERE user_id = $1', [userId]);
  for (const c of cycles) {
    const dbPeriodDuration = isNaN(c.period_duration) ? 1 : c.period_duration;
    const dbCycleLength = (c.cycle_length && !isNaN(c.cycle_length)) ? c.cycle_length : null;

    await query(`
      INSERT INTO period_cycles (user_id, start_date, end_date, cycle_length, period_duration)
      VALUES ($1, $2, $3, $4, $5)
    `, [userId, c.start_date, c.end_date, dbCycleLength, dbPeriodDuration]);
  }
}

// GET /api/period/logs?month=YYYY-MM — get all logs for a month
router.get('/logs', async (req, res) => {
  try {
    const { month } = req.query; // YYYY-MM
    if (!month) {
      return res.status(400).json({ error: 'Month parameter is required' });
    }
    const result = await query(`
      SELECT * FROM period_logs 
      WHERE user_id = $1 AND TO_CHAR(log_date, 'YYYY-MM') = $2
      ORDER BY log_date ASC
    `, [req.userId, month]);

    const formattedRows = result.rows.map(r => ({
      ...r,
      log_date: formatLocalDate(r.log_date)
    }));
    
    res.json(formattedRows);
  } catch (error) {
    console.error('Get logs error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/period/log — create or update a day log (upsert by date)
router.post('/log', async (req, res) => {
  try {
    const { 
      log_date, 
      is_period_day = false, 
      is_period_start = false,
      is_period_end = false,
      flow_intensity = null, 
      moods = [], 
      symptoms = [], 
      energy_level = null, 
      notes = '' 
    } = req.body;

    if (!log_date) {
      return res.status(400).json({ error: 'Log date is required' });
    }

    const result = await query(`
      INSERT INTO period_logs (user_id, log_date, is_period_day, is_period_start, is_period_end, flow_intensity, moods, symptoms, energy_level, notes, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())
      ON CONFLICT (user_id, log_date) 
      DO UPDATE SET 
        is_period_day = EXCLUDED.is_period_day,
        is_period_start = EXCLUDED.is_period_start,
        is_period_end = EXCLUDED.is_period_end,
        flow_intensity = EXCLUDED.flow_intensity,
        moods = EXCLUDED.moods,
        symptoms = EXCLUDED.symptoms,
        energy_level = EXCLUDED.energy_level,
        notes = EXCLUDED.notes,
        updated_at = NOW()
      RETURNING *
    `, [req.userId, log_date, is_period_day, is_period_start, is_period_end, flow_intensity, moods, symptoms, energy_level, notes]);

    // Recalculate cycles
    await recalculateCycles(req.userId);

    const formattedLog = {
      ...result.rows[0],
      log_date: formatLocalDate(result.rows[0].log_date)
    };
    res.json(formattedLog);
  } catch (error) {
    console.error('Post log error — full detail:', error.message, error.detail || '', error.code || '');
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

// GET /api/period/cycles — get all cycle history
router.get('/cycles', async (req, res) => {
  try {
    const result = await query('SELECT * FROM period_cycles WHERE user_id = $1 ORDER BY start_date DESC', [req.userId]);
    const formatted = result.rows.map(r => ({
      ...r,
      start_date: formatLocalDate(r.start_date),
      end_date: r.end_date ? formatLocalDate(r.end_date) : null
    }));
    res.json(formatted);
  } catch (error) {
    console.error('Get cycles error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/period/settings — get settings
router.get('/settings', async (req, res) => {
  try {
    res.json(await getSettings(req.userId));
  } catch (error) {
    console.error('Get settings error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/period/settings — update settings
router.put('/settings', async (req, res) => {
  try {
    const { average_cycle_length, average_period_duration, reminder_time, show_fertile_window } = req.body;
    await getSettings(req.userId); // make sure this profile has a settings row
    const result = await query(`
      UPDATE period_settings
      SET average_cycle_length = COALESCE($1, average_cycle_length),
          average_period_duration = COALESCE($2, average_period_duration),
          reminder_time = COALESCE($3, reminder_time),
          show_fertile_window = COALESCE($4, show_fertile_window)
      WHERE user_id = $5
      RETURNING *
    `, [average_cycle_length, average_period_duration, reminder_time, show_fertile_window, req.userId]);
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Put settings error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/period/stats — returns predictions, averages, current phase
router.get('/stats', async (req, res) => {
  try {
    // 1. Fetch settings & cycles
    const [settings, cyclesRes, logsRes] = await Promise.all([
      getSettings(req.userId),
      query('SELECT * FROM period_cycles WHERE user_id = $1 ORDER BY start_date DESC', [req.userId]),
      query('SELECT log_date, moods, is_period_day FROM period_logs WHERE user_id = $1 ORDER BY log_date ASC', [req.userId])
    ]);

    const cycles = cyclesRes.rows;
    const logs = logsRes.rows;

    // 2. Compute averages from history if available
    let avgCycleLength = settings.average_cycle_length;
    let avgPeriodDuration = settings.average_period_duration;

    const completedCycles = cycles.filter(c => c.cycle_length !== null);
    if (completedCycles.length > 0) {
      const sum = completedCycles.reduce((acc, curr) => acc + curr.cycle_length, 0);
      avgCycleLength = Math.round(sum / completedCycles.length);
    }

    const completedDurations = cycles.filter(c => c.period_duration !== null);
    if (completedDurations.length > 0) {
      const sum = completedDurations.reduce((acc, curr) => acc + curr.period_duration, 0);
      avgPeriodDuration = Math.round(sum / completedDurations.length);
    }

    // Shortest / Longest cycle
    let shortestCycle = null;
    let longestCycle = null;
    if (completedCycles.length > 0) {
      const lengths = completedCycles.map(c => c.cycle_length);
      shortestCycle = Math.min(...lengths);
      longestCycle = Math.max(...lengths);
    }

    // 3. Prediction & Current status based on most recent cycle start date
    let currentCycleDay = null;
    let nextPeriodStart = null;
    let fertileStart = null;
    let fertileEnd = null;
    let ovulationDate = null;
    let currentPhase = 'Unknown';
    let currentPhaseDesc = 'Log a period day to begin cycle calculations.';

    if (cycles.length > 0) {
      const lastCycle = cycles[0];
      const { date: lastStart } = parseLocalDate(lastCycle.start_date);
      const today = new Date();
      today.setHours(0,0,0,0);
      
      currentCycleDay = daysBetween(formatLocalDate(lastStart), formatLocalDate(today)) + 1;

      // Predicted start date
      const nextStart = new Date(lastStart);
      nextStart.setDate(lastStart.getDate() + avgCycleLength);
      nextPeriodStart = formatLocalDate(nextStart);

      // Ovulation & Fertile window (ovulation = cycle day 14)
      const ovDate = new Date(lastStart);
      ovDate.setDate(lastStart.getDate() + 13); // Day 14
      ovulationDate = formatLocalDate(ovDate);

      const fStart = new Date(ovDate);
      fStart.setDate(ovDate.getDate() - 2); // 5 days window centered around ovulation
      fertileStart = formatLocalDate(fStart);

      const fEnd = new Date(ovDate);
      fEnd.setDate(ovDate.getDate() + 2);
      fertileEnd = formatLocalDate(fEnd);

      // Determine current phase based on current cycle day
      if (currentCycleDay >= 1 && currentCycleDay <= avgPeriodDuration) {
        currentPhase = 'Menstrual';
        currentPhaseDesc = 'Your period is here. Estrogen and progesterone are low. Focus on rest, hydration, and gentle movement.';
      } else if (currentCycleDay > avgPeriodDuration && currentCycleDay <= 11) {
        currentPhase = 'Follicular';
        currentPhaseDesc = 'Estrogen levels are rising. Your energy and mood are picking up. Great time for learning, planning, and light workouts.';
      } else if (currentCycleDay >= 12 && currentCycleDay <= 16) {
        currentPhase = 'Ovulatory';
        currentPhaseDesc = 'Peak fertility and estrogen. Energy, confidence, and social vibe are at their maximum. Ovulation occurs in this window.';
      } else {
        currentPhase = 'Luteal';
        currentPhaseDesc = 'Progesterone rises, then drops if no pregnancy. Energy may wind down, and PMS symptoms can occur. Prioritize self-care.';
      }
    }

    // 4. Mood patterns insight: Calculate most frequent mood per cycle phase
    const phaseMoods = {
      Menstrual: {},
      Follicular: {},
      Ovulatory: {},
      Luteal: {}
    };

    logs.forEach(log => {
      if (log.moods && log.moods.length > 0) {
        const logDateStr = formatLocalDate(log.log_date);
        // Find which cycle this log belongs to
        const cycle = cycles.find(c => {
          const offset = daysBetween(formatLocalDate(c.start_date), logDateStr);
          return offset >= 0 && offset < (c.cycle_length || avgCycleLength);
        });

        if (cycle) {
          const diffDays = daysBetween(formatLocalDate(cycle.start_date), logDateStr) + 1;
          
          let phase = 'Luteal';
          if (diffDays >= 1 && diffDays <= avgPeriodDuration) {
            phase = 'Menstrual';
          } else if (diffDays > avgPeriodDuration && diffDays <= 11) {
            phase = 'Follicular';
          } else if (diffDays >= 12 && diffDays <= 16) {
            phase = 'Ovulatory';
          }

          log.moods.forEach(m => {
            phaseMoods[phase][m] = (phaseMoods[phase][m] || 0) + 1;
          });
        }
      }
    });

    const dominantMoods = {};
    Object.entries(phaseMoods).forEach(([phase, moodCounts]) => {
      const sorted = Object.entries(moodCounts).sort((a, b) => b[1] - a[1]);
      dominantMoods[phase] = sorted.length > 0 ? sorted[0][0] : null;
    });

    res.json({
      currentCycleDay,
      averageCycleLength: avgCycleLength,
      averagePeriodDuration: avgPeriodDuration,
      nextPeriodStart,
      fertileWindow: {
        start: fertileStart,
        end: fertileEnd
      },
      ovulationDate,
      shortestCycle,
      longestCycle,
      currentPhase,
      currentPhaseDesc,
      dominantMoods
    });
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
