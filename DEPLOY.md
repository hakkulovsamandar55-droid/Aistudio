# Deploy qo'llanmasi

MVP'ni internetga chiqarish uchun ikki qism alohida deploy qilinadi:
backend (API + PostgreSQL) va frontend (statik SPA).

## 1-qism — Backend (Railway yoki Render)

### Qaysi birini tanlash

| | Railway | Render |
|---|---|---|
| PostgreSQL | Bepul/arzon, bir bosishda qo'shiladi | Bepul tier bor, lekin 90 kunda o'chadi (free Postgres) |
| Sozlash tezligi | Juda tez, GitHub'dan avtomatik deploy | Xuddi shunday tez |
| Kichik byudjet uchun | Tavsiya etiladi — narxlash prognozini oldindan ko'rsatadi | Yaxshi, lekin free Postgres muddati cheklangan |

**MVP va kichik byudjet uchun Railway tavsiya etiladi** — PostgreSQL
bazasi doimiy (o'chib qolmaydi) va narxlash predictable.

### Qadamlar

1. **GitHub repo'ni ulash**: Railway/Render dashboard'da "New Project" →
   "Deploy from GitHub repo" → shu repo'ni tanlang, **root directory**ni
   `backend` qilib belgilang (chunki bu monorepo).

2. **PostgreSQL yaratish**: platformada "New" → "PostgreSQL" — u avtomatik
   `DATABASE_URL` environment o'zgaruvchisini beradi (Railway) yoki
   connection string'ni qo'lda `DATABASE_URL`ga qo'yishingiz kerak bo'ladi
   (Render).

3. **Environment o'zgaruvchilarni sozlash** — `backend/.env.example`dagi
   barcha qiymatlarni platformaning "Variables" bo'limiga kiriting:
   `DATABASE_URL`, `JWT_SECRET`, `JWT_REFRESH_SECRET`, `OPENAI_API_KEY`,
   `RUNWAY_API_KEY`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`,
   `FRONTEND_URL` (production frontend domeningiz), `PORT` (platforma
   odatda o'zi belgilaydi).

4. **Build/start buyruqlari**:
   - Build: `npm install && npx prisma generate`
   - Start: `npm start`

5. **Prisma migration'ni production bazada ishga tushirish** — deploy
   muvaffaqiyatli bo'lgach, platformaning shell/console orqali:
   ```bash
   npx prisma migrate deploy
   npx prisma db seed
   ```

6. **Stripe webhook URL'ini yangilash** — Stripe Dashboard → Developers →
   Webhooks → endpoint URL'ni `https://<backend-domeningiz>/api/webhooks/stripe`
   ga o'zgartiring, yangi signing secret'ni `STRIPE_WEBHOOK_SECRET`ga
   qo'ying.

7. **CORS** — `FRONTEND_URL` environment o'zgaruvchisini production
   frontend domeningizga (masalan `https://ai-studio.vercel.app`) o'rnating,
   `backend/src/app.js` shu qiymatni CORS uchun avtomatik ishlatadi.

## 2-qism — Frontend (Vercel yoki Netlify)

**Vercel tavsiya etiladi** — Vite loyihalar uchun eng qulay, zero-config
deploy.

### Qadamlar

1. Vercel dashboard'da "New Project" → shu GitHub repo'ni tanlang, **root
   directory**ni `frontend` qilib belgilang.

2. **Build sozlamalari** (Vercel avtomatik aniqlaydi, lekin tekshirib
   qo'ying):
   - Build command: `npm run build`
   - Output directory: `dist`

3. **Environment o'zgaruvchisi**: `VITE_API_URL` ni backend'ning
   production URL'iga o'rnating, masalan
   `https://ai-studio-backend.up.railway.app/api`.

4. **Custom domen** (ixtiyoriy): Vercel dashboard → Settings → Domains →
   domeningizni qo'shing va DNS yozuvlarini ko'rsatilgan qiymatlarga
   sozlang.

5. **Deploy'dan keyingi end-to-end test ro'yxati**:
   - [ ] Ro'yxatdan o'tish — 10 bepul kredit tushayaptimi
   - [ ] Kirish — token saqlanib, dashboard ochilyaptimi
   - [ ] Rasm generatsiya qilish — natija chiqyaptimi, kredit kamayaptimi
   - [ ] Video generatsiya qilish — polling ishlayaptimi
   - [ ] Kredit sotib olish — Stripe checkout'ga o'tyaptimi, webhook orqali
         kredit qo'shilyaptimi
   - [ ] Tarix sahifasi — barcha generatsiyalar ko'rinyaptimi

## Xavfsizlik eslatmasi

Hech qanday API kalitni (`OPENAI_API_KEY`, `RUNWAY_API_KEY`,
`STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `JWT_SECRET`,
`JWT_REFRESH_SECRET`) kodga yoki repo'ga commit qilmang — faqat platforma
dashboard'idagi environment o'zgaruvchilar orqali kiriting.
