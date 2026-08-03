# AI Studio — Backend

Node.js + Express API for AI Studio. Handles auth, credits, plans, the AI
gateway (image/video/voice/music/script generation across multiple
providers, admin-managed credentials), Remix (image-to-image), and Stripe
billing.

## Stack

- Node.js + Express
- PostgreSQL + Prisma
- JWT auth (access + refresh)
- Stripe (checkout + webhooks)
- AI Gateway: OpenAI (image/text) · Wan/Kling/Runway/Veo (video, by quality
  tier) · ElevenLabs (voice) · Suno (music) — every provider also has a mock
  implementation so the app runs with zero API keys

## Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Copy the env template and fill in real values:

   ```bash
   cp .env.example .env
   ```

   At minimum, set `DATABASE_URL` to a running PostgreSQL instance. Leave
   `IMAGE_PROVIDER=mock` / `VIDEO_PROVIDER=mock` while developing without API
   keys — the mock providers return fake URLs so the full pipeline still
   works end to end.

3. Run migrations and generate the Prisma client:

   ```bash
   npx prisma migrate dev
   npx prisma generate
   ```

4. Seed the credit packages (Starter/Pro/Business) so `/api/payments/packages`
   returns data. Optionally set `ADMIN_EMAIL`/`ADMIN_PASSWORD` in `.env`
   first to also seed an initial admin account:

   ```bash
   npx prisma db seed
   ```

5. Start the dev server:

   ```bash
   npm run dev
   ```

   The API listens on `http://localhost:4000` by default (`PORT` in `.env`).
   Check `GET /api/health` to confirm it's up.

## Switching to real AI providers

Two ways to supply credentials, and they can be mixed:

1. **`.env`**, same as always:

   ```
   IMAGE_PROVIDER=openai
   OPENAI_API_KEY=sk-...
   VIDEO_PROVIDER=runway
   RUNWAY_API_KEY=...
   ```

2. **Admin panel** (`/admin/providers`, or `GET|PATCH /api/admin/providers`) —
   an admin can enter a key, flip a provider on/off, and override the base
   URL, all without a redeploy. A value set here always wins over `.env`; if
   it's cleared, credentials fall back to whatever `.env` provides.

Keys entered through the admin panel are encrypted at rest with AES-256-GCM
(`src/utils/crypto.js`), keyed by `SETTINGS_ENCRYPTION_KEY` (32 bytes as hex —
generate with `openssl rand -hex 32`). Without that env var set, saving a key
via the admin panel is refused with a 503 rather than silently storing it in
plaintext. No API response — admin or otherwise — ever returns a raw key;
`GET /api/admin/providers` only ever returns a masked form (`sk-t••••cdef`).

No other code changes are needed to add credentials for an already-registered
provider — `src/services/providerSettings.service.js` and
`src/services/ai-gateway/modelSelector.js` resolve the precedence above, and
`src/services/ai-gateway/index.js` drops its cached provider instances the
moment settings change so a rotated or newly-enabled key takes effect on the
next request.

For video specifically, provider choice is also driven by the requested
*quality tier* (`low`/`standard`/`better`/`ultra`, mapped to
wan/kling/runway/veo in `src/services/ai-gateway/videoTiers.js`) rather than a
single `VIDEO_PROVIDER` pin — see that file for the fallback-to-cheaper-tier
behavior when a tier's provider has no credentials.

## Background jobs (video generation)

Video renders take minutes, so they run as background jobs rather than inside
the request. With `REDIS_URL` set, `POST /api/generate/video` enqueues a
BullMQ job and a **separate worker process** does the work:

```bash
npm run worker        # production; npm run worker:dev to watch for changes
```

The job id *is* the generation id, so a resubmission can't double-queue and
reconciliation can ask the queue about a generation by primary key. Each job
gets three attempts (initial + two retries) with exponential backoff; only
when those are exhausted is the generation marked `FAILED` — and anything it
was already charged is refunded (`failVideoGeneration`, safe to call twice).

**Leaving `REDIS_URL` empty is supported** — jobs then run in-process exactly
as they did before the queue existed, which is fine for local dev and what the
test suite uses. The tradeoff is that a restart loses whatever was rendering,
which is precisely why production should set it. `QUEUE_DRIVER=inline` forces
that fallback even when Redis is reachable.

On boot, both the API and the worker run a **reconciliation pass**: any
generation still `PROCESSING` after 15 minutes that the queue no longer holds
a live job for is closed out as `FAILED` and refunded. Without that, a crash
mid-render leaves a row the client polls forever. `GET /api/admin/queue`
reports job counts per state plus the current stuck count, and the admin
dashboard renders it.

## Stripe webhook (local testing)

Use the Stripe CLI to forward events to your local server:

```bash
stripe listen --forward-to localhost:4000/api/webhooks/stripe
```

Copy the printed webhook signing secret into `STRIPE_WEBHOOK_SECRET`.

## Tests

```bash
cp .env.test.example .env.test     # point DATABASE_URL at a throwaway DB
DATABASE_URL="postgresql://...ai_studio_test..." npx prisma migrate deploy
npm test
```

The suite runs against a real PostgreSQL database (mock AI providers, no
network) and truncates every table between tests, so `DATABASE_URL` in
`.env.test` **must** contain "test" — `tests/setup.js` refuses to run
otherwise. Rate limiters stand down under `NODE_ENV=test`.

## API overview

