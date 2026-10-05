import express from 'express';
import { query } from '../db.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

router.use(requireAuth);

// Get all media items
router.get('/', async (req, res) => {
  try {
    const result = await query('SELECT * FROM media_items WHERE user_id = $1 ORDER BY created_at DESC', [req.userId]);
    res.json(result.rows);
  } catch (error) {
    console.error('Get media error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Add new media item
router.post('/', async (req, res) => {
  try {
    let { 
      title, 
      tmdb_id, 
      poster_url, 
      description, 
      release_year, 
      genres, 
      rating, 
      user_rating,
      status, 
      notes, 
      type, 
      current_season = 1, 
      current_episode = 0,
      imdb_rating,
      duration,
      director,
      cast,
      imdb_id
    } = req.body;
    
    // Normalize rating to avoid database check constraint violations
    const finalRating = user_rating !== undefined ? user_rating : rating;
    const dbRating = (finalRating === 0 || finalRating === '0' || finalRating === '' || finalRating === undefined || finalRating === null) ? null : parseInt(finalRating, 10);

    const result = await query(`
      INSERT INTO media_items (user_id, title, tmdb_id, poster_url, description, release_year, genres, rating, status, notes, type, current_season, current_episode, imdb_rating, duration, director, "cast", imdb_id)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
      RETURNING *
    `, [req.userId, title, tmdb_id, poster_url, description, release_year, genres, dbRating, status, notes, type, current_season, current_episode, imdb_rating, duration, director, cast, imdb_id]);

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Post media error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update media item (handles PUT & PATCH)
const handleUpdate = async (req, res) => {
  try {
    const { id } = req.params;
    const { rating, user_rating, status, notes, current_season, current_episode, imdb_rating, duration, director, cast, imdb_id } = req.body;
    
    let updateFields = [];
    let params = [];
    let paramIndex = 1;

    const finalRating = user_rating !== undefined ? user_rating : rating;
    if (finalRating !== undefined) {
      updateFields.push(`rating = $${paramIndex++}`);
      const dbRating = (finalRating === 0 || finalRating === '0' || finalRating === '' || finalRating === null) ? null : parseInt(finalRating, 10);
      params.push(dbRating);
    }
    if (status !== undefined) {
      updateFields.push(`status = $${paramIndex++}`);
      params.push(status);
    }
    if (notes !== undefined) {
      updateFields.push(`notes = $${paramIndex++}`);
      params.push(notes);
    }
    if (current_season !== undefined) {
      updateFields.push(`current_season = $${paramIndex++}`);
      params.push(current_season);
    }
    if (current_episode !== undefined) {
      updateFields.push(`current_episode = $${paramIndex++}`);
      params.push(current_episode);
    }
    if (imdb_rating !== undefined) {
      updateFields.push(`imdb_rating = $${paramIndex++}`);
      params.push(imdb_rating);
    }
    if (duration !== undefined) {
      updateFields.push(`duration = $${paramIndex++}`);
      params.push(duration);
    }
    if (director !== undefined) {
      updateFields.push(`director = $${paramIndex++}`);
      params.push(director);
    }
    if (cast !== undefined) {
      updateFields.push(`"cast" = $${paramIndex++}`);
      params.push(cast);
    }
    if (imdb_id !== undefined) {
      updateFields.push(`imdb_id = $${paramIndex++}`);
      params.push(imdb_id);
    }

    if (updateFields.length === 0) {
      return res.json({ success: true, message: 'No updates provided' });
    }

    updateFields.push(`updated_at = NOW()`);
    params.push(id, req.userId);

    const result = await query(`
      UPDATE media_items 
      SET ${updateFields.join(', ')}
      WHERE id = $${paramIndex} AND user_id = $${paramIndex + 1}
      RETURNING *
    `, params);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Item not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update media error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

router.put('/:id', handleUpdate);
router.patch('/:id', handleUpdate);

// Delete media item
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await query('DELETE FROM media_items WHERE id = $1 AND user_id = $2', [id, req.userId]);
    res.json({ success: true });
  } catch (error) {
    console.error('Delete media error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
