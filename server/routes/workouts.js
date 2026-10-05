import express from 'express';
import { pool, query } from '../db.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();
router.use(requireAuth);

const WORKOUT_TYPES = ['strength', 'cardio', 'flexibility', 'sport', 'other'];
const MAX_EXERCISES = 30;

const SESSION_SELECT = `
  SELECT
    s.id, s.title, s.type, s.date, s.duration_minutes, s.feeling, s.notes, s.template_id, s.created_at,
    COALESCE(
      (SELECT json_agg(json_build_object(
          'id', e.id, 'name', e.name, 'sets', e.sets, 'reps', e.reps, 'weight', e.weight,
          'duration_minutes', e.duration_minutes, 'distance_km', e.distance_km
        ) ORDER BY e.position)
       FROM workout_exercises e WHERE e.session_id = s.id),
      '[]'
    ) AS exercises
  FROM workout_sessions s
`;

const TEMPLATE_SELECT = `
  SELECT
    t.id, t.name, t.type, t.created_at,
    COALESCE(
      (SELECT json_agg(json_build_object(
          'name', e.name, 'sets', e.sets, 'reps', e.reps, 'weight', e.weight,
          'duration_minutes', e.duration_minutes, 'distance_km', e.distance_km
        ) ORDER BY e.position)
       FROM workout_template_exercises e WHERE e.template_id = t.id),
      '[]'
    ) AS exercises
  FROM workout_templates t
`;

// Optional non-negative number; '' and null mean "not set"
const optionalNumber = (value, { integer = false, max = 100000 } = {}) => {
  if (value === undefined || value === null || value === '') return { ok: true, value: null };
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0 || n > max || (integer && !Number.isInteger(n))) return { ok: false };
  return { ok: true, value: n };
};

// Validates and normalizes an exercise list. Returns { error } or { exercises }.
function parseExercises(list) {
  if (list === undefined) return { exercises: [] };
  if (!Array.isArray(list) || list.length > MAX_EXERCISES) return { error: `Up to ${MAX_EXERCISES} exercises.` };
  const exercises = [];
  for (const raw of list) {
    const name = typeof raw?.name === 'string' ? raw.name.trim() : '';
    if (!name) continue; // blank rows from the form are ignored
    if (name.length > 255) return { error: 'Exercise name is too long.' };
    const fields = {
      sets: optionalNumber(raw.sets, { integer: true, max: 100 }),
      reps: optionalNumber(raw.reps, { integer: true, max: 1000 }),
      weight: optionalNumber(raw.weight, { max: 1000 }),
      duration_minutes: optionalNumber(raw.duration_minutes, { integer: true, max: 1440 }),
      distance_km: optionalNumber(raw.distance_km, { max: 1000 }),
    };
    const bad = Object.entries(fields).find(([, f]) => !f.ok);
    if (bad) return { error: `Invalid ${bad[0].replace('_', ' ')} for "${name}".` };
    exercises.push({ name, ...Object.fromEntries(Object.entries(fields).map(([k, f]) => [k, f.value])) });
  }
  return { exercises };
}

