const nodemailer = require('nodemailer');
const adminService = require('./adminService');

class EmailService {
  getTransporter() {
    const settings = adminService.getSettings();
    const smtp = settings.smtp || {};

    const host = process.env.SMTP_HOST || smtp.host || 'smtp.gmail.com';
    const port = Number(process.env.SMTP_PORT || smtp.port || 587);
    const secure = (process.env.SMTP_SECURE === 'true') || smtp.secure || false;
    const user = process.env.SMTP_USER || smtp.user || '';
    const pass = process.env.SMTP_PASS || smtp.pass || '';

    if (!user || !pass) {
      console.warn('[EmailService] SMTP User / Password belum diatur. Email tidak dapat dikirim.');
      return null;
    }

    return nodemailer.createTransport({
      host,
      port,
      secure,
      auth: { user, pass }
    });
  }

  /**
   * Send order confirmation and license activation email
   */
  async sendOrderLicenseEmail({ customerName, customerEmail, productName, orderId, amount, appUrl }) {
    const cleanEmail = String(customerEmail || '').trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      console.warn(`[EmailService] Invalid customer email: ${customerEmail}`);
      return false;
    }

    const transporter = this.getTransporter();
    if (!transporter) {
      console.warn(`[EmailService] Dilewati karena SMTP belum dikonfigurasi.`);
      return false;
    }

    const targetAppUrl = appUrl || (productName.toLowerCase().includes('cek desil') ? 'https://cekdesil.buatdigital.id' : 'https://buatdigital.id');
    const settings = adminService.getSettings();
    const fromAddress = process.env.SMTP_FROM || settings.smtp?.from || `"BuatDigital.id" <${process.env.SMTP_USER || settings.smtp?.user || 'kontak@buatdigital.id'}>`;

    const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f8fafc; margin: 0; padding: 20px; color: #1e293b; }
        .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.06); border: 1px solid #e2e8f0; }
        .header { background: linear-gradient(135deg, #2563eb, #1d4ed8); padding: 32px 24px; text-align: center; color: #ffffff; }
        .header h1 { margin: 0; font-size: 22px; font-weight: 800; }
        .header p { margin: 6px 0 0; font-size: 13px; opacity: 0.9; }
        .content { padding: 32px 28px; }
        .badge-success { display: inline-block; background-color: #ecfdf5; color: #059669; padding: 6px 14px; border-radius: 9999px; font-size: 12px; font-weight: bold; border: 1px solid #a7f3d0; margin-bottom: 20px; }
        .order-box { background-color: #f8fafc; border-radius: 12px; border: 1px solid #e2e8f0; padding: 18px; margin-bottom: 24px; font-size: 13px; }
        .order-row { display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px dashed #e2e8f0; }
        .order-row:last-child { border-bottom: none; font-weight: bold; color: #0f172a; padding-top: 10px; }
        .access-box { background: linear-gradient(to right, #eff6ff, #f0fdf4); border: 1px solid #bfdbfe; border-radius: 14px; padding: 20px; margin: 24px 0; }
        .access-title { font-weight: 800; color: #1e40af; font-size: 14px; margin-bottom: 12px; }
        .access-item { margin-bottom: 8px; font-size: 13px; }
        .access-item strong { color: #0f172a; }
        .btn-cta { display: block; text-align: center; background-color: #2563eb; color: #ffffff !important; font-weight: bold; text-decoration: none; padding: 14px 24px; border-radius: 12px; margin: 24px 0; font-size: 14px; box-shadow: 0 4px 12px rgba(37,99,235,0.25); }
        .instructions { font-size: 12px; color: #64748b; line-height: 1.6; margin-top: 20px; padding-top: 16px; border-top: 1px solid #f1f5f9; }
        .footer { background-color: #f8fafc; padding: 20px; text-align: center; font-size: 11px; color: #94a3b8; border-top: 1px solid #e2e8f0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>BuatDigital<span style="color: #fb923c;">.id</span></h1>
          <p>Konfirmasi Pembayaran & Aktivasi Lisensi</p>
        </div>

        <div class="content">
          <div style="text-align: center;">
            <span class="badge-success">✓ Pembayaran Berhasil Diterima</span>
          </div>

          <p style="font-size: 14px;">Halo <strong>${customerName || 'Pelanggan'}</strong>,</p>
          <p style="font-size: 13px; color: #475569; line-height: 1.6;">
            Terima kasih telah mempercayakan kebutuhan aplikasi digital Anda kepada BuatDigital.id. Pembayaran Anda telah kami verifikasi dan lisensi akun Anda telah <strong>langsung diaktifkan secara otomatis</strong>.
          </p>

          <div class="order-box">
            <div class="order-row"><span>ID Pesanan:</span><span><strong>#${orderId}</strong></span></div>
            <div class="order-row"><span>Produk:</span><span>${productName}</span></div>
            <div class="order-row"><span>Waktu Transaksi:</span><span>${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })} WIB</span></div>
            <div class="order-row"><span>Total Bayar:</span><span>Rp ${Number(amount).toLocaleString('id-ID')} (Lunas)</span></div>
          </div>

          <div class="access-box">
            <div class="access-title">🔑 Informasi Akses & Login Aplikasi</div>
            <div class="access-item"><strong>URL Aplikasi:</strong> <a href="${targetAppUrl}" style="color: #2563eb;">${targetAppUrl}</a></div>
            <div class="access-item"><strong>Email Lisensi:</strong> <span style="background: #e0e7ff; padding: 2px 8px; border-radius: 6px; font-family: monospace; font-weight: bold; color: #3730a3;">${cleanEmail}</span></div>
            <div class="access-item"><strong>Status Lisensi:</strong> <span style="color: #059669; font-weight: bold;">Aktif Permanen</span></div>
          </div>

          <a href="${targetAppUrl}" class="btn-cta">Buka Aplikasi & Mulai Gunakan Sekarang &rarr;</a>

          <div class="instructions">
            <strong>Cara Masuk ke Aplikasi:</strong>
            <ol style="margin: 6px 0 0 16px; padding: 0;">
              <li>Klik tombol <strong>Buka Aplikasi</strong> di atas atau kunjungi <a href="${targetAppUrl}" style="color: #2563eb;">${targetAppUrl}</a>.</li>
              <li>Masukkan email terdaftar Anda (<code>${cleanEmail}</code>) pada halaman login.</li>
              <li>Klik <strong>Masuk</strong>. Sistem akan langsung memverifikasi lisensi Anda tanpa perlu password rumit.</li>
            </ol>
          </div>
        </div>

        <div class="footer">
          <p>Butuh bantuan atau kendala aktivasi? Hubungi WhatsApp Layanan Pelanggan kami di <strong>+62 857-1117-7941</strong>.</p>
          <p>&copy; 2026 BuatDigital.id &bull; Solusi Aplikasi Web Siap Pakai.</p>
        </div>
      </div>
    </body>
    </html>
    `;

    try {
      console.log(`[EmailService] Mengirim email aktivasi lisensi ke ${cleanEmail}...`);
      const info = await transporter.sendMail({
        from: fromAddress,
        to: cleanEmail,
        subject: `🎉 Pembayaran Berhasil & Lisensi Aktif: ${productName} [#${orderId}]`,
        html: htmlContent
      });
      console.log(`[EmailService] Email berhasil terkirim ke ${cleanEmail}! MessageId: ${info.messageId}`);
      return true;
    } catch (err) {
      console.error(`[EmailService Error]: Gagal mengirim email ke ${cleanEmail}:`, err.message);
      return false;
    }
  }
}

module.exports = new EmailService();
