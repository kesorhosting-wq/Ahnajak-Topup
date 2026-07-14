#!/bin/bash

# ==============================================================================
# Ahnajak Topup - Interactive Deployment & Installer Script
# Supports: Ubuntu 22.04 LTS & Ubuntu 24.04 LTS
# ==============================================================================

set -e

# Formatting & colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if running as root
if [ "$EUID" -ne 0 ]; then
  echo -e "${RED}* Error: Please run this script as root (use: sudo bash deploy.sh)${NC}"
  exit 1
fi

# Title screen
clear
echo -e "${BLUE}=====================================================================${NC}"
echo -e "              AHNAJAK TOPUP INTERACTIVE INSTALLER                    "
echo -e "${BLUE}=====================================================================${NC}"
echo -e " This script installs Node.js, MySQL, PM2, Nginx, and secures the app."
echo -e "---------------------------------------------------------------------"

# Option menu selector
show_menu() {
  echo -e "\nWhat would you like to do?"
  echo -e " [0] Install Ahnajak Topup (Full Setup with MySQL, Nginx, PM2)"
  echo -e " [1] Setup/Renew Let's Encrypt SSL (HTTPS)"
  echo -e " [2] Uninstall/Remove Ahnajak Topup"
  echo -e " [3] Exit Installer\n"
  echo -n "* Input option (0-3): "
  read -r OPTION
}

