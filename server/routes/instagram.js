import express from 'express';
import { query } from '../db.js';
import { requireAuth } from '../middleware/auth.js';

// Reads a public business/creator account's latest posts (e.g. your gym's) through
// Meta's official Instagram Graph API "Business Discovery" endpoint. Needs your own
// Instagram professional account linked to a Facebook Page, and an access token with
// instagram_basic, instagram_manage_insights, pages_show_list and pages_read_engagement.
// The token stays on the server; the browser only ever sees connection status.
const router = express.Router();
router.use(requireAuth);

const PROVIDER = 'instagram';
const GRAPH_VERSION = process.env.META_GRAPH_VERSION || 'v26.0';
const GRAPH_BASE = (process.env.META_GRAPH_BASE || 'https://graph.facebook.com').replace(/\/$/, '');
const USERNAME = /^[A-Za-z0-9._]{1,30}$/;
const CACHE_MS = 10 * 60 * 1000;
const MAX_POSTS = 12;

const postsCache = new Map(); // `${userId}:${username}` → { at, data }

class GraphError extends Error {}

async function graph(path, params) {
  const url = new URL(`${GRAPH_BASE}/${GRAPH_VERSION}/${path}`);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  let response;
  try {
    response = await fetch(url, { signal: AbortSignal.timeout(10000) });
  } catch {
    throw new GraphError('Could not reach Instagram. Check your internet connection.');
  }
  const data = await response.json().catch(() => ({}));
  if (!response.ok || data.error) {
    const code = data.error?.code;
    if (code === 190) throw new GraphError('Your Instagram access token expired or was revoked. Connect again with a new token.');
    if (code === 4 || code === 17 || code === 32 || code === 613) throw new GraphError('Instagram rate limit reached — try again in a little while.');
    if (code === 110 || data.error?.error_subcode === 2207013) throw new GraphError('Instagram couldn\'t find that account, or it isn\'t a public business/creator account.');
    throw new GraphError(data.error?.message || `Instagram returned an error (${response.status}).`);
  }
  return data;
}

async function getConnection(userId) {
  const result = await query(
    'SELECT access_token, external_user_id, external_username, token_expires_at FROM integrations WHERE user_id = $1 AND provider = $2',
    [userId, PROVIDER]
  );
  return result.rows[0] || null;
}

router.get('/status', async (req, res) => {
  try {
    const c = await getConnection(req.userId);
    res.json({
      connected: Boolean(c),
      username: c?.external_username || null,
      expires_at: c?.token_expires_at || null,
      can_extend_tokens: Boolean(process.env.META_APP_ID && process.env.META_APP_SECRET),
    });
  } catch (error) {
    console.error('Instagram status error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Connect with an access token (from Meta's Graph API Explorer or your app's login).
// With META_APP_ID/META_APP_SECRET set, a short-lived token is exchanged for a ~60-day one.
router.post('/connect', async (req, res) => {
  try {
    let token = typeof req.body.access_token === 'string' ? req.body.access_token.trim() : '';
    if (!/^[A-Za-z0-9_\-|.]{20,1000}$/.test(token)) return res.status(400).json({ error: 'Paste a valid access token.' });

    let expiresAt = null;
    if (process.env.META_APP_ID && process.env.META_APP_SECRET) {
      const exchanged = await graph('oauth/access_token', {
        grant_type: 'fb_exchange_token',
        client_id: process.env.META_APP_ID,
        client_secret: process.env.META_APP_SECRET,
        fb_exchange_token: token,
      });
      token = exchanged.access_token;
      if (exchanged.expires_in) expiresAt = new Date(Date.now() + exchanged.expires_in * 1000);
    }

    // Find the Instagram professional account linked to one of the user's Facebook Pages
    const pages = await graph('me/accounts', { fields: 'name,instagram_business_account{id,username}', access_token: token });
    const linked = (pages.data || []).find(p => p.instagram_business_account);
    if (!linked) {
      return res.status(400).json({
        error: 'No Instagram professional account found. Switch your Instagram to a Business or Creator account and link it to a Facebook Page you manage.',
      });
    }

    const { id, username } = linked.instagram_business_account;
    await query(`
      INSERT INTO integrations (user_id, provider, access_token, external_user_id, external_username, token_expires_at)
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (user_id, provider) DO UPDATE SET
        access_token = EXCLUDED.access_token, external_user_id = EXCLUDED.external_user_id,
        external_username = EXCLUDED.external_username, token_expires_at = EXCLUDED.token_expires_at, updated_at = NOW()
    `, [req.userId, PROVIDER, token, id, username, expiresAt]);

    res.json({ connected: true, username, expires_at: expiresAt });
  } catch (error) {
    if (error instanceof GraphError) return res.status(400).json({ error: error.message });
    console.error('Instagram connect error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/connect', async (req, res) => {
  try {
    await query('DELETE FROM integrations WHERE user_id = $1 AND provider = $2', [req.userId, PROVIDER]);
    for (const key of postsCache.keys()) if (key.startsWith(`${req.userId}:`)) postsCache.delete(key);
    res.json({ connected: false });
  } catch (error) {
    console.error('Instagram disconnect error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Latest posts of a public business/creator account, e.g. GET /posts?username=mygym
router.get('/posts', async (req, res) => {
  try {
    const username = String(req.query.username || '').trim().replace(/^@/, '');
    if (!USERNAME.test(username)) return res.status(400).json({ error: 'Enter the gym\'s Instagram username.' });

    const c = await getConnection(req.userId);
    if (!c) return res.status(400).json({ error: 'Connect Instagram first.' });

    const cacheKey = `${req.userId}:${username.toLowerCase()}`;
    const cached = postsCache.get(cacheKey);
    if (cached && Date.now() - cached.at < CACHE_MS && req.query.refresh !== '1') return res.json(cached.data);

    const media = `media.limit(${MAX_POSTS}){id,caption,media_type,media_url,thumbnail_url,permalink,timestamp,children{media_type,media_url,thumbnail_url}}`;
    const data = await graph(c.external_user_id, {
      fields: `business_discovery.username(${username}){username,name,profile_picture_url,${media}}`,
      access_token: c.access_token,
    });

    const account = data.business_discovery || {};
    const imageOf = (m) => (m.media_type === 'VIDEO' ? m.thumbnail_url : m.media_url) || null;
    const result = {
      account: { username: account.username, name: account.name || null, profile_picture_url: account.profile_picture_url || null },
      posts: (account.media?.data || []).map(m => ({
        id: m.id,
        caption: m.caption || '',
        media_type: m.media_type,
        image_url: imageOf(m) || imageOf(m.children?.data?.[0] || {}),
        images: (m.children?.data || []).map(imageOf).filter(Boolean),
        permalink: m.permalink,
        timestamp: m.timestamp,
      })),
    };
    postsCache.set(cacheKey, { at: Date.now(), data: result });
    res.json(result);
  } catch (error) {
    if (error instanceof GraphError) return res.status(400).json({ error: error.message });
    console.error('Instagram posts error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
