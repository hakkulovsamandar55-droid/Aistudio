const path = require('path');

// Must load before anything requires the Prisma client, so it connects to the
// test database rather than whatever .env points at.
require('dotenv').config({ path: path.join(__dirname, '..', '.env.test') });

if (!process.env.DATABASE_URL || !/test/i.test(process.env.DATABASE_URL)) {
  throw new Error(
    'Refusing to run tests: DATABASE_URL in .env.test must point at a database with "test" in its name.'
  );
}

const prisma = require('../src/config/db');
const providerSettings = require('../src/services/providerSettings.service');

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
