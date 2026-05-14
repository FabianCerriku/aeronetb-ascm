const express  = require('express');
const bcrypt   = require('bcryptjs');
const jwt      = require('jsonwebtoken');
const pool     = require('../db/postgres');
const { writeAuditLog }    = require('../middleware/auditLog');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// ── POST /api/auth/login ───────────────────────────────────
// Body: { email, password }
// Returns: { token, user: { empId, fullName, role, email, accessLevel } }
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  try {
    const result = await pool.query(
      'SELECT * FROM employees WHERE email = $1',
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const employee = result.rows[0];
    const validPassword = await bcrypt.compare(password, employee.password_hash);

    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    // Sign JWT
    const token = jwt.sign(
      {
        empId:       employee.emp_id,
        email:       employee.email,
        fullName:    employee.full_name,
        role:        employee.role,
        accessLevel: employee.access_level
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '8h' }
    );

    // Write audit log
    await writeAuditLog(employee.emp_id, 'LOGIN', null, null, 'Successful login');

    res.json({
      token,
      user: {
        empId:       employee.emp_id,
        fullName:    employee.full_name,
        role:        employee.role,
        email:       employee.email,
        accessLevel: employee.access_level,
        department:  employee.department
      }
    });
  } catch (err) {
    console.error('Login error:', err.message);
    res.status(500).json({ error: 'Server error during login.' });
  }
});

// ── GET /api/auth/me ───────────────────────────────────────
// Returns the currently authenticated user's profile
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT emp_id, full_name, job_title, department, email, phone,
              access_level, role, created_at
       FROM employees WHERE emp_id = $1`,
      [req.user.empId]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found.' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
