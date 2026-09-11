/**
 * Local database launcher — no MongoDB install needed.
 *
 * Starts an in-memory MongoDB on port 27017 (same as MONGO_URI in .env),
 * then boots the API server. Data lives only while this process runs.
 *
 * Usage:
 *   npm run local        # start local DB + API (keep this terminal open)
 *   npm run seed         # in a SECOND terminal, while `npm run local` runs
 */
const { MongoMemoryServer } = require('mongodb-memory-server');

async function main() {
  const mongod = await MongoMemoryServer.create({
    instance: { port: 27017, dbName: 'mitva-jewels' },
  });
  console.log(`Local MongoDB running at ${mongod.getUri('mitva-jewels')}`);

  // Now boot the real API server (it connects via MONGO_URI in .env)
  require('./server');

  const stop = async () => {
    await mongod.stop();
    process.exit(0);
  };
  process.on('SIGINT', stop);
  process.on('SIGTERM', stop);
}

main().catch((e) => {
  console.error('Local DB failed to start:', e);
  process.exit(1);
});
