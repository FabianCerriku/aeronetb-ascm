const express = require('express');
const pool    = require('../db/postgres');
const { connectMongo }      = require('../db/mongo');
const { authenticateToken } = require('../middleware/auth');
const { allowRoles }        = require('../middleware/rbac');
const { writeAuditLog }     = require('../middleware/auditLog');

const router = express.Router();
router.use(authenticateToken);

// ── GET /api/shipments ────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT sh.*, po.supplier_id, s.business_name AS supplier_name,
              po.part_id, p.part_name, po.desired_delivery
       FROM shipments sh
       JOIN purchase_orders po ON sh.order_id = po.order_id
       JOIN suppliers s        ON po.supplier_id = s.supplier_id
       JOIN parts p            ON po.part_id = p.part_id
       ORDER BY sh.eta ASC`
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/shipments/:id ────────────────────────────────
// Returns shipment from PostgreSQL + updates from MongoDB
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // SQL: core shipment data
    const sqlResult = await pool.query(
      `SELECT sh.*, po.supplier_id, s.business_name AS supplier_name,
              po.part_id, p.part_name, po.order_date, po.desired_delivery
       FROM shipments sh
       JOIN purchase_orders po ON sh.order_id = po.order_id
       JOIN suppliers s        ON po.supplier_id = s.supplier_id
       JOIN parts p            ON po.part_id = p.part_id
       WHERE sh.shipment_id = $1`,
      [id]
    );
    if (sqlResult.rows.length === 0) return res.status(404).json({ error: 'Shipment not found.' });

    // MongoDB: checkpoint updates
    const db = await connectMongo();
    const mongoDoc = await db.collection('shipment_updates').findOne({ shipmentID: id });

    await writeAuditLog(req.user.empId, 'VIEW', 'shipments', id, null);
    res.json({ ...sqlResult.rows[0], updates: mongoDoc ? mongoDoc.updates : [] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/shipments/:id/update ────────────────────────
// Add a checkpoint update to a shipment (supply chain manager)
router.post('/:id/update',
  allowRoles('supply_chain_manager','procurement_officer'),
  async (req, res) => {
    try {
      const { id } = req.params;
      const { location, containerCondition, checkpoint } = req.body;

      const updateEntry = {
        timestamp: new Date().toISOString(),
        location,
        containerCondition,
        checkpoint,
        recordedBy: req.user.empId
      };

      const db = await connectMongo();
      await db.collection('shipment_updates').updateOne(
        { shipmentID: id },
        { $push: { updates: updateEntry }, $set: { currentStatus: 'in_transit' } },
        { upsert: true }
      );

      await writeAuditLog(req.user.empId, 'UPDATE', 'shipments', id, `Added checkpoint: ${checkpoint}`);
      res.status(201).json({ message: 'Checkpoint added.', update: updateEntry });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
);

module.exports = router;
