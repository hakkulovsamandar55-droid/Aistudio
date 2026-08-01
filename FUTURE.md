# Kelajakka tayyorgarlik

MVP veb-saytda ishlagandan keyin ko'riladigan keyingi qadamlar.

## APK qilish: PWA vs Capacitor

| | PWA | Capacitor (Ionic) |
|---|---|---|
| Mavjud React kodga o'zgartirish | Deyarli yo'q — manifest.json + service worker qo'shiladi | Deyarli yo'q — mavjud kod native shell ichiga o'raladi |
| Chiqish natijasi | "Add to Home Screen" tajribasi, haqiqiy .apk emas | Haqiqiy .apk/.ipa fayl, do'konlarga chiqariladi |
| Native funksiyalar (push, kamera) | Cheklangan | To'liq kirish imkoniyati |
| Sozlash murakkabligi | Eng oson | O'rtacha (Android Studio/Xcode kerak) |

**Tavsiya**: Avval **PWA** bilan boshlang — bu deyarli bepul qo'shimcha
(manifest + service worker) va foydalanuvchilarga mobil tajribani tezda
beradi. Agar keyinchalik Google Play/App Store'ga chiqish yoki push
notification/kamera kabi native funksiyalar kerak bo'lsa, **Capacitor**ga
o'ting — u ham mavjud React kodni deyarli o'zgartirmaydi.

### PWA uchun boshlang'ich qadamlar

1. `frontend/public/manifest.json` yaratish (nom, ikonkalar, theme rang)
2. Service worker qo'shish (`vite-plugin-pwa` paketi buni avtomatlashtiradi)
3. `index.html`ga manifest link va meta teglarni qo'shish
4. HTTPS orqali deploy qilingan bo'lishi shart (Vercel avtomatik beradi)

### Capacitor uchun boshlang'ich qadamlar

1. `npm install @capacitor/core @capacitor/cli`
2. `npx cap init` — app nomi va bundle ID kiritiladi
3. `npm run build` (Vite build) → `npx cap add android` / `npx cap add ios`
4. `npx cap sync` — web build'ni native loyihaga ko'chiradi
5. Android Studio / Xcode orqali build va imzolash

## Rejalashtirilgan yangi modullar

Arxitektura (AI Gateway, credit middleware, papka strukturasi) shu
modullarni qo'shishga tayyor holda qurilgan:

- **Ovoz generatsiya** (ElevenLabs) — yangi `IAudioProvider` + `AudioGateway`
- **Musiqa generatsiya** (Suno) — xuddi shunday pattern
- **Avtomatik intent aniqlash** (Magic Mode) — foydalanuvchi "Rasm"/"Video"
  tanlamasdan, tizim o'zi aniqlaydi
- **Video uslub almashtirish** (Remix)
- **AI Agent** — butun marketing kampaniya yaratish
- **Marketplace, Business plan, Developer API**

Har biri uchun: `CREDIT_COSTS`ga yangi tur qo'shiladi, `ai-gateway/`ga
yangi provider interfeysi va provider klassi qo'shiladi, `Generation`
modelidagi `type` enumiga yangi qiymat qo'shiladi — asosiy oqim
(`generation.service.js`, `checkCredits` middleware) o'zgarishsiz qoladi.
