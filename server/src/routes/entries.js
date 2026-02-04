import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import pool from '../db/connection.js';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();

// All routes require authentication
router.use(authMiddleware);

// GET /api/entries - List fuel entries with optional filters
router.get('/', async (req, res) => {
  try {
    const { vehicleId, startDate, endDate, limit = 50, offset = 0, sortBy = 'date', order = 'DESC' } = req.query;

    let query = `
      SELECT e.*, v.name as vehicle_name 
      FROM fuel_entries e 
      LEFT JOIN vehicles v ON e.vehicle_id = v.id
      WHERE e.user_id = ?
    `;
    const params = [req.user.userId];

    if (vehicleId) {
      query += ' AND e.vehicle_id = ?';
      params.push(vehicleId);
    }

    if (startDate) {
      query += ' AND e.date >= ?';
      params.push(startDate);
    }

    if (endDate) {
      query += ' AND e.date <= ?';
      params.push(endDate);
    }

    // Sorting Logic
    let orderByClause = 'e.date DESC, e.time DESC'; // Default
    const direction = order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    switch (sortBy) {
      case 'price':
        orderByClause = `e.total_cost ${direction}`;
        break;
      case 'liters':
        orderByClause = `e.total_liters ${direction}`;
        break;
      case 'date':
      default:
        orderByClause = `e.date ${direction}, e.time ${direction}`;
        break;
    }

    query += ` ORDER BY ${orderByClause} LIMIT ? OFFSET ?`;
    params.push(parseInt(limit), parseInt(offset));

    const [entries] = await pool.execute(query, params);

    const mappedEntries = entries.map(entry => ({
      id: entry.id,
      vehicleId: entry.vehicle_id,
      vehicleName: entry.vehicle_name,
      stationName: entry.station_name,
      stationAddress: entry.station_address,
      stationLat: entry.station_lat,
      stationLng: entry.station_lng,
      date: entry.date,
      time: entry.time,
      pricePerLiter: entry.price_per_liter,
      totalLiters: entry.total_liters,
      totalCost: entry.total_cost,
      mileage: entry.mileage,
      receiptImageUrl: entry.receipt_image_url,
      notes: entry.notes,
    }));

    res.json(mappedEntries);
  } catch (error) {
    console.error('Get entries error:', error);
    res.status(500).json({ error: 'Failed to get entries' });
  }
});

