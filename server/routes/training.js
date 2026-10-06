import express from 'express';
import { query } from '../db.js';
import { requireAuth } from '../middleware/auth.js';
import { WORKOUT_TYPES, parseExercises, inTransaction } from './workouts.js';

// Sports (each profile's own list) and multi-day training programs for any sport
const router = express.Router();
router.use(requireAuth);

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_DAYS = 31;
const DEFAULT_SPORTS = [
  ['Gym', '🏋️'], ['Running', '🏃'], ['Football', '⚽'], ['Swimming', '🏊'], ['Yoga', '🧘'],
];
// Naming a sport like this unlocks the BJJ space
const BJJ_NAME = /\b(bjj|jiu[\s-]?jitsu|grappling|no[\s-]?gi)\b/i;
const sportKind = (name) => (BJJ_NAME.test(name) ? 'bjj' : 'general');

// ── Sports ──────────────────────────────────────────────────────────────────

router.get('/sports', async (req, res) => {
  try {
    let result = await query('SELECT id, name, emoji, kind FROM sports WHERE user_id = $1 ORDER BY created_at, name', [req.userId]);
    if (result.rows.length === 0) {
      for (const [name, emoji] of DEFAULT_SPORTS) {
        await query('INSERT INTO sports (user_id, name, emoji) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING', [req.userId, name, emoji]);
      }
      result = await query('SELECT id, name, emoji, kind FROM sports WHERE user_id = $1 ORDER BY created_at, name', [req.userId]);
    }
    res.json(result.rows);
  } catch (error) {
    console.error('Get sports error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/sports', async (req, res) => {
  try {
    const name = typeof req.body.name === 'string' ? req.body.name.trim() : '';
    const emoji = typeof req.body.emoji === 'string' ? req.body.emoji.trim().slice(0, 20) : null;
    if (!name || name.length > 100) return res.status(400).json({ error: 'Give the sport a name.' });
    const result = await query(`
      INSERT INTO sports (user_id, name, emoji, kind) VALUES ($1, $2, $3, $4)
      ON CONFLICT (user_id, name) DO NOTHING
      RETURNING id, name, emoji, kind
    `, [req.userId, name, emoji || null, sportKind(name)]);
    if (result.rows.length === 0) return res.status(409).json({ error: 'You already have that sport.' });
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Create sport error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/sports/:id', async (req, res) => {
  try {
    const result = await query('DELETE FROM sports WHERE id = $1 AND user_id = $2 RETURNING id', [req.params.id, req.userId]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Sport not found' });
    res.json({ success: true });
  } catch (error) {
    console.error('Delete sport error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── Programs ────────────────────────────────────────────────────────────────

// Programs with their days; each day knows when it was last done and how often
const PROGRAM_SELECT = `
  SELECT
    p.id, p.name, p.description, p.source, p.source_url, p.is_archived, p.created_at, p.updated_at, p.sport_id,
    (SELECT json_build_object('id', sp.id, 'name', sp.name, 'emoji', sp.emoji, 'kind', sp.kind)
     FROM sports sp WHERE sp.id = p.sport_id) AS sport,
    COALESCE((
      SELECT json_agg(json_build_object(
        'id', d.id, 'label', d.label, 'weekday', d.weekday, 'type', d.type, 'notes', d.notes,
        'exercises', d.exercises,
        'last_done', (SELECT MAX(w.date) FROM workout_sessions w WHERE w.program_day_id = d.id),
        'times_done', (SELECT COUNT(*) FROM workout_sessions w WHERE w.program_day_id = d.id)
      ) ORDER BY d.position)
      FROM program_days d WHERE d.program_id = p.id
    ), '[]') AS days
  FROM training_programs p
`;

function parseProgram(body) {
  const name = typeof body.name === 'string' ? body.name.trim() : '';
  if (!name || name.length > 255) return { error: 'Give the program a name.' };
  if (body.description != null && typeof body.description !== 'string') return { error: 'Invalid description.' };
  if (body.sport_id && !UUID.test(body.sport_id)) return { error: 'Invalid sport.' };
  if (!['manual', 'instagram', 'text'].includes(body.source ?? 'manual')) return { error: 'Invalid source.' };
  if (body.source_url != null && (typeof body.source_url !== 'string' || !/^https:\/\//.test(body.source_url))) return { error: 'Invalid source link.' };
  if (!Array.isArray(body.days) || body.days.length === 0) return { error: 'Add at least one day.' };
  if (body.days.length > MAX_DAYS) return { error: `Up to ${MAX_DAYS} days.` };

  const days = [];
  for (const [i, d] of body.days.entries()) {
    const label = typeof d?.label === 'string' && d.label.trim() ? d.label.trim().slice(0, 255) : `Day ${i + 1}`;
    if (d.id && !UUID.test(d.id)) return { error: 'Invalid day.' };
    if (d.weekday != null && d.weekday !== '' && !(Number.isInteger(Number(d.weekday)) && d.weekday >= 0 && d.weekday <= 6)) return { error: `Invalid weekday for "${label}".` };
    if (d.type && !WORKOUT_TYPES.includes(d.type)) return { error: `Invalid type for "${label}".` };
    const { exercises, error } = parseExercises(d.exercises);
    if (error) return { error: `${label}: ${error}` };
    days.push({
      id: d.id || null, label,
      weekday: d.weekday === '' || d.weekday == null ? null : Number(d.weekday),
      type: d.type || 'strength',
      notes: typeof d.notes === 'string' ? d.notes.trim().slice(0, 5000) || null : null,
      exercises,
    });
  }
  return {
    program: {
      name, description: body.description?.trim() || null, sport_id: body.sport_id || null,
      source: body.source || 'manual', source_url: body.source_url || null,
    },
    days,
  };
}

async function ownsSport(client, userId, sportId) {
  if (!sportId) return true;
  const r = await client.query('SELECT 1 FROM sports WHERE id = $1 AND user_id = $2', [sportId, userId]);
  return r.rows.length > 0;
}

// Upsert days by id so workouts already linked to a day keep their link
async function saveDays(client, programId, days) {
  const keep = days.filter(d => d.id).map(d => d.id);
  await client.query(
    'DELETE FROM program_days WHERE program_id = $1 AND NOT (id = ANY($2::uuid[]))',
    [programId, keep]
  );
  for (const [position, d] of days.entries()) {
    const values = [d.label, d.weekday, d.type, d.notes, JSON.stringify(d.exercises), position];
    const updated = d.id
      ? await client.query(`
          UPDATE program_days SET label = $1, weekday = $2, type = $3, notes = $4, exercises = $5, position = $6
          WHERE id = $7 AND program_id = $8 RETURNING id
        `, [...values, d.id, programId])
      : { rows: [] };
    if (updated.rows.length === 0) {
      await client.query(`
        INSERT INTO program_days (label, weekday, type, notes, exercises, position, program_id)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
      `, [...values, programId]);
    }
  }
}

router.get('/programs', async (req, res) => {
  try {
    const result = await query(`${PROGRAM_SELECT} WHERE p.user_id = $1 ORDER BY p.is_archived, p.updated_at DESC`, [req.userId]);
    res.json(result.rows);
  } catch (error) {
    console.error('Get programs error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/programs', async (req, res) => {
  try {
    const { program, days, error } = parseProgram(req.body);
    if (error) return res.status(400).json({ error });
    if (!(await ownsSport({ query }, req.userId, program.sport_id))) return res.status(404).json({ error: 'Sport not found' });

    const id = await inTransaction(async (client) => {
      const created = await client.query(`
        INSERT INTO training_programs (user_id, sport_id, name, description, source, source_url)
        VALUES ($1, $2, $3, $4, $5, $6) RETURNING id
      `, [req.userId, program.sport_id, program.name, program.description, program.source, program.source_url]);
      await saveDays(client, created.rows[0].id, days.map(d => ({ ...d, id: null })));
      return created.rows[0].id;
    });

    res.json((await query(`${PROGRAM_SELECT} WHERE p.id = $1`, [id])).rows[0]);
  } catch (error) {
    console.error('Create program error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/programs/:id', async (req, res) => {
  try {
    const { program, days, error } = parseProgram(req.body);
    if (error) return res.status(400).json({ error });
    if (!(await ownsSport({ query }, req.userId, program.sport_id))) return res.status(404).json({ error: 'Sport not found' });

    const found = await inTransaction(async (client) => {
      const updated = await client.query(`
        UPDATE training_programs
        SET sport_id = $3, name = $4, description = $5, is_archived = $6, updated_at = NOW()
        WHERE id = $1 AND user_id = $2 RETURNING id
      `, [req.params.id, req.userId, program.sport_id, program.name, program.description, Boolean(req.body.is_archived)]);
      if (updated.rows.length === 0) return false;
      await saveDays(client, req.params.id, days);
      return true;
    });
    if (!found) return res.status(404).json({ error: 'Program not found' });

    res.json((await query(`${PROGRAM_SELECT} WHERE p.id = $1`, [req.params.id])).rows[0]);
  } catch (error) {
    console.error('Update program error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/programs/:id', async (req, res) => {
  try {
    const result = await query('DELETE FROM training_programs WHERE id = $1 AND user_id = $2 RETURNING id', [req.params.id, req.userId]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Program not found' });
    res.json({ success: true });
  } catch (error) {
    console.error('Delete program error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