| Area | Endpoints |
|---|---|
| Auth | `POST /auth/register` (accepts `referralCode`), `/login`, `/google` (Google ID token), `/refresh`, `/forgot-password`, `/reset-password` |
| Profile | `GET|PATCH /users/me`, `POST /users/me/password`, `GET /users/me/stats`, `/credits/history`, `/generations`, `/referrals`, `/me/quota`, `POST /users/me/daily-bonus` |
| Generation | `GET /generate/styles`, `POST /generate/enhance` (free — prompt only, no credit charge), `POST /generate/image`, `POST /generate/video`, `GET /generate/:id/status`, `GET /generate/:id/download`, `PATCH /generate/:id/favorite`, `PATCH /generate/:id/public`, `DELETE /generate/:id` |
| Remix | `GET /remix/styles`, `POST /remix` (multipart: `image` file + `style` id) |
| Public | `GET /gallery`, `GET /announcements`, `GET /payments/packages`, `GET /health` |
| Payments | `POST /payments/checkout`, `POST /webhooks/stripe` |
| Admin | `GET /admin/stats`, `/users`, `/users/:id`, `POST /users/:id/credits`, `PATCH /users/:id/active`, `PATCH /users/:id/role`, `PATCH /users/:id/plan`, `GET /admin/generations`, `GET|POST|PATCH /admin/packages`, `GET|POST|PATCH|DELETE /admin/announcements`, `GET /admin/providers`, `PATCH /admin/providers/:provider`, `GET /admin/economics` |

Notes worth knowing:

- **Style presets** live in `src/config/styles.config.js`. The picked preset's
  `promptSuffix` is appended to the enhanced prompt before it reaches the
  provider, and the preset id is stored on the generation.
- **Downloads** stream through `GET /generate/:id/download` rather than the
  provider URL directly: a cross-origin `<a download>` is ignored by browsers,
  so the file would otherwise just open in a new tab. Provider failures surface
  as `502`, not `500`.
- **Deletes are soft.** Rows stay in the table (credit history references them)
  but are filtered out of every listing and drop out of the gallery.
- **Gallery is unauthenticated** and returns a deliberately narrow projection —
  creator display name only, never emails or enhanced prompts.
- **Growth loops:** signup grants 10 credits; a valid referral code pays the new
  user +10 and the referrer +20 inside one transaction; the daily bonus grants
  3 credits behind a race-safe 24h cooldown. All amounts live in
  `src/config/credits.config.js`.

## Admin panel

Every route under `/api/admin/*` requires a user whose `role` is `ADMIN`,
checked fresh against the database on every request rather than trusted from
the JWT — so a demoted admin loses access immediately instead of when their
token expires. The matching UI lives at `/admin` on the frontend and only
renders its nav link for admins. Promote a user either via the seed script's
`ADMIN_EMAIL`/`ADMIN_PASSWORD`, or by having an existing admin call
`PATCH /api/admin/users/:id/role`.

## Plans & free-tier limits

Every user is `FREE` or `PRO` (`User.plan`, `src/config/economics.config.js`).
`FREE` gets a small daily cap per module (currently 1 video, 2 images, 2
voice lines, 1 music track, 10 scripts/day — counted from non-failed
`generations` rows, reset at local midnight); `PRO` ($4.99/mo, 360 credits)
has no daily cap and lapses back to `FREE` automatically once
`planExpiresAt` passes. `checkPlanLimit.middleware.js` enforces this and
always runs *before* the credit check, so a free user out of quota gets a
clear "come back tomorrow or upgrade" (429) instead of a confusing credit
error. `GET /api/users/me/quota` gives the frontend a snapshot to warn
before that happens. An admin sets a user's plan via
`PATCH /api/admin/users/:id/plan`.

`GET /api/admin/economics` reports estimated provider cost vs. credit value
over the last 30 days, by module and by video quality tier — useful for
checking the margin assumptions in `economics.config.js` against what
generations are actually costing.

## Password reset

Reset tokens are stored as SHA-256 hashes with a one-hour expiry and are
single-use; changing a password also voids any outstanding links.
`POST /auth/forgot-password` always returns 200 so email addresses can't be
enumerated. **There is no mail transport wired up yet** — the raw token is
logged server-side and, outside production only, returned as `devResetToken`
so the flow is testable. Swap that for a real email send before launch.

## Google Sign-In

The frontend gets an ID token from Google Identity Services
(`@react-oauth/google`'s `<GoogleLogin>`) and `POST /auth/google` verifies
it server-side with `google-auth-library`, checked against
`GOOGLE_CLIENT_ID` as the token's audience. First sign-in creates an
account with the same signup bonus as email/password registration and no
password set; signing in again with the same Google account never creates
a duplicate; a password account that later signs in with Google matching
its email gets the Google identity linked onto it instead. A
password-account user who never sets one can't run `POST
/users/me/password` — there's nothing to change it from.

Both `GOOGLE_CLIENT_ID` (backend) and `VITE_GOOGLE_CLIENT_ID` (frontend,
same value) need to be set for the button to work; leave both unset and the
button simply doesn't render — email/password auth is unaffected either
way.

## Project structure

```
src/
  config/        env-driven config (db client, credit costs, style presets)
  controllers/   request handlers
  middleware/    auth, admin, credit checks, rate limiting, error handling
  routes/        Express routers
  services/
    ai-gateway/  provider-agnostic image/video generation layer
  utils/         logger, asyncHandler, AppError
tests/           Jest + supertest suite
prisma/
  schema.prisma  data model
  seed.js        seeds CreditPackage rows
```
