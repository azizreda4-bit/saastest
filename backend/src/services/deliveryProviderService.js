const axios = require('axios');
const config = require('../config');
const { encrypt, decrypt } = require('../utils/encryption');
const db = require('../database/connection');

class DeliveryProviderService {
  constructor(tenantId) {
    this.tenantId = tenantId;
    this.providers = new Map();
  }

  /**
   * Initialize provider configurations for tenant
   */
  async initialize() {
    const configs = await db('tenant_delivery_configs as tdc')
      .select([
        'tdc.*',
        'dpm.name',
        'dpm.slug',
        'dpm.api_type',
        'dpm.base_url',
        'dpm.configuration_schema'
      ])
      .join('delivery_providers_master as dpm', 'tdc.provider_id', 'dpm.id')
      .where('tdc.tenant_id', this.tenantId)
      .where('tdc.is_enabled', true)
      .where('dpm.is_active', true);

    for (const config of configs) {
      // Decrypt credentials
      const credentials = JSON.parse(decrypt(config.credentials));
      
      this.providers.set(config.slug, {
        id: config.provider_id,
        name: config.name,
        slug: config.slug,
        apiType: config.api_type,
        baseUrl: config.base_url,
        credentials,
        settings: config.settings || {},
        configId: config.id
      });
    }
  }

