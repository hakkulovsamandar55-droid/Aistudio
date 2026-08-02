const fs = require('fs');
const path = require('path');
const { request, app, prisma, registerUser, grantCredits, auth } = require('./helpers');
const { REMIX_DIR } = require('../src/middleware/upload.middleware');

// A minimal valid 1x1 PNG, so multer/sharp-less validation accepts it as a
// real image without needing a fixture file on disk.
const TINY_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
  'base64'
);

function filesInRemixDir() {
  return fs.readdirSync(REMIX_DIR).filter((name) => !name.startsWith('.'));
}

describe('Remix (image upload + style transformation)', () => {
  it('lists the available styles without auth requirements beyond login', async () => {
    const { accessToken } = await registerUser();
    const res = await request(app).get('/api/remix/styles').set(auth(accessToken));

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThan(0);
    expect(res.body.data[0]).toHaveProperty('id');
    expect(res.body.data[0]).toHaveProperty('promptSuffix');
  });

  it('rejects an unauthenticated request', async () => {
    const res = await request(app).get('/api/remix/styles');
    expect(res.status).toBe(401);
  });

  it('remixes an uploaded image, deducts credits and cleans up the source file', async () => {
    const { user, accessToken } = await registerUser();
    await grantCredits(user.id, 100);
    const before = await prisma.user.findUnique({ where: { id: user.id } });

    const res = await request(app)
      .post('/api/remix')
      .set(auth(accessToken))
      .field('style', 'anime')
      .attach('image', TINY_PNG, { filename: 'photo.png', contentType: 'image/png' });

    expect(res.status).toBe(201);
    expect(res.body.data.status).toBe('COMPLETED');
    expect(res.body.data.resultUrl).toBeTruthy();

    const after = await prisma.user.findUnique({ where: { id: user.id } });
    expect(after.credits).toBe(before.credits - 2);

    // The uploaded source file must not remain on disk after processing.
    expect(filesInRemixDir()).toHaveLength(0);
  });

  it('rejects an unknown style and leaves no orphaned file', async () => {
    const { user, accessToken } = await registerUser();
    await grantCredits(user.id, 100);

    const res = await request(app)
      .post('/api/remix')
      .set(auth(accessToken))
      .field('style', 'not-a-real-style')
      .attach('image', TINY_PNG, { filename: 'photo.png', contentType: 'image/png' });

    expect(res.status).toBe(400);
    expect(filesInRemixDir()).toHaveLength(0);
  });

  it('rejects a disallowed file type', async () => {
    const { user, accessToken } = await registerUser();
    await grantCredits(user.id, 100);

    const res = await request(app)
      .post('/api/remix')
      .set(auth(accessToken))
      .field('style', 'anime')
      .attach('image', Buffer.from('not an image'), { filename: 'file.txt', contentType: 'text/plain' });

    expect(res.status).toBe(400);
    expect(filesInRemixDir()).toHaveLength(0);
  });

  it('rejects a request with no file', async () => {
    const { user, accessToken } = await registerUser();
    await grantCredits(user.id, 100);

    const res = await request(app).post('/api/remix').set(auth(accessToken)).field('style', 'anime');

    expect(res.status).toBe(400);
  });

  it('blocks remix once the FREE image daily cap is reached, before any file is written', async () => {
    const { user, accessToken } = await registerUser();
    await grantCredits(user.id, 100);
    await prisma.generation.create({
      data: { userId: user.id, type: 'IMAGE', userPrompt: 'x', status: 'COMPLETED', provider: 'mock' },
    });
    await prisma.generation.create({
      data: { userId: user.id, type: 'IMAGE', userPrompt: 'x', status: 'COMPLETED', provider: 'mock' },
    });

    const res = await request(app)
      .post('/api/remix')
      .set(auth(accessToken))
      .field('style', 'anime')
      .attach('image', TINY_PNG, { filename: 'photo.png', contentType: 'image/png' });

    expect(res.status).toBe(429);
    expect(filesInRemixDir()).toHaveLength(0);
  });

  it('blocks remix when the user has insufficient credits, before any file is written', async () => {
    const { user, accessToken } = await registerUser();
    await prisma.user.update({ where: { id: user.id }, data: { credits: 0 } });

    const res = await request(app)
      .post('/api/remix')
      .set(auth(accessToken))
      .field('style', 'anime')
      .attach('image', TINY_PNG, { filename: 'photo.png', contentType: 'image/png' });

    expect(res.status).toBe(402);
    expect(filesInRemixDir()).toHaveLength(0);
  });

  it('the remixed image is served back from /uploads with a cross-origin-friendly header', async () => {
    const { user, accessToken } = await registerUser();
    await grantCredits(user.id, 100);

    const res = await request(app)
      .post('/api/remix')
      .set(auth(accessToken))
      .field('style', 'pixar')
      .attach('image', TINY_PNG, { filename: 'photo.png', contentType: 'image/png' });

    expect(res.status).toBe(201);
    // resultUrl comes from the mock/gateway provider, not necessarily /uploads,
    // but the static route itself must set the CORP override regardless.
    const staticRes = await request(app).get('/uploads/does-not-exist.png');
    expect(staticRes.headers['cross-origin-resource-policy']).toBe('cross-origin');
  });
});
