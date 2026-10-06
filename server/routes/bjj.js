import express from 'express';
import { query } from '../db.js';
import { requireAuth } from '../middleware/auth.js';
import { inTransaction } from './workouts.js';

// The BJJ space: belt profile, technique library, session journal and gym timetable
const router = express.Router();
router.use(requireAuth);

export const BELTS = ['white', 'blue', 'purple', 'brown', 'black'];
export const POSITIONS = [
  'closed_guard', 'open_guard', 'half_guard', 'butterfly', 'de_la_riva', 'x_guard', 'spider_lasso',
  'mount', 'side_control', 'back', 'north_south', 'knee_on_belly', 'turtle', 'standing', 'leg_entanglement', 'other',
];
export const CATEGORIES = ['submission', 'sweep', 'pass', 'escape', 'takedown', 'transition', 'control', 'guard_retention', 'drill', 'concept', 'other'];
export const STATUSES = ['to_learn', 'learning', 'drilling', 'live'];
export const CLASS_TYPES = ['gi', 'nogi', 'open_mat', 'fundamentals', 'advanced', 'competition', 'kids', 'women', 'private', 'drilling'];
const CLASS_LABELS = {
  gi: 'Gi class', nogi: 'No-Gi class', open_mat: 'Open mat', fundamentals: 'Fundamentals', advanced: 'Advanced class',
  competition: 'Competition class', kids: 'Kids class', women: "Women's class", private: 'Private lesson', drilling: 'Drilling session',
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const TIME = /^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/;
const MAX_BULK = 100;

const str = (v, max) => (typeof v === 'string' && v.trim() ? v.trim().slice(0, max) : null);
const optInt = (v, min, max) => {
  if (v === undefined || v === null || v === '') return { ok: true, value: null };
  const n = Number(v);
  return Number.isInteger(n) && n >= min && n <= max ? { ok: true, value: n } : { ok: false };
};
const httpsUrl = (v) => {
  const s = str(v, 2000);
  if (!s) return { ok: true, value: null };
  try { return new URL(s).protocol === 'https:' ? { ok: true, value: s } : { ok: false }; } catch { return { ok: false }; }
};

// ── Profile ─────────────────────────────────────────────────────────────────

router.get('/profile', async (req, res) => {
  try {
    const result = await query('SELECT belt, stripes, promoted_on, gym_name, gym_instagram FROM bjj_profile WHERE user_id = $1', [req.userId]);
    res.json(result.rows[0] || { belt: 'white', stripes: 0, promoted_on: null, gym_name: null, gym_instagram: null });
  } catch (error) {
    console.error('Get BJJ profile error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/profile', async (req, res) => {
  try {
    const { belt, stripes, promoted_on } = req.body;
    if (!BELTS.includes(belt)) return res.status(400).json({ error: 'Invalid belt.' });
    const s = optInt(stripes, 0, 4);
    if (!s.ok) return res.status(400).json({ error: 'Stripes go from 0 to 4.' });
    if (promoted_on && !DATE.test(promoted_on)) return res.status(400).json({ error: 'Invalid promotion date.' });
    const gymInstagram = str(req.body.gym_instagram, 100)?.replace(/^@/, '').replace(/^https?:\/\/(www\.)?instagram\.com\//, '').replace(/\/.*$/, '') || null;
    if (gymInstagram && !/^[A-Za-z0-9._]{1,30}$/.test(gymInstagram)) return res.status(400).json({ error: 'That doesn\'t look like an Instagram username.' });

    const result = await query(`
      INSERT INTO bjj_profile (user_id, belt, stripes, promoted_on, gym_name, gym_instagram)
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (user_id) DO UPDATE SET
        belt = EXCLUDED.belt, stripes = EXCLUDED.stripes, promoted_on = EXCLUDED.promoted_on,
        gym_name = EXCLUDED.gym_name, gym_instagram = EXCLUDED.gym_instagram, updated_at = NOW()
      RETURNING belt, stripes, promoted_on, gym_name, gym_instagram
    `, [req.userId, belt, s.value ?? 0, promoted_on || null, str(req.body.gym_name, 255), gymInstagram]);
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update BJJ profile error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── Techniques ──────────────────────────────────────────────────────────────

function parseTechnique(body) {
  const name = str(body.name, 255);
  if (!name) return { error: 'Name the technique.' };
  const position = body.position || 'other';
  const category = body.category || 'other';
  const status = body.status || 'to_learn';
  if (!POSITIONS.includes(position)) return { error: 'Invalid position.' };
  if (!CATEGORIES.includes(category)) return { error: 'Invalid category.' };
  if (!STATUSES.includes(status)) return { error: 'Invalid status.' };
  const video = httpsUrl(body.video_url);
  if (!video.ok) return { error: 'Video link must start with https://' };
  return {
    technique: {
      name, position, category, status,
      notes: typeof body.notes === 'string' ? body.notes.trim().slice(0, 10000) || null : null,
      video_url: video.value,
      source: body.source === 'gym' ? 'gym' : 'manual',
      source_label: str(body.source_label, 255),
    },
  };
}

const TECHNIQUE_COLUMNS = 'id, name, position, category, status, notes, video_url, source, source_label, last_reviewed, created_at, updated_at';

router.get('/techniques', async (req, res) => {
  try {
    const result = await query(`
      SELECT ${TECHNIQUE_COLUMNS},
        (SELECT COUNT(*)::int FROM bjj_session_techniques st WHERE st.technique_id = t.id) AS times_practiced
      FROM bjj_techniques t WHERE user_id = $1 ORDER BY name
    `, [req.userId]);
    res.json(result.rows);
  } catch (error) {
    console.error('Get techniques error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/techniques', async (req, res) => {
  try {
    const { technique: t, error } = parseTechnique(req.body);
    if (error) return res.status(400).json({ error });
    const result = await query(`
      INSERT INTO bjj_techniques (user_id, name, position, category, status, notes, video_url, source, source_label)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      ON CONFLICT (user_id, lower(name)) DO NOTHING
      RETURNING ${TECHNIQUE_COLUMNS}, 0 AS times_practiced
    `, [req.userId, t.name, t.position, t.category, t.status, t.notes, t.video_url, t.source, t.source_label]);
    if (result.rows.length === 0) return res.status(409).json({ error: 'That technique is already in your library.' });
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Create technique error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Import a list (e.g. the gym's curriculum); names already in the library are skipped
router.post('/techniques/bulk', async (req, res) => {
  try {
    const list = req.body.techniques;
    if (!Array.isArray(list) || list.length === 0 || list.length > MAX_BULK) return res.status(400).json({ error: `Send 1–${MAX_BULK} techniques.` });
    const parsed = [];
    for (const raw of list) {
      const { technique, error } = parseTechnique(raw);
      if (error) return res.status(400).json({ error: `${raw?.name || 'Technique'}: ${error}` });
      parsed.push(technique);
    }
    const created = await inTransaction(async (client) => {
      let count = 0;
      for (const t of parsed) {
        const r = await client.query(`
          INSERT INTO bjj_techniques (user_id, name, position, category, status, notes, video_url, source, source_label)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
          ON CONFLICT (user_id, lower(name)) DO NOTHING RETURNING id
        `, [req.userId, t.name, t.position, t.category, t.status, t.notes, t.video_url, t.source, t.source_label]);
        count += r.rows.length;
      }
      return count;
    });
    res.json({ created, skipped: parsed.length - created });
  } catch (error) {
    console.error('Bulk techniques error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/techniques/:id', async (req, res) => {
  try {
    const { technique: t, error } = parseTechnique(req.body);
    if (error) return res.status(400).json({ error });
    const result = await query(`
      UPDATE bjj_techniques SET name = $3, position = $4, category = $5, status = $6, notes = $7, video_url = $8, updated_at = NOW()
      WHERE id = $1 AND user_id = $2
      RETURNING ${TECHNIQUE_COLUMNS}
    `, [req.params.id, req.userId, t.name, t.position, t.category, t.status, t.notes, t.video_url]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Technique not found' });
    res.json(result.rows[0]);
  } catch (error) {
    if (error.code === '23505') return res.status(409).json({ error: 'Another technique already has that name.' });
    console.error('Update technique error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/techniques/:id/review', async (req, res) => {
  try {
    const date = DATE.test(req.body.date || '') ? req.body.date : null;
    const result = await query(`
      UPDATE bjj_techniques SET last_reviewed = COALESCE($3::date, CURRENT_DATE), updated_at = NOW()
      WHERE id = $1 AND user_id = $2 RETURNING ${TECHNIQUE_COLUMNS}
    `, [req.params.id, req.userId, date]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Technique not found' });
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Review technique error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/techniques/:id', async (req, res) => {
  try {
    const result = await query('DELETE FROM bjj_techniques WHERE id = $1 AND user_id = $2 RETURNING id', [req.params.id, req.userId]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Technique not found' });
    res.json({ success: true });
  } catch (error) {
    console.error('Delete technique error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── Sessions ────────────────────────────────────────────────────────────────

const SESSION_SELECT = `
  SELECT s.id, s.workout_session_id, s.date, s.class_type, s.duration_minutes, s.rounds, s.subs_hit, s.subs_caught,
    s.energy, s.notes, s.created_at,
    COALESCE((SELECT json_agg(st.technique_id) FROM bjj_session_techniques st WHERE st.session_id = s.id), '[]') AS technique_ids
  FROM bjj_sessions s
`;

function parseSession(body) {
  if (!DATE.test(body.date || '')) return { error: 'Invalid date.' };
  if (!CLASS_TYPES.includes(body.class_type)) return { error: 'Pick a class type.' };
  const fields = {
    duration_minutes: optInt(body.duration_minutes, 0, 1440),
    rounds: optInt(body.rounds, 0, 100),
    subs_hit: optInt(body.subs_hit, 0, 200),
    subs_caught: optInt(body.subs_caught, 0, 200),
    energy: optInt(body.energy, 1, 5),
  };
  const bad = Object.entries(fields).find(([, f]) => !f.ok);
  if (bad) return { error: `Invalid ${bad[0].replace('_', ' ')}.` };
  const ids = body.technique_ids ?? [];
  if (!Array.isArray(ids) || ids.length > MAX_BULK || ids.some(id => !UUID.test(id))) return { error: 'Invalid techniques.' };
  return {
    session: {
      date: body.date, class_type: body.class_type,
      ...Object.fromEntries(Object.entries(fields).map(([k, f]) => [k, f.value])),
      notes: typeof body.notes === 'string' ? body.notes.trim().slice(0, 10000) || null : null,
    },
    techniqueIds: [...new Set(ids)],
  };
}

// The profile's BJJ sport (created on first use) so sessions show up in the Workout Logger
async function bjjSportId(client, userId) {
  const existing = await client.query("SELECT id FROM sports WHERE user_id = $1 AND kind = 'bjj' ORDER BY created_at LIMIT 1", [userId]);
  if (existing.rows[0]) return existing.rows[0].id;
  const created = await client.query(`
    INSERT INTO sports (user_id, name, emoji, kind) VALUES ($1, 'BJJ', '🥋', 'bjj')
    ON CONFLICT (user_id, name) DO UPDATE SET kind = 'bjj' RETURNING id
  `, [userId]);
  return created.rows[0].id;
}

const workoutNotes = (s) => [
  s.rounds != null && `${s.rounds} rounds`,
  s.subs_hit != null && `${s.subs_hit} submissions`,
  s.subs_caught != null && `tapped ${s.subs_caught}×`,
].filter(Boolean).join(' · ') || null;

async function writeSessionTechniques(client, userId, sessionId, date, techniqueIds) {
  await client.query('DELETE FROM bjj_session_techniques WHERE session_id = $1', [sessionId]);
  if (techniqueIds.length === 0) return;
  // Only this profile's techniques; practicing one counts as reviewing it
  const owned = await client.query('SELECT id FROM bjj_techniques WHERE user_id = $1 AND id = ANY($2::uuid[])', [userId, techniqueIds]);
  for (const { id } of owned.rows) {
    await client.query('INSERT INTO bjj_session_techniques (session_id, technique_id) VALUES ($1, $2)', [sessionId, id]);
  }
  await client.query(`
    UPDATE bjj_techniques SET last_reviewed = GREATEST(COALESCE(last_reviewed, $3::date), $3::date)
    WHERE user_id = $1 AND id = ANY($2::uuid[])
  `, [userId, owned.rows.map(r => r.id), date]);
}

router.get('/sessions', async (req, res) => {
  try {
    const result = await query(`${SESSION_SELECT} WHERE s.user_id = $1 ORDER BY s.date DESC, s.created_at DESC`, [req.userId]);
    res.json(result.rows);
  } catch (error) {
    console.error('Get BJJ sessions error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/sessions', async (req, res) => {
  try {
    const { session: s, techniqueIds, error } = parseSession(req.body);
    if (error) return res.status(400).json({ error });
    const logWorkout = req.body.log_workout !== false;

    const id = await inTransaction(async (client) => {
      let workoutId = null;
      if (logWorkout) {
        const sportId = await bjjSportId(client, req.userId);
        const w = await client.query(`
          INSERT INTO workout_sessions (user_id, sport_id, title, type, date, duration_minutes, feeling, notes)
          VALUES ($1, $2, $3, 'sport', $4, $5, $6, $7) RETURNING id
        `, [req.userId, sportId, CLASS_LABELS[s.class_type], s.date, s.duration_minutes, s.energy, workoutNotes(s)]);
        workoutId = w.rows[0].id;
      }
      const created = await client.query(`
        INSERT INTO bjj_sessions (user_id, workout_session_id, date, class_type, duration_minutes, rounds, subs_hit, subs_caught, energy, notes)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING id
      `, [req.userId, workoutId, s.date, s.class_type, s.duration_minutes, s.rounds, s.subs_hit, s.subs_caught, s.energy, s.notes]);
      await writeSessionTechniques(client, req.userId, created.rows[0].id, s.date, techniqueIds);
      return created.rows[0].id;
    });

    res.json((await query(`${SESSION_SELECT} WHERE s.id = $1`, [id])).rows[0]);
  } catch (error) {
    console.error('Create BJJ session error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/sessions/:id', async (req, res) => {
  try {
    const { session: s, techniqueIds, error } = parseSession(req.body);
    if (error) return res.status(400).json({ error });

    const found = await inTransaction(async (client) => {
      const updated = await client.query(`
        UPDATE bjj_sessions SET date = $3, class_type = $4, duration_minutes = $5, rounds = $6, subs_hit = $7,
          subs_caught = $8, energy = $9, notes = $10, updated_at = NOW()
        WHERE id = $1 AND user_id = $2 RETURNING workout_session_id
      `, [req.params.id, req.userId, s.date, s.class_type, s.duration_minutes, s.rounds, s.subs_hit, s.subs_caught, s.energy, s.notes]);
      if (updated.rows.length === 0) return false;
      const workoutId = updated.rows[0].workout_session_id;
      if (workoutId) {
        await client.query(`
          UPDATE workout_sessions SET title = $3, date = $4, duration_minutes = $5, feeling = $6, notes = $7, updated_at = NOW()
          WHERE id = $1 AND user_id = $2
        `, [workoutId, req.userId, CLASS_LABELS[s.class_type], s.date, s.duration_minutes, s.energy, workoutNotes(s)]);
      }
      await writeSessionTechniques(client, req.userId, req.params.id, s.date, techniqueIds);
      return true;
    });
    if (!found) return res.status(404).json({ error: 'Session not found' });

    res.json((await query(`${SESSION_SELECT} WHERE s.id = $1`, [req.params.id])).rows[0]);
  } catch (error) {
    console.error('Update BJJ session error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Deleting a session also removes the workout it created
router.delete('/sessions/:id', async (req, res) => {
  try {
    const found = await inTransaction(async (client) => {
      const deleted = await client.query(
        'DELETE FROM bjj_sessions WHERE id = $1 AND user_id = $2 RETURNING workout_session_id',
        [req.params.id, req.userId]
      );
      if (deleted.rows.length === 0) return false;
      const workoutId = deleted.rows[0].workout_session_id;
      if (workoutId) await client.query('DELETE FROM workout_sessions WHERE id = $1 AND user_id = $2', [workoutId, req.userId]);
      return true;
    });
    if (!found) return res.status(404).json({ error: 'Session not found' });
    res.json({ success: true });
  } catch (error) {
    console.error('Delete BJJ session error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── Gym timetable ───────────────────────────────────────────────────────────

function parseClass(body) {
  const weekday = Number(body.weekday);
  if (!Number.isInteger(weekday) || weekday < 0 || weekday > 6) return { error: 'Pick a day.' };
  if (!TIME.test(body.start_time || '')) return { error: 'Invalid start time.' };
  if (body.end_time && !TIME.test(body.end_time)) return { error: 'Invalid end time.' };
  const classType = CLASS_TYPES.includes(body.class_type) ? body.class_type : 'gi';
  return {
    klass: {
      weekday, start_time: body.start_time, end_time: body.end_time || null,
      title: str(body.title, 255) || CLASS_LABELS[classType], class_type: classType,
      source: body.source === 'instagram' || body.source === 'text' ? body.source : 'manual',
    },
  };
}

const CLASS_COLUMNS = "id, weekday, to_char(start_time, 'HH24:MI') AS start_time, to_char(end_time, 'HH24:MI') AS end_time, title, class_type, source";

router.get('/classes', async (req, res) => {
  try {
    const result = await query(`SELECT ${CLASS_COLUMNS} FROM gym_classes WHERE user_id = $1 ORDER BY weekday, start_time`, [req.userId]);
    res.json(result.rows);
  } catch (error) {
    console.error('Get classes error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/classes', async (req, res) => {
  try {
    const { klass: c, error } = parseClass(req.body);
    if (error) return res.status(400).json({ error });
    const result = await query(`
      INSERT INTO gym_classes (user_id, weekday, start_time, end_time, title, class_type, source)
      VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING ${CLASS_COLUMNS}
    `, [req.userId, c.weekday, c.start_time, c.end_time, c.title, c.class_type, c.source]);
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Create class error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Import a timetable; with replace=true the previously imported classes are swapped out
router.post('/classes/bulk', async (req, res) => {
  try {
    const list = req.body.classes;
    if (!Array.isArray(list) || list.length === 0 || list.length > MAX_BULK) return res.status(400).json({ error: `Send 1–${MAX_BULK} classes.` });
    const parsed = [];
    for (const raw of list) {
      const { klass, error } = parseClass({ ...raw, source: req.body.source });
      if (error) return res.status(400).json({ error });
      parsed.push(klass);
    }
    await inTransaction(async (client) => {
      if (req.body.replace) await client.query("DELETE FROM gym_classes WHERE user_id = $1 AND source <> 'manual'", [req.userId]);
      for (const c of parsed) {
        await client.query(`
          INSERT INTO gym_classes (user_id, weekday, start_time, end_time, title, class_type, source)
          VALUES ($1, $2, $3, $4, $5, $6, $7)
        `, [req.userId, c.weekday, c.start_time, c.end_time, c.title, c.class_type, c.source]);
      }
    });
    const result = await query(`SELECT ${CLASS_COLUMNS} FROM gym_classes WHERE user_id = $1 ORDER BY weekday, start_time`, [req.userId]);
    res.json(result.rows);
  } catch (error) {
    console.error('Bulk classes error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/classes/:id', async (req, res) => {
  try {
    const { klass: c, error } = parseClass(req.body);
    if (error) return res.status(400).json({ error });
    const result = await query(`
      UPDATE gym_classes SET weekday = $3, start_time = $4, end_time = $5, title = $6, class_type = $7
      WHERE id = $1 AND user_id = $2 RETURNING ${CLASS_COLUMNS}
    `, [req.params.id, req.userId, c.weekday, c.start_time, c.end_time, c.title, c.class_type]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Class not found' });
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update class error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/classes/:id', async (req, res) => {
  try {
    const result = await query('DELETE FROM gym_classes WHERE id = $1 AND user_id = $2 RETURNING id', [req.params.id, req.userId]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Class not found' });
    res.json({ success: true });
  } catch (error) {
    console.error('Delete class error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
