import express from 'express';
import pool from '../db/connection.js';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();

// All routes require authentication
router.use(authMiddleware);

// GET /api/users/me - Get current user profile
router.get('/me', async (req, res) => {
  try {
    const [users] = await pool.execute(
      'SELECT id, email, name, avatar_url, created_at FROM users WHERE id = ?',
      [req.user.userId]
    );

    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(users[0]);
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Failed to get user' });
  }
});

// PUT /api/users/me - Update current user profile
router.put('/me', async (req, res) => {
  try {
    const { name } = req.body;

    await pool.execute(
      'UPDATE users SET name = ?, updated_at = NOW() WHERE id = ?',
      [name, req.user.userId]
    );

    const [users] = await pool.execute(
      'SELECT id, email, name, avatar_url, created_at FROM users WHERE id = ?',
      [req.user.userId]
    );

    res.json(users[0]);
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ error: 'Failed to update user' });
  }
});

// GET /api/users/devices - Get user's logged in devices
router.get('/devices', async (req, res) => {
  try {
    const [devices] = await pool.execute(
      'SELECT id, device_id, device_name, last_used_at, created_at FROM device_tokens WHERE user_id = ? ORDER BY last_used_at DESC',
      [req.user.userId]
    );

    res.json(devices);
  } catch (error) {
    console.error('Get devices error:', error);
    res.status(500).json({ error: 'Failed to get devices' });
  }
});

// DELETE /api/users/devices/:deviceId - Remove a device
router.delete('/devices/:deviceId', async (req, res) => {
  try {
    await pool.execute(
      'DELETE FROM device_tokens WHERE id = ? AND user_id = ?',
      [req.params.deviceId, req.user.userId]
    );

    res.json({ success: true });
  } catch (error) {
    console.error('Delete device error:', error);
    res.status(500).json({ error: 'Failed to remove device' });
  }
});

export default router;
