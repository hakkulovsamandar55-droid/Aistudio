# Deploy

VPS bo'yicha skriptlar va operatsion qo'llanma.

| Fayl | Vazifasi |
|---|---|
| `setup-vps.sh` | Bo'sh Ubuntu/Debian serverni bitta buyruq bilan to'liq sozlaydi |
| `backup-db.sh` | PostgreSQL zaxirasi: `pg_dump` → gzip → S3, eskilarini tozalaydi |
| `restore-db.sh` | S3 dagi zaxiradan tiklaydi (nazorat summasini tekshirib) |

Deploy'ning o'zi qo'lda emas — `.github/workflows/deploy.yml` `claude/salom-g8fylr`
branch'iga har push'da kodni serverga yuboradi, migratsiyalarni bajaradi,
frontendni build qiladi va pm2 orqali API hamda worker'ni qayta ishga tushiradi.

---

## Ma'lumotlar bazasi zaxirasi

### Nima uchun

Server diski buziladi, `DROP TABLE` xato yoziladi, migratsiya noto'g'ri
ketadi. Bularning barchasida yagona javob — kechagi zaxira. Zaxirasiz
loyihada bitta xato butun foydalanuvchi bazasini yo'q qiladi.

Zaxira **serverning o'zida emas**, S3-mos bucket'da saqlanadi: diski
o'lgan serverdagi zaxira — zaxira emas.

### O'rnatish (bir marta, VPS'da root sifatida)

```bash
# 1. Kerakli vositalar
apt-get update && apt-get install -y postgresql-client unzip
curl -fsSL "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o /tmp/awscliv2.zip
unzip -q /tmp/awscliv2.zip -d /tmp && /tmp/aws/install --update

# 2. Skriptlarni bajariladigan qilish
chmod +x /var/www/aistudio/deploy/backup-db.sh /var/www/aistudio/deploy/restore-db.sh

# 3. Qo'lda bir marta sinab ko'rish (cron'ga qo'yishdan OLDIN)
/var/www/aistudio/deploy/backup-db.sh
```

Skript kalitlarni `backend/.env` dan oladi — ular allaqachon o'sha yerda
(`S3_BUCKET`, `S3_ACCESS_KEY`, `S3_SECRET_KEY`, `S3_ENDPOINT`), shuning
uchun alohida sozlash shart emas.

### Cron

Har kuni UTC 03:00 da:

```bash
crontab -e
```

```cron
0 3 * * * /var/www/aistudio/deploy/backup-db.sh >> /var/log/aistudio-backup.log 2>&1
```

Skript muvaffaqiyatsizlikda nol bo'lmagan kod bilan chiqadi, shuning uchun
cron xatoni pochtaga yuboradi. Log faylini ham vaqti-vaqti bilan ko'rib
turing — "jimgina ishlamayotgan zaxira" zaxira yo'qligidan ham xavfliroq,
chunki unga ishonib qolinadi.

### Sozlamalar

| O'zgaruvchi | Sukut bo'yicha | Izoh |
|---|---|---|
| `RETENTION_DAYS` | `14` | Bucket'da shu kundan eski nusxalar o'chiriladi |
| `S3_BACKUP_PREFIX` | `db-backups` | Bucket ichidagi papka |
| `BACKUP_DIR` | `/var/backups/aistudio` | Vaqtinchalik local papka |
| `APP_DIR` | `/var/www/aistudio` | Ilova papkasi (`.env` shu yerdan o'qiladi) |

Nusxalar `db-backups/YYYY/MM/aistudio-<sana>.dump.gz` ko'rinishida, har biri
yoniga `.sha256` nazorat summasi bilan yotadi.

### Tiklash

```bash
# Eng oxirgi zaxiradan
/var/www/aistudio/deploy/restore-db.sh

# Yoki aniq bir nusxadan
/var/www/aistudio/deploy/restore-db.sh db-backups/2026/08/aistudio-20260803T030000Z.dump.gz
```

Skript nazorat summasini tekshiradi va bazani almashtirishdan oldin
tasdiqlashni so'raydi. Tiklagandan keyin migratsiyalar holatini tekshiring:

```bash
cd /var/www/aistudio/backend && npx prisma migrate status
```

### Oyiga bir marta: tiklashni sinab ko'ring

**Tiklanmagan zaxira — zaxira emas.** Oyiga bir marta bo'sh test bazasiga
tiklab ko'ring — buzilgan zaxira haqiqiy avariya paytida bilinsa, juda kech
bo'ladi:

```bash
sudo -u postgres createdb aistudio_restore_test
DATABASE_URL="postgresql://aistudio:PAROL@localhost:5432/aistudio_restore_test" \
  /var/www/aistudio/deploy/restore-db.sh
# Tekshirdingizmi? Endi o'chiring:
sudo -u postgres dropdb aistudio_restore_test
```

---

## GitHub Actions varianti

VPS'da cron o'rniga scheduled workflow ham ishlatish mumkin. Buning uchun
runner'ga baza kerak bo'ladi — ya'ni PostgreSQL tashqaridan ochiq bo'lishi
yoki self-hosted runner ishlatilishi kerak. VPS'da cron soddaroq va
xavfsizroq, shuning uchun asosiy variant sifatida shu tavsiya etiladi.
