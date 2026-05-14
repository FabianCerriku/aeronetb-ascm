const express = require('express');
const { connectMongo }      = require('../db/mongo');
const pool                  = require('../db/postgres');
const { authenticateToken } = require('../middleware/auth');
const { allowRoles }        = require('../middleware/rbac');
const { writeAuditLog }     = require('../middleware/auditLog');

// ── IoT Router ────────────────────────────────────────────
const iotRouter = express.Router();
iotRouter.use(authenticateToken);

// GET /api/iot - latest log per equipment
iotRouter.get('/', async (req, res) => {
  try {
    const db = await connectMongo();
    const logs = await db.collection('iot_logs').aggregate([
      { $sort: { timestamp: -1 } },
      { $group: { _id: '$equipmentID', latest: { $first: '$$ROOT' } } },
      { $replaceRoot: { newRoot: '$latest' } }
    ]).toArray();
    res.json(logs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/iot/alerts - all equipment with active breaches
iotRouter.get('/alerts', async (req, res) => {
  try {
    const db = await connectMongo();
    const alerts = await db.collection('iot_logs').aggregate([
      { $match: { 'alerts.0': { $exists: true } } },
      { $sort: { timestamp: -1 } },
      { $group: { _id: '$equipmentID', latest: { $first: '$$ROOT' } } },
      { $replaceRoot: { newRoot: '$latest' } },
      { $match: { 'alerts.breached': true } }
    ]).toArray();
    res.json(alerts);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/iot/:equipmentID/history - time series for one machine
iotRouter.get('/:equipmentID/history', async (req, res) => {
  try {
    const db = await connectMongo();
    const logs = await db.collection('iot_logs')
      .find({ equipmentID: req.params.equipmentID })
      .sort({ timestamp: -1 })
      .limit(50)
      .toArray();
    res.json(logs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/iot - equipment engineer posts a new reading
iotRouter.post('/', allowRoles('equipment_engineer'), async (req, res) => {
  try {
    const { equipmentID, facilityID, readings, alerts } = req.body;
    if (!equipmentID || !readings) {
      return res.status(400).json({ error: 'equipmentID and readings are required.' });
    }
    const doc = {
      equipmentID,
      facilityID,
      timestamp: new Date().toISOString(),
      readings,
      alerts: alerts || [],
      source: 'manual_entry'
    };
    const db = await connectMongo();
    await db.collection('iot_logs').insertOne(doc);

    // Update equipment status in PostgreSQL if critical
    const hasCritical = (alerts || []).some(a => a.severity === 'critical' && a.breached);
    const hasWarning  = (alerts || []).some(a => a.severity === 'warning'  && a.breached);
    if (hasCritical || hasWarning) {
      await pool.query(
        'UPDATE equipment SET status = $1 WHERE equipment_id = $2',
        [hasCritical ? 'critical' : 'warning', equipmentID]
      );
    }
    await writeAuditLog(req.user.empId, 'CREATE', 'iot_logs', equipmentID, 'Manual IoT reading posted');
    res.status(201).json({ message: 'Reading recorded.', doc });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Equipment Router (PostgreSQL) ─────────────────────────
const equipRouter = express.Router();
equipRouter.use(authenticateToken);

equipRouter.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT eq.*, f.name AS facility_name, f.location AS facility_location
       FROM equipment eq
       JOIN facilities f ON eq.facility_id = f.facility_id
       ORDER BY eq.status DESC, eq.name`
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Audit Log Router ──────────────────────────────────────
const auditRouter = express.Router();
auditRouter.use(authenticateToken);

// Only auditors and managers can read audit logs
auditRouter.get('/', allowRoles('auditor','supply_chain_manager'), async (req, res) => {
  try {
    const { emp_id, action, limit = 50 } = req.query;
    let query = `
      SELECT al.*, e.full_name, e.role
      FROM audit_logs al
      JOIN employees e ON al.emp_id = e.emp_id
      WHERE 1=1`;
    const params = [];
    if (emp_id) { params.push(emp_id); query += ` AND al.emp_id = $${params.length}`; }
    if (action) { params.push(action); query += ` AND al.action = $${params.length}`; }
    params.push(Math.min(parseInt(limit), 200));
    query += ` ORDER BY al.created_at DESC LIMIT $${params.length}`;
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = { iotRouter, equipRouter, auditRouter };
