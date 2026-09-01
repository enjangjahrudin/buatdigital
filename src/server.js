const express = require('express');
const cors = require('cors');
const path = require('path');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const productService = require('./services/productService');
const salesService = require('./services/salesService');
const adminService = require('./services/adminService');
const midtransService = require('./services/midtransService');
const { requireAdminAuth } = require('./middleware/authMiddleware');

const app = express();
const PORT = process.env.PORT || 4000;

// Security Hardening: Disable X-Powered-By
app.disable('x-powered-by');

// Security Hardening: HTTP Security Headers via Helmet
app.use(
  helmet({
    contentSecurityPolicy: false, // Allows CDN scripts like Tailwind, Chart.js, FontAwesome, and Midtrans Snap
    crossOriginEmbedderPolicy: false
  })
);

app.use(cors());
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));
app.use(express.static(path.join(__dirname, '../public')));

// Security Hardening: Rate Limiters
const generalApiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 300, // Max 300 requests per IP
  message: { error: 'Terlalu banyak permintaan dari IP ini. Silakan coba lagi beberapa saat lagi.' }
});

const adminLoginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 8, // Max 8 failed login attempts per 15 minutes to prevent brute-force
  message: { error: 'Terlalu banyak percobaan login gagal. Demi keamanan, akun dibekukan selama 15 menit.' }
});

const checkoutLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20, // Max 20 checkout attempts per 15 mins to prevent spam
  message: { error: 'Terlalu banyak permintaan checkout. Silakan coba beberapa saat lagi.' }
});

app.use('/api/', generalApiLimiter);

// Clean URL Routes
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/admin.html'));
});

app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/login.html'));
});

// ==========================================
// 💳 MIDTRANS PAYMENT GATEWAY ENDPOINTS
// ==========================================

// Create Snap Token for checkout
app.post('/api/payment/create-snap', checkoutLimiter, async (req, res) => {
  try {
    const { productId, customer } = req.body;
    if (!productId || !customer) {
      return res.status(400).json({ error: 'Data produk dan pembeli wajib diisi.' });
    }

    const product = productService.getProductById(productId);
    if (!product) {
      return res.status(404).json({ error: 'Produk tidak ditemukan.' });
    }

    const result = await midtransService.createTransaction({ product, customer });
    res.json(result);
  } catch (err) {
    console.error('Midtrans Create Snap Error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Midtrans Webhook Notification Listener
app.post('/api/payment/notification', async (req, res) => {
  try {
    const result = await midtransService.handleNotification(req.body);
    res.status(200).json(result);
  } catch (err) {
    console.error('Midtrans Webhook Error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Check Order Status
app.get('/api/payment/status/:orderId', (req, res) => {
  try {
    const sales = salesService.getAllSales();
    const sale = sales.find(s => s.id === req.params.orderId);
    if (!sale) return res.status(404).json({ error: 'Order tidak ditemukan' });
    res.json({ success: true, status: sale.status, sale });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 🌐 PUBLIC ENDPOINTS
// ==========================================

// Get published product catalog
app.get('/api/products', (req, res) => {
  try {
    const products = productService.getAllProducts(true);
    res.json({ success: true, products });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get single product details by slug
app.get('/api/products/:slug', (req, res) => {
  try {
    const product = productService.getProductBySlug(req.params.slug);
    if (!product) {
      return res.status(404).json({ error: 'Produk tidak ditemukan.' });
    }
    res.json({ success: true, product });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get public website settings
app.get('/api/settings/public', (req, res) => {
  try {
    const settings = adminService.getPublicSettings();
    res.json({ success: true, settings });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 🛡️ ADMIN AUTH & DASHBOARD ENDPOINTS
// ==========================================

// Admin Login with Brute-Force Rate Limiter
app.post('/api/admin/login', adminLoginLimiter, (req, res) => {
  try {
    const { pin } = req.body;
    if (!pin) return res.status(400).json({ error: 'PIN Admin wajib diisi.' });

    const result = adminService.verifyPin(pin);
    if (!result.success) {
      return res.status(401).json({ error: result.error });
    }
    res.json({ success: true, token: result.token });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Admin Analytics Overview
app.get('/api/admin/overview', requireAdminAuth, (req, res) => {
  try {
    const analytics = salesService.getAnalytics();
    const allProducts = productService.getAllProducts(false);
    res.json({
      success: true,
      analytics,
      totalProductsCount: allProducts.length,
      publishedProductsCount: allProducts.filter(p => p.isPublished).length
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Admin Product Catalog CRUD
app.get('/api/admin/products', requireAdminAuth, (req, res) => {
  try {
    const products = productService.getAllProducts(false);
    res.json({ success: true, products });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/admin/products', requireAdminAuth, (req, res) => {
  try {
    const newProduct = productService.createProduct(req.body);
    res.json({ success: true, product: newProduct });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.put('/api/admin/products/:id', requireAdminAuth, (req, res) => {
  try {
    const updated = productService.updateProduct(req.params.id, req.body);
    res.json({ success: true, product: updated });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.delete('/api/admin/products/:id', requireAdminAuth, (req, res) => {
  try {
    productService.deleteProduct(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Admin Sales & Transactions CRUD
app.get('/api/admin/sales', requireAdminAuth, (req, res) => {
  try {
    const sales = salesService.getAllSales();
    res.json({ success: true, sales });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/admin/sales', requireAdminAuth, (req, res) => {
  try {
    const newSale = salesService.addSale(req.body);
    res.json({ success: true, sale: newSale });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.delete('/api/admin/sales/:id', requireAdminAuth, (req, res) => {
  try {
    salesService.deleteSale(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Admin Settings CRUD
app.get('/api/admin/settings', requireAdminAuth, (req, res) => {
  try {
    const settings = adminService.getSettings();
    // Don't expose pinHash
    const safeSettings = { ...settings };
    delete safeSettings.pinHash;
    delete safeSettings.sessionToken;
    res.json({ success: true, settings: safeSettings });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/admin/settings', requireAdminAuth, (req, res) => {
  try {
    const updated = adminService.updateSettings(req.body);
    res.json({ success: true, settings: updated });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.post('/api/admin/change-pin', requireAdminAuth, (req, res) => {
  try {
    const { oldPin, newPin } = req.body;
    const result = adminService.changePin(oldPin, newPin);
    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }
    res.json({ success: true, message: result.message });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`========================================================`);
  console.log(`  🌟 Website Resmi & Portal Showcase: BuatDigital.id`);
  console.log(`  🌐 Website Utama : http://localhost:${PORT}`);
  console.log(`  🔐 Dashboard Admin: http://localhost:${PORT}/admin`);
  console.log(`========================================================`);
});
