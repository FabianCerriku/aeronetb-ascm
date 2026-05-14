const express = require('express');
const pool    = require('../db/postgres');
const { authenticateToken } = require('../middleware/auth');
const { allowRoles }        = require('../middleware/rbac');
const { writeAuditLog }     = require('../middleware/auditLog');

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// ── GET /api/suppliers ────────────────────────────────────
// All authenticated roles can view suppliers
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT s.*, COUNT(DISTINCT sp.part_id) AS part_count
       FROM suppliers s
       LEFT JOIN supplier_parts sp ON s.supplier_id = sp.supplier_id
       GROUP BY s.supplier_id
       ORDER BY s.business_name`
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/suppliers/performance ────────────────────────
// Supplier KPI view — supply chain manager + auditor
router.get('/performance', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM supplier_performance ORDER BY on_time_pct DESC NULLS LAST');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/suppliers/:id ────────────────────────────────
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const supplier = await pool.query('SELECT * FROM suppliers WHERE supplier_id = $1', [id]);
    if (supplier.rows.length === 0) return res.status(404).json({ error: 'Supplier not found.' });

    const parts = await pool.query(
      `SELECT p.*, sp.customizations FROM parts p
       JOIN supplier_parts sp ON p.part_id = sp.part_id
       WHERE sp.supplier_id = $1`, [id]
    );

    await writeAuditLog(req.user.empId, 'VIEW', 'suppliers', id, null);
    res.json({ ...supplier.rows[0], parts: parts.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/suppliers ───────────────────────────────────
// Only procurement officers and supply chain managers can create
router.post('/', allowRoles('procurement_officer','supply_chain_manager'), async (req, res) => {
  const { supplier_id, business_name, address, accreditation, contact_email, contact_phone } = req.body;
  if (!supplier_id || !business_name) {
    return res.status(400).json({ error: 'supplier_id and business_name are required.' });
  }
  try {
    const result = await pool.query(
      `INSERT INTO suppliers (supplier_id, business_name, address, accreditation, contact_email, contact_phone)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [supplier_id, business_name, address, accreditation, contact_email, contact_phone]
    );
    await writeAuditLog(req.user.empId, 'CREATE', 'suppliers', supplier_id, `Created supplier: ${business_name}`);
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── PUT /api/suppliers/:id ────────────────────────────────
router.put('/:id', allowRoles('procurement_officer','supply_chain_manager'), async (req, res) => {
  const { id } = req.params;
  const { business_name, address, accreditation, contact_email, contact_phone } = req.body;
  try {
    const result = await pool.query(
      `UPDATE suppliers SET business_name=$1, address=$2, accreditation=$3,
       contact_email=$4, contact_phone=$5 WHERE supplier_id=$6 RETURNING *`,
      [business_name, address, accreditation, contact_email, contact_phone, id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Supplier not found.' });
    await writeAuditLog(req.user.empId, 'UPDATE', 'suppliers', id, `Updated supplier: ${business_name}`);
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
