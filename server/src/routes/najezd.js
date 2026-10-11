import express from 'express';
import jwt from 'jsonwebtoken';
import pool from '../db/connection.js';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET;

/**
 * GET /api/najezd — poslední stav tachometru JEDNOHO auta (jen číslo a datum).
 *
 * Pro prodejní stránku Golfu (golf.dejny.eu), ať tam nájezd sedí s poslední
 * účtenkou. Token vystavuje scripts/vystav-token-najezdu.js a nese ID vozidla —
 * nic jiného tím nejde přečíst (žádné stanice, časy ani poznámky) a jinde
 * v API neprojde (authMiddleware tokeny `sub: "najezd"` odmítá).
 */
router.get('/', async (req, res) => {
  const hlavicka = req.headers.authorization ?? '';
  if (!hlavicka.startsWith('Bearer ') || !JWT_SECRET) return res.status(401).json({ error: 'No token provided' });

  let token;
  try {
    token = jwt.verify(hlavicka.slice(7), JWT_SECRET);
  } catch {
    return res.status(401).json({ error: 'Invalid token' });
  }
  if (token?.sub !== 'najezd' || token?.scope !== 'mileage:read' || typeof token.vehicleId !== 'string') {
    return res.status(403).json({ error: 'Wrong token' });
  }

  try {
    const [radky] = await pool.execute(
      `SELECT mileage, date FROM fuel_entries
       WHERE vehicle_id = ? AND mileage IS NOT NULL AND mileage > 0
       ORDER BY date DESC, time DESC LIMIT 1`,
      [token.vehicleId],
    );
    if (radky.length === 0) return res.status(404).json({ error: 'No mileage yet' });
    const { mileage, date } = radky[0];
    res.set('Cache-Control', 'private, max-age=300');
    res.json({ mileage, date: new Date(date).toISOString().slice(0, 10) });
  } catch (e) {
    console.error('najezd:', e);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