install_app() {
  echo -e "\n${BLUE}>>> [STEP 1/6] Gathering Configuration Settings${NC}"
  
  # App Folder Name
  read -p "Enter Application Folder Name under /var/www/ [default: ahnajak-topup]: " APP_FOLDER
  APP_FOLDER=${APP_FOLDER:-ahnajak-topup}
  APP_DIR="/var/www/${APP_FOLDER}"

  # App Port
  read -p "Enter Application Port [default: 9911]: " APP_PORT
  APP_PORT=${APP_PORT:-9911}

  # DB Name
  read -p "Enter Database Name [default: ahnajak_topup]: " DB_NAME
  DB_NAME=${DB_NAME:-ahnajak_topup}

  # DB User
  read -p "Enter Database User [default: ahnajak_user]: " DB_USER
  DB_USER=${DB_USER:-ahnajak_user}

  # DB Password
  SUGGESTED_DB_PASS=$(openssl rand -hex 12)
  read -p "Enter Database Password [default: $SUGGESTED_DB_PASS]: " DB_PASSWORD
  DB_PASSWORD=${DB_PASSWORD:-$SUGGESTED_DB_PASS}

  # Admin Email
  read -p "Enter Admin Login Email [default: admin@ahnajak.com]: " ADMIN_EMAIL
  ADMIN_EMAIL=${ADMIN_EMAIL:-admin@ahnajak.com}

  # Admin Password
  SUGGESTED_ADMIN_PASS="admin$(openssl rand -hex 4)"
  read -p "Enter Admin Login Password [default: $SUGGESTED_ADMIN_PASS]: " ADMIN_PASSWORD
  ADMIN_PASSWORD=${ADMIN_PASSWORD:-$SUGGESTED_ADMIN_PASS}

  # Configure SSL prompt
  read -p "Do you want to configure Let's Encrypt SSL (HTTPS) right now? (y/N): " SETUP_SSL
  DOMAIN_NAME=""
  EMAIL_ADDR=""
  if [[ "$SETUP_SSL" =~ ^[Yy]$ ]]; then
    read -p "Enter your Domain Name (e.g. ahnajak.com): " DOMAIN_NAME
    read -p "Enter your Email Address for Let's Encrypt notifications: " EMAIL_ADDR
  fi

  echo -e "\n${BLUE}>>> [STEP 2/6] Updating System & Installing Core Dependencies${NC}"
  # Check if swap space is needed
  TOTAL_MEM=$(free -m | awk '/^Mem:/{print $2}')
  if [ "$TOTAL_MEM" -lt 1024 ] && [ ! -f /swapfile ]; then
    echo -e "${YELLOW}* Creating 2GB swap space to prevent memory issues during build...${NC}"
    fallocate -l 2G /swapfile
    chmod 600 /swapfile
    mkswap /swapfile
    swapon /swapfile
    echo '/swapfile none swap sw 0 0' >> /etc/fstab
  fi

  apt update && apt upgrade -y
  apt install -y curl git ufw nginx software-properties-common ca-certificates unzip build-essential

  # Node.js
  if ! [ -x "$(command -v node)" ]; then
    echo -e "${BLUE}[*] Installing Node.js v20 LTS...${NC}"
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt install -y nodejs
  fi

  # MySQL Server
  if ! [ -x "$(command -v mysql)" ]; then
    echo -e "${BLUE}[*] Installing MySQL Server...${NC}"
    apt install -y mysql-server
    systemctl start mysql
    systemctl enable mysql
  fi

  # Ensure MySQL service is running
  systemctl start mysql || service mysql start
  systemctl enable mysql || true

  echo -e "\n${BLUE}>>> [STEP 3/6] Configuring Database & Users${NC}"
  # Setup MySQL schema cleanly (drops old database if exists to prevent foreign key errors with leftover tables)
  mysql -e "DROP DATABASE IF EXISTS \`${DB_NAME}\`; CREATE DATABASE \`${DB_NAME}\`;"
  mysql -e "CREATE USER IF NOT EXISTS '${DB_USER}'@'localhost' IDENTIFIED BY '${DB_PASSWORD}';"
  mysql -e "GRANT ALL PRIVILEGES ON \`${DB_NAME}\`.* TO '${DB_USER}'@'localhost';"
  mysql -e "FLUSH PRIVILEGES;"

  echo -e "\n${BLUE}>>> [STEP 4/6] Deploying Application Code${NC}"
  mkdir -p "$APP_DIR"
  if [ "$(pwd)" != "$APP_DIR" ]; then
    cp -r . "$APP_DIR"
  fi
  cd "$APP_DIR"

  # Create .env config
  JWT_SECRET=$(openssl rand -hex 32)
  cat <<EOT > "$APP_DIR/.env"
DB_HOST=localhost
DB_PORT=3306
DB_USER=${DB_USER}
DB_PASSWORD=${DB_PASSWORD}
DB_NAME=${DB_NAME}
PORT=${APP_PORT}
JWT_SECRET=${JWT_SECRET}
EOT

  # Install deps and seed DB
  npm install
  mysql "$DB_NAME" < database/schema.sql
  mysql "$DB_NAME" < database/seed.sql

  # Set secure generated admin password hash
  BCRYPT_HASH=$(node -e "const bcrypt = require('bcryptjs'); console.log(bcrypt.hashSync('${ADMIN_PASSWORD}', 10));")
  mysql "$DB_NAME" -e "UPDATE users SET email = '${ADMIN_EMAIL}', password_hash = '${BCRYPT_HASH}' WHERE email = 'admin@ahnajak.com';"

  # Build frontend static files
  npm run build

  # Create uploads directories and grant proper permissions for Nginx/Express
  mkdir -p "$APP_DIR/uploads/site-assets"
  chown -R www-data:www-data "$APP_DIR/uploads"
  chmod -R 755 "$APP_DIR/uploads"

  echo -e "\n${BLUE}>>> [STEP 5/6] Configuring Nginx Web Server Proxy${NC}"
  rm -f /etc/nginx/sites-enabled/default
  rm -f /etc/nginx/sites-available/default

  NGINX_DOMAIN="_"
  if [ -n "$DOMAIN_NAME" ]; then
    NGINX_DOMAIN="${DOMAIN_NAME} www.${DOMAIN_NAME}"
  fi

  cat <<EOT > /etc/nginx/sites-available/${APP_FOLDER}
server {
    listen 80;
    server_name ${NGINX_DOMAIN};

    root $APP_DIR/dist;
    index index.html;

    location / {
        try_files \$uri \$uri/ /index.html;
    }

    location /api/ {
        proxy_pass http://localhost:${APP_PORT};
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
    }

    location /uploads/ {
        alias $APP_DIR/uploads/;
        expires 7d;
        add_header Cache-Control "public, max-age=604800";
    }
}
EOT

  ln -sf /etc/nginx/sites-available/${APP_FOLDER} /etc/nginx/sites-enabled/
  systemctl restart nginx

  # PM2 Configuration
  npm install -g pm2
  pm2 delete "${APP_FOLDER}-api" 2>/dev/null || true
  pm2 start server/index.cjs --name "${APP_FOLDER}-api"
  pm2 save
  pm2 startup || true

  # 6. Configure SSL
  SITE_URL="http://$(curl -s https://api.ipify.org)"
  if [ -n "$DOMAIN_NAME" ] && [ -n "$EMAIL_ADDR" ]; then
    echo -e "\n${BLUE}>>> [STEP 6/6] Initializing SSL Configuration via Certbot${NC}"
    apt install -y certbot python3-certbot-nginx
    certbot --nginx --non-interactive --agree-tos -m "$EMAIL_ADDR" -d "$DOMAIN_NAME" -d "www.$DOMAIN_NAME" || certbot --nginx --non-interactive --agree-tos -m "$EMAIL_ADDR" -d "$DOMAIN_NAME"
    SITE_URL="https://${DOMAIN_NAME}"
  fi

  # Enable Firewall
  echo -e "\n${BLUE}[*] Securing Ports with UFW Firewall...${NC}"
  ufw default deny incoming
  ufw default allow outgoing
  ufw allow ssh
  ufw allow http
  ufw allow https
  echo "y" | ufw enable

  # Clear terminal and show finished details
  clear
  echo -e "${GREEN}=====================================================================${NC}"
  echo -e "       AHNAJAK TOPUP SYSTEM DEPLOYED SUCCESSFULLY!                   "
  echo -e "${GREEN}=====================================================================${NC}"
  echo -e " Website Link: ${SITE_URL}"
  echo -e " Admin Login:  ${SITE_URL}/auth"
  echo -e " Admin User:   ${ADMIN_EMAIL}"
  echo -e " Admin Pass:   ${YELLOW}${ADMIN_PASSWORD}${NC}"
  echo -e "---------------------------------------------------------------------"
  echo -e " Database Configurations:"
  echo -e "  Database:    ${DB_NAME}"
  echo -e "  DB User:     ${DB_USER}"
  echo -e "  DB Password: ${DB_PASSWORD}"
  echo -e "${GREEN}=====================================================================${NC}\n"
}

