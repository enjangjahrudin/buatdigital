const fs = require('fs');
const path = require('path');
const { SyahajaClient } = require('./syahajaClient');
const adminService = require('./adminService');
const salesService = require('./salesService');
const emailService = require('./emailService');

class SyahajaService {
  getClient() {
    const settings = adminService.getSettings();
    const gatewayUrl = process.env.SYAHAJA_GATEWAY_URL || settings.syahajaGatewayUrl || 'https://sypay.buatdigital.id';
    const clientKey = process.env.SYAHAJA_CLIENT_KEY || settings.syahajaClientKey || 'syh_live_buatdigital_store_key';
    const secretKey = process.env.SYAHAJA_SECRET_KEY || settings.syahajaSecretKey || 'sec_buatdigital_store_secret_9944';

    return new SyahajaClient({
      gatewayUrl,
      clientKey,
      secretKey
    });
  }

  /**
   * Create Syahaja Pay invoice for instant customer checkout
   */
  async createTransaction({ product, customer }) {
    const client = this.getClient();
    const orderId = `BD-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const finalPrice = product.discountPrice || product.price;

    if (!finalPrice || finalPrice <= 0) {
      throw new Error('Produk ini gratis atau tidak memerlukan pembayaran.');
    }

    const invoiceData = {
      external_ref: orderId,
      title: product.name || 'Produk Digital BuatDigital.id',
      amount: finalPrice,
      payment_method: 'QRIS',
      payer_name: customer.name || 'Pelanggan BuatDigital',
      payer_email: customer.email || 'customer@buatdigital.id',
      payer_phone: customer.phone || '081234567890',
      callback_url: 'https://buatdigital.id/api/payment/syahaja-webhook',
      redirect_url: `https://buatdigital.id/?status=success&order_id=${encodeURIComponent(orderId)}`
    };

    const invoice = await client.createInvoice(invoiceData);

    const invoiceId = invoice.invoice_id || invoice.id;

    // Save preliminary pending sale in sales tracker
    salesService.addSale({
      id: orderId,
      productId: product.id,
      productName: product.name,
      customerName: customer.name,
      customerEmail: customer.email,
      customerPhone: customer.phone,
      amount: finalPrice,
      pricingType: product.pricingType,
      paymentMethod: 'Syahaja Pay',
      status: 'PENDING',
      notes: `Syahaja Pay Invoice #${invoiceId}`
    });

