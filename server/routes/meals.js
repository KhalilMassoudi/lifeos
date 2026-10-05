import express from 'express';
import { query } from '../db.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();
router.use(requireAuth);

const USDA_KEY = process.env.USDA_API_KEY || 'DEMO_KEY';

// USDA FoodData Central nutrient ID → field name
const NUTRIENT_MAP = {
  1008: 'calories',
  1003: 'protein',
  1005: 'carbs',
  1004: 'fat',
  1079: 'fiber',
  2000: 'sugar',
  1093: 'sodium',
};

// ── FOOD SEARCH (USDA + Open Food Facts) ────────────────────────────────────

router.get('/search', async (req, res) => {
  const { q } = req.query;
  if (!q || q.trim().length < 2) return res.json([]);

  try {
    const usdaUrl = `https://api.nal.usda.gov/fdc/v1/foods/search?query=${encodeURIComponent(q.trim())}&api_key=${USDA_KEY}&pageSize=8&dataType=Foundation,SR%20Legacy,Survey%20(FNDDS)`;
    const offUrl  = `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(q.trim())}&search_simple=1&action=process&json=1&page_size=6&fields=product_name,brands,nutriments,_id`;

    const [usdaRes, offRes] = await Promise.allSettled([
      fetch(usdaUrl, { signal: AbortSignal.timeout(5000) }),
      fetch(offUrl,  { signal: AbortSignal.timeout(5000) }),
    ]);

    const results = [];

    // Parse USDA results
    if (usdaRes.status === 'fulfilled' && usdaRes.value.ok) {
      const data = await usdaRes.value.json();
      for (const food of (data.foods || [])) {
        const n = {};
        for (const nutrient of (food.foodNutrients || [])) {
          const key = NUTRIENT_MAP[nutrient.nutrientId];
          if (key) n[key] = nutrient.value;
        }
        results.push({
          id: `usda_${food.fdcId}`,
          name: food.description,
          brand: food.brandOwner || null,
          source: 'USDA',
          calories_per_100g: n.calories  || 0,
          protein_per_100g:  n.protein   || 0,
          carbs_per_100g:    n.carbs     || 0,
          fat_per_100g:      n.fat       || 0,
          fiber_per_100g:    n.fiber     || 0,
        });
      }
    }

    // Parse Open Food Facts results
    if (offRes.status === 'fulfilled' && offRes.value.ok) {
      const data = await offRes.value.json();
      for (const p of (data.products || []).slice(0, 6)) {
        if (!p.product_name || !p.nutriments) continue;
        const n = p.nutriments;
        results.push({
          id: `off_${p._id || p.product_name}`,
          name: p.product_name,
          brand: p.brands || null,
          source: 'OpenFoodFacts',
          calories_per_100g: parseFloat(n['energy-kcal_100g'] || n['energy_100g'] || 0),
          protein_per_100g:  parseFloat(n['proteins_100g']      || 0),
          carbs_per_100g:    parseFloat(n['carbohydrates_100g'] || 0),
          fat_per_100g:      parseFloat(n['fat_100g']           || 0),
          fiber_per_100g:    parseFloat(n['fiber_100g']         || 0),
        });
      }
    }

    res.json(results.slice(0, 14));
  } catch (error) {
    console.error('Food search error:', error);
    res.status(500).json({ error: 'Search failed' });
  }
});

// ── DAY DATA ─────────────────────────────────────────────────────────────────

