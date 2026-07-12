import { configFromEnv, startRelay } from './server';

const config = configFromEnv();
const relay = await startRelay(config);
// Deliberately logs only the listener address, never frames, identifiers, or coordinates.
console.info(`CrownTrack development relay listening at ${relay.url}`);

const shutdown = async (): Promise<void> => {
  await relay.close();
  process.exit(0);
};

process.once('SIGINT', shutdown);
process.once('SIGTERM', shutdown);
