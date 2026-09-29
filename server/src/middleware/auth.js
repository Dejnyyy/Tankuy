import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import pool from '../db/connection.js';

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-change-me';

// Servisní token pro Platee: smí POUZE číst tankování. Nese e-mail, ne userId
// — uživatele dohledáme za běhu, aby token přežil případnou změnu id.
// Záměrně úzké: jakákoliv jiná cesta než GET /api/entries skončí 403.
const jeServisniCteni = (req, decoded) =>
  decoded?.sub === 'platee' &&
  decoded?.scope === 'entries:read' &&
  req.method === 'GET' &&
  req.baseUrl === '/api/entries' &&
  (req.path === '/' || req.path === '');

export const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];

    const decoded = jwt.verify(token, JWT_SECRET);

    if (decoded?.sub === 'platee') {
      if (!jeServisniCteni(req, decoded)) {
        return res.status(403).json({ error: 'Service token is read-only' });
      }
      const [radky] = await pool.execute(
        'SELECT id, email FROM users WHERE LOWER(email) = LOWER(?)',
        [String(decoded.email ?? '').trim()],
      );
      if (radky.length === 0) {
        return res.status(404).json({ error: 'User not found' });
      }
      // Schema negarantuje unikátní e-mail (unikátní je jen google_id) — kdyby
      // se shodovalo víc účtů, LIMIT 1 by tiše vybral jeden z nich a servisní
      // token by mohl dostat data cizího uživatele. Radši odmítnout než hádat.
      if (radky.length > 1) {
        console.error(
          `Servisní token: nejednoznačný e-mail "${decoded.email}" odpovídá ${radky.length} účtům`,
        );
        return res.status(409).json({ error: 'Ambiguous user email' });
      }
      req.user = { userId: radky[0].id, email: radky[0].email };
      return next();
    }

    req.user = decoded;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired' });
    }
    return res.status(401).json({ error: 'Invalid token' });
  }
};

export const generateToken = (userId, email) => {
  return jwt.sign(
    { userId, email },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
};

export const generateRefreshToken = (userId) => {
  return jwt.sign(
    { userId, type: 'refresh' },
    JWT_SECRET,
    { expiresIn: '30d' }
  );
};

export const verifyRefreshToken = (token) => {
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (decoded.type !== 'refresh') {
      throw new Error('Invalid token type');
    }
    return decoded;
  } catch (error) {
    return null;
  }
};
