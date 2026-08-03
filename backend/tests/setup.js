const path = require('path');

// Must load before anything requires the Prisma client, so it connects to the
// test database rather than whatever .env points at.
const testEnv = require('dotenv').config({ path: path.join(__dirname, '..', '.env.test') }).parsed || {};

if (!process.env.DATABASE_URL || !/test/i.test(process.env.DATABASE_URL)) {
  throw new Error(
    'Refusing to run tests: DATABASE_URL in .env.test must point at a database with "test" in its name.'
  );
}

const prisma = require('../src/config/db');
const providerSettings = require('../src/services/providerSettings.service');

/**
 * Prisma Client loads the project's `.env` when it is imported. Anything in
 * there that `.env.test` doesn't also define leaks straight into the test
 * process — so a developer with `REDIS_URL` set locally silently runs the
 * suite against a real queue with no worker (every generation hangs), and one
 * with `OPENAI_API_KEY` set makes the tests hit the network.
 *
 * Which infrastructure the suite talks to is not allowed to depend on the
 * machine it runs on. Any variable that selects a driver or enables an
 * external service is cleared unless `.env.test` asked for it.
 */
const INFRASTRUCTURE_KEYS = [
  'REDIS_URL',
  'QUEUE_DRIVER',
  'STORAGE_DRIVER',
  'API_PUBLIC_URL',
  'S3_ENDPOINT',
  'S3_REGION',
  'S3_BUCKET',
  'S3_ACCESS_KEY',
  'S3_SECRET_KEY',
  'S3_PUBLIC_URL',
  'EMAIL_PROVIDER_API_KEY',
  'EMAIL_FROM_ADDRESS',
  'SENTRY_DSN',
  'OPENAI_API_KEY',
  'STRIPE_SECRET_KEY',
  'STRIPE_WEBHOOK_SECRET',
  'GOOGLE_CLIENT_ID',
];

for (const key of INFRASTRUCTURE_KEYS) {
  if (!(key in testEnv)) delete process.env[key];
}

// Order matters only for readability — TRUNCATE ... CASCADE handles the FKs.
const TABLES = [
  'credit_transactions',
  'password_reset_tokens',
  'generations',
  'projects',
  'provider_settings',
  'processed_webhook_events',
  'announcements',
  'credit_packages',
  'users',
];

global.resetDatabase = async () => {
  await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${TABLES.map((t) => `"${t}"`).join(', ')} CASCADE;`);
  // provider_settings rows are gone but the service mirrors them into an
  // in-memory cache that TRUNCATE never touches, and invalidate() alone only
  // flips a "stale" flag rather than clearing it — callers that read the
  // cache synchronously (as provider constructors do) would keep seeing the
  // previous test's values. Force an immediate reload so every test starts
  // from the truncated (env-only) state.
  await providerSettings.refresh();
};

beforeEach(async () => {
  await global.resetDatabase();
});

afterAll(async () => {
  await prisma.$disconnect();
});