router.get('/day/:date', async (req, res) => {
  try {
    const { date } = req.params;
    const result = await query(`
      SELECT
        m.id, m.meal_date, m.meal_type, m.name, m.created_at,
        COALESCE(
          json_agg(
            json_build_object(
              'id',         e.id,
              'food_name',  e.food_name,
              'quantity_g', e.quantity_g,
              'calories',   e.calories,
              'protein_g',  e.protein_g,
              'carbs_g',    e.carbs_g,
              'fat_g',      e.fat_g,
              'fiber_g',    e.fiber_g
            ) ORDER BY e.created_at
          ) FILTER (WHERE e.id IS NOT NULL),
          '[]'
        ) AS entries
      FROM meals m
      LEFT JOIN meal_entries e ON e.meal_id = m.id
      WHERE m.user_id = $1 AND m.meal_date = $2
      GROUP BY m.id
      ORDER BY
        CASE m.meal_type
          WHEN 'breakfast' THEN 1
          WHEN 'lunch'     THEN 2
          WHEN 'dinner'    THEN 3
          ELSE 4
        END
    `, [req.userId, date]);

    res.json(result.rows);
  } catch (error) {
    console.error('Get day meals error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── GOALS ─────────────────────────────────────────────────────────────────────

const DEFAULT_GOALS = { calories: 2000, protein_g: 150, carbs_g: 250, fat_g: 65, fiber_g: 30, water_ml: 2000 };

router.get('/goals', async (req, res) => {
  try {
    const result = await query('SELECT * FROM nutrition_goals WHERE user_id = $1 LIMIT 1', [req.userId]);
    res.json(result.rows[0] || DEFAULT_GOALS);
  } catch (error) {
    console.error('Get goals error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/goals', async (req, res) => {
  try {
    const { calories, protein_g, carbs_g, fat_g, fiber_g, water_ml } = req.body;
    const values = [calories, protein_g, carbs_g, fat_g, fiber_g, water_ml];
    const existing = await query('SELECT id FROM nutrition_goals WHERE user_id = $1 LIMIT 1', [req.userId]);
    const result = existing.rows[0]
      ? await query(
          `UPDATE nutrition_goals
           SET calories=$1, protein_g=$2, carbs_g=$3, fat_g=$4, fiber_g=$5, water_ml=$6, updated_at=NOW()
           WHERE id=$7 RETURNING *`,
          [...values, existing.rows[0].id]
        )
      : await query(
          'INSERT INTO nutrition_goals (calories, protein_g, carbs_g, fat_g, fiber_g, water_ml, user_id) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *',
          [...values, req.userId]
        );
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Save goals error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── WEEKLY STATS ──────────────────────────────────────────────────────────────

router.get('/stats/week', async (req, res) => {
  try {
    const result = await query(`
      SELECT
        m.meal_date::text AS date,
        ROUND(COALESCE(SUM(e.calories),  0)::numeric, 0) AS calories,
        ROUND(COALESCE(SUM(e.protein_g), 0)::numeric, 1) AS protein,
        ROUND(COALESCE(SUM(e.carbs_g),   0)::numeric, 1) AS carbs,
        ROUND(COALESCE(SUM(e.fat_g),     0)::numeric, 1) AS fat
      FROM meals m
      LEFT JOIN meal_entries e ON e.meal_id = m.id
      WHERE m.user_id = $1 AND m.meal_date >= CURRENT_DATE - INTERVAL '6 days'
      GROUP BY m.meal_date
      ORDER BY m.meal_date
    `, [req.userId]);
    res.json(result.rows);
  } catch (error) {
    console.error('Week stats error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── WATER LOGS ────────────────────────────────────────────────────────────────

router.get('/water/:date', async (req, res) => {
  try {
    const result = await query(
      'SELECT * FROM water_logs WHERE user_id = $1 AND log_date = $2 ORDER BY logged_at',
      [req.userId, req.params.date]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Get water error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/water', async (req, res) => {
  try {
    const { log_date, amount_ml } = req.body;
    const result = await query(
      'INSERT INTO water_logs (user_id, log_date, amount_ml) VALUES ($1, $2, $3) RETURNING *',
      [req.userId, log_date, amount_ml || 250]
    );
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Add water error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/water/:id', async (req, res) => {
  try {
    await query('DELETE FROM water_logs WHERE id = $1 AND user_id = $2', [req.params.id, req.userId]);
    res.json({ success: true });
  } catch (error) {
    console.error('Delete water error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── MEAL ENTRIES (must come before /:id to avoid route conflict) ──────────────

router.post('/entries', async (req, res) => {
  try {
    const { meal_id, food_name, food_item_id, quantity_g,
            calories_per_100g, protein_per_100g, carbs_per_100g,
            fat_per_100g, fiber_per_100g } = req.body;
    const qty = parseFloat(quantity_g) || 100;
    const calc = (v) => v != null ? Math.round(parseFloat(v) * qty / 100 * 10) / 10 : null;

    const owned = await query('SELECT 1 FROM meals WHERE id = $1 AND user_id = $2', [meal_id, req.userId]);
    if (owned.rows.length === 0) {
      return res.status(404).json({ error: 'Meal not found' });
    }

    const result = await query(`
      INSERT INTO meal_entries
        (user_id, meal_id, food_item_id, food_name, quantity_g, calories, protein_g, carbs_g, fat_g, fiber_g)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
      RETURNING *
    `, [
      req.userId, meal_id, food_item_id || null, food_name, qty,
      calc(calories_per_100g), calc(protein_per_100g),
      calc(carbs_per_100g),    calc(fat_per_100g),
      calc(fiber_per_100g),
    ]);
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Add entry error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/entries/:id', async (req, res) => {
  try {
    await query('DELETE FROM meal_entries WHERE id = $1 AND user_id = $2', [req.params.id, req.userId]);
    res.json({ success: true });
  } catch (error) {
    console.error('Delete entry error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── MEALS CRUD ────────────────────────────────────────────────────────────────

router.post('/', async (req, res) => {
  try {
    const { meal_date, meal_type, name } = req.body;
    const result = await query(
      'INSERT INTO meals (user_id, meal_date, meal_type, name) VALUES ($1, $2, $3, $4) RETURNING *',
      [req.userId, meal_date, meal_type, name || null]
    );
    res.json({
      ...result.rows[0],
      entries: [],
    });
  } catch (error) {
    console.error('Create meal error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    await query('DELETE FROM meals WHERE id = $1 AND user_id = $2', [req.params.id, req.userId]);
    res.json({ success: true });
  } catch (error) {
    console.error('Delete meal error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
