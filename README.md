# BuatDigital.id - Showcase & Web Sales Portal

Official website & digital product showcase portal for **BuatDigital.id**. Built with Node.js & Express, featuring interactive product catalog, multi-pricing models, WhatsApp & Midtrans automated checkout, and an administrative control center with analytics.

---

## 🚀 Fitur Utama

- **Katalog & Showcase Produk Digital**:
  - Filter kategori: Paket Token (Top-Up), Sekali Bayar (Lifetime), Langganan (SaaS).
  - Pop-up detail fitur interaktif.
  - Dukungan Direct External App Checkout (e.g. ModulAI.id).
- **Payment Gateway Midtrans Snap**:
  - Otomatis: QRIS (GoPay, OVO, ShopeePay, DANA), Virtual Account (BCA, Mandiri, BNI, BRI).
  - Manual: WhatsApp CS Checkout.
  - Webhook Notification listener (`/api/payment/notification`).
- **Dashboard Admin Interaktif**:
  - Sidebar collapsible menu.
  - Grafik tren omset bulanan & analisis model pembayaran (Chart.js).
  - Manajemen katalog produk (CRUD + Publish/Draft toggle).
  - Pencatatan transaksi penjualan & data pembeli berlisensi.
  - Pengaturan Midtrans & WhatsApp checkout.

---

## 🛠️ Tech Stack & Prerequisites

- **Runtime**: Node.js v18+
- **Framework**: Express.js
- **Dependencies**: `cors`, `midtrans-client`
- **UI / Frontend**: Vanilla JS, HTML5, Tailwind CSS, FontAwesome 6, Chart.js

---

## 💻 Cara Menjalankan (Local)

1. Clone repository:
   ```bash
   git clone https://github.com/enjangjahrudin/buatdigital.git
   cd buatdigital
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Jalankan server:
   ```bash
   npm start
   ```
4. Akses di browser:
   - Website Utama: `http://localhost:4000`
   - Dashboard Admin: `http://localhost:4000/admin` (PIN Default: `admin123`)

---

## ☁️ Panduan Deployment VPS (PM2 & Nginx)

1. Clone dan install di server VPS:
   ```bash
   cd /var/www/buatdigital
   git pull origin main
   npm install --production
   ```
2. Jalankan dengan PM2:
   ```bash
   pm2 start src/server.js --name "buatdigital-portal"
   pm2 save
   ```
3. Konfigurasi Nginx Reverse Proxy (Port 4000) dengan SSL Let's Encrypt / Certbot.

---

© 2026 BuatDigital.id &bull; Solusi Aplikasi Web & Produk Digital Siap Pakai.