function parseSession(body) {
  const { title, type, date, duration_minutes, feeling, notes } = body;
  if (!WORKOUT_TYPES.includes(type)) return { error: 'Pick a workout type.' };
  if (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return { error: 'Invalid date.' };
  if (title != null && (typeof title !== 'string' || title.length > 255)) return { error: 'Title is too long.' };
  if (notes != null && typeof notes !== 'string') return { error: 'Invalid notes.' };
  const duration = optionalNumber(duration_minutes, { integer: true, max: 1440 });
  if (!duration.ok) return { error: 'Invalid duration.' };
  const feel = optionalNumber(feeling, { integer: true, max: 5 });
  if (!feel.ok || feel.value === 0) return { error: 'Invalid feeling.' };
  const { exercises, error } = parseExercises(body.exercises);
  if (error) return { error };
  return {
    session: { title: title?.trim() || null, type, date, duration_minutes: duration.value, feeling: feel.value, notes: notes?.trim() || null },
    exercises,
  };
}

async function inTransaction(work) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await work(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

async function insertExercises(client, userId, sessionId, exercises) {
  for (const [position, e] of exercises.entries()) {
    await client.query(`
      INSERT INTO workout_exercises (user_id, session_id, name, sets, reps, weight, duration_minutes, distance_km, position)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    `, [userId, sessionId, e.name, e.sets ?? 1, e.reps, e.weight, e.duration_minutes, e.distance_km, position]);
  }
}

async function createTemplate(client, userId, name, type, exercises) {
  const created = await client.query(
    'INSERT INTO workout_templates (user_id, name, type) VALUES ($1, $2, $3) RETURNING id',
    [userId, name, type]
  );
  const templateId = created.rows[0].id;
  for (const [position, e] of exercises.entries()) {
    await client.query(`
      INSERT INTO workout_template_exercises (template_id, name, sets, reps, weight, duration_minutes, distance_km, position)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    `, [templateId, e.name, e.sets, e.reps, e.weight, e.duration_minutes, e.distance_km, position]);
  }
  return templateId;
}

// ── Sessions ────────────────────────────────────────────────────────────────

router.get('/sessions', async (req, res) => {
  try {
    const result = await query(`${SESSION_SELECT} WHERE s.user_id = $1 ORDER BY s.date DESC, s.created_at DESC`, [req.userId]);
    res.json(result.rows);
  } catch (error) {
    console.error('Get workouts error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/sessions', async (req, res) => {
  try {
    const { session, exercises, error } = parseSession(req.body);
    if (error) return res.status(400).json({ error });

    const templateName = typeof req.body.save_as_template === 'string' ? req.body.save_as_template.trim() : '';
    if (templateName.length > 255) return res.status(400).json({ error: 'Template name is too long.' });
    if (templateName && exercises.length === 0) return res.status(400).json({ error: 'Add exercises to save a template.' });

    const id = await inTransaction(async (client) => {
      const templateId = templateName
        ? await createTemplate(client, req.userId, templateName, session.type, exercises)
        : null;
      const created = await client.query(`
        INSERT INTO workout_sessions (user_id, template_id, title, type, date, duration_minutes, feeling, notes)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING id
      `, [req.userId, templateId, session.title, session.type, session.date, session.duration_minutes, session.feeling, session.notes]);
      await insertExercises(client, req.userId, created.rows[0].id, exercises);
      return created.rows[0].id;
    });

    const result = await query(`${SESSION_SELECT} WHERE s.id = $1`, [id]);
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Create workout error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/sessions/:id', async (req, res) => {
  try {
    const { session, exercises, error } = parseSession(req.body);
    if (error) return res.status(400).json({ error });

    const updated = await inTransaction(async (client) => {
      const result = await client.query(`
        UPDATE workout_sessions
        SET title = $1, type = $2, date = $3, duration_minutes = $4, feeling = $5, notes = $6, updated_at = NOW()
        WHERE id = $7 AND user_id = $8
        RETURNING id
      `, [session.title, session.type, session.date, session.duration_minutes, session.feeling, session.notes, req.params.id, req.userId]);
      if (result.rows.length === 0) return false;
      await client.query('DELETE FROM workout_exercises WHERE session_id = $1', [req.params.id]);
      await insertExercises(client, req.userId, req.params.id, exercises);
      return true;
    });
    if (!updated) return res.status(404).json({ error: 'Workout not found' });

    const result = await query(`${SESSION_SELECT} WHERE s.id = $1`, [req.params.id]);
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update workout error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/sessions/:id', async (req, res) => {
  try {
    const result = await query('DELETE FROM workout_sessions WHERE id = $1 AND user_id = $2 RETURNING id', [req.params.id, req.userId]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Workout not found' });
    res.json({ success: true });
  } catch (error) {
    console.error('Delete workout error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── Templates ───────────────────────────────────────────────────────────────

router.get('/templates', async (req, res) => {
  try {
    const result = await query(`${TEMPLATE_SELECT} WHERE t.user_id = $1 ORDER BY t.name`, [req.userId]);
    res.json(result.rows);
  } catch (error) {
    console.error('Get templates error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/templates', async (req, res) => {
  try {
    const name = typeof req.body.name === 'string' ? req.body.name.trim() : '';
    if (!name || name.length > 255) return res.status(400).json({ error: 'Give the template a name.' });
    if (!WORKOUT_TYPES.includes(req.body.type)) return res.status(400).json({ error: 'Pick a workout type.' });
    const { exercises, error } = parseExercises(req.body.exercises);
    if (error) return res.status(400).json({ error });
    if (exercises.length === 0) return res.status(400).json({ error: 'Add at least one exercise.' });

    const id = await inTransaction(client => createTemplate(client, req.userId, name, req.body.type, exercises));
    const result = await query(`${TEMPLATE_SELECT} WHERE t.id = $1`, [id]);
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Create template error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/templates/:id', async (req, res) => {
  try {
    const result = await query('DELETE FROM workout_templates WHERE id = $1 AND user_id = $2 RETURNING id', [req.params.id, req.userId]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Template not found' });
    res.json({ success: true });
  } catch (error) {
    console.error('Delete template error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
