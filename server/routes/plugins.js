import express from 'express';
import { query } from '../db.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

router.use(requireAuth);

// Get all active plugins
router.get('/', async (req, res) => {
  try {
    const result = await query('SELECT plugin_id FROM active_plugins WHERE user_id = $1 AND is_active = true ORDER BY created_at', [req.userId]);
    const activePlugins = result.rows.map(row => row.plugin_id);
    res.json(activePlugins);
  } catch (error) {
    console.error('Get plugins error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Toggle plugin status
router.post('/toggle', async (req, res) => {
  try {
    const { pluginId, isActive } = req.body;

    await query(`
      INSERT INTO active_plugins (user_id, plugin_id, is_active)
      VALUES ($1, $2, $3)
      ON CONFLICT (user_id, plugin_id)
      DO UPDATE SET is_active = EXCLUDED.is_active, updated_at = NOW()
    `, [req.userId, pluginId, isActive]);

    res.json({ success: true });
  } catch (error) {
    console.error('Toggle plugin error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