    return {
      success: true,
      invoiceId,
      paymentUrl: invoice.payment_url,
      redirectUrl: invoice.snap_redirect_url || invoice.payment_url,
      orderId
    };
  }

  /**
   * Handle incoming Syahaja Pay webhook notification
   */
  async handleWebhook(payload, signature) {
    const client = this.getClient();

    // Verify HMAC-SHA256 signature
    const isValid = client.verifyWebhook(payload, signature);
    if (!isValid) {
      console.error('[Syahaja Webhook] Invalid signature rejected!');
      throw new Error('Invalid signature');
    }

    const { event, data } = payload;
    const orderId = data?.external_ref;
    const invoiceId = data?.invoice_id;
    const paymentStatus = data?.status;
    const paymentMethod = data?.payment_method || 'QRIS';

    console.log(`[Syahaja Webhook] Event: ${event}, Invoice: ${invoiceId}, Order: ${orderId}, Status: ${paymentStatus}`);

    let sales = salesService.getAllSales();
    let sale = sales.find(s => s.id === orderId || (s.notes && s.notes.includes(invoiceId)));

    if (!sale) {
      console.warn(`[Syahaja Webhook] Order ${orderId} (Invoice ${invoiceId}) not found in local sales.`);
      return { success: false, message: 'Order not found' };
    }

    let isSuccess = false;

    if (event === 'payment.success' || paymentStatus === 'PAID') {
      sale.status = 'PAID';
      sale.paymentMethod = `Syahaja Pay (${paymentMethod})`;
      isSuccess = true;
    } else if (event === 'payment.refunded' || paymentStatus === 'REFUNDED') {
      sale.status = 'REFUNDED';
    } else if (paymentStatus === 'EXPIRED') {
      sale.status = 'EXPIRED';
    } else if (paymentStatus === 'FAILED') {
      sale.status = 'FAILED';
    }

    sale.updatedAt = new Date().toISOString();
    salesService.saveSales(sales);

    // Auto-provision license & send confirmation email if payment is successful
    if (isSuccess && sale.customerEmail) {
      // 1. Auto-Provision License for CekDesilMassal if applicable
      if (sale.productName && sale.productName.toLowerCase().includes('cek desil')) {
        this.autoProvisionCekDesilLicense(sale.customerEmail, sale.customerName, orderId);
      }

      // 2. Dispatch automated confirmation & license access email
      try {
        const appUrl = (sale.productName && sale.productName.toLowerCase().includes('cek desil'))
          ? 'https://cekdesil.buatdigital.id'
          : 'https://buatdigital.id';

        emailService.sendOrderLicenseEmail({
          customerName: sale.customerName,
          customerEmail: sale.customerEmail,
          productName: sale.productName,
          orderId: sale.id || orderId,
          amount: sale.amount,
          appUrl
        }).catch(err => {
          console.error('[Email Dispatch Background Error]:', err.message);
        });
      } catch (mailErr) {
        console.error('[Email Dispatch Error]:', mailErr.message);
      }
    }

    return { success: true, status: sale.status };
  }

  /**
   * Automatically adds buyer's email into CekDesilMassal licenses database upon successful payment.
   * Checks multiple common paths across local dev & Linux VPS deployment.
   */
  autoProvisionCekDesilLicense(email, name, orderId) {
    try {
      const candidates = [
        path.join(__dirname, '../../../CekDesilMassal/data/licenses.json'),
        path.join(__dirname, '../../../cekdesil.buatdigital.id/data/licenses.json'),
        path.join(__dirname, '../../../cekdesil/data/licenses.json'),
        '/www/wwwroot/cekdesil.buatdigital.id/data/licenses.json',
        '/www/wwwroot/CekDesilMassal/data/licenses.json',
        '/www/wwwroot/cekdesil/data/licenses.json'
      ];

      const cleanEmail = String(email || '').trim().toLowerCase();
      let updatedCount = 0;

      for (const targetFile of candidates) {
        try {
          const targetDir = path.dirname(targetFile);
          if (fs.existsSync(targetDir)) {
            let licenses = [];
            if (fs.existsSync(targetFile)) {
              const raw = fs.readFileSync(targetFile, 'utf8');
              licenses = JSON.parse(raw || '[]');
            }

            if (!licenses.some(l => l.email.toLowerCase() === cleanEmail)) {
              licenses.push({
                id: require('crypto').randomUUID(),
                email: cleanEmail,
                name: name || cleanEmail.split('@')[0],
                isActive: true,
                createdAt: new Date().toISOString(),
                notes: `Auto-activated via Syahaja Pay Order #${orderId}`,
                activeSessionToken: null,
                lastLoginAt: null,
                lastDeviceInfo: null,
                lastIp: null,
                loginCount: 0
              });
              fs.writeFileSync(targetFile, JSON.stringify(licenses, null, 2));
              console.log(`[Auto-License] Created CekDesilMassal license for ${cleanEmail} at ${targetFile}`);
              updatedCount++;
            } else {
              console.log(`[Auto-License] License already exists for ${cleanEmail} at ${targetFile}`);
              updatedCount++;
            }
          }
        } catch (fileErr) {
          console.warn(`[Auto-License] Skipped checking ${targetFile}:`, fileErr.message);
        }
      }

      if (updatedCount === 0) {
        console.warn(`[Auto-License Warning]: No valid CekDesilMassal data directory found to store license for ${cleanEmail}`);
      }
    } catch (err) {
      console.error('[Auto-License Error]:', err.message);
    }
  }
}

module.exports = new SyahajaService();