// GET /api/entries/stats - Get spending statistics
router.get('/stats', async (req, res) => {
  try {
    const { period = 'month', date } = req.query;
    const userId = req.user.userId;

    // Determine Date Range (Calendar based)
    const refDate = date ? new Date(date) : new Date();
    let startDate, endDate;
    let groupByFormat, labelFormat; // For chart

    const formatDate = (d) => {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    if (period === 'week') {
      // Start: Monday of the week
      const day = refDate.getDay();
      const diff = refDate.getDate() - day + (day === 0 ? -6 : 1); 
      startDate = new Date(refDate);
      startDate.setDate(diff);
      
      endDate = new Date(startDate);
      endDate.setDate(startDate.getDate() + 6);

      groupByFormat = "date"; // Group by day
      labelFormat = "%a"; // Mon, Tue...
    } else if (period === 'year') {
      startDate = new Date(refDate.getFullYear(), 0, 1);
      endDate = new Date(refDate.getFullYear(), 11, 31);
      
      groupByFormat = "DATE_FORMAT(date, '%Y-%m')"; // Group by month
      labelFormat = "%b"; // Jan, Feb...
    } else if (period === 'all') {
      startDate = new Date('2020-01-01'); // Start of app usage/decade
      endDate = new Date(); // Today

      groupByFormat = "DATE_FORMAT(date, '%Y-%m')"; // Group by month
      labelFormat = "%m/%y"; // 01/24
    } else {
      // Month (default)
      startDate = new Date(refDate.getFullYear(), refDate.getMonth(), 1);
      endDate = new Date(refDate.getFullYear(), refDate.getMonth() + 1, 0); // Last day of month
      
      groupByFormat = "YEARWEEK(date, 1)"; // Group by week
      labelFormat = "%d.%m"; // 01.01
    }

    const startStr = formatDate(startDate);
    const endStr = formatDate(endDate);

    // Total spending for period
    const [totalResult] = await pool.execute(
      `SELECT 
        COALESCE(SUM(total_cost), 0) as total_spent,
        COALESCE(AVG(total_cost), 0) as avg_per_tank,
        COUNT(*) as total_tanks,
        CASE 
          WHEN SUM(total_liters) > 0 THEN SUM(total_cost) / SUM(total_liters)
          ELSE 0 
        END as avg_price_per_liter,
        COALESCE(AVG(total_liters), 0) as avg_liters_per_tank,
        COALESCE(SUM(total_liters), 0) as total_liters
       FROM fuel_entries 
       WHERE user_id = ? AND date >= ? AND date <= ?`,
      [userId, startStr, endStr]
    );

    // Chart Data
    // Chart Data
    let chartQuery = `
      SELECT ${period === 'year' ? `DATE_FORMAT(date, '%b')` : `DATE_FORMAT(date, '${labelFormat}')`} as label, 
             SUM(total_cost) as value
      FROM fuel_entries
      WHERE user_id = ? AND date >= ? AND date <= ?
      GROUP BY ${groupByFormat}
      ORDER BY date ASC
    `;

    // Special handling for week/month labels
    if (period === 'week') {
       chartQuery = `
         SELECT DATE_FORMAT(date, '%a') as label, SUM(total_cost) as value 
         FROM fuel_entries 
         WHERE user_id = ? AND date >= ? AND date <= ?
         GROUP BY date ORDER BY date ASC`;
    } else if (period === 'month') {
        // Group by Date (Active days only)
        // This ensures every day with a fill-up gets a point, 
        // avoiding "missing dots" from weekly grouping AND "jaggy zeros" from full filling.
        chartQuery = `
         SELECT DATE_FORMAT(date, '%d.%m') as label, SUM(total_cost) as value
         FROM fuel_entries 
         WHERE user_id = ? AND date >= ? AND date <= ?
         GROUP BY date ORDER BY date ASC`;
    }

    const [chartRows] = await pool.execute(chartQuery, [userId, startStr, endStr]);

    let chartData = {
      labels: chartRows.map(r => r.label),
      data: chartRows.map(r => parseFloat(r.value))
    };

    res.json({
      period,
      range: { start: startStr, end: endStr },
      summary: totalResult[0],
      chart: chartData,
    });

  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({ error: 'Failed to get statistics' });
  }
});

// POST /api/entries - Add a new fuel entry
router.post('/', async (req, res) => {
  try {
    const {
      vehicleId,
      stationName,
      stationAddress,
      stationLat,
      stationLng,
      date,
      time,
      pricePerLiter,
      totalLiters,
      totalCost,
      mileage,
      receiptImageUrl,
      notes,
    } = req.body;

    if (!totalCost || !date) {
      return res.status(400).json({ error: 'Date and total cost are required' });
    }

    // Duplicate Check
    // If exact same date and amount (tolerance 1 CZK) exists, warn user
    // Unless ?force=true is present
    const forceSave = req.query.force === 'true';
    
    if (!forceSave) {
      const [duplicates] = await pool.execute(
        `SELECT id, date, total_cost FROM fuel_entries 
         WHERE user_id = ? 
         AND date = ? 
         AND ABS(total_cost - ?) < 1.0`,
        [req.user.userId, date, totalCost]
      );

      if (duplicates.length > 0) {
        return res.status(409).json({ 
          error: 'Potential duplicate entry detected',
          duplicate: duplicates[0] 
        });
      }
    }

    const entryId = uuidv4();

    await pool.execute(
      `INSERT INTO fuel_entries 
       (id, user_id, vehicle_id, station_name, station_address, station_lat, station_lng, 
        date, time, price_per_liter, total_liters, total_cost, mileage, receipt_image_url, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        entryId, req.user.userId, vehicleId, stationName, stationAddress,
        stationLat, stationLng, date, time, pricePerLiter, totalLiters,
        totalCost, mileage, receiptImageUrl, notes
      ]
    );

    const [entries] = await pool.execute(
      'SELECT * FROM fuel_entries WHERE id = ?',
      [entryId]
    );

    res.status(201).json(entries[0]);
  } catch (error) {
    console.error('Add entry error:', error);
    res.status(500).json({ error: 'Failed to add entry' });
  }
});

// GET /api/entries/:id - Get a specific entry
router.get('/:id', async (req, res) => {
  try {
    const [entries] = await pool.execute(
      `SELECT e.*, v.name as vehicle_name 
       FROM fuel_entries e 
       LEFT JOIN vehicles v ON e.vehicle_id = v.id
       WHERE e.id = ? AND e.user_id = ?`,
      [req.params.id, req.user.userId]
    );

    if (entries.length === 0) {
      return res.status(404).json({ error: 'Entry not found' });
    }

    res.json(entries[0]);
  } catch (error) {
    console.error('Get entry error:', error);
    res.status(500).json({ error: 'Failed to get entry' });
  }
});

// PUT /api/entries/:id - Update an entry
router.put('/:id', async (req, res) => {
  try {
    const {
      vehicleId, stationName, stationAddress, stationLat, stationLng,
      date, time, pricePerLiter, totalLiters, totalCost, mileage, notes
    } = req.body;

    const [existing] = await pool.execute(
      'SELECT id FROM fuel_entries WHERE id = ? AND user_id = ?',
      [req.params.id, req.user.userId]
    );

    if (existing.length === 0) {
      return res.status(404).json({ error: 'Entry not found' });
    }

    await pool.execute(
      `UPDATE fuel_entries SET 
       vehicle_id = ?, station_name = ?, station_address = ?, station_lat = ?, station_lng = ?,
       date = ?, time = ?, price_per_liter = ?, total_liters = ?, total_cost = ?, 
       mileage = ?, notes = ?, updated_at = NOW()
       WHERE id = ? AND user_id = ?`,
      [
        vehicleId, stationName, stationAddress, stationLat, stationLng,
        date, time, pricePerLiter, totalLiters, totalCost, mileage, notes,
        req.params.id, req.user.userId
      ]
    );

    const [entries] = await pool.execute(
      'SELECT * FROM fuel_entries WHERE id = ?',
      [req.params.id]
    );

    res.json(entries[0]);
  } catch (error) {
    console.error('Update entry error:', error);
    res.status(500).json({ error: 'Failed to update entry' });
  }
});

// DELETE /api/entries/:id - Delete an entry
router.delete('/:id', async (req, res) => {
  try {
    const [existing] = await pool.execute(
      'SELECT id FROM fuel_entries WHERE id = ? AND user_id = ?',
      [req.params.id, req.user.userId]
    );

    if (existing.length === 0) {
      return res.status(404).json({ error: 'Entry not found' });
    }

    await pool.execute(
      'DELETE FROM fuel_entries WHERE id = ? AND user_id = ?',
      [req.params.id, req.user.userId]
    );

    res.json({ success: true });
  } catch (error) {
    console.error('Delete entry error:', error);
    res.status(500).json({ error: 'Failed to delete entry' });
  }
});

export default router;