setup_ssl_only() {
  echo -e "\n${BLUE}>>> Setting up SSL (HTTPS Only)${NC}"
  read -p "Enter Application Folder Name [default: ahnajak-topup]: " APP_FOLDER
  APP_FOLDER=${APP_FOLDER:-ahnajak-topup}
  read -p "Enter Domain Name (e.g., yoursite.com): " DOM_NAME
  read -p "Enter Email Address: " E_ADDR
  if [ -z "$DOM_NAME" ] || [ -z "$E_ADDR" ]; then
    echo -e "${RED}Error: Domain name and email are required.${NC}"
    return
  fi
  # Replace server_name in nginx configuration
  sed -i "s/server_name _;/server_name ${DOM_NAME} www.${DOM_NAME};/g" "/etc/nginx/sites-available/${APP_FOLDER}" 2>/dev/null || true
  systemctl restart nginx
  apt install -y certbot python3-certbot-nginx
  certbot --nginx --non-interactive --agree-tos -m "$E_ADDR" -d "$DOM_NAME" -d "www.$DOM_NAME" || certbot --nginx --non-interactive --agree-tos -m "$E_ADDR" -d "$DOM_NAME"
  echo -e "${GREEN}[✓] SSL enabled successfully.${NC}"
}

uninstall_app() {
  read -p "Enter Application Folder Name to uninstall [default: ahnajak-topup]: " APP_FOLDER
  APP_FOLDER=${APP_FOLDER:-ahnajak-topup}

  read -p "Are you sure you want to delete the entire application, database, and configurations for ${APP_FOLDER}? (y/N): " CONFIRM
  if [[ "$CONFIRM" =~ ^[Yy]$ ]]; then
    echo -e "${RED}[*] Stopping and removing PM2 instances...${NC}"
    pm2 delete "${APP_FOLDER}-api" 2>/dev/null || true
    pm2 save
    
    echo -e "${RED}[*] Removing Nginx configurations...${NC}"
    rm -f "/etc/nginx/sites-enabled/${APP_FOLDER}"
    rm -f "/etc/nginx/sites-available/${APP_FOLDER}"
    systemctl restart nginx
    
    echo -e "${RED}[*] Removing application folder...${NC}"
    rm -rf "/var/www/${APP_FOLDER}"
    
    echo -e "${GREEN}[✓] ${APP_FOLDER} uninstalled successfully.${NC}"
  else
    echo -e "Uninstall canceled."
  fi
}

# Main execution loop
show_menu
case "$OPTION" in
  0)
    install_app
    ;;
  1)
    setup_ssl_only
    ;;
  2)
    uninstall_app
    ;;
  *)
    echo -e "Exiting installer."
    exit 0
    ;;
esac
