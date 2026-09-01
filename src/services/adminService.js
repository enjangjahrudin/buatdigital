const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DATA_DIR = path.join(__dirname, '../../data');
const SETTINGS_FILE = path.join(DATA_DIR, 'settings.json');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

function hashPin(pin) {
  return crypto.createHash('sha256').update(String(pin)).digest('hex');
}

function initSettings() {
  if (!fs.existsSync(SETTINGS_FILE)) {
    const defaultSettings = {
      pinHash: hashPin('admin123'),
      sessionToken: null,
      siteTitle: 'BuatDigital.id - Solusi Aplikasi Web & Produk Digital Siap Pakai',
      siteTagline: 'Koleksi Aplikasi Web, Tools Otomasi & Solusi Digital Siap Pakai untuk Mempermudah Bisnis dan Produktivitas Anda.',
      whatsappNumber: '6281234567890',
      whatsappOrderTemplate: 'Halo BuatDigital.id, saya tertarik untuk memesan produk *{product_name}* dengan harga {product_price}. Mohon info cara pembayarannya.',
      contactEmail: 'kontak@buatdigital.id',
      // Midtrans Payment Gateway Configuration
      midtransServerKey: '', // e.g. SB-Mid-server-xxxx
      midtransClientKey: '', // e.g. SB-Mid-client-xxxx
      midtransIsProduction: false,
      enableMidtrans: true,
      paymentMode: 'MIDTRANS_AND_WA', // MIDTRANS_AND_WA, MIDTRANS_ONLY, WA_ONLY
      updatedAt: new Date().toISOString()
    };
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(defaultSettings, null, 2));
  }
}

initSettings();

class AdminService {
  getSettings() {
    try {
      if (!fs.existsSync(SETTINGS_FILE)) initSettings();
      const content = fs.readFileSync(SETTINGS_FILE, 'utf8');
      const s = JSON.parse(content || '{}');
      if (s.enableMidtrans === undefined) s.enableMidtrans = true;
      if (s.midtransIsProduction === undefined) s.midtransIsProduction = false;
      if (!s.paymentMode) s.paymentMode = 'MIDTRANS_AND_WA';
      return s;
    } catch (err) {
      console.error('Error reading settings:', err);
      return {};
    }
  }

  saveSettings(settings) {
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2));
  }

  getPublicSettings() {
    const s = this.getSettings();
    return {
      siteTitle: s.siteTitle,
      siteTagline: s.siteTagline,
      whatsappNumber: s.whatsappNumber,
      whatsappOrderTemplate: s.whatsappOrderTemplate,
      contactEmail: s.contactEmail,
      // Public Midtrans keys
      enableMidtrans: !!(s.enableMidtrans && s.midtransClientKey),
      midtransClientKey: s.midtransClientKey || '',
      midtransIsProduction: s.midtransIsProduction || false,
      paymentMode: s.paymentMode || 'MIDTRANS_AND_WA'
    };
  }

  verifyPin(pin) {
    const s = this.getSettings();
    if (s.pinHash === hashPin(pin)) {
      const token = crypto.randomBytes(32).toString('hex');
      s.sessionToken = token;
      this.saveSettings(s);
      return { success: true, token };
    }
    return { success: false, error: 'PIN Admin tidak sesuai.' };
  }

  verifySession(token) {
    if (!token) return false;
    const s = this.getSettings();
    return s.sessionToken === token;
  }

  changePin(oldPin, newPin) {
    const s = this.getSettings();
    if (s.pinHash !== hashPin(oldPin)) {
      return { success: false, error: 'PIN lama salah.' };
    }
    if (!newPin || newPin.length < 4) {
      return { success: false, error: 'PIN baru minimal 4 karakter.' };
    }
    s.pinHash = hashPin(newPin);
    s.updatedAt = new Date().toISOString();
    this.saveSettings(s);
    return { success: true, message: 'PIN Admin berhasil diubah.' };
  }

  updateSettings(data) {
    const s = this.getSettings();
    if (data.siteTitle !== undefined) s.siteTitle = data.siteTitle;
    if (data.siteTagline !== undefined) s.siteTagline = data.siteTagline;
    if (data.whatsappNumber !== undefined) s.whatsappNumber = data.whatsappNumber.replace(/[^0-9]/g, '');
    if (data.whatsappOrderTemplate !== undefined) s.whatsappOrderTemplate = data.whatsappOrderTemplate;
    if (data.contactEmail !== undefined) s.contactEmail = data.contactEmail;

    // Midtrans Settings
    if (data.midtransServerKey !== undefined) s.midtransServerKey = data.midtransServerKey.trim();
    if (data.midtransClientKey !== undefined) s.midtransClientKey = data.midtransClientKey.trim();
    if (data.midtransIsProduction !== undefined) s.midtransIsProduction = Boolean(data.midtransIsProduction);
    if (data.enableMidtrans !== undefined) s.enableMidtrans = Boolean(data.enableMidtrans);
    if (data.paymentMode !== undefined) s.paymentMode = data.paymentMode;

    s.updatedAt = new Date().toISOString();
    this.saveSettings(s);
    return s;
  }
}

module.exports = new AdminService();
