const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const productService = require('./productService');

const DATA_DIR = path.join(__dirname, '../../data');
const SALES_FILE = path.join(DATA_DIR, 'sales.json');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

function initSales() {
  if (!fs.existsSync(SALES_FILE)) {
    const initialSales = [
      {
        id: crypto.randomUUID(),
        productName: 'Aplikasi Cek Desil Massal Kemensos (DTSEN)',
        customerName: 'Budi Santoso',
        customerEmail: 'budi.santoso@gmail.com',
        customerPhone: '081298765432',
        amount: 150000,
        pricingType: 'ONETIME',
        paymentMethod: 'Transfer Bank BCA',
        status: 'PAID',
        createdAt: new Date(Date.now() - 86400000 * 3).toISOString(),
        notes: 'Order lisensi via WA'
      },
      {
        id: crypto.randomUUID(),
        productName: 'Aplikasi Cek Desil Massal Kemensos (DTSEN)',
        customerName: 'Dinas Sosial Kabupaten X',
        customerEmail: 'dinsos.kabx@gmail.com',
        customerPhone: '081311223344',
        amount: 150000,
        pricingType: 'ONETIME',
        paymentMethod: 'QRIS',
        status: 'PAID',
        createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
        notes: 'Akses 1 device tim verifikator'
      },
      {
        id: crypto.randomUUID(),
        productName: 'SAKOLA - Sistem Manajemen Sekolah & Absensi WA SaaS',
        customerName: 'SMK Mitra Bangsa',
        customerEmail: 'admin@smkmitrabangsa.sch.id',
        customerPhone: '085712349988',
        amount: 99000,
        pricingType: 'MONTHLY',
        paymentMethod: 'Transfer Bank Mandiri',
        status: 'PAID',
        createdAt: new Date(Date.now() - 86400000 * 5).toISOString(),
        notes: 'Langganan Bulan Pertama (450 Siswa)'
      },
      {
        id: crypto.randomUUID(),
        productName: 'Jurnal Ramadhan Digital Interaktif',
        customerName: 'Yayasan Nurul Fikri',
        customerEmail: 'nurulfikri.edu@gmail.com',
        customerPhone: '081809988776',
        amount: 350000,
        pricingType: 'YEARLY',
        paymentMethod: 'Transfer Bank BSI',
        status: 'PAID',
        createdAt: new Date(Date.now() - 86400000 * 10).toISOString(),
        notes: 'Lisensi 1 Tahun Ajaran'
      }
    ];
    fs.writeFileSync(SALES_FILE, JSON.stringify(initialSales, null, 2));
  }
}

initSales();

class SalesService {
  getAllSales() {
    try {
      if (!fs.existsSync(SALES_FILE)) initSales();
      const content = fs.readFileSync(SALES_FILE, 'utf8');
      return JSON.parse(content || '[]');
    } catch (err) {
      console.error('Error reading sales:', err);
      return [];
    }
  }

  saveSales(sales) {
    fs.writeFileSync(SALES_FILE, JSON.stringify(sales, null, 2));
  }

  addSale(data) {
    const sales = this.getAllSales();

    const newSale = {
      id: crypto.randomUUID(),
      productId: data.productId || null,
      productName: data.productName || 'Produk Digital',
      customerName: data.customerName || 'Pelanggan',
      customerEmail: data.customerEmail || '-',
      customerPhone: data.customerPhone || '-',
      amount: Number(data.amount) || 0,
      pricingType: data.pricingType || 'ONETIME',
      paymentMethod: data.paymentMethod || 'Transfer Bank',
      status: data.status || 'PAID',
      createdAt: data.createdAt || new Date().toISOString(),
      notes: data.notes || ''
    };

    sales.unshift(newSale);
    this.saveSales(sales);

    // Update product stats
    if (newSale.productId && newSale.status === 'PAID') {
      try {
        const prod = productService.getProductById(newSale.productId);
        if (prod) {
          prod.totalSalesCount = (prod.totalSalesCount || 0) + 1;
          prod.totalRevenue = (prod.totalRevenue || 0) + newSale.amount;
          productService.updateProduct(prod.id, prod);
        }
      } catch (e) {}
    }

    return newSale;
  }

  deleteSale(id) {
    let sales = this.getAllSales();
    sales = sales.filter(s => s.id !== id);
    this.saveSales(sales);
    return true;
  }

  getAnalytics() {
    const sales = this.getAllSales();
    const paidSales = sales.filter(s => s.status === 'PAID');

    const totalRevenue = paidSales.reduce((acc, s) => acc + (s.amount || 0), 0);
    const totalOrders = paidSales.length;

    // Breakdown by pricing type
    const pricingTypeBreakdown = {
      ONETIME: { count: 0, revenue: 0 },
      MONTHLY: { count: 0, revenue: 0 },
      YEARLY: { count: 0, revenue: 0 },
      OTHER: { count: 0, revenue: 0 }
    };

    paidSales.forEach(s => {
      const type = s.pricingType || 'ONETIME';
      if (pricingTypeBreakdown[type]) {
        pricingTypeBreakdown[type].count++;
        pricingTypeBreakdown[type].revenue += s.amount || 0;
      } else {
        pricingTypeBreakdown.OTHER.count++;
        pricingTypeBreakdown.OTHER.revenue += s.amount || 0;
      }
    });

    // Monthly revenue chart data (Last 6 months)
    const monthsMap = {};
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${monthNames[d.getMonth()]} ${d.getFullYear()}`;
      monthsMap[key] = 0;
    }

    paidSales.forEach(s => {
      const d = new Date(s.createdAt);
      const key = `${monthNames[d.getMonth()]} ${d.getFullYear()}`;
      if (monthsMap[key] !== undefined) {
        monthsMap[key] += s.amount || 0;
      }
    });

    // Top products
    const productStats = {};
    paidSales.forEach(s => {
      const pName = s.productName || 'Lainnya';
      if (!productStats[pName]) productStats[pName] = { count: 0, revenue: 0 };
      productStats[pName].count++;
      productStats[pName].revenue += s.amount || 0;
    });

    return {
      totalRevenue,
      totalOrders,
      averageOrderValue: totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0,
      pricingTypeBreakdown,
      monthlyChart: {
        labels: Object.keys(monthsMap),
        data: Object.values(monthsMap)
      },
      productStats,
      recentSales: sales.slice(0, 10)
    };
  }
}

module.exports = new SalesService();
