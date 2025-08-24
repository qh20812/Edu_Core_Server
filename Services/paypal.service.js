const axios = require('axios');

class PayPalService {
  constructor() {
    this.clientId = process.env.PAYPAL_CLIENT_ID;
    this.clientSecret = process.env.PAYPAL_CLIENT_SECRET;
    this.baseURL = process.env.PAYPAL_BASE_URL;
    this.accessToken = null;
    this.tokenExpiry = null;
  }

  // Get access token from PayPal
  async getAccessToken() {
    // Check if we have a valid token
    if (this.accessToken && this.tokenExpiry && Date.now() < this.tokenExpiry) {
      return this.accessToken;
    }

    try {
      const auth = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64');
      
      const response = await axios.post(
        `${this.baseURL}/v1/oauth2/token`,
        'grant_type=client_credentials',
        {
          headers: {
            'Authorization': `Basic ${auth}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        }
      );

      this.accessToken = response.data.access_token;
      // Set expiry to 90% of actual expiry to be safe
      this.tokenExpiry = Date.now() + (response.data.expires_in * 1000 * 0.9);
      
      return this.accessToken;
    } catch (error) {
      console.error('Error getting PayPal access token:', error.response?.data || error.message);
      throw new Error('Failed to get PayPal access token');
    }
  }

  // Create PayPal order
  async createOrder(orderData) {
    try {
      const accessToken = await this.getAccessToken();
      
      const response = await axios.post(
        `${this.baseURL}/v2/checkout/orders`,
        {
          intent: 'CAPTURE',
          purchase_units: [{
            amount: {
              currency_code: 'USD',
              value: orderData.amount.toString(),
            },
            description: orderData.description,
            custom_id: orderData.tenantId,
          }],
          application_context: {
            return_url: `${process.env.CLIENT_URL}/payment/success`,
            cancel_url: `${process.env.CLIENT_URL}/payment/cancel`,
            brand_name: 'EduCore',
            user_action: 'PAY_NOW',
          },
        },
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      return response.data;
    } catch (error) {
      console.error('Error creating PayPal order:', error.response?.data || error.message);
      throw new Error('Failed to create PayPal order');
    }
  }

  // Capture payment
  async captureOrder(orderId) {
    try {
      const accessToken = await this.getAccessToken();
      
      const response = await axios.post(
        `${this.baseURL}/v2/checkout/orders/${orderId}/capture`,
        {},
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      return response.data;
    } catch (error) {
      console.error('Error capturing PayPal order:', error.response?.data || error.message);
      throw new Error('Failed to capture PayPal payment');
    }
  }

  // Get order details
  async getOrderDetails(orderId) {
    try {
      const accessToken = await this.getAccessToken();
      
      const response = await axios.get(
        `${this.baseURL}/v2/checkout/orders/${orderId}`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      return response.data;
    } catch (error) {
      console.error('Error getting PayPal order details:', error.response?.data || error.message);
      throw new Error('Failed to get PayPal order details');
    }
  }

  // Convert VND to USD (simple conversion, you should use real exchange rates)
  convertVNDToUSD(vndAmount) {
    const exchangeRate = 24000; // 1 USD = 24,000 VND (approximate)
    return Math.round((vndAmount / exchangeRate) * 100) / 100; // Round to 2 decimal places
  }

  // Get plan pricing
  getPlanPricing() {
    return {
      small: {
        monthly: this.convertVNDToUSD(3000000), // ~125 USD
        yearly: this.convertVNDToUSD(28800000), // ~1200 USD
        maxStudents: 300,
      },
      medium: {
        monthly: this.convertVNDToUSD(5000000), // ~208 USD
        yearly: this.convertVNDToUSD(48000000), // ~2000 USD
        maxStudents: 700,
      },
      large: {
        monthly: this.convertVNDToUSD(7000000), // ~292 USD
        yearly: this.convertVNDToUSD(67200000), // ~2800 USD
        maxStudents: 900,
      },
    };
  }
}

module.exports = new PayPalService();
