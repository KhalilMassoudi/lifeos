import express from 'express';
import { query } from '../db.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

router.use(requireAuth);

// ==========================================
// BOOKS
// ==========================================

router.get('/', async (req, res) => {
  try {
    const result = await query('SELECT * FROM books ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (error) {
    console.error('Get books error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/', async (req, res) => {
  try {
    const { title, author, openlibrary_id, cover_url, genres, total_pages, pages_read, status, rating, notes, start_date, finish_date } = req.body;
    
    const result = await query(`
      INSERT INTO books (title, author, openlibrary_id, cover_url, genres, total_pages, pages_read, status, rating, notes, start_date, finish_date)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *
    `, [title, author, openlibrary_id, cover_url, genres, total_pages, pages_read, status, rating, notes, start_date, finish_date]);

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Post book error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

const BOOK_UPDATABLE_FIELDS = [
  'title', 'author', 'total_pages', 'pages_read', 'status',
  'rating', 'notes', 'start_date', 'finish_date',
];

router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updateFields = [];
    const params = [];
    let paramIndex = 1;

    for (const field of BOOK_UPDATABLE_FIELDS) {
      if (req.body[field] !== undefined) {
        updateFields.push(`${field} = $${paramIndex++}`);
        params.push(req.body[field]);
      }
    }

    if (updateFields.length === 0) {
      return res.json({ success: true, message: 'No updates provided' });
    }

    updateFields.push(`updated_at = NOW()`);
    params.push(id);

    const result = await query(`
      UPDATE books 
      SET ${updateFields.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `, params);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Book not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update book error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await query('DELETE FROM books WHERE id = $1', [id]);
    res.json({ success: true });
  } catch (error) {
    console.error('Delete book error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ==========================================
// SESSIONS (Logs)
// ==========================================

router.get('/sessions', async (req, res) => {
  try {
    const result = await query('SELECT * FROM book_sessions ORDER BY date DESC, created_at DESC');
    res.json(result.rows);
  } catch (error) {
    console.error('Get book sessions error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/sessions', async (req, res) => {
  try {
    const { book_id, date, pages_read, duration_minutes, notes } = req.body;
    
    // Insert the session
    const result = await query(`
      INSERT INTO book_sessions (book_id, date, pages_read, duration_minutes, notes)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `, [book_id, date, pages_read, duration_minutes, notes]);

    // Also update the book's total pages_read if it's provided
    // This assumes pages_read in session is the number of pages read in that session
    if (book_id && pages_read) {
      await query(`
        UPDATE books 
        SET pages_read = pages_read + $1, updated_at = NOW()
        WHERE id = $2
      `, [pages_read, book_id]);
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Post book session error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/sessions/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await query('DELETE FROM book_sessions WHERE id = $1 RETURNING book_id, pages_read', [id]);

    // Take the session's pages back off the book's running total
    const session = deleted.rows[0];
    if (session?.book_id && session.pages_read) {
      await query(`
        UPDATE books
        SET pages_read = GREATEST(pages_read - $1, 0), updated_at = NOW()
        WHERE id = $2
      `, [session.pages_read, session.book_id]);
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Delete book session error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
