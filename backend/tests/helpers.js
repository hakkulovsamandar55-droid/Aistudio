const request = require('supertest');
const app = require('../src/app');
const prisma = require('../src/config/db');

let counter = 0;

function uniqueEmail(prefix = 'user') {
  counter += 1;
  return `${prefix}${counter}-${Date.now()}@example.com`;
}

async function registerUser(overrides = {}) {
  const email = overrides.email || uniqueEmail();
  const password = overrides.password || 'password123';

  const response = await request(app)
    .post('/api/auth/register')
    .send({
      email,
      password,
      name: overrides.name || 'Test User',
      referralCode: overrides.referralCode,
    });

  if (response.status !== 201) {
    throw new Error(`registerUser failed: ${response.status} ${JSON.stringify(response.body)}`);
  }

  return { ...response.body.data, email, password };
}

async function registerAdmin(overrides = {}) {
  const user = await registerUser(overrides);
  await prisma.user.update({ where: { id: user.user.id }, data: { role: 'ADMIN' } });
  return user;
}

/** Gives a user enough credits to run generations in a test. */
async function grantCredits(userId, amount) {
  await prisma.user.update({ where: { id: userId }, data: { credits: { increment: amount } } });
}

function auth(token) {
  return { Authorization: `Bearer ${token}` };
}

module.exports = { app, request, prisma, uniqueEmail, registerUser, registerAdmin, grantCredits, auth };
