const crypto = require('crypto');

/**
 * Syahaja Payment Gateway SDK Client for BuatDigital.id
 * Uses native fetch and crypto (Zero external dependencies)
 */
class SyahajaClient {
  /**
   * @param {Object} options
   * @param {string} options.gatewayUrl - Base URL of Syahaja Gateway (e.g. 'https://sypay.buatdigital.id')
   * @param {string} options.clientKey - Client API Key issued for your app
   * @param {string} options.secretKey - Secret Key for HMAC signature signing
   */
  constructor({ gatewayUrl, clientKey, secretKey }) {
    if (!gatewayUrl) throw new Error('gatewayUrl is required');
    if (!clientKey) throw new Error('clientKey is required');
    if (!secretKey) throw new Error('secretKey is required');

    this.gatewayUrl = gatewayUrl.replace(/\/+$/, '');
    this.clientKey = clientKey;
    this.secretKey = secretKey;
  }

  /**
   * Generate HMAC-SHA256 signature
   */
  generateSignature(payload) {
    const content = typeof payload === 'string' ? payload : JSON.stringify(payload);
    return crypto.createHmac('sha256', this.secretKey).update(content).digest('hex');
  }

  /**
   * Verify an incoming webhook from Syahaja Payment Gateway
   * @param {Object|string} payload - Raw or parsed body received in webhook endpoint
   * @param {string} signature - Header 'X-Syahaja-Signature'
   * @returns {boolean}
   */
  verifyWebhook(payload, signature) {
    if (!signature) return false;
    const expected = this.generateSignature(payload);
    try {
      return crypto.timingSafeEqual(Buffer.from(signature, 'hex'), Buffer.from(expected, 'hex'));
    } catch (e) {
      return false;
    }
  }

  /**
   * Create an invoice in Syahaja Pay
   * @param {Object} data
   * @returns {Promise<Object>}
   */
  async createInvoice(data) {
    const signature = this.generateSignature(data);
    const endpoint = `${this.gatewayUrl}/api/v1/invoices`;

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Client-Key': this.clientKey,
        'X-Signature': signature
      },
      body: JSON.stringify(data)
    });

    const resJson = await response.json();
    const isSuccess = response.ok && (resJson.status === 'success' || resJson.success === true);
    if (!isSuccess) {
      const msg = resJson.message || resJson.error || `HTTP ${response.status}`;
      throw new Error(`SyahajaClient: Failed to create invoice - ${msg}`);
    }

    return resJson.data;
  }

  /**
   * Check status of an invoice
   * @param {string} invoiceId
   * @returns {Promise<Object>}
   */
  async getInvoiceStatus(invoiceId) {
    const endpoint = `${this.gatewayUrl}/api/v1/invoices/${encodeURIComponent(invoiceId)}/status`;
    const response = await fetch(endpoint, {
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      }
    });

    const resJson = await response.json();
    const isSuccess = response.ok && (resJson.status === 'success' || resJson.success === true);
    if (!isSuccess) {
      const msg = resJson.message || resJson.error || `HTTP ${response.status}`;
      throw new Error(`SyahajaClient: Failed to get status - ${msg}`);
    }

    return resJson.data;
  }
}

module.exports = {
  SyahajaClient
};
