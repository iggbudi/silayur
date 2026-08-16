# Deployment ke VPS Ubuntu — Runbook

> Panduan deploy DIGITAMA Dashboard ke **VPS Ubuntu** yang dikelola sendiri oleh
> owner. Tidak memakai ChatGPT Sites tooling. Kode di-publish ke GitHub
> (`git push origin main`), lalu owner men-deploy di server dengan menjalankan
> server Node (bukan workerd/Cloudflare).
>
> Prinsip keamanan mengikuti `AGENTS.md`: jangan jalankan migrasi database
> produksi / deploy tanpa otorisasi eksplisit owner; validasi lokal tidak sama
> dengan izin produksi.

---

## Arsitektur target

```
Internet
   │  HTTPS :443
   ▼
Reverse proxy TLS (Caddy / Nginx + certbot)
   │  proxy_pass http://127.0.0.1:3000  (dengan X-Forwarded-*)
   ▼
DIGITAMA server (Node >=22.13)     ← `npm run start`
   │  membaca env: DATABASE_URL + VINEXT_TRUST_PROXY
   ▼
PostgreSQL (di VPS atau eksternal)
```

Aplikasi dijalankan sebagai **proses Node biasa** (`npm run start` = `vinext
start`). Ini membuka port `3000` di `0.0.0.0`. Reverse proxy menangani TLS dan
menyediakan HTTPS ke luar; aplikasi sendiri tidak perlu HTTPS langsung.

---

## 1. Prasyarat di server

Pastikan **Node `>=22.13`** (lihat `package.json` `engines`) dan **PostgreSQL**.

```bash
# Node bentukan paket Ubuntu sering versi lama — pakai NodeSource atau nvm.
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt-get install -y nodejs
node -v            # harus >= 22.13

# PostgreSQL
sudo apt-get update
sudo apt-get install -y postgresql postgresql-contrib
```

Opsional tambahan: `git`, `ufw`, dan reverse proxy pilihan.

---

## 2. Buat user & database Postgres

```bash
sudo -u postgres createuser --pwprompt digitama
sudo -u postgres createdb -O digitama silayur
```

Setelah itu nilai `DATABASE_URL` berbentuk:

```
DATABASE_URL=postgres://digitama:<password>@127.0.0.1:5432/silayur
```
---

## 3. Clone & pasang aplikasi

```bash
sudo mkdir -p /opt/digitama
sudo chown "$USER":"$USER" /opt/digitama
cd /opt/digitama
git clone https://github.com/iggbudi/silayur.git .
git checkout main

npm ci
# atau: npm install
```

`npm ci` menjalankan `postinstall` (`scripts/patch-vinext.mjs`) yang men-patch
vinext; aman dan hanya men-target file `node_modules/vinext` /
`dist/standalone/node_modules/vinext` tanpa mengubah perilaku di Linux.

---

## 4. Buat `.env` produksi

Salin dari template, isi nilai sesuai target:

```bash
cp .env.example .env
nano .env
```

Isi minimal:

```env
DATABASE_URL=postgres://digitama:<password>@127.0.0.1:5432/silayur

# Satu-satunya saat seed awal: password Super Admin (min. 10 karakter).
DIGITAMA_SEED_ADMIN_PASSWORD=<min-10-karakter>

# Di belakang reverse-proxy TLS, wajib agar aplikasi mempercayai
# X-Forwarded-Proto / X-Forwarded-Host dari proxy. Tanpa ini cookie sesi
# tidak ber-flag Secure (dan assertSameOrigin bisa salah skema).
VINEXT_TRUST_PROXY=1
# Opsional: batasi host yang dipercaya sebagai X-Forwarded-Host.
# VINEXT_TRUSTED_HOSTS=dashboard.example.com
```

> **Jangan pernah commit** `.env` (sudah ada di `.gitignore`). Env berisi
> kredensial DB & password seed.

Jika Anda menaruh `.env` dan menjalankan dari direktori yang sama, aplikasi
membacanya otomatis (`db/runtime-env.ts` fallback ke `.env` di `cwd`). Untuk
systemd, pastikan `WorkingDirectory` menunjuk ke folder repo.

---

