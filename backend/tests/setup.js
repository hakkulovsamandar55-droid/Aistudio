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

// Order matters only for readability — TRUNCATE ... CASCADE handles the FKs.
const TABLES = [
  'credit_transactions',
  'password_reset_tokens',
  'generations',
  'announcements',
  'credit_packages',
  'users',
];

global.resetDatabase = async () => {
  await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${TABLES.map((t) => `"${t}"`).join(', ')} CASCADE;`);
};

beforeEach(async () => {
  await global.resetDatabase();
});

afterAll(async () => {
  await prisma.$disconnect();
});
