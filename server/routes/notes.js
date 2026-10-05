import express from 'express';
import { pool, query } from '../db.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();
router.use(requireAuth);

// journal    — private, or shared with the other profiles (read-only for them)
// quick_note — always private
// love_note  — always visible to every profile
const NOTE_TYPES = ['journal', 'quick_note', 'love_note'];
const COLOR_TAGS = ['blush', 'lavender', 'mint', 'peach', 'butter', 'sky'];
const MAX_TAGS = 10;

// Notes with their author and tag names
const NOTE_SELECT = `
  SELECT
    n.id, n.user_id, n.type, n.title, n.content, n.mood, n.color_tag, n.is_pinned,
    n.is_shared, n.date, n.created_at, n.updated_at,
    json_build_object('id', u.id, 'name', u.name, 'avatar', u.avatar, 'color', u.color) AS author,
    COALESCE(
      (SELECT json_agg(t.name ORDER BY t.name)
       FROM note_tags nt JOIN tags t ON t.id = nt.tag_id
       WHERE nt.note_id = n.id),
      '[]'
    ) AS tags
  FROM notes n
  JOIN users u ON u.id = n.user_id
`;

function validateNote(body, { partial }) {
  const { type, title, content, mood, color_tag, date, tags } = body;
  if (!partial && !NOTE_TYPES.includes(type)) return 'Invalid note type.';
  if (!partial || content !== undefined) {
    if (typeof content !== 'string' || !content.trim()) return 'Write something first ✍️';
  }
  if (title != null && (typeof title !== 'string' || title.length > 255)) return 'Title is too long.';
  if (mood != null && (typeof mood !== 'string' || mood.length > 50)) return 'Invalid mood.';
  if (color_tag != null && !COLOR_TAGS.includes(color_tag)) return 'Invalid color.';
  if (date != null && !/^\d{4}-\d{2}-\d{2}$/.test(date)) return 'Invalid date.';
  if (tags !== undefined && (!Array.isArray(tags) || tags.length > MAX_TAGS || tags.some(t => typeof t !== 'string'))) {
    return `Up to ${MAX_TAGS} tags.`;
  }
  return null;
}

const cleanTags = (tags) =>
  [...new Set(tags.map(t => t.trim().toLowerCase().replace(/^#/, '')).filter(Boolean).map(t => t.slice(0, 40)))];

// Replace a note's tags with `names`, creating this profile's tags as needed
async function setNoteTags(client, userId, noteId, names) {
  await client.query('DELETE FROM note_tags WHERE note_id = $1', [noteId]);
  for (const name of cleanTags(names)) {
    const tag = await client.query(`
      INSERT INTO tags (user_id, name) VALUES ($1, $2)
      ON CONFLICT (user_id, name) DO UPDATE SET name = EXCLUDED.name
      RETURNING id
    `, [userId, name]);
    await client.query('INSERT INTO note_tags (note_id, tag_id) VALUES ($1, $2) ON CONFLICT DO NOTHING', [noteId, tag.rows[0].id]);
  }
  // Drop this profile's tags that no note uses anymore
  await client.query(`
    DELETE FROM tags t
    WHERE t.user_id = $1 AND NOT EXISTS (SELECT 1 FROM note_tags nt WHERE nt.tag_id = t.id)
  `, [userId]);
}

async function getNote(id) {
  const result = await query(`${NOTE_SELECT} WHERE n.id = $1`, [id]);
  return result.rows[0];
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

// GET /api/notes?type=journal — everything this profile may see of that type
router.get('/', async (req, res) => {
  try {
    const { type } = req.query;
    if (!NOTE_TYPES.includes(type)) return res.status(400).json({ error: 'Invalid note type.' });

    const visibility = type === 'love_note'
      ? 'TRUE'
      : type === 'journal'
        ? '(n.user_id = $2 OR n.is_shared)'
        : 'n.user_id = $2';
    const order = type === 'quick_note'
      ? 'n.is_pinned DESC, n.updated_at DESC'
      : 'n.date DESC NULLS LAST, n.created_at DESC';

    const params = type === 'love_note' ? [type] : [type, req.userId];
    const result = await query(`${NOTE_SELECT} WHERE n.type = $1 AND ${visibility} ORDER BY ${order}`, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Get notes error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/tags', async (req, res) => {
  try {
    const result = await query('SELECT name FROM tags WHERE user_id = $1 ORDER BY name', [req.userId]);
    res.json(result.rows.map(r => r.name));
  } catch (error) {
    console.error('Get tags error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/', async (req, res) => {
  try {
    const error = validateNote(req.body, { partial: false });
    if (error) return res.status(400).json({ error });

    const { type, title, content, mood, color_tag, is_pinned, date, is_shared, tags = [] } = req.body;
    const id = await inTransaction(async (client) => {
      const created = await client.query(`
        INSERT INTO notes (user_id, type, title, content, mood, color_tag, is_pinned, date, is_shared)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING id
      `, [
        req.userId, type, title?.trim() || null, content.trim(), mood || null, color_tag || null,
        type === 'quick_note' && Boolean(is_pinned),
        date || null,
        type === 'love_note' || (type === 'journal' && Boolean(is_shared)),
      ]);
      await setNoteTags(client, req.userId, created.rows[0].id, tags);
      return created.rows[0].id;
    });

    res.json(await getNote(id));
  } catch (error) {
    console.error('Create note error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const error = validateNote(req.body, { partial: true });
    if (error) return res.status(400).json({ error });

    const existing = await query('SELECT type FROM notes WHERE id = $1 AND user_id = $2', [req.params.id, req.userId]);
    if (existing.rows.length === 0) return res.status(404).json({ error: 'Note not found' });
    const { type } = existing.rows[0];

    const { title, content, mood, color_tag, is_pinned, date, is_shared, tags } = req.body;
    await inTransaction(async (client) => {
      await client.query(`
        UPDATE notes SET
          title     = CASE WHEN $2 THEN $3 ELSE title END,
          content   = COALESCE($4, content),
          mood      = CASE WHEN $5 THEN $6 ELSE mood END,
          color_tag = CASE WHEN $7 THEN $8 ELSE color_tag END,
          is_pinned = COALESCE($9, is_pinned),
          date      = CASE WHEN $10 THEN $11::date ELSE date END,
          is_shared = COALESCE($12, is_shared),
          updated_at = NOW()
        WHERE id = $1
      `, [
        req.params.id,
        title !== undefined, title?.trim() || null,
        content?.trim() ?? null,
        mood !== undefined, mood || null,
        color_tag !== undefined, color_tag || null,
        type === 'quick_note' && is_pinned !== undefined ? Boolean(is_pinned) : null,
        date !== undefined, date || null,
        type === 'journal' && is_shared !== undefined ? Boolean(is_shared) : null,
      ]);
      if (tags !== undefined) await setNoteTags(client, req.userId, req.params.id, tags);
    });

    res.json(await getNote(req.params.id));
  } catch (error) {
    console.error('Update note error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const deleted = await query('DELETE FROM notes WHERE id = $1 AND user_id = $2 RETURNING id', [req.params.id, req.userId]);
    if (deleted.rows.length === 0) return res.status(404).json({ error: 'Note not found' });
    await query(`
      DELETE FROM tags t
      WHERE t.user_id = $1 AND NOT EXISTS (SELECT 1 FROM note_tags nt WHERE nt.tag_id = t.id)
    `, [req.userId]);
    res.json({ success: true });
  } catch (error) {
    console.error('Delete note error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
