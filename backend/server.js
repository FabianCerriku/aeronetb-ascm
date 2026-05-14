require('dotenv').config();
const express = require('express');
const cors    = require('cors');
const path    = require('path');
const fs      = require('fs');

// Case-insensitive route loader
function req(p) {
  const abs = path.join(__dirname, p);
  // try exact, then capitalised variations
  const variants = [abs, abs.replace('/routes/', '/Routes/').replace('/db/', '/DB/').replace('/middleware/', '/Middleware/')];
  for (const v of variants) {
    if (fs.existsSync(v)) return require(v);
    if (fs.existsSync(v + '.js')) return require(v);
  }
  throw new Error(`Cannot find module: ${p}`);
}

const authRoutes          = require('./routes/auth');
const supplierRoutes      = require('./routes/suppliers');
const orderRoutes         = require('./routes/orders');
const shipmentRoutes      = require('./routes/shipments');
const qcReportRoutes      = require('./routes/qcreports');
const certRoutes          = require('./routes/certifications');
const { iotRouter, equipRouter, auditRouter } = require('./routes/iot');

const pool             = require('./db/postgres');
const { connectMongo } = require('./db/mongo');

const app  = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.use('/api/auth',           authRoutes);
app.use('/api/suppliers',      supplierRoutes);
app.use('/api/orders',         orderRoutes);
app.use('/api/shipments',      shipmentRoutes);
app.use('/api/qc-reports',     qcReportRoutes);
app.use('/api/certifications', certRoutes);
app.use('/api/iot',            iotRouter);
app.use('/api/equipment',      equipRouter);
app.use('/api/audit',          auditRouter);

app.get('/api/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    const mongo = await connectMongo();
    await mongo.command({ ping: 1 });
    res.json({ status: 'ok', postgres: 'connected', mongodb: 'connected' });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});

app.use((req, res) => {
  res.status(404).json({ error: `Route not found: ${req.method} ${req.path}` });
});

app.use((err, req, res, next) => {
  console.error('Unhandled error:', err.message);
  res.status(500).json({ error: 'Internal server error.' });
});

async function start() {
  try {
    await pool.query('SELECT 1');
    await connectMongo();
    app.listen(PORT, () => {
      console.log(`AeroNetB API running on port ${PORT}`);
    });
  } catch (err) {
    console.error('Failed to start server:', err.message);
    process.exit(1);
  }
}

start();
