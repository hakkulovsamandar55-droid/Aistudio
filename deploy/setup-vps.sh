#!/usr/bin/env bash
# AI Studio — bitta buyruqli VPS o'rnatuvchisi (Ubuntu/Debian, root sifatida ishga tushiring).
#
# Ishlatish:
#   export GITHUB_TOKEN=ghp_xxxxxxxxxxxx
#   curl -fsSL -H "Authorization: token $GITHUB_TOKEN" \
#     https://raw.githubusercontent.com/hakkulovsamandar55-droid/aistudio/claude/salom-g8fylr/deploy/setup-vps.sh \
#     | bash
#
# Skript quyidagilarni bajaradi: Node.js, PostgreSQL, nginx, pm2 o'rnatadi;
# kodni GitHub'dan tortib oladi; backend .env faylini (tasodifiy JWT
# sirlari bilan) yaratadi; migration va seed'ni ishga tushiradi; backendni
# pm2 orqali fon jarayoni sifatida ishga tushiradi; frontendni build qilib
# nginx orqali serverning IP manzilida (port 80) namoyish qiladi.

set -euo pipefail

if [ -z "${GITHUB_TOKEN:-}" ]; then
  echo "XATO: GITHUB_TOKEN environment o'zgaruvchisi topilmadi."
  echo "Avval quyidagini bajaring: export GITHUB_TOKEN=sizning_tokeningiz"
  exit 1
fi

REPO_URL="https://${GITHUB_TOKEN}@github.com/hakkulovsamandar55-droid/aistudio.git"
BRANCH="claude/salom-g8fylr"
APP_DIR="/opt/ai-studio"

echo "==> Server IP aniqlanmoqda..."
SERVER_IP=$(curl -fsS https://ifconfig.me || curl -fsS https://api.ipify.org)
echo "==> Server IP: ${SERVER_IP}"

echo "==> Paket ro'yxati yangilanmoqda..."
apt-get update -y

echo "==> Node.js 20 tekshirilmoqda/o'rnatilmoqda..."
if ! command -v node >/dev/null || [ "$(node -v | cut -d. -f1 | tr -d v)" -lt 20 ]; then
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt-get install -y nodejs
fi

echo "==> PostgreSQL, nginx, git va boshqa kerakli paketlar o'rnatilmoqda..."
apt-get install -y postgresql postgresql-contrib nginx git build-essential openssl

echo "==> pm2 (process manager) o'rnatilmoqda..."
npm install -g pm2

echo "==> PostgreSQL foydalanuvchi va bazasi tayyorlanmoqda..."
DB_PASSWORD=$(openssl rand -hex 16)
sudo -u postgres psql -tc "SELECT 1 FROM pg_roles WHERE rolname='aistudio'" | grep -q 1 \
  || sudo -u postgres psql -c "CREATE USER aistudio WITH PASSWORD '${DB_PASSWORD}';"
sudo -u postgres psql -c "ALTER USER aistudio WITH PASSWORD '${DB_PASSWORD}';"
sudo -u postgres psql -tc "SELECT 1 FROM pg_database WHERE datname='ai_studio'" | grep -q 1 \
  || sudo -u postgres psql -c "CREATE DATABASE ai_studio OWNER aistudio;"

echo "==> Kod GitHub'dan yuklab olinmoqda..."
if [ -d "${APP_DIR}/.git" ]; then
  cd "${APP_DIR}"
  git fetch origin "${BRANCH}"
  git checkout "${BRANCH}"
  git reset --hard "origin/${BRANCH}"
else
  git clone --branch "${BRANCH}" "${REPO_URL}" "${APP_DIR}"
fi

echo "==> Backend o'rnatilmoqda..."
cd "${APP_DIR}/backend"
npm install

JWT_SECRET=$(openssl rand -hex 32)
JWT_REFRESH_SECRET=$(openssl rand -hex 32)

cat > .env <<EOF
PORT=4000
NODE_ENV=production
FRONTEND_URL=http://${SERVER_IP}

DATABASE_URL="postgresql://aistudio:${DB_PASSWORD}@localhost:5432/ai_studio?schema=public"

JWT_SECRET=${JWT_SECRET}
JWT_REFRESH_SECRET=${JWT_REFRESH_SECRET}
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

IMAGE_PROVIDER=mock
VIDEO_PROVIDER=mock

OPENAI_API_KEY=
OPENAI_IMAGE_MODEL=gpt-image-1
OPENAI_ENHANCER_MODEL=gpt-4o-mini

RUNWAY_API_KEY=
RUNWAY_API_BASE_URL=https://api.dev.runwayml.com/v1

STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
EOF

npx prisma migrate deploy
npx prisma generate
npx prisma db seed

echo "==> Backend pm2 orqali ishga tushirilmoqda..."
pm2 delete ai-studio-backend >/dev/null 2>&1 || true
pm2 start src/server.js --name ai-studio-backend
pm2 save
STARTUP_CMD=$(pm2 startup systemd -u root --hp /root | tail -1)
eval "${STARTUP_CMD}" || true

echo "==> Frontend build qilinmoqda..."
cd "${APP_DIR}/frontend"
npm install
echo "VITE_API_URL=http://${SERVER_IP}/api" > .env.production
npm run build

echo "==> nginx sozlanmoqda..."
cat > /etc/nginx/sites-available/ai-studio <<EOF
server {
    listen 80;
    server_name ${SERVER_IP};

    root ${APP_DIR}/frontend/dist;
    index index.html;

    location / {
        try_files \$uri /index.html;
    }

    location /api/ {
        proxy_pass http://127.0.0.1:4000/api/;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
EOF

ln -sf /etc/nginx/sites-available/ai-studio /etc/nginx/sites-enabled/ai-studio
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl restart nginx
systemctl enable nginx

if command -v ufw >/dev/null 2>&1; then
  ufw allow 80/tcp || true
  ufw allow OpenSSH || true
fi

echo ""
echo "======================================================"
echo " TAYYOR!"
echo " Sayt:            http://${SERVER_IP}"
echo " Health check:    http://${SERVER_IP}/api/health"
echo " Backend loglari: pm2 logs ai-studio-backend"
echo "======================================================"
