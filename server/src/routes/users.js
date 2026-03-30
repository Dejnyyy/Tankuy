import express from "express";
import pool from "../db/connection.js";
import { authMiddleware } from "../middleware/auth.js";

const router = express.Router();

// All routes require authentication
router.use(authMiddleware);

// Map DB user row to camelCase for frontend
const mapUser = (row) => ({
  id: row.id,
  email: row.email,
  name: row.name,
  avatarUrl: row.avatar_url,
  currency: row.currency || "CZK",
  unitSystem: row.unit_system || "metric",
  createdAt: row.created_at,
});

// GET /api/users/me - Get current user profile
router.get("/me", async (req, res) => {
  try {
    const [users] = await pool.execute(
      "SELECT id, email, name, avatar_url, currency, unit_system, created_at FROM users WHERE id = ?",
      [req.user.userId],
    );

    if (users.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json(mapUser(users[0]));
  } catch (error) {
    console.error("Get user error:", error);
    res.status(500).json({ error: "Failed to get user" });
  }
});

// PUT /api/users/me - Update current user profile
router.put("/me", async (req, res) => {
  try {
    const { name, currency, unitSystem } = req.body;

    const updates = [];
    const params = [];

    if (name !== undefined) {
      updates.push("name = ?");
      params.push(name);
    }
    if (currency !== undefined) {
      updates.push("currency = ?");
      params.push(currency);
    }
    if (unitSystem !== undefined) {
      updates.push("unit_system = ?");
      params.push(unitSystem);
    }

    if (updates.length > 0) {
      updates.push("updated_at = NOW()");
      params.push(req.user.userId);
      await pool.execute(
        `UPDATE users SET ${updates.join(", ")} WHERE id = ?`,
        params,
      );
    }

    const [users] = await pool.execute(
      "SELECT id, email, name, avatar_url, currency, unit_system, created_at FROM users WHERE id = ?",
      [req.user.userId],
    );

    res.json(mapUser(users[0]));
  } catch (error) {
    console.error("Update user error:", error);
    res.status(500).json({ error: "Failed to update user" });
  }
});

// GET /api/users/devices - Get user's logged in devices
router.get("/devices", async (req, res) => {
  try {
    const [devices] = await pool.execute(
      "SELECT id, device_id, device_name, last_used_at, created_at FROM device_tokens WHERE user_id = ? ORDER BY last_used_at DESC",
      [req.user.userId],
    );

    res.json(devices);
  } catch (error) {
    console.error("Get devices error:", error);
    res.status(500).json({ error: "Failed to get devices" });
  }
});

// DELETE /api/users/devices/:deviceId - Remove a device
router.delete("/devices/:deviceId", async (req, res) => {
  try {
    await pool.execute(
      "DELETE FROM device_tokens WHERE id = ? AND user_id = ?",
      [req.params.deviceId, req.user.userId],
    );

    res.json({ success: true });
  } catch (error) {
    console.error("Delete device error:", error);
    res.status(500).json({ error: "Failed to remove device" });
  }
});

export default router;
