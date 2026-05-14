const pool = require('../db/postgres');

// Call this from any route to write an audit entry
async function writeAuditLog(empId, action, targetTable = null, targetRecord = null, details = null) {
  try {
    await pool.query(
      `INSERT INTO audit_logs (emp_id, action, target_table, target_record, details)
       VALUES ($1, $2, $3, $4, $5)`,
      [empId, action, targetTable, targetRecord, details]
    );
  } catch (err) {
    // Log failures silently — don't break the main request
    console.error('Audit log write failed:', err.message);
  }
}

module.exports = { writeAuditLog };
