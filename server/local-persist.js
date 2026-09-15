/**
 * Persistent local database launcher — no admin rights, no MongoDB install needed.
 *
 * Starts a real mongod (downloaded once into the user cache by
 * mongodb-memory-server) with its data files in server/.devdb, so the
 * database SURVIVES restarts — unlike local.js (ephemeral) and unlike the
 * broken Windows service binaries on machines without admin rights.
 *
 * Usage:
 *   npm run local:persist   # start persistent local DB + API (keep terminal open)
 *   # then seed once from VPS export: node <seed-script>
 *
 * Data lives in server/.devdb (gitignored). Delete that folder to reset.
 */
const path = require('path');
const fs = require('fs');
const { MongoMemoryServer } = require('mongodb-memory-server');

const DB_PATH = path.join(__dirname, '.devdb');
const DB_NAME = 'etherstar-jewels';

async function main() {
  fs.mkdirSync(DB_PATH, { recursive: true });
  const mongod = await MongoMemoryServer.create({
    instance: {
      dbName: DB_NAME,
      dbPath: DB_PATH,
      storageEngine: 'wiredTiger',
    },
  });
  const uri = mongod.getUri(DB_NAME);
  process.env.MONGO_URI = uri;
  console.log(`Persistent local MongoDB at ${uri}`);
  console.log(`Data files: ${DB_PATH}`);

  // Boot the real API server (it connects via process.env.MONGO_URI).
  // NOTE: server.js only auto-boots when run directly, so boot explicitly.
  require('./server').boot();

  const stop = async () => {
    try {
      await mongod.stop();
    } finally {
      process.exit(0);
    }
  };
  process.on('SIGINT', stop);
  process.on('SIGTERM', stop);
  process.on('uncaughtException', async (e) => {
    console.error('Uncaught exception:', e);
    await stop();
  });
  process.on('unhandledRejection', async (e) => {
    console.error('Unhandled rejection:', e);
    await stop();
  });
}

main().catch((e) => {
  console.error('Local persistent DB failed to start:', e.message);
  process.exit(1);
});
