#!/usr/bin/env bash
# AI Studio — zaxiradan tiklash.
#
#   ./restore-db.sh                      # S3 dagi eng oxirgi nusxadan
#   ./restore-db.sh db-backups/2026/08/aistudio-20260803T030000Z.dump.gz
#
# Tiklanmagan zaxira — zaxira emas. Bu skript aynan shuning uchun bor:
# tiklash yo'lini oyiga bir marta sinab ko'ring (deploy/README.md ga qarang).

set -euo pipefail

APP_DIR="${APP_DIR:-/var/www/aistudio}"
ENV_FILE="${ENV_FILE:-${APP_DIR}/backend/.env}"
WORK_DIR="${WORK_DIR:-/tmp/aistudio-restore}"

log() { echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] $*"; }
fail() { log "XATO: $*" >&2; exit 1; }

[ -f "$ENV_FILE" ] || fail "env fayl topilmadi: $ENV_FILE"
set -a
# shellcheck disable=SC1090
source "$ENV_FILE"
set +a

[ -n "${DATABASE_URL:-}" ] || fail "DATABASE_URL .env da yo'q"
[ -n "${S3_BUCKET:-}" ] || fail "S3_BUCKET .env da yo'q"

# backup-db.sh dagi kabi: Prisma qo'shadigan `schema`/`connection_limit` kabi
# parametrlarni libpq tushunmaydi va butun URI'ni rad etadi.
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

export AWS_ACCESS_KEY_ID="${S3_ACCESS_KEY:-}"
export AWS_SECRET_ACCESS_KEY="${S3_SECRET_KEY:-}"
export AWS_DEFAULT_REGION="${S3_REGION:-auto}"

AWS_ARGS=()
[ -n "${S3_ENDPOINT:-}" ] && AWS_ARGS+=(--endpoint-url "$S3_ENDPOINT")

S3_KEY="${1:-}"
if [ -z "$S3_KEY" ]; then
  log "Eng oxirgi zaxira qidirilmoqda..."
  S3_KEY=$(aws "${AWS_ARGS[@]}" s3api list-objects-v2 \
    --bucket "$S3_BUCKET" --prefix "${S3_BACKUP_PREFIX:-db-backups}/" \
    --query 'sort_by(Contents, &LastModified)[-1].Key' --output text)
  [ -n "$S3_KEY" ] && [ "$S3_KEY" != "None" ] || fail "bucket'da zaxira topilmadi"
  # .sha256 fayli emas, dump'ning o'zi kerak.
  case "$S3_KEY" in *.sha256) fail "kutilmagan kalit: $S3_KEY" ;; esac
fi

mkdir -p "$WORK_DIR"
LOCAL_FILE="${WORK_DIR}/$(basename "$S3_KEY")"

log "Yuklab olinmoqda: s3://${S3_BUCKET}/${S3_KEY}"
aws "${AWS_ARGS[@]}" s3 cp "s3://${S3_BUCKET}/${S3_KEY}" "$LOCAL_FILE" || fail "yuklab bo'lmadi"

# Nazorat summasi bo'lsa — tekshiramiz. Buzilgan faylni tiklash, ayniqsa
# haqiqiy avariya paytida, eng yomon vaqtda bilinadi.
if aws "${AWS_ARGS[@]}" s3 cp "s3://${S3_BUCKET}/${S3_KEY}.sha256" "${LOCAL_FILE}.sha256" 2>/dev/null; then
  EXPECTED=$(cat "${LOCAL_FILE}.sha256")
  ACTUAL=$(sha256sum "$LOCAL_FILE" | awk '{print $1}')
  [ "$EXPECTED" = "$ACTUAL" ] || fail "nazorat summasi mos kelmadi — fayl buzilgan"
  log "Nazorat summasi to'g'ri."
fi

echo
echo "DIQQAT: bu amal ${DATABASE_URL%%\?*} bazasidagi mavjud ma'lumotlarni"
echo "almashtiradi. Davom etish uchun 'HA' deb yozing:"
read -r CONFIRM
[ "$CONFIRM" = "HA" ] || { log "Bekor qilindi."; exit 1; }

log "Tiklanmoqda..."
# --clean --if-exists: eski obyektlarni tushiradi, bo'sh bazaga ham ishlaydi.
gunzip -c "$LOCAL_FILE" \
  | pg_restore --dbname="$PG_URL" --clean --if-exists --no-owner --no-acl \
  || fail "pg_restore muvaffaqiyatsiz tugadi"

log "Tiklandi. Endi migratsiyalar holatini tekshiring:"
log "  cd ${APP_DIR}/backend && npx prisma migrate status"
