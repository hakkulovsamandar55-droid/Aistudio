const bcrypt = require('bcrypt');
const { PrismaClient } = require('@prisma/client');
const { CREDIT_PACKAGES } = require('../src/config/credits.config');

const prisma = new PrismaClient();

async function seedAdmin() {
  const { ADMIN_EMAIL, ADMIN_PASSWORD } = process.env;
  if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
    console.log('ADMIN_EMAIL/ADMIN_PASSWORD not set — skipping admin user seed.');
    return;
  }

  const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 10);

  await prisma.user.upsert({
    where: { email: ADMIN_EMAIL },
    update: { role: 'ADMIN' },
    create: {
      email: ADMIN_EMAIL,
      password: passwordHash,
      name: 'Admin',
      role: 'ADMIN',
      credits: 0,
    },
  });

  console.log(`Seeded admin user: ${ADMIN_EMAIL}`);
}

async function main() {
  for (const pkg of CREDIT_PACKAGES) {
    await prisma.creditPackage.upsert({
      where: { stripePriceId: pkg.stripePriceId },
      update: pkg,
      create: pkg,
    });
  }
  console.log(`Seeded ${CREDIT_PACKAGES.length} credit packages.`);

  await seedAdmin();
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
