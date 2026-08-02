const { app, request, prisma, registerUser, auth } = require('./helpers');

describe('referrals', () => {
  it('pays both sides when a code is used at signup', async () => {
    const referrer = await registerUser();

    const referred = await registerUser({ referralCode: referrer.user.referralCode });
    expect(referred.user.credits).toBe(20); // 10 signup + 10 referral

    const referrerAfter = await prisma.user.findUnique({ where: { id: referrer.user.id } });
    expect(referrerAfter.credits).toBe(30); // 10 signup + 20 referral

    const bonuses = await prisma.creditTransaction.findMany({ where: { type: 'REFERRAL_BONUS' } });
    expect(bonuses).toHaveLength(2);
  });

  it('links the referred user back to the referrer', async () => {
    const referrer = await registerUser();
    const referred = await registerUser({ referralCode: referrer.user.referralCode });

    const row = await prisma.user.findUnique({ where: { id: referred.user.id } });
    expect(row.referredById).toBe(referrer.user.id);
  });

  it('accepts a lowercase code', async () => {
    const referrer = await registerUser();
    const referred = await registerUser({ referralCode: referrer.user.referralCode.toLowerCase() });

    expect(referred.user.credits).toBe(20);
  });

  it('ignores an unknown code instead of failing the signup', async () => {
    const referred = await registerUser({ referralCode: 'NOTREAL1' });

    expect(referred.user.credits).toBe(10);
    expect(await prisma.creditTransaction.count({ where: { type: 'REFERRAL_BONUS' } })).toBe(0);
  });

  it('ignores a suspended referrer', async () => {
    const referrer = await registerUser();
    await prisma.user.update({ where: { id: referrer.user.id }, data: { isActive: false } });

    const referred = await registerUser({ referralCode: referrer.user.referralCode });
    expect(referred.user.credits).toBe(10);
  });

  it('reports referral totals to the referrer', async () => {
    const referrer = await registerUser();
    await registerUser({ referralCode: referrer.user.referralCode });
    await registerUser({ referralCode: referrer.user.referralCode });

    const res = await request(app).get('/api/users/me/referrals').set(auth(referrer.accessToken));

    expect(res.body.data.referredCount).toBe(2);
    expect(res.body.data.creditsEarned).toBe(40);
    expect(res.body.data.referralCode).toBe(referrer.user.referralCode);
  });

  it('issues a distinct referral code per user', async () => {
    const a = await registerUser();
    const b = await registerUser();
    expect(a.user.referralCode).not.toBe(b.user.referralCode);
  });
});

describe('daily bonus', () => {
  it('grants credits once and then refuses until the cooldown lapses', async () => {
    const { user, accessToken } = await registerUser();

    const first = await request(app).post('/api/users/me/daily-bonus').set(auth(accessToken));
    expect(first.status).toBe(200);
    expect(first.body.data.credits).toBe(13);

    const second = await request(app).post('/api/users/me/daily-bonus').set(auth(accessToken));
    expect(second.status).toBe(429);

    const after = await prisma.user.findUnique({ where: { id: user.id } });
    expect(after.credits).toBe(13); // the rejected claim paid nothing
  });

  it('grants again once the cooldown has passed', async () => {
    const { user, accessToken } = await registerUser();
    await request(app).post('/api/users/me/daily-bonus').set(auth(accessToken));

    await prisma.user.update({
      where: { id: user.id },
      data: { lastDailyBonusAt: new Date(Date.now() - 25 * 60 * 60 * 1000) },
    });

    const again = await request(app).post('/api/users/me/daily-bonus').set(auth(accessToken));
    expect(again.status).toBe(200);
    expect(again.body.data.credits).toBe(16);
  });

  it('pays out only once when claims race each other', async () => {
    const { user, accessToken } = await registerUser();

    const results = await Promise.all(
      Array.from({ length: 5 }, () => request(app).post('/api/users/me/daily-bonus').set(auth(accessToken)))
    );

    const granted = results.filter((res) => res.status === 200);
    expect(granted).toHaveLength(1);

    const after = await prisma.user.findUnique({ where: { id: user.id } });
    expect(after.credits).toBe(13);
  });

  it('advertises availability on the profile payload', async () => {
    const { accessToken } = await registerUser();

    const before = await request(app).get('/api/users/me').set(auth(accessToken));
    expect(before.body.data.dailyBonus.available).toBe(true);

    await request(app).post('/api/users/me/daily-bonus').set(auth(accessToken));

    const after = await request(app).get('/api/users/me').set(auth(accessToken));
    expect(after.body.data.dailyBonus.available).toBe(false);
  });

  // Regression: the dashboard renders the claim prompt straight from the auth
  // payload, so a freshly registered user must already carry the state.
  it('reports availability on the register and login payloads too', async () => {
    const registered = await registerUser();
    expect(registered.user.dailyBonus.available).toBe(true);

    const login = await request(app)
      .post('/api/auth/login')
      .send({ email: registered.email, password: registered.password });
    expect(login.body.data.user.dailyBonus.available).toBe(true);

    await request(app).post('/api/users/me/daily-bonus').set(auth(registered.accessToken));

    const loginAfter = await request(app)
      .post('/api/auth/login')
      .send({ email: registered.email, password: registered.password });
    expect(loginAfter.body.data.user.dailyBonus.available).toBe(false);
  });
});

describe('user stats', () => {
  it('summarises generations, favourites and spend', async () => {
    const { accessToken } = await registerUser();

    const gen = await request(app)
      .post('/api/generate/image')
      .set(auth(accessToken))
      .send({ prompt: 'stats subject' });

    await request(app)
      .patch(`/api/generate/${gen.body.data.id}/favorite`)
      .set(auth(accessToken))
      .send({ isFavorite: true });

    const res = await request(app).get('/api/users/me/stats').set(auth(accessToken));

    expect(res.body.data.totalGenerations).toBe(1);
    expect(res.body.data.byType.IMAGE).toBe(1);
    expect(res.body.data.favorites).toBe(1);
    expect(res.body.data.creditsSpent).toBe(2);
  });
});

describe('profile updates', () => {
  it('updates the display name', async () => {
    const { accessToken } = await registerUser();

    const res = await request(app)
      .patch('/api/users/me')
      .set(auth(accessToken))
      .send({ name: 'Renamed Person' });

    expect(res.status).toBe(200);
    expect(res.body.data.name).toBe('Renamed Person');
  });

  it('rejects a blank name', async () => {
    const { accessToken } = await registerUser();
    const res = await request(app).patch('/api/users/me').set(auth(accessToken)).send({ name: '  ' });
    expect(res.status).toBe(400);
  });
});
