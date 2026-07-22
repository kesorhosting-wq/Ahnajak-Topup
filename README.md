# Ahnajak Topup — Game Topup Platform

React + Express + MySQL game topup platform with payment gateways (KHQR, KHQRcc, IKhode Bakong) and G2Bulk fulfillment.

## VPS Installation (100% Complete)

Run these commands on a fresh Ubuntu VPS as root:

### 1. System Update & Dependencies

```bash
apt update && apt upgrade -y
apt install -y git curl nginx mysql-server certbot python3-certbot-nginx
```

### 2. Install Node.js 20

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs
node -v  # should show v20.x
```

### 3. Setup MySQL

```bash
mysql
```

```sql
CREATE DATABASE ahnajak_topup CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'ahnajak'@'localhost' IDENTIFIED BY 'YourStrongPassword123';
GRANT ALL PRIVILEGES ON ahnajak_topup.* TO 'ahnajak'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

Secure MySQL (set root password, remove anonymous users, etc.):
```bash
mysql_secure_installation
```

### 4. Clone Repository

```bash
cd /root
git clone https://github.com/kesorhosting-wq/Ahnajak-Topup.git
cd Ahnajak-Topup
```

### 5. Configure Environment

```bash
cp .env.example .env
nano .env
```

Minimum required changes in `.env`:
```env
DB_PASSWORD=YourStrongPassword123
JWT_SECRET=<generate a random string: openssl rand -hex 32>
PUBLIC_BASE_URL=https://example.com
```

Optional but recommended:
```env
G2BULK_API_KEY=your_g2bulk_key
TELEGRAM_BOT_TOKEN=your_bot_token
TELEGRAM_CLIENT_SECRET=your_client_secret
```

### 6. Install Dependencies & Setup Database

```bash
npm install
node scripts/seed.cjs
```

This creates all tables and inserts default data (admin user, settings).

### 7. Start Backend with PM2

```bash
npm install -g pm2
pm2 start server/index.cjs --name ahnajak-api
pm2 save
pm2 startup
```

Follow the on-screen instructions from `pm2 startup` to enable PM2 on boot.

### 8. Build Frontend

```bash
npm run build
mkdir -p /var/www/example
cp -r dist/* /var/www/example/
```

### 9. Configure nginx

```bash
cat > /etc/nginx/sites-enabled/example.com << 'NGINX'
server {
    listen 80;
    listen [::]:80;
    server_name example.com www.example.com;

    location / {
        return 301 https://$host$request_uri;
    }

    location ^~ /.well-known/acme-challenge/ {
        root /var/www/example;
        default_type "text/plain";
        allow all;
    }
}

server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name example.com www.example.com;

    ssl_certificate /etc/letsencrypt/live/example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/example.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 1440m;

    root /var/www/example;
    index index.html;

    location /api/ {
        proxy_pass http://localhost:3010;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /uploads/ {
        proxy_pass http://localhost:3010;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location / {
        try_files $uri $uri/ /index.html;
    }

    location ~* \.(css|js|png|jpg|jpeg|gif|svg|ico|woff2?|ttf)$ {
        expires 30d;
        access_log off;
    }
}
NGINX
```

### 10. Get SSL Certificate

```bash
certbot --nginx -d example.com -d www.example.com
```

### 11. Restart nginx & Verify

```bash
nginx -t && systemctl restart nginx
```

### 12. Verify Everything

```bash
# Backend running?
curl -I http://localhost:3010/api/settings

# Frontend serving?
curl -I https://example.com

# PM2 status
pm2 status
```

Visit `https://example.com` and login with:
- Email: `admin@ahnajak.com`
- Password: `admin123`

**Change the password immediately after first login!**

---

## Updating (Pull Latest Code)

```bash
cd /root/Ahnajak-Topup
git pull
npm install
pm2 restart ahnajak-api
npm run build
rm -rf /var/www/example/*
cp -r dist/* /var/www/example/
```

---

## Environment Variables

| Variable | Description | Default |
|---|---|---|
| `DB_HOST` | MySQL host | `localhost` |
| `DB_PORT` | MySQL port | `3306` |
| `DB_USER` | MySQL user | `root` |
| `DB_PASSWORD` | MySQL password | (required) |
| `DB_NAME` | Database name | `ahnajak_topup` |
| `JWT_SECRET` | JWT signing key | (required — generate with `openssl rand -hex 32`) |
| `JWT_EXPIRES_IN` | Token expiry | `24h` |
| `PORT` | API server port | `3010` |
| `PUBLIC_BASE_URL` | Public site URL | `http://localhost:3010` |
| `FRONTEND_URL` | Frontend URL (CORS) | `https://example.com` |
| `ALLOWED_ORIGINS` | CORS origins (comma-sep) | (same as FRONTEND_URL) |
| `G2BULK_API_KEY` | G2Bulk API key | |
| `G2BULK_WEBHOOK_SECRET` | G2Bulk webhook secret | |
| `TELEGRAM_BOT_TOKEN` | Telegram bot token (old auth) | |
| `TELEGRAM_CLIENT_ID` | Telegram client ID (OIDC) | |
| `TELEGRAM_CLIENT_SECRET` | Telegram client secret (OIDC) | |
| `KHQR_API_KEY` | KHQR API key | |
| `IKHODE_API_KEY` | IKhode Bakong API key | |

---

## npm Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start API + Vite dev server |
| `npm run dev:server` | Start API only |
| `npm run dev:client` | Start Vite only (port 8080) |
| `npm run build` | Build frontend for production |
| `npm run server` | Start API server (production) |
| `npm run lint` | Run ESLint |
| `node scripts/seed.cjs` | Initialize/reset database |

---

## Tech Stack

- **Frontend:** React 18, Vite 5, TypeScript, Tailwind CSS, shadcn/ui
- **Backend:** Express 5, Node.js (CommonJS)
- **Database:** MySQL / MariaDB
- **Auth:** JWT + bcrypt
- **File Storage:** Local `/uploads/` directory
- **Payments:** KHQR, KHQRcc (ABA Pay), IKhode Bakong
- **Fulfillment:** G2Bulk API
