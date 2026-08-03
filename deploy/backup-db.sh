#!/usr/bin/env bash
# AI Studio — PostgreSQL zaxira nusxasi (pg_dump -> gzip -> S3).
#
# Kunlik cron sifatida ishlatiladi. O'rnatish uchun: deploy/README.md
#
# Ishlash tartibi:
#   1. pg_dump --format=custom (parallel restore va tanlab tiklash imkonini beradi)
#   2. gzip bilan siqadi va SHA-256 nazorat summasini hisoblaydi
#   3. S3-mos bucket'ga yuklaydi (backend/.env dagi kalitlar bilan)
#   4. Bucket'dagi eski nusxalarni RETENTION_DAYS bo'yicha o'chiradi
#   5. Local vaqtinchalik faylni o'chiradi
#
# Muhim: skript zaxira MUVAFFAQIYATLI yuklanganini tekshiradi. Yuklanmasa,
# nol bo'lmagan kod bilan chiqadi — cron xatolikni pochtaga yuboradi yoki
# monitoring ko'radi. "Jimgina ishlamayotgan zaxira" — zaxira yo'qligidan
# ham yomon, chunki unga ishonib qolinadi.

set -euo pipefail

APP_DIR="${APP_DIR:-/var/www/aistudio}"
ENV_FILE="${ENV_FILE:-${APP_DIR}/backend/.env}"
BACKUP_DIR="${BACKUP_DIR:-/var/backups/aistudio}"
RETENTION_DAYS="${RETENTION_DAYS:-14}"
S3_PREFIX="${S3_BACKUP_PREFIX:-db-backups}"

log() { echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] $*"; }
fail() { log "XATO: $*" >&2; exit 1; }

# --- .env dan sozlamalarni o'qish -------------------------------------------
# `set -a` bilan export qilinadi, lekin subshell'da — asosiy muhitga ta'sir
# qilmaydi va qiymatlar log'ga tushmaydi.
[ -f "$ENV_FILE" ] || fail "env fayl topilmadi: $ENV_FILE"
set -a
# shellcheck disable=SC1090
source "$ENV_FILE"
set +a

[ -n "${DATABASE_URL:-}" ] || fail "DATABASE_URL .env da yo'q"

# Prisma DATABASE_URL'ga libpq tushunmaydigan parametrlarni qo'shadi
# (schema, connection_limit, pgbouncer...). pg_dump bunday URI'ni butunlay
# rad etadi ("invalid URI query parameter"), shuning uchun faqat libpq
# tanaydigan parametrlar qoldiriladi. `schema` olib tashlanadi va --schema
# ham berilmaydi: zaxira uchun butun bazani olish eng xavfsiz variant.
sanitize_pg_url() {
  local url="$1"
  local base="${url%%\?*}"
  local query=""
  [ "$url" != "$base" ] && query="${url#*\?}"

  local kept=""
  local pair
  local IFS='&'
  for pair in $query; do
    case "${pair%%=*}" in
      sslmode|sslcert|sslkey|sslrootcert|connect_timeout|application_name|options)
        kept="${kept:+${kept}&}${pair}" ;;
    esac
  done

  printf '%s%s' "$base" "${kept:+?${kept}}"
}

PG_URL="$(sanitize_pg_url "$DATABASE_URL")"

command -v pg_dump >/dev/null || fail "pg_dump topilmadi (apt-get install postgresql-client)"
command -v aws >/dev/null || fail "aws CLI topilmadi (deploy/README.md ga qarang)"

TIMESTAMP="$(date -u +%Y%m%dT%H%M%SZ)"
DUMP_FILE="${BACKUP_DIR}/aistudio-${TIMESTAMP}.dump.gz"
mkdir -p "$BACKUP_DIR"

cleanup() { rm -f "$DUMP_FILE" "${DUMP_FILE}.sha256"; }
trap cleanup EXIT