## 5. Migrate, seed, dan build

```bash
cd /opt/digitama

# Migration schema + seed idempotent (hanya menambah, tidak menimpa)
npm run db:setup

# Uji health schema
npm run db:check

# Build produksi
npm run build
```

`npm run db:setup` = `db:migrate` + `db:seed` + `db:check`.

---

## 6. Jalankan server (uji manual dulu)

```bash
# Bind 0.0.0.0:3000 (default vinext start)
npm run start
```

Cek cepat dari server:

```bash
curl -I http://127.0.0.1:3000/
# Expected: 200 OK atau 302 ke /login
```

> Untuk Postgres lokal/dev di **Windows**, instalatur memakai
> `npm run start:local` yang menjalankan `dist/standalone/server.js`. Pada
> Linux/Ubuntu gunakan `npm run start` (server produksi vinext) yang juga Node.

---

## 7. Jalankan sebagai service (systemd)

Buat unit service agar server restart otomatis dan berjalan sejak boot. Contoh
file di repo: `scripts/systemd/digitama.service`.

```bash
sudo cp scripts/systemd/digitama.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now digitama
sudo systemctl status digitama
```

Log service:

```bash
sudo journalctl -u digitama -f
```

---

## 8. Reverse proxy + HTTPS

Cookie sesi ber-flag `Secure` hanya bila request diterima sebagai `https`
(vinext menentukannya dari `X-Forwarded-Proto`; karena itu `VINEXT_TRUST_PROXY=1`)
Tanpa HTTPS di depan, login bisa tidak bertahan. Pasang salah satu:

### Opsi A — Caddy (paling sederhana, auto-HTTPS)

```bash
sudo apt-get install -y caddy
```

```text
# /etc/caddy/Caddyfile
dashboard.example.com {
    reverse_proxy 127.0.0.1:3000
}
```

```bash
sudo systemctl reload caddy
```

Caddy otomatis mengeluarkan sertifikat Let's Encrypt dan mengirim
`X-Forwarded-Proto`/`X-Forwarded-Host`. Pastikan `VINEXT_TRUST_PROXY=1` di `.env`
aplikasi.

### Opsi B — Nginx + certbot

```bash
sudo apt-get install -y nginx certbot python3-certbot-nginx
```

```nginx
# /etc/nginx/sites-available/digitama
server {
    listen 80;
    server_name dashboard.example.com;
    location / {
        return 301 https://$host$request_uri;
    }
}

server {
    listen 443 ssl;
    server_name dashboard.example.com;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host                 $host;
        proxy_set_header X-Forwarded-Proto    $scheme;
        proxy_set_header X-Forwarded-Host     $host;
        proxy_set_header X-Forwarded-For      $proxy_add_x_forwarded_for;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/digitama /etc/nginx/sites-enabled/
sudo nginx -t
sudo certbot --nginx -d dashboard.example.com
sudo systemctl restart nginx
```

---

## 9. Firewall

```bash
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
# JANGAN expose 3000/tcp ke publik — hanya reverse proxy yang boleh bicara ke app.
sudo ufw enable
```

---

## 10. Update & deploy versi baru

Alur umum untuk rilis berikutnya:

```bash
cd /opt/digitama
git pull origin main
npm ci
# migration baru (bila schema berubah) lalu build
npm run db:migrate
npm run build
sudo systemctl restart digitama
```

> Buat **backup database** sebelum migrate produksi. Pastikan `DATABASE_URL` dan
> env lain benar — jangan sampai migrasi menargetkan DB yang salah.

---

## Rollback

- **Kode**: checkout commit/build sebelumnya lalu restart service
  (`git checkout <commit>` → `npm run build` → `sudo systemctl restart digitama`).
- **DB**: restore dari backup/snapshot Postgres sebelum migrate.

---

## Referensi

- `README.md` — setup lokal & arsitektur.
- `docs/DEPLOY-CHECKLIST.md` — runbook historis (perintah Turso/Sites di sana
  tidak berlaku; gunakan panduan ini untuk deploy produksi).

## Catatan versi

- **v1** (16 Agustus 2026) — runbook deploy VPS Ubuntu tanpa ChatGPT Sites.

