# AI Studio — Backend

Node.js + Express API for AI Studio. Handles auth, credits, the AI gateway
(image/video generation), and Stripe billing.

## Stack

- Node.js + Express
- PostgreSQL + Prisma
- JWT auth (access + refresh)
- Stripe (checkout + webhooks)
- OpenAI (image generation, prompt enhancement) · Runway ML (video generation)

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
   returns data:

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

Set in `.env`:

```
IMAGE_PROVIDER=openai
OPENAI_API_KEY=sk-...
VIDEO_PROVIDER=runway
RUNWAY_API_KEY=...
```

No other code changes are needed — `src/services/ai-gateway/index.js` picks
the provider class based on these env vars.

## Stripe webhook (local testing)

Use the Stripe CLI to forward events to your local server:

```bash
stripe listen --forward-to localhost:4000/api/webhooks/stripe
```

Copy the printed webhook signing secret into `STRIPE_WEBHOOK_SECRET`.

## Project structure

```
src/
  config/        env-driven config (db client, credit costs/packages)
  controllers/   request handlers
  middleware/    auth, credit checks, rate limiting, error handling
  routes/        Express routers
  services/
    ai-gateway/  provider-agnostic image/video generation layer
  utils/         logger, asyncHandler, AppError
prisma/
  schema.prisma  data model
  seed.js        seeds CreditPackage rows
```