# --- 1-2: dump va siqish ----------------------------------------------------
log "pg_dump boshlandi..."
# --format=custom: pg_restore bilan parallel va tanlab tiklash mumkin.
# --no-owner/--no-acl: boshqa serverga tiklashda rol nomlari to'sqinlik qilmasin.
pg_dump --dbname="$PG_URL" --format=custom --no-owner --no-acl --compress=0 \
  | gzip -9 > "$DUMP_FILE" \
  || fail "pg_dump muvaffaqiyatsiz tugadi"

DUMP_BYTES=$(stat -c%s "$DUMP_FILE" 2>/dev/null || stat -f%z "$DUMP_FILE")
# Bo'sh yoki juda kichik fayl — bu buzilgan zaxira. Uni yuklab qo'yish
# "zaxiramiz bor" degan yolg'on xotirjamlik beradi.
[ "$DUMP_BYTES" -gt 1024 ] || fail "zaxira juda kichik (${DUMP_BYTES} bayt), buzilgan bo'lishi mumkin"

sha256sum "$DUMP_FILE" | awk '{print $1}' > "${DUMP_FILE}.sha256"
log "Zaxira tayyor: $(basename "$DUMP_FILE") (${DUMP_BYTES} bayt)"

# --- 3: S3 ga yuklash -------------------------------------------------------
[ -n "${S3_BUCKET:-}" ] || fail "S3_BUCKET .env da yo'q"

export AWS_ACCESS_KEY_ID="${S3_ACCESS_KEY:-}"
export AWS_SECRET_ACCESS_KEY="${S3_SECRET_KEY:-}"
export AWS_DEFAULT_REGION="${S3_REGION:-auto}"

AWS_ARGS=()
[ -n "${S3_ENDPOINT:-}" ] && AWS_ARGS+=(--endpoint-url "$S3_ENDPOINT")

S3_KEY="${S3_PREFIX}/$(date -u +%Y/%m)/$(basename "$DUMP_FILE")"

log "S3 ga yuklanmoqda: s3://${S3_BUCKET}/${S3_KEY}"
aws "${AWS_ARGS[@]}" s3 cp "$DUMP_FILE" "s3://${S3_BUCKET}/${S3_KEY}" \
  || fail "S3 ga yuklab bo'lmadi"
aws "${AWS_ARGS[@]}" s3 cp "${DUMP_FILE}.sha256" "s3://${S3_BUCKET}/${S3_KEY}.sha256" \
  || fail "nazorat summasini yuklab bo'lmadi"

# Yuklangani haqiqatan tasdiqlansin — cp muvaffaqiyatli qaytishi kamlik qiladi.
REMOTE_BYTES=$(aws "${AWS_ARGS[@]}" s3api head-object \
  --bucket "$S3_BUCKET" --key "$S3_KEY" --query 'ContentLength' --output text 2>/dev/null || echo 0)
[ "$REMOTE_BYTES" = "$DUMP_BYTES" ] \
  || fail "S3 dagi hajm mos kelmadi (local ${DUMP_BYTES}, remote ${REMOTE_BYTES})"

log "Yuklandi va tasdiqlandi (${REMOTE_BYTES} bayt)"

# --- 4: eski nusxalarni o'chirish -------------------------------------------
CUTOFF=$(date -u -d "${RETENTION_DAYS} days ago" +%Y-%m-%d 2>/dev/null \
  || date -u -v-"${RETENTION_DAYS}"d +%Y-%m-%d)

log "${CUTOFF} dan eski nusxalar o'chirilmoqda..."
aws "${AWS_ARGS[@]}" s3api list-objects-v2 \
  --bucket "$S3_BUCKET" --prefix "${S3_PREFIX}/" \
  --query "Contents[?LastModified<='${CUTOFF}'].Key" --output text 2>/dev/null \
  | tr '\t' '\n' | grep -v '^None$' | grep -v '^$' \
  | while read -r old_key; do
      log "  o'chirilmoqda: ${old_key}"
      aws "${AWS_ARGS[@]}" s3 rm "s3://${S3_BUCKET}/${old_key}" >/dev/null
    done || true

log "Zaxira muvaffaqiyatli yakunlandi."
