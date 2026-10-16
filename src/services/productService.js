const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DATA_DIR = path.join(__dirname, '../../data');
const PRODUCTS_FILE = path.join(DATA_DIR, 'products.json');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

function initProducts() {
  if (!fs.existsSync(PRODUCTS_FILE)) {
    const initialProducts = [
      {
        id: crypto.randomUUID(),
        name: 'Aplikasi Cek Desil Massal Kemensos (DTSEN)',
        slug: 'cek-desil-massal',
        category: 'Aplikasi Web & Otomasi',
        shortDesc: 'Aplikasi otomasi pengecekan desil dan status bansos (Sembako, PKH, PBI-JK) secara massal dari Excel dengan Auto-Captcha Solver.',
        fullDesc: 'Solusi terbaik bagi instansi, desa, relawan, dan lembaga sosial untuk memverifikasi kelayakan bansos ribuan NIK sekaligus. Dilengkapi bypass auto-captcha cerdas, dashboard statistik real-time, dan export hasil langsung ke file Excel terformat rapi.',
        pricingType: 'ONETIME', // ONETIME, MONTHLY, YEARLY, FREE, CUSTOM
        price: 250000,
        discountPrice: 150000,
        badge: 'Best Seller',
        icon: 'fa-users-viewfinder',
        thumbnailColor: 'from-blue-600 to-indigo-900',
        features: [
          'Pengecekan Massal ribuan NIK via Excel / CSV',
          'Auto-Captcha Solver OCR Cerdas & Adaptif',
          'Deteksi Desil 1–10 & Status Bansos Lengkap',
          'Export Excel dengan Pewarnaan Badge Otomatis',
          'Sistem Lisensi 1 Perangkat Aktif & Panel Admin',
          'Akses Seumur Hidup (Sekali Bayar Tanpa Batasan)'
        ],
        demoUrl: 'http://localhost:3000',
        appUrl: 'http://localhost:3000',
        isPublished: true,
        orderIndex: 1,
        totalSalesCount: 18,
        totalRevenue: 2700000,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: crypto.randomUUID(),
        name: 'SAKOLA - Sistem Manajemen Sekolah & Absensi WA SaaS',
        slug: 'sakola-school-manager',
        category: 'SaaS & Enterprise',
        shortDesc: 'Aplikasi manajemen sekolah terpadu dengan integrasi notifikasi WhatsApp otomatis untuk kehadiran siswa dan jurnal wali kelas.',
        fullDesc: 'Platform manajemen sekolah modern yang menghubungkan guru, siswa, dan orang tua. Orang tua otomatis menerima pesan WhatsApp saat anak tiba di sekolah atau izin/sakit. Dilengkapi e-Rapor dan rekap nilai otomatis.',
        pricingType: 'MONTHLY', // Langganan Bulanan
        price: 150000,
        discountPrice: 99000,
        badge: 'Langganan Populer',
        icon: 'fa-graduation-cap',
        thumbnailColor: 'from-emerald-600 to-teal-900',
        features: [
          'Absensi QR Code & Real-time Notifikasi WhatsApp',
          'Jurnal Harian Wali Kelas & Laporan Rapor Siswa',
          'Multi-user (Admin, Kepala Sekolah, Guru, Siswa)',
          'Dashboard Statistik Kehadiran Siswa',
          'Cloud Hosting & Update Fitur Berkala'
        ],
        demoUrl: '#',
        appUrl: '#',
        isPublished: true,
        orderIndex: 2,
        totalSalesCount: 8,
        totalRevenue: 792000,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: crypto.randomUUID(),
        name: 'Jurnal Ramadhan Digital Interaktif',
        slug: 'jurnal-ramadhan-digital',
        category: 'Aplikasi Web & Edukasi',
        shortDesc: 'Aplikasi web interaktif untuk memantau ibadah harian, sholat, tilawah Al-Qur\'an, dan puasa ramadhan siswa secara digital.',
        fullDesc: 'Menggantikan buku jurnal ramadhan fisik dengan aplikasi ramah gadget. Guru dan wali kelas dapat memantau grafik ibadah seluruh murid dalam satu dashboard terpusat.',
        pricingType: 'YEARLY', // Langganan Tahunan
        price: 500000,
        discountPrice: 350000,
        badge: 'Musiman / Edukasi',
        icon: 'fa-moon',
        thumbnailColor: 'from-amber-600 to-yellow-900',
        features: [
          'Tracker Sholat 5 Waktu & Tarawih Harian',
          'Target Khatam Tilawah & Catatan Kultum',
          'Validasi Tanda Tangan Orang Tua Digital',
          'Export Rekap Nilai Ibadah Ramadhan'
        ],
        demoUrl: '#',
        appUrl: '#',
        isPublished: true,
        orderIndex: 3,
        totalSalesCount: 12,
        totalRevenue: 4200000,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: crypto.randomUUID(),
        name: 'AI Video Loop & Content Automator',
        slug: 'ai-video-loop-content',
        category: 'AI & Tools Kreator',
        shortDesc: 'Tool otomatisasi editing video pendek, looping dinamis, dan subtitle AI untuk konten kreator TikTok, Reels, dan Shorts.',
        fullDesc: 'Tingkatkan produktivitas pembuatan konten Anda 10x lebih cepat dengan generator video berbasis script otomatis.',
        pricingType: 'ONETIME',
        price: 399000,
        discountPrice: 199000,
        badge: 'New AI Tool',
        icon: 'fa-wand-magic-sparkles',
        thumbnailColor: 'from-purple-600 to-pink-900',
        features: [
          'Auto-caption & Transkripsi Audio ke Teks',
          'Algoritma Seamless Looping Video',
          'Preset Format 9:16 TikTok / Reels',
          'Sekali Bayar & Bebas Watermark'
        ],
        demoUrl: '#',
        appUrl: '#',
        isPublished: true,
        orderIndex: 4,
        totalSalesCount: 5,
        totalRevenue: 995000,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    ];
    fs.writeFileSync(PRODUCTS_FILE, JSON.stringify(initialProducts, null, 2));
  }
}

initProducts();

class ProductService {
  getAllProducts(onlyPublished = false) {
    try {
      if (!fs.existsSync(PRODUCTS_FILE)) initProducts();
      const content = fs.readFileSync(PRODUCTS_FILE, 'utf8');
      let products = JSON.parse(content || '[]');
      if (onlyPublished) {
        products = products.filter(p => p.isPublished);
      }
      return products.sort((a, b) => (a.orderIndex || 0) - (b.orderIndex || 0));
    } catch (err) {
      console.error('Error getting products:', err);
      return [];
    }
  }

  saveProducts(products) {
    fs.writeFileSync(PRODUCTS_FILE, JSON.stringify(products, null, 2));
  }

  getProductById(id) {
    const products = this.getAllProducts(false);
    return products.find(p => p.id === id);
  }

  getProductBySlug(slug) {
    const products = this.getAllProducts(false);
    return products.find(p => p.slug === slug);
  }

  createProduct(data) {
    const products = this.getAllProducts(false);

    const slug = (data.slug || data.name || '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') || `prod-${Date.now()}`;

    const newProduct = {
      id: crypto.randomUUID(),
      name: data.name || 'Produk Digital Baru',
      slug,
      category: data.category || 'Aplikasi Web',
      shortDesc: data.shortDesc || '',
      fullDesc: data.fullDesc || '',
      pricingType: data.pricingType || 'ONETIME', // ONETIME, MONTHLY, YEARLY, FREE, CUSTOM
      price: Number(data.price) || 0,
      discountPrice: Number(data.discountPrice) || 0,
      badge: data.badge || '',
      icon: data.icon || 'fa-cubes',
      thumbnailColor: data.thumbnailColor || 'from-blue-600 to-indigo-900',
      features: Array.isArray(data.features) ? data.features : (data.features || '').split('\n').filter(Boolean),
      demoUrl: data.demoUrl || '#',
      appUrl: data.appUrl || '#',
      checkoutType: data.checkoutType || (data.externalCheckoutUrl ? 'EXTERNAL' : 'BUATDIGITAL'), // BUATDIGITAL or EXTERNAL
      externalCheckoutUrl: data.externalCheckoutUrl || '',
      externalCheckoutLabel: data.externalCheckoutLabel || '',
      showPrice: data.showPrice !== undefined ? (data.showPrice === true || data.showPrice === 'true') : true,
      isPublished: data.isPublished !== undefined ? (data.isPublished === true || data.isPublished === 'true') : true,
      orderIndex: products.length + 1,
      totalSalesCount: 0,
      totalRevenue: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    products.push(newProduct);
    this.saveProducts(products);
    return newProduct;
  }

  updateProduct(id, data) {
    const products = this.getAllProducts(false);
    const index = products.findIndex(p => p.id === id);
    if (index === -1) throw new Error('Produk tidak ditemukan.');

    const p = products[index];
    p.name = data.name !== undefined ? data.name : p.name;
    if (data.slug) p.slug = data.slug.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    p.category = data.category !== undefined ? data.category : p.category;
    p.shortDesc = data.shortDesc !== undefined ? data.shortDesc : p.shortDesc;
    p.fullDesc = data.fullDesc !== undefined ? data.fullDesc : p.fullDesc;
    p.pricingType = data.pricingType !== undefined ? data.pricingType : p.pricingType;
    p.price = data.price !== undefined ? Number(data.price) : p.price;
    p.discountPrice = data.discountPrice !== undefined ? Number(data.discountPrice) : p.discountPrice;
    p.badge = data.badge !== undefined ? data.badge : p.badge;
    p.icon = data.icon !== undefined ? data.icon : p.icon;
    p.thumbnailColor = data.thumbnailColor !== undefined ? data.thumbnailColor : p.thumbnailColor;
    if (data.features !== undefined) {
      p.features = Array.isArray(data.features) ? data.features : String(data.features).split('\n').filter(Boolean);
    }
    p.demoUrl = data.demoUrl !== undefined ? data.demoUrl : p.demoUrl;
    p.appUrl = data.appUrl !== undefined ? data.appUrl : p.appUrl;
    p.checkoutType = data.checkoutType !== undefined ? data.checkoutType : (p.checkoutType || (data.externalCheckoutUrl ? 'EXTERNAL' : 'BUATDIGITAL'));
    p.externalCheckoutUrl = data.externalCheckoutUrl !== undefined ? data.externalCheckoutUrl : p.externalCheckoutUrl;
    p.externalCheckoutLabel = data.externalCheckoutLabel !== undefined ? data.externalCheckoutLabel : p.externalCheckoutLabel;
    if (data.showPrice !== undefined) {
      p.showPrice = data.showPrice === true || data.showPrice === 'true';
    } else {
      p.showPrice = p.showPrice !== false;
    }
    if (data.isPublished !== undefined) {
      p.isPublished = data.isPublished === true || data.isPublished === 'true';
    }
    p.orderIndex = data.orderIndex !== undefined ? Number(data.orderIndex) : p.orderIndex;
    p.updatedAt = new Date().toISOString();

    products[index] = p;
    this.saveProducts(products);
    return p;
  }

  deleteProduct(id) {
    let products = this.getAllProducts(false);
    const initialLen = products.length;
    products = products.filter(p => p.id !== id);
    if (products.length === initialLen) throw new Error('Produk tidak ditemukan.');
    this.saveProducts(products);
    return true;
  }
}

module.exports = new ProductService();
