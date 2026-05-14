const express = require('express');
const pool    = require('../db/postgres');
const { authenticateToken } = require('../middleware/auth');
const { allowRoles }        = require('../middleware/rbac');
const { writeAuditLog }     = require('../middleware/auditLog');

const router = express.Router();
router.use(authenticateToken);

// ── GET /api/orders ───────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const { status, supplier_id } = req.query;
    let query = `
      SELECT po.*, s.business_name AS supplier_name, p.part_name
      FROM purchase_orders po
      JOIN suppliers s ON po.supplier_id = s.supplier_id
      JOIN parts p     ON po.part_id = p.part_id
      WHERE 1=1`;
    const params = [];

    if (status)      { params.push(status);      query += ` AND po.status = $${params.length}`; }
    if (supplier_id) { params.push(supplier_id); query += ` AND po.supplier_id = $${params.length}`; }

    query += ' ORDER BY po.order_date DESC';
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/orders/delayed ───────────────────────────────
router.get('/delayed', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM delayed_shipments ORDER BY days_delayed DESC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/orders/:id ───────────────────────────────────
router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT po.*, s.business_name AS supplier_name, s.contact_email,
              p.part_name, p.description
       FROM purchase_orders po
       JOIN suppliers s ON po.supplier_id = s.supplier_id
       JOIN parts p     ON po.part_id = p.part_id
       WHERE po.order_id = $1`,
      [req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Order not found.' });
    await writeAuditLog(req.user.empId, 'VIEW', 'purchase_orders', req.params.id, null);
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/orders ──────────────────────────────────────
router.post('/', allowRoles('procurement_officer'), async (req, res) => {
  const { order_id, supplier_id, part_id, order_date, desired_delivery } = req.body;
  if (!order_id || !supplier_id || !part_id || !order_date) {
    return res.status(400).json({ error: 'order_id, supplier_id, part_id, order_date are required.' });
  }
  try {
    const result = await pool.query(
      `INSERT INTO purchase_orders (order_id, supplier_id, part_id, order_date, desired_delivery, status)
       VALUES ($1,$2,$3,$4,$5,'placed') RETURNING *`,
      [order_id, supplier_id, part_id, order_date, desired_delivery]
    );
    await writeAuditLog(req.user.empId, 'CREATE', 'purchase_orders', order_id, `Created order for supplier ${supplier_id}`);
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── PATCH /api/orders/:id/status ──────────────────────────
router.patch('/:id/status', allowRoles('procurement_officer','supply_chain_manager'), async (req, res) => {
  const { status } = req.body;
  const validStatuses = ['placed','confirmed','dispatched','delivered','completed'];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` });
  }
  try {
    const extra = status === 'delivered' ? ', actual_delivery = NOW()' : '';
    const result = await pool.query(
      `UPDATE purchase_orders SET status = $1 ${extra} WHERE order_id = $2 RETURNING *`,
      [status, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Order not found.' });
    await writeAuditLog(req.user.empId, 'UPDATE', 'purchase_orders', req.params.id, `Status changed to: ${status}`);
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
