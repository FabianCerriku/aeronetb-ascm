const express = require('express');
const { connectMongo }      = require('../db/mongo');
const { authenticateToken } = require('../middleware/auth');
const { allowRoles }        = require('../middleware/rbac');
const { writeAuditLog }     = require('../middleware/auditLog');

const router = express.Router();
router.use(authenticateToken);

// ── GET /api/qc-reports ───────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const { partID, inspectorID, result, inspectionType } = req.query;
    const filter = {};
    if (partID)         filter.partID = partID;
    if (inspectorID)    filter.inspectorID = inspectorID;
    if (result)         filter.overallResult = result;
    if (inspectionType) filter.inspectionType = inspectionType;

    const db = await connectMongo();
    const reports = await db.collection('qc_reports')
      .find(filter)
      .sort({ timestamp: -1 })
      .toArray();

    res.json(reports);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/qc-reports/stats ─────────────────────────────
// Pass/fail breakdown for dashboard charts
router.get('/stats', async (req, res) => {
  try {
    const db = await connectMongo();
    const stats = await db.collection('qc_reports').aggregate([
      { $group: {
          _id: { partID: '$partID', result: '$overallResult' },
          count: { $sum: 1 }
      }},
      { $group: {
          _id: '$_id.partID',
          results: { $push: { result: '$_id.result', count: '$count' } },
          total: { $sum: '$count' }
      }},
      { $sort: { _id: 1 } }
    ]).toArray();
    res.json(stats);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/qc-reports/:reportID ────────────────────────
router.get('/:reportID', async (req, res) => {
  try {
    const db = await connectMongo();
    const report = await db.collection('qc_reports').findOne({ reportID: req.params.reportID });
    if (!report) return res.status(404).json({ error: 'QC report not found.' });
    await writeAuditLog(req.user.empId, 'VIEW', 'qc_reports', req.params.reportID, null);
    res.json(report);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/qc-reports ──────────────────────────────────
// Only quality inspectors can create QC reports
router.post('/', allowRoles('quality_inspector'), async (req, res) => {
  try {
    const { reportID, partID, inspectionType, overallResult, ...rest } = req.body;
    if (!reportID || !partID || !inspectionType || !overallResult) {
      return res.status(400).json({ error: 'reportID, partID, inspectionType, overallResult required.' });
    }

    const doc = {
      reportID,
      partID,
      inspectorID: req.user.empId,
      inspectionType,
      overallResult,
      timestamp: new Date().toISOString(),
      versionHistory: [{
        version: 1,
        editedBy: req.user.empId,
        editedAt: new Date().toISOString(),
        note: 'Initial report'
      }],
      ...rest
    };

    const db = await connectMongo();
    await db.collection('qc_reports').insertOne(doc);
    await writeAuditLog(req.user.empId, 'CREATE', 'qc_reports', reportID, `Created QC report for part ${partID}`);
    res.status(201).json(doc);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── PUT /api/qc-reports/:reportID ────────────────────────
// Quality inspectors can update their own reports (adds version history entry)
router.put('/:reportID', allowRoles('quality_inspector'), async (req, res) => {
  try {
    const { reportID } = req.params;
    const db = await connectMongo();

    const existing = await db.collection('qc_reports').findOne({ reportID });
    if (!existing) return res.status(404).json({ error: 'QC report not found.' });

    // Only the original inspector can edit
    if (existing.inspectorID !== req.user.empId) {
      return res.status(403).json({ error: 'You can only edit your own QC reports.' });
    }

    const newVersion = existing.versionHistory.length + 1;
    const versionEntry = {
      version:  newVersion,
      editedBy: req.user.empId,
      editedAt: new Date().toISOString(),
      note:     req.body.editNote || `Version ${newVersion} update`
    };

    const { editNote, ...updateFields } = req.body;
    await db.collection('qc_reports').updateOne(
      { reportID },
      {
        $set: updateFields,
        $push: { versionHistory: versionEntry }
      }
    );

    await writeAuditLog(req.user.empId, 'UPDATE', 'qc_reports', reportID, `Updated to version ${newVersion}`);
    res.json({ message: 'QC report updated.', version: newVersion });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
