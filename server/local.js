/**
 * Local database launcher — no MongoDB install needed.
 *
 * Starts an in-memory MongoDB (random free port by default) and points
 * MONGO_URI at it, then boots the API server. Data is ephemeral.
 *
 * Usage:
 *   npm run local        # start local DB + API (keep this terminal open)
 *   npm run seed         # in a SECOND terminal, while `npm run local` runs
 */
const { MongoMemoryServer } = require('mongodb-memory-server');

async function main() {
  const mongod = await MongoMemoryServer.create({
    // Pinned (not a random free port) — same reasoning as local-persist.js:
    // matches server/.env.example's default MONGO_URI, so tools like
    // MongoDB Compass always find it at mongodb://127.0.0.1:27017.
    instance: { dbName: 'etherstar-jewels', port: 27017 },
  });
  const uri = mongod.getUri('etherstar-jewels');
  process.env.MONGO_URI = uri;
  console.log(`Local MongoDB running at ${uri}`);

  // Now boot the real API server (it connects via process.env.MONGO_URI).
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
  console.error('Local DB failed to start:', e);
  process.exit(1);
});
