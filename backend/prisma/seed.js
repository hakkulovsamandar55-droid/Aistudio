const { PrismaClient } = require('@prisma/client');
const { CREDIT_PACKAGES } = require('../src/config/credits.config');

const prisma = new PrismaClient();

async function main() {
  for (const pkg of CREDIT_PACKAGES) {
    await prisma.creditPackage.upsert({
      where: { stripePriceId: pkg.stripePriceId },
      update: pkg,
      create: pkg,
    });
  }
  console.log(`Seeded ${CREDIT_PACKAGES.length} credit packages.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
