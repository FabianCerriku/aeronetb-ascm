const { MongoClient, ServerApiVersion } = require('mongodb');

let db = null;

async function connectMongo() {
  if (db) return db;
  
  const client = new MongoClient(process.env.MONGO_URI, {
    serverApi: {
      version: ServerApiVersion.v1,
      strict: true,
      deprecationErrors: true,
    },
    tls: true,
    tlsAllowInvalidCertificates: true,
    tlsAllowInvalidHostnames: true,
    serverSelectionTimeoutMS: 10000,
    connectTimeoutMS: 10000,
  });

  await client.connect();
  db = client.db('aeronetsystem');
  console.log('✅ MongoDB Atlas connected');
  return db;
}

module.exports = { connectMongo };