  /**
   * Sync order with delivery provider
   */
  async syncOrder(order) {
    if (!this.providers.size) {
      await this.initialize();
    }

    const provider = this.providers.get(order.deliveryProviderSlug);
    if (!provider) {
      return {
        success: false,
        error: 'Delivery provider not configured'
      };
    }

    try {
      switch (provider.slug) {
        case 'coliix':
          return await this.syncWithColiix(order, provider);
        case 'cathedis':
          return await this.syncWithCathedis(order, provider);
        case 'forcelog':
          return await this.syncWithForcelog(order, provider);
        case 'sendit':
          return await this.syncWithSendit(order, provider);
        case 'ozonexpress':
          return await this.syncWithOzonExpress(order, provider);
        case 'speedaf':
          return await this.syncWithSpeedaf(order, provider);
        case 'ameex':
          return await this.syncWithAmeex(order, provider);
        case 'vitex':
          return await this.syncWithVitex(order, provider);
        default:
          return {
            success: false,
            error: `Provider ${provider.slug} not implemented`
          };
      }
    } catch (error) {
      console.error(`Sync error with ${provider.slug}:`, error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Check delivery status for order
   */
  async checkDeliveryStatus(order) {
    if (!this.providers.size) {
      await this.initialize();
    }

    const provider = this.providers.get(order.deliveryProviderSlug);
    if (!provider || !order.trackingNumber) {
      return {
        success: false,
        error: 'Provider not configured or no tracking number'
      };
    }

    try {
      switch (provider.slug) {
        case 'coliix':
          return await this.checkColiixStatus(order, provider);
        case 'cathedis':
          return await this.checkCathedisStatus(order, provider);
        case 'forcelog':
          return await this.checkForcelogStatus(order, provider);
        case 'sendit':
          return await this.checkSenditStatus(order, provider);
        default:
          return {
            success: false,
            error: `Status check not implemented for ${provider.slug}`
          };
      }
    } catch (error) {
      console.error(`Status check error with ${provider.slug}:`, error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // ===============================================
  // COLIIX INTEGRATION
  // ===============================================

  async syncWithColiix(order, provider) {
    const payload = {
      action: 'add',
      token: provider.credentials.api_key,
      name: order.customerName,
      phone: order.customerPhone,
      marchandise: order.items.map(item => item.productName).join(', '),
      marchandise_qty: order.items.reduce((sum, item) => sum + item.quantity, 0),
      ville: order.cityName,
      adresse: order.address,
      note: order.deliveryNotes || '',
      price: order.totalAmount
    };

    const response = await axios.post(provider.baseUrl, new URLSearchParams(payload), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      timeout: config.deliveryProviders.coliix.timeout
    });

    if (response.data.status === 200) {
      return {
        success: true,
        trackingNumber: response.data.tracking,
        providerResponse: response.data
      };
    } else {
      return {
        success: false,
        error: response.data.msg || 'Unknown error'
      };
    }
  }

  async checkColiixStatus(order, provider) {
    const payload = {
      action: 'track',
      token: provider.credentials.api_key,
      tracking: order.trackingNumber
    };

    const response = await axios.post(provider.baseUrl, new URLSearchParams(payload), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      timeout: config.deliveryProviders.coliix.timeout
    });

    if (response.data.status === true && Array.isArray(response.data.msg)) {
      const latestStatus = response.data.msg[response.data.msg.length - 1];
      return {
        success: true,
        status: latestStatus.status.trim(),
        statusHistory: response.data.msg,
        providerResponse: response.data
      };
    } else {
      return {
        success: false,
        error: 'Invalid response format'
      };
    }
  }

  // ===============================================
  // CATHEDIS INTEGRATION
  // ===============================================

  async syncWithCathedis(order, provider) {
    // First, authenticate
    const sessionId = await this.authenticateCathedis(provider);
    
    const deliveryData = {
      recipient: order.customerName,
      phone: this.formatPhoneForCathedis(order.customerPhone),
      city: order.cityName || 'Casablanca',
      sector: 'Centre Ville',
      address: order.address,
      amount: order.totalAmount.toString(),
      nomOrder: order.orderNumber,
      comment: order.deliveryNotes || '',
      subject: order.items.map(item => item.productName).join(', '),
      rangeWeight: this.getWeightRange(order.totalWeight || 1),
      paymentType: 'ESPECES',
      deliveryType: 'Livraison CRBT',
      packageCount: '1'
    };

    const payload = {
      action: 'delivery.api.save',
      data: {
        context: {
          delivery: deliveryData
        }
      }
    };

    const response = await axios.post(`${provider.baseUrl}/ws/action`, payload, {
      headers: {
        'Cookie': sessionId,
        'Content-Type': 'application/json'
      },
      timeout: config.deliveryProviders.cathedis.timeout
    });

    if (response.data.status === 0 && response.data.data[0].values?.delivery) {
      return {
        success: true,
        trackingNumber: response.data.data[0].values.delivery.id,
        providerResponse: response.data
      };
    } else {
      const errorMsg = response.data.data?.[0]?.error?.message || 'Unknown error';
      return {
        success: false,
        error: errorMsg
      };
    }
  }

  async authenticateCathedis(provider) {
    const response = await axios.post(`${provider.baseUrl}/login.jsp`, {
      username: provider.credentials.username,
      password: provider.credentials.password
    }, {
      headers: { 'Content-Type': 'application/json' },
      maxRedirects: 0,
      validateStatus: status => status < 400
    });

    const cookies = response.headers['set-cookie'];
    if (!cookies) throw new Error('No cookies in response');

    for (const cookie of cookies) {
      const match = cookie.match(/JSESSIONID=([^;]+)/);
      if (match) return `JSESSIONID=${match[1]}`;
    }

    throw new Error('JSESSIONID not found');
  }

  formatPhoneForCathedis(phone) {
    phone = phone.toString().trim();
    if (phone.startsWith('0')) {
      return phone.replace(/^0/, '+212');
    }
    if (!phone.startsWith('+212')) {
      return '+212' + phone;
    }
    return phone;
  }

  getWeightRange(weight) {
    weight = parseFloat(weight) || 0;
    if (weight <= 5) return 'Entre 1.2 Kg et 5 Kg';
    if (weight <= 10) return 'Entre 6Kg et 10Kg';
    if (weight <= 29) return 'Entre 11Kg et 29Kg';
    return 'Plus de 30Kg';
  }

  async checkCathedisStatus(order, provider) {
    const sessionId = await this.authenticateCathedis(provider);
    
    const response = await axios.post(
      `${provider.baseUrl}/ws/rest/com.tracker.delivery.db.Delivery/${order.trackingNumber}/fetch`,
      {
        fields: [
          'nomOrder', 'importOrigin', 'allowOpening', 'city.name', 'subject',
          'paymentType.code', 'id', 'caution', 'sector.name', 'declaredValue',
          'selected', 'amount', 'rangeWeight', 'address', 'deliveryType.code',
          'length', 'weight', 'version', 'tags', 'deliveryChangedId', 'depth',
          'importId', 'notificationPhoneNumbers', 'phone', 'recipient.name',
          'width', 'comment', 'fragile', 'packageCount', 'deliveryStatus.type',
          'status'
        ]
      },
      {
        headers: {
          'Cookie': sessionId,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        timeout: config.deliveryProviders.cathedis.timeout
      }
    );

    if (response.status === 200) {
      const deliveryStatus = response.data.data[0]?.deliveryStatus?.name || 'Unknown';
      return {
        success: true,
        status: deliveryStatus,
        providerResponse: response.data
      };
    } else {
      return {
        success: false,
        error: `HTTP ${response.status}`
      };
    }
  }

  // ===============================================
  // FORCELOG INTEGRATION
  // ===============================================

  async syncWithForcelog(order, provider) {
    const payload = {
      ORDER_NUM: order.orderNumber,
      RECEIVER: order.customerName,
      PHONE: order.customerPhone,
      CITY: order.cityName,
      ADDRESS: order.address,
      COMMENT: order.deliveryNotes || '',
      PRODUCT_NATURE: order.items.map(item => item.productName).join(', '),
      COD: order.totalAmount,
      CAN_OPEN: '1'
    };

    const response = await axios.post(`${provider.baseUrl}/customer/Parcels/AddParcel`, payload, {
      headers: {
        'X-API-Key': provider.credentials.api_key,
        'Content-Type': 'application/json'
      },
      timeout: config.deliveryProviders.forcelog.timeout
    });

    if (response.data['ADD-PARCEL']?.RESULT === 'SUCCESS') {
      return {
        success: true,
        trackingNumber: response.data['ADD-PARCEL']['NEW-PARCEL']['TRACKING_NUMBER'],
        providerResponse: response.data
      };
    } else {
      return {
        success: false,
        error: response.data['ADD-PARCEL']?.MESSAGE || 'Unknown error'
      };
    }
  }

  async checkForcelogStatus(order, provider) {
    const payload = { Code: order.trackingNumber };

    const response = await axios.post(`${provider.baseUrl}/customer/Parcels/GetParcel`, payload, {
      headers: {
        'X-API-Key': provider.credentials.api_key,
        'Content-Type': 'application/json'
      },
      timeout: config.deliveryProviders.forcelog.timeout
    });

    if (response.data['GET-PARCEL']?.RESULT === 'SUCCESS') {
      return {
        success: true,
        status: response.data['GET-PARCEL']['PARCEL']['STATUS'],
        providerResponse: response.data
      };
    } else {
      return {
        success: false,
        error: response.data['GET-PARCEL']?.MESSAGE || 'Unknown error'
      };
    }
  }

  // ===============================================
  // SENDIT INTEGRATION
  // ===============================================

  async syncWithSendit(order, provider) {
    const deliveryData = {
      pickup_district_id: '1',
      district_id: order.cityApiId || '1',
      name: order.customerName,
      amount: order.totalAmount.toString(),
      address: order.address,
      phone: order.customerPhone,
      comment: order.deliveryNotes || '',
      reference: order.orderNumber,
      allow_open: '1',
      allow_try: '1',
      products_from_stock: '0',
      products: order.items.map(item => item.productName).join(' / '),
      packaging_id: '1',
      option_exchange: '0',
      delivery_exchange_id: '0'
    };

    const response = await axios.post(`${provider.baseUrl}/deliveries`, deliveryData, {
      headers: {
        'Authorization': `Bearer ${provider.credentials.access_token}`,
        'Content-Type': 'application/json'
      },
      timeout: config.deliveryProviders.sendit.timeout
    });

    if (response.data.success) {
      return {
        success: true,
        trackingNumber: response.data.data.code,
        providerResponse: response.data
      };
    } else {
      return {
        success: false,
        error: response.data.message || 'Unknown error'
      };
    }
  }

  async checkSenditStatus(order, provider) {
    const response = await axios.get(`${provider.baseUrl}/deliveries/${order.trackingNumber}`, {
      headers: {
        'Authorization': `Bearer ${provider.credentials.access_token}`,
        'Content-Type': 'application/json'
      },
      timeout: config.deliveryProviders.sendit.timeout
    });

    if (response.data.success) {
      return {
        success: true,
        status: response.data.data.status,
        providerResponse: response.data
      };
    } else {
      return {
        success: false,
        error: response.data.message || 'Unknown error'
      };
    }
  }

  // ===============================================
  // PLACEHOLDER IMPLEMENTATIONS FOR OTHER PROVIDERS
  // ===============================================

  async syncWithOzonExpress(order, provider) {
    // Implementation for OzonExpress
    throw new Error('OzonExpress integration not yet implemented');
  }

  async syncWithSpeedaf(order, provider) {
    // Implementation for Speedaf
    throw new Error('Speedaf integration not yet implemented');
  }

  async syncWithAmeex(order, provider) {
    // Implementation for Ameex
    throw new Error('Ameex integration not yet implemented');
  }

  async syncWithVitex(order, provider) {
    // Implementation for Vitex
    throw new Error('Vitex integration not yet implemented');
  }

  /**
   * Get available providers for tenant
   */
  async getAvailableProviders() {
    if (!this.providers.size) {
      await this.initialize();
    }

    return Array.from(this.providers.values()).map(provider => ({
      id: provider.id,
      name: provider.name,
      slug: provider.slug,
      apiType: provider.apiType,
      isConfigured: true
    }));
  }

  /**
   * Test provider connection
   */
  async testConnection(providerSlug) {
    if (!this.providers.size) {
      await this.initialize();
    }

    const provider = this.providers.get(providerSlug);
    if (!provider) {
      return {
        success: false,
        error: 'Provider not configured'
      };
    }

    try {
      // Implement basic connection test for each provider
      switch (provider.slug) {
        case 'cathedis':
          await this.authenticateCathedis(provider);
          return { success: true, message: 'Connection successful' };
        
        default:
          return { success: true, message: 'Connection test not implemented' };
      }
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }
}

module.exports = { DeliveryProviderService };