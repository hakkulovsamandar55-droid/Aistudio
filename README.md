# AI Studio

**"Say your idea. AI does the rest."**

Foydalanuvchi oddiy so'zlashuv tilida g'oyasini yozadi (masalan "mushuk
pitsa pishiryapti"), tizim buni professional AI promptga aylantiradi va
tanlangan turdagi kontentni (rasm yoki video) generatsiya qiladi.

## Monorepo strukturasi

Loyiha ikkita mustaqil, alohida deploy qilinadigan qismdan iborat:

```
backend/    Node.js + Express + PostgreSQL/Prisma API
frontend/   React + Vite single-page app
```

Ular alohida `package.json`, `node_modules` va `.env` fayllariga ega —
har biri mustaqil ravishda ishga tushiriladi va deploy qilinadi
(masalan backend Railway'da, frontend Vercel'da).

## Tezkor boshlash

```bash
npm run install:all   # backend va frontend dependencies

# backend/.env va frontend/.env.local fayllarini
# .env.example asosida to'ldiring

npm run dev            # ikkalasini bir vaqtda ishga tushiradi (concurrently)
```

Yoki alohida-alohida:

```bash
cd backend && npm run dev     # http://localhost:4000
cd frontend && npm run dev    # http://localhost:5173
```

Batafsil sozlash (migration, seed, Stripe webhook va h.k.) uchun
[`backend/README.md`](backend/README.md) va
[`frontend/README.md`](frontend/README.md) ga qarang.

## Imkoniyatlar

**Foydalanuvchi uchun**
- Rasm va video generatsiya — 9 ta rasm va 6 ta video **uslub preseti** bilan
  (fotorealistik, anime, kiberpank, kino, dron va h.k.)
- Prompt Enhancer — oddiy jumlani professional promptga aylantiradi
- **Galereya** — ishlarni ommaga ulashish va boshqalarnikini ko'rish
- Tarix: qidiruv, filtrlar, sevimlilar, yuklab olish, o'chirish
- **Kunlik bonus** (3 kredit) va **referal tizimi** (do'st uchun 20 kredit)
- Sozlamalar: profil, parolni o'zgartirish, shaxsiy statistika
- Parolni unutganda tiklash

**Admin uchun** (`/admin`)
- Statistika: 7 kunlik trend grafiklari, muvaffaqiyat foizi, muomaladagi kredit
- Foydalanuvchilar: qidiruv, kredit qo'shish/ayirish, bloklash, admin qilish
- Barcha generatsiyalarni ko'rish va filtrlash
- Kredit paketlarini boshqarish
- E'lonlar — barcha foydalanuvchilarga banner ko'rsatish

## Arxitektura

- **AI Gateway** (`backend/src/services/ai-gateway/`) — har bir AI
  provider (OpenAI, Runway) `IImageProvider`/`IVideoProvider` interfeysi
  orqali ulanadi. Provider almashtirish faqat `ai-gateway/index.js`da
  bitta qatorni o'zgartirish bilan amalga oshadi.
- **Credit system** — barcha generatsiya endpointlaridan oldin
  `checkCredits` middleware ishlaydi; kredit faqat generatsiya
  muvaffaqiyatli yakunlangandan keyin yechiladi.
- **Stripe** — kredit faqat Stripe webhook orqali (imzosi tekshirilgan
  holda) qo'shiladi, frontend'dan emas.
- **Admin huquqi** har bir so'rovda bazadan qayta tekshiriladi, JWT'dagi
  ma'lumotga ishonilmaydi.

## Testlar

Backend'da 96 ta avtomatik test bor (Jest + supertest, haqiqiy PostgreSQL
va mock AI providerlar bilan):

```bash
cd backend
cp .env.test.example .env.test
npm test
```

## Texnologiyalar

Node.js · Express · PostgreSQL · Prisma · React · Vite · Tailwind CSS ·
Stripe · OpenAI API · Runway ML API

## Qo'shimcha hujjatlar

- [`DEPLOY.md`](DEPLOY.md) — production'ga chiqarish qadamlari (Railway/Render + Vercel)
- [`FUTURE.md`](FUTURE.md) — MVP'dan keyingi qadamlar (APK/PWA, yangi modullar)
