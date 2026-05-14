// Role-Based Access Control middleware
// Usage: router.get('/route', authenticateToken, allowRoles('procurement_officer','supply_chain_manager'), handler)

function allowRoles(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated.' });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        error: `Access denied. Required role(s): ${roles.join(', ')}. Your role: ${req.user.role}`
      });
    }
    next();
  };
}

// Auditors are always read-only — block any write operation
function blockAuditorWrites(req, res, next) {
  if (req.user && req.user.role === 'auditor' &&
      ['POST','PUT','PATCH','DELETE'].includes(req.method)) {
    return res.status(403).json({ error: 'Auditors have read-only access.' });
  }
  next();
}

module.exports = { allowRoles, blockAuditorWrites };
