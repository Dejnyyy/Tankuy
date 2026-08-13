import express from 'express';
import webpush from 'web-push';
import pool from '../db/connection.js';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();

const publicKey = process.env.VAPID_PUBLIC_KEY;
const privateKey = process.env.VAPID_PRIVATE_KEY;
const subject = process.env.VAPID_SUBJECT || 'mailto:hlidac@dejny.eu';

const pushEnabled = Boolean(publicKey && privateKey);
if (pushEnabled) {
  webpush.setVapidDetails(subject, publicKey, privateKey);
} else {
  console.warn('VAPID keys not set — push notifications disabled.');
}

// Auto-migrate: create the subscriptions table on startup.
async function ensureTable() {
  await pool.execute(`
    CREATE TABLE IF NOT EXISTS push_subscriptions (
      id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      user_id VARCHAR(64) NULL,
      endpoint VARCHAR(500) NOT NULL UNIQUE,
      p256dh VARCHAR(255) NOT NULL,
      auth VARCHAR(255) NOT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_push_user (user_id)
    )
  `);
}
ensureTable().catch((err) => console.error('push table init failed:', err.message));

// Sends a payload to the given subscription rows; prunes dead ones (410/404).
export async function sendPushTo(rows, payload) {
  if (!pushEnabled) return { sent: 0 };
  const body = JSON.stringify(payload);
  let sent = 0;
  for (const row of rows) {
    try {
      await webpush.sendNotification(
        { endpoint: row.endpoint, keys: { p256dh: row.p256dh, auth: row.auth } },
        body
      );
      sent++;
    } catch (err) {
      if (err.statusCode === 410 || err.statusCode === 404) {
        await pool.execute('DELETE FROM push_subscriptions WHERE endpoint = ?', [row.endpoint]);
      } else {
        console.error('Push send failed:', err.statusCode || err.message);
      }
    }
  }
  return { sent };
}

export async function sendPushToUser(userId, payload) {
  const [rows] = await pool.execute(
    'SELECT endpoint, p256dh, auth FROM push_subscriptions WHERE user_id = ?',
    [userId]
  );
  return sendPushTo(rows, payload);
}

// SSRF guard: web-push POSTs to this URL from the server, so only accept
// endpoints hosted by the browsers' real push services (hostname allowlist —
// a plain "public hostname" check is bypassable via attacker-controlled DNS).
const PUSH_HOST_ALLOWLIST = [
  /^fcm\.googleapis\.com$/,                      // Chrome / Chromium
  /^updates\.push\.services\.mozilla\.com$/,     // Firefox
  /(^|\.)push\.services\.mozilla\.com$/,         // Firefox (regional)
  /(^|\.)push\.apple\.com$/,                     // Safari / iOS
  /(^|\.)notify\.windows\.com$/,                 // Edge (WNS)
];

function isValidPushEndpoint(endpoint) {
  if (typeof endpoint !== 'string' || endpoint.length > 500) return false;
  let url;
  try {
    url = new URL(endpoint);
  } catch {
    return false;
  }
  if (url.protocol !== 'https:') return false;
  const host = url.hostname.toLowerCase();
  return PUSH_HOST_ALLOWLIST.some((re) => re.test(host));
}

// GET /api/push/public-key — VAPID public key for the browser
router.get('/public-key', (req, res) => {
  if (!pushEnabled) return res.status(503).json({ error: 'Push not configured' });
  res.json({ key: publicKey });
});

// POST /api/push/subscribe — store a browser subscription for the signed-in user
router.post('/subscribe', authMiddleware, async (req, res) => {
  const sub = req.body && req.body.subscription;
  if (!sub || !sub.endpoint || !sub.keys || !sub.keys.p256dh || !sub.keys.auth) {
    return res.status(400).json({ error: 'Invalid subscription' });
  }
  if (!isValidPushEndpoint(sub.endpoint) ||
      String(sub.keys.p256dh).length > 255 || String(sub.keys.auth).length > 255) {
    return res.status(400).json({ error: 'Invalid subscription' });
  }
  try {
    await pool.execute(
      `INSERT INTO push_subscriptions (user_id, endpoint, p256dh, auth) VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE user_id = VALUES(user_id), p256dh = VALUES(p256dh), auth = VALUES(auth)`,
      [String(req.user.userId), sub.endpoint, sub.keys.p256dh, sub.keys.auth]
    );
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'DB error' });
  }
});

// POST /api/push/unsubscribe — remove one of the signed-in user's subscriptions
router.post('/unsubscribe', authMiddleware, async (req, res) => {
  const endpoint = req.body && req.body.endpoint;
  if (!endpoint) return res.status(400).json({ error: 'Missing endpoint' });
  try {
    await pool.execute(
      'DELETE FROM push_subscriptions WHERE endpoint = ? AND user_id = ?',
      [endpoint, String(req.user.userId)]
    );
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'DB error' });
  }
});

// POST /api/push/test — send a test notification to the signed-in user's devices
router.post('/test', authMiddleware, async (req, res) => {
  try {
    const { sent } = await sendPushToUser(String(req.user.userId), {
      title: 'Tankuy ⛽',
      body: 'Push notifikace fungují! Tohle je testovací zpráva.',
      url: '/',
    });
    res.json({ ok: true, sent });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Push error' });
  }
});

export default router;
