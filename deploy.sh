#!/bin/bash

# ==============================================================================
# Ahnajak Topup - Interactive Deployment & Installer Script
# Supports: Ubuntu 22.04 LTS & Ubuntu 24.04 LTS
# ==============================================================================

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

if [ "$EUID" -ne 0 ]; then
  echo -e "${RED}* Error: Please run as root (sudo bash deploy.sh)${NC}"
  exit 1
fi

clear
echo -e "${BLUE}=====================================================================${NC}"
echo -e "              AHNAJAK TOPUP INTERACTIVE INSTALLER                    "
echo -e "${BLUE}=====================================================================${NC}"

show_menu() {
  echo -e "\nWhat would you like to do?"
  echo -e " [0] Install Ahnajak Topup (Full Setup)"
  echo -e " [1] Setup/Renew Let's Encrypt SSL"
  echo -e " [2] Uninstall Ahnajak Topup"
  echo -e " [3] Exit\n"
  read -p "* Input option (0-3): " OPTION
}

install_app() {
  echo -e "\n${BLUE}>>> [STEP 1/6] Gathering Configuration${NC}"

  read -p "Enter your domain (e.g. example.com): " DOMAIN_NAME
  DOMAIN_NAME=${DOMAIN_NAME:-example.com}
  APP_DIR="/var/www/${DOMAIN_NAME}"

  read -p "Enter API port [default: 3010]: " APP_PORT
  APP_PORT=${APP_PORT:-3010}

  read -p "Enter Database Name [default: ahnajak_topup]: " DB_NAME
  DB_NAME=${DB_NAME:-ahnajak_topup}

  read -p "Enter Database User [default: ahnajak]: " DB_USER
  DB_USER=${DB_USER:-ahnajak}

  SUGGESTED_DB_PASS=$(openssl rand -hex 12)
  read -p "Enter Database Password [default: $SUGGESTED_DB_PASS]: " DB_PASSWORD
  DB_PASSWORD=${DB_PASSWORD:-$SUGGESTED_DB_PASS}

  read -p "Enter Admin Email [default: admin@ahnajak.com]: " ADMIN_EMAIL
  ADMIN_EMAIL=${ADMIN_EMAIL:-admin@ahnajak.com}

  SUGGESTED_ADMIN_PASS="admin$(openssl rand -hex 4)"
  read -p "Enter Admin Password [default: $SUGGESTED_ADMIN_PASS]: " ADMIN_PASSWORD
  ADMIN_PASSWORD=${ADMIN_PASSWORD:-$SUGGESTED_ADMIN_PASS}

  read -p "Enter email for Let's Encrypt: " EMAIL_ADDR

  echo -e "\n${BLUE}>>> [STEP 2/6] Installing System Dependencies${NC}"

  TOTAL_MEM=$(free -m | awk '/^Mem:/{print $2}')
  if [ "$TOTAL_MEM" -lt 1024 ] && [ ! -f /swapfile ]; then
    echo -e "${YELLOW}* Creating 2GB swap...${NC}"
    fallocate -l 2G /swapfile
    chmod 600 /swapfile
    mkswap /swapfile
    swapon /swapfile
    echo '/swapfile none swap sw 0 0' >> /etc/fstab
  fi

  apt update && apt upgrade -y
  apt install -y curl git nginx mysql-server certbot python3-certbot-nginx

  if ! [ -x "$(command -v node)" ]; then
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt install -y nodejs
  fi

  systemctl start mysql
  systemctl enable mysql

  echo -e "\n${BLUE}>>> [STEP 3/6] Configuring Database${NC}"
  mysql <<SQL
DROP DATABASE IF EXISTS \`${DB_NAME}\`;
CREATE DATABASE \`${DB_NAME}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER IF NOT EXISTS '${DB_USER}'@'localhost' IDENTIFIED BY '${DB_PASSWORD}';
GRANT ALL PRIVILEGES ON \`${DB_NAME}\`.* TO '${DB_USER}'@'localhost';
FLUSH PRIVILEGES;
SQL

  echo -e "\n${BLUE}>>> [STEP 4/6] Deploying Application${NC}"
  mkdir -p "$APP_DIR"
  if [ "$(pwd)" != "$APP_DIR" ]; then
    cp -r . "$APP_DIR"
  fi
  cd "$APP_DIR"

  JWT_SECRET=$(openssl rand -hex 32)
  cat > .env <<EOT
DB_HOST=localhost
DB_PORT=3306
DB_USER=${DB_USER}
DB_PASSWORD=${DB_PASSWORD}
DB_NAME=${DB_NAME}
PORT=${APP_PORT}
JWT_SECRET=${JWT_SECRET}
JWT_EXPIRES_IN=24h
PUBLIC_BASE_URL=https://${DOMAIN_NAME}
FRONTEND_URL=https://${DOMAIN_NAME}
ALLOWED_ORIGINS=https://${DOMAIN_NAME}
EOT

  npm install
  node scripts/seed.cjs

  # Set admin credentials
  BCRYPT_HASH=$(node -e "const bcrypt = require('bcryptjs'); console.log(bcrypt.hashSync('${ADMIN_PASSWORD}', 10));")
  mysql "$DB_NAME" -e "UPDATE users SET email = '${ADMIN_EMAIL}', password_hash = '${BCRYPT_HASH}' WHERE email = 'admin@ahnajak.com';"

  npm run build
  mkdir -p "$APP_DIR/dist"
  cp -r dist/* "$APP_DIR/dist/"

  echo -e "\n${BLUE}>>> [STEP 5/6] Configuring Nginx${NC}"
  rm -f /etc/nginx/sites-enabled/default

  cat > /etc/nginx/sites-available/${DOMAIN_NAME} <<NGINX
server {
    listen 80;
    listen [::]:80;
    server_name ${DOMAIN_NAME} www.${DOMAIN_NAME};

    location / {
        return 301 https://\$host\$request_uri;
    }

    location ^~ /.well-known/acme-challenge/ {
        root ${APP_DIR}/dist;
        default_type "text/plain";
        allow all;
    }
}

server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name ${DOMAIN_NAME} www.${DOMAIN_NAME};

    ssl_certificate /etc/letsencrypt/live/${DOMAIN_NAME}/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/${DOMAIN_NAME}/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 1440m;

    root ${APP_DIR}/dist;
    index index.html;

    location /api/ {
        proxy_pass http://localhost:${APP_PORT};
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }

    location /uploads/ {
        proxy_pass http://localhost:${APP_PORT};
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }

    location / {
        try_files \$uri \$uri/ /index.html;
    }

    location ~* \.(css|js|png|jpg|jpeg|gif|svg|ico|woff2?|ttf)$ {
        expires 30d;
        access_log off;
    }
}
NGINX

  ln -sf /etc/nginx/sites-available/${DOMAIN_NAME} /etc/nginx/sites-enabled/

  echo -e "\n${BLUE}>>> [STEP 6/6] SSL & PM2${NC}"

  # Get SSL first so nginx can start with HTTPS
  if [ -n "$EMAIL_ADDR" ]; then
    certbot --nginx --non-interactive --agree-tos -m "$EMAIL_ADDR" -d "$DOMAIN_NAME" -d "www.$DOMAIN_NAME" || true
  fi

  nginx -t && systemctl restart nginx

  # PM2
  npm install -g pm2
  pm2 delete "${DOMAIN_NAME}-api" 2>/dev/null || true
  pm2 start server/index.cjs --name "${DOMAIN_NAME}-api"
  pm2 save
  pm2 startup || true

  # UFW
  ufw default deny incoming
  ufw default allow outgoing
  ufw allow ssh
  ufw allow http
  ufw allow https
  echo "y" | ufw enable

  clear
  echo -e "${GREEN}=====================================================================${NC}"
  echo -e "       AHNAJAK TOPUP DEPLOYED SUCCESSFULLY!                          "
  echo -e "${GREEN}=====================================================================${NC}"
  echo -e " Website:   https://${DOMAIN_NAME}"
  echo -e " Admin:     https://${DOMAIN_NAME}/auth"
  echo -e " Email:     ${ADMIN_EMAIL}"
  echo -e " Password:  ${YELLOW}${ADMIN_PASSWORD}${NC}"
  echo -e "${GREEN}=====================================================================${NC}"
}

setup_ssl_only() {
  read -p "Enter your domain (e.g. example.com): " DOM_NAME
  read -p "Enter email for Let's Encrypt: " E_ADDR
  if [ -z "$DOM_NAME" ] || [ -z "$E_ADDR" ]; then
    echo -e "${RED}Domain and email required.${NC}"
    return
  fi
  sed -i "s/server_name _;/server_name ${DOM_NAME} www.${DOM_NAME};/g" "/etc/nginx/sites-available/${DOM_NAME}" 2>/dev/null || true
  systemctl restart nginx 2>/dev/null || true
  apt install -y certbot python3-certbot-nginx
  certbot --nginx --non-interactive --agree-tos -m "$E_ADDR" -d "$DOM_NAME" -d "www.$DOM_NAME" || certbot --nginx --non-interactive --agree-tos -m "$E_ADDR" -d "$DOM_NAME"
  echo -e "${GREEN}[✓] SSL enabled.${NC}"
}

uninstall_app() {
  read -p "Enter domain to uninstall: " DOM_NAME
  read -p "Are you sure? (y/N): " CONFIRM
  if [[ "$CONFIRM" =~ ^[Yy]$ ]]; then
    pm2 delete "${DOM_NAME}-api" 2>/dev/null || true
    pm2 save
    rm -f "/etc/nginx/sites-enabled/${DOM_NAME}"
    rm -f "/etc/nginx/sites-available/${DOM_NAME}"
    systemctl restart nginx
    rm -rf "/var/www/${DOM_NAME}"
    echo -e "${GREEN}[✓] Uninstalled ${DOM_NAME}.${NC}"
  fi
}

show_menu
case "$OPTION" in
  0) install_app ;;
  1) setup_ssl_only ;;
  2) uninstall_app ;;
  *) echo "Exiting."; exit 0 ;;
esac
