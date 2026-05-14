const { MongoClient } = require('mongodb');

let db = null;

async function connectMongo() {
  if (db) return db;
  const client = new MongoClient(process.env.MONGO_URI);
  await client.connect();
  db = client.db('aeronetsystem');
  console.log('✅ MongoDB Atlas connected');
  return db;
}

module.exports = { connectMongo };
