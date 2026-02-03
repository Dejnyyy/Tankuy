import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import pool from '../db/connection.js';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();

// All routes require authentication
router.use(authMiddleware);

// GET /api/vehicles - List user's vehicles
router.get('/', async (req, res) => {
  try {
    const [vehicles] = await pool.execute(
      `SELECT id, name, license_plate, fuel_type, brand, model, year, engine, engine_power, created_at 
       FROM vehicles WHERE user_id = ? ORDER BY created_at DESC`,
      [req.user.userId]
    );

    const mappedVehicles = vehicles.map(v => ({
      id: v.id,
      name: v.name,
      licensePlate: v.license_plate,
      fuelType: v.fuel_type,
      brand: v.brand,
      model: v.model,
      year: v.year,
      engine: v.engine,
      enginePower: v.engine_power,
    }));

    res.json(mappedVehicles);
  } catch (error) {
    console.error('Get vehicles error:', error);
    res.status(500).json({ error: 'Failed to get vehicles' });
  }
});

// POST /api/vehicles - Add a new vehicle
router.post('/', async (req, res) => {
  try {
    const { name, licensePlate, fuelType, brand, model, year, engine, enginePower } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Vehicle name is required' });
    }

    const vehicleId = uuidv4();

    await pool.execute(
      `INSERT INTO vehicles (id, user_id, name, license_plate, fuel_type, brand, model, year, engine, engine_power)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [vehicleId, req.user.userId, name, licensePlate, fuelType || 'petrol', brand, model, year, engine, enginePower]
    );

    const [vehicles] = await pool.execute(
      'SELECT * FROM vehicles WHERE id = ?',
      [vehicleId]
    );

    res.status(201).json(vehicles[0]);
  } catch (error) {
    console.error('Add vehicle error:', error);
    res.status(500).json({ error: 'Failed to add vehicle' });
  }
});

// GET /api/vehicles/:id - Get a specific vehicle
router.get('/:id', async (req, res) => {
  try {
    const [vehicles] = await pool.execute(
      'SELECT * FROM vehicles WHERE id = ? AND user_id = ?',
      [req.params.id, req.user.userId]
    );

    if (vehicles.length === 0) {
      return res.status(404).json({ error: 'Vehicle not found' });
    }

    res.json(vehicles[0]);
  } catch (error) {
    console.error('Get vehicle error:', error);
    res.status(500).json({ error: 'Failed to get vehicle' });
  }
});

// PUT /api/vehicles/:id - Update a vehicle
router.put('/:id', async (req, res) => {
  try {
    const { name, licensePlate, fuelType, brand, model, year, engine, enginePower } = req.body;

    const [existing] = await pool.execute(
      'SELECT id FROM vehicles WHERE id = ? AND user_id = ?',
      [req.params.id, req.user.userId]
    );

    if (existing.length === 0) {
      return res.status(404).json({ error: 'Vehicle not found' });
    }

    await pool.execute(
      `UPDATE vehicles SET name = ?, license_plate = ?, fuel_type = ?, brand = ?, model = ?, year = ?, engine = ?, engine_power = ?, updated_at = NOW()
       WHERE id = ? AND user_id = ?`,
      [name, licensePlate, fuelType, brand, model, year, engine, enginePower, req.params.id, req.user.userId]
    );

    const [vehicles] = await pool.execute(
      'SELECT * FROM vehicles WHERE id = ?',
      [req.params.id]
    );

    res.json(vehicles[0]);
  } catch (error) {
    console.error('Update vehicle error:', error);
    res.status(500).json({ error: 'Failed to update vehicle' });
  }
});

// DELETE /api/vehicles/:id - Delete a vehicle
router.delete('/:id', async (req, res) => {
  try {
    const [existing] = await pool.execute(
      'SELECT id FROM vehicles WHERE id = ? AND user_id = ?',
      [req.params.id, req.user.userId]
    );

    if (existing.length === 0) {
      return res.status(404).json({ error: 'Vehicle not found' });
    }

    await pool.execute(
      'DELETE FROM vehicles WHERE id = ? AND user_id = ?',
      [req.params.id, req.user.userId]
    );

    res.json({ success: true });
  } catch (error) {
    console.error('Delete vehicle error:', error);
    res.status(500).json({ error: 'Failed to delete vehicle' });
  }
});

export default router;
