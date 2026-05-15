const express = require('express');
const pool    = require('../db/postgres');
const { authenticateToken } = require('../middleware/auth');
const router  = express.Router();
router.use(authenticateToken);

router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM parts ORDER BY part_name');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM parts WHERE part_id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Part not found.' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
