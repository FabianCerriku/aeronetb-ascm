const express = require('express');
const pool    = require('../db/postgres');
const { authenticateToken } = require('../middleware/auth');
const { allowRoles }        = require('../middleware/rbac');
const { writeAuditLog }     = require('../middleware/auditLog');

const router = express.Router();
router.use(authenticateToken);

// ── GET /api/certifications ───────────────────────────────
router.get('/', async (req, res) => {
  try {
    const { part_id, status } = req.query;
    let query = `SELECT c.*, p.part_name, e.full_name AS inspector_name
                 FROM certifications c
                 JOIN parts p     ON c.part_id = p.part_id
                 LEFT JOIN employees e ON c.inspector_id = e.emp_id
                 WHERE 1=1`;
    const params = [];
    if (part_id) { params.push(part_id); query += ` AND c.part_id = $${params.length}`; }
    if (status)  { params.push(status);  query += ` AND c.status = $${params.length}`; }
    query += ' ORDER BY c.created_at DESC';
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/certifications/:id ───────────────────────────
router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT c.*, p.part_name, e.full_name AS inspector_name
       FROM certifications c
       JOIN parts p ON c.part_id = p.part_id
       LEFT JOIN employees e ON c.inspector_id = e.emp_id
       WHERE c.cert_id = $1`, [req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Certification not found.' });
    await writeAuditLog(req.user.empId, 'VIEW', 'certifications', req.params.id, null);
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/certifications ──────────────────────────────
router.post('/', allowRoles('quality_inspector'), async (req, res) => {
  const { cert_id, part_id, test_results, digital_stamp, material_traceability } = req.body;
  if (!cert_id || !part_id) {
    return res.status(400).json({ error: 'cert_id and part_id are required.' });
  }
  try {
    const result = await pool.query(
      `INSERT INTO certifications
         (cert_id, part_id, inspector_id, test_results, digital_stamp, material_traceability, status)
       VALUES ($1,$2,$3,$4,$5,$6,'pending') RETURNING *`,
      [cert_id, part_id, req.user.empId, test_results, digital_stamp, material_traceability]
    );
    await writeAuditLog(req.user.empId, 'CREATE', 'certifications', cert_id, `Created cert for part ${part_id}`);
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── PATCH /api/certifications/:id/approve ─────────────────
// Approve and lock a certification — only quality_inspector or supply_chain_manager
router.patch('/:id/approve',
  allowRoles('quality_inspector','supply_chain_manager'),
  async (req, res) => {
    try {
      const { id } = req.params;

      // Check if already immutable (extra application-layer guard)
      const check = await pool.query('SELECT is_immutable FROM certifications WHERE cert_id = $1', [id]);
      if (check.rows.length === 0) return res.status(404).json({ error: 'Certification not found.' });
      if (check.rows[0].is_immutable) {
        return res.status(409).json({ error: 'Certification is already approved and immutable.' });
      }

      const result = await pool.query(
        `UPDATE certifications
         SET status = 'approved', is_immutable = TRUE, approved_at = NOW()
         WHERE cert_id = $1 RETURNING *`,
        [id]
      );
      await writeAuditLog(req.user.empId, 'APPROVE', 'certifications', id, 'Certification approved and locked');
      res.json({ message: 'Certification approved and locked.', certification: result.rows[0] });
    } catch (err) {
      // The DB trigger will also throw if somehow bypassed
      if (err.message.includes('immutable')) {
        return res.status(409).json({ error: err.message });
      }
      res.status(500).json({ error: err.message });
    }
  }
);

module.exports = router;
