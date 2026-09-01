const midtransClient = require('midtrans-client');
const fs = require('fs');
const path = require('path');
const adminService = require('./adminService');
const salesService = require('./salesService');

class MidtransService {
  getSnapClient() {
    const settings = adminService.getSettings();
    if (!settings.midtransServerKey) {
      throw new Error('Midtrans Server Key belum diatur. Silakan atur di Dashboard Admin > Pengaturan.');
    }

    return new midtransClient.Snap({
      isProduction: Boolean(settings.midtransIsProduction),
      serverKey: settings.midtransServerKey,
      clientKey: settings.midtransClientKey
    });
  }

  getCoreClient() {
    const settings = adminService.getSettings();
    return new midtransClient.CoreApi({
      isProduction: Boolean(settings.midtransIsProduction),
      serverKey: settings.midtransServerKey,
      clientKey: settings.midtransClientKey
    });
  }

  /**
   * Create Snap Token for instant customer checkout
   */
  async createTransaction({ product, customer }) {
    const snap = this.getSnapClient();
    const orderId = `BD-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const finalPrice = product.discountPrice || product.price;

    if (!finalPrice || finalPrice <= 0) {
      throw new Error('Produk ini gratis atau tidak memerlukan pembayaran.');
    }

    const parameter = {
      transaction_details: {
        order_id: orderId,
        gross_amount: finalPrice
      },
      item_details: [{
        id: product.id || 'BD-ITEM',
        price: finalPrice,
        quantity: 1,
        name: (product.name || 'Produk Digital').slice(0, 50),
        category: product.category || 'Digital Product'
      }],
      customer_details: {
        first_name: customer.name || 'Pelanggan BuatDigital',
        email: customer.email || 'customer@buatdigital.id',
        phone: customer.phone || '081234567890'
      },
      callbacks: {
        finish: 'http://localhost:4000/?status=success&order_id=' + orderId
      }
    };

    const transaction = await snap.createTransaction(parameter);

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
      paymentMethod: 'Midtrans Payment Gateway',
      status: 'PENDING',
      notes: `Order Midtrans (Snap Token: ${transaction.token.slice(0, 10)}...)`
    });

    return {
      success: true,
      token: transaction.token,
      redirectUrl: transaction.redirect_url,
      orderId
    };
  }

  /**
   * Handle Midtrans Webhook Notification & Status Update
   */
  async handleNotification(notificationJson) {
    try {
      const apiClient = this.getCoreClient();
      const statusResponse = await apiClient.transaction.notification(notificationJson);

      const orderId = statusResponse.order_id;
      const transactionStatus = statusResponse.transaction_status;
      const fraudStatus = statusResponse.fraud_status;
      const paymentType = statusResponse.payment_type;

      console.log(`[Midtrans Webhook] Order: ${orderId}, Status: ${transactionStatus}, Payment: ${paymentType}`);

      let sales = salesService.getAllSales();
      let sale = sales.find(s => s.id === orderId);

      if (!sale) {
        console.warn(`[Midtrans] Order ${orderId} not found in local sales.`);
        return { success: false, message: 'Order not found' };
      }

      let isSuccess = false;

      if (transactionStatus === 'capture') {
        if (fraudStatus === 'accept') {
          sale.status = 'PAID';
          isSuccess = true;
        }
      } else if (transactionStatus === 'settlement') {
        sale.status = 'PAID';
        isSuccess = true;
      } else if (transactionStatus === 'cancel' || transactionStatus === 'deny' || transactionStatus === 'expire') {
        sale.status = 'FAILED';
      } else if (transactionStatus === 'pending') {
        sale.status = 'PENDING';
      }

      sale.paymentMethod = `Midtrans (${paymentType})`;
      sale.updatedAt = new Date().toISOString();
      salesService.saveSales(sales);

      // Auto-Provision License for CekDesilMassal if customer paid for Cek Desil Massal
      if (isSuccess && sale.customerEmail && sale.productName.toLowerCase().includes('cek desil')) {
        this.autoProvisionCekDesilLicense(sale.customerEmail, sale.customerName, orderId);
      }

      return { success: true, status: sale.status };

    } catch (err) {
      console.error('[Midtrans Notification Error]:', err.message);
      return { success: false, error: err.message };
    }
  }

  /**
   * Automatically adds buyer's email into CekDesilMassal licenses database upon successful payment!
   */
  autoProvisionCekDesilLicense(email, name, orderId) {
    try {
      const cekDesilLicenseFile = path.join(__dirname, '../../../CekDesilMassal/data/licenses.json');
      if (fs.existsSync(cekDesilLicenseFile)) {
        const raw = fs.readFileSync(cekDesilLicenseFile, 'utf8');
        const licenses = JSON.parse(raw || '[]');

        const cleanEmail = String(email).trim().toLowerCase();
        if (!licenses.some(l => l.email.toLowerCase() === cleanEmail)) {
          licenses.push({
            id: require('crypto').randomUUID(),
            email: cleanEmail,
            name: name || cleanEmail.split('@')[0],
            isActive: true,
            createdAt: new Date().toISOString(),
            notes: `Auto-activated via Midtrans Order #${orderId}`,
            activeSessionToken: null,
            lastLoginAt: null,
            lastDeviceInfo: null,
            lastIp: null,
            loginCount: 0
          });
          fs.writeFileSync(cekDesilLicenseFile, JSON.stringify(licenses, null, 2));
          console.log(`[Auto-License] Successfully created CekDesilMassal license for ${cleanEmail}!`);
        }
      }
    } catch (err) {
      console.error('[Auto-License Error]:', err.message);
    }
  }
}

module.exports = new MidtransService();
