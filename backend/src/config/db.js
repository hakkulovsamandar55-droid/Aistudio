const { PrismaClient } = require('@prisma/client');

// In dev, nodemon restarts wipe the module cache on every reload, so a naive
// `new PrismaClient()` here would open a fresh pool of DB connections each
// time and eventually exhaust Postgres' max_connections. Stashing the
// instance on `global` survives those reloads and keeps a single client.
const globalForPrisma = global;

const prisma =
  globalForPrisma.__prisma ||
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.__prisma = prisma;
}

module.exports = prisma;
