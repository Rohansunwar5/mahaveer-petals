import axios, { AxiosInstance } from 'axios';
import config from '../config';
import { InternalServerError } from '../errors/internal-server.error';

export interface IShiprocketCheckoutParams {
  order_id: string;
  order_amount: number;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  billing_address: string;
  billing_city: string;
  billing_state: string;
  billing_pincode: string;
  billing_country: string;
  payment_method?: 'prepaid' | 'cod';
  redirect_url?: string;
  notify_url?: string;
}

export interface IShiprocketOrderParams {
  order_id: string;
  order_date: string;
  pickup_location: string;
  channel_id?: string;
  comment?: string;
  billing_customer_name: string;
  billing_last_name?: string;
  billing_address: string;
  billing_address_2?: string;
  billing_city: string;
  billing_pincode: string;
  billing_state: string;
  billing_country: string;
  billing_email: string;
  billing_phone: string;
  shipping_is_billing: boolean;
  shipping_customer_name?: string;
  shipping_last_name?: string;
  shipping_address?: string;
  shipping_address_2?: string;
  shipping_city?: string;
  shipping_pincode?: string;
  shipping_country?: string;
  shipping_state?: string;
  shipping_email?: string;
  shipping_phone?: string;
  order_items: Array<{
    name: string;
    sku: string;
    units: number;
    selling_price: number;
    discount?: number;
    tax?: number;
    hsn?: string;
  }>;
  payment_method: 'Prepaid' | 'COD';
  shipping_charges?: number;
  giftwrap_charges?: number;
  transaction_charges?: number;
  total_discount?: number;
  sub_total: number;
  length: number;
  breadth: number;
  height: number;
  weight: number;
}

export interface IShiprocketCourierParams {
  pickup_postcode: string;
  delivery_postcode: string;
  weight: number;
  cod: 0 | 1;
  order_amount?: number;
}

class ShiprocketService {
  private client: AxiosInstance;
  private token: string | null = null;
  private tokenExpiry: number = 0;

  constructor() {
    this.client = axios.create({
      baseURL: config.SHIPROCKET_BASE_URL || 'https://apiv2.shiprocket.in/v1/external',
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  private async getAuthToken(): Promise<string> {
    const now = Date.now();
    
    // Return cached token if still valid
    if (this.token && this.tokenExpiry > now) {
      return this.token;
    }

    try {
      const response = await axios.post(
        `${config.SHIPROCKET_BASE_URL || 'https://apiv2.shiprocket.in/v1/external'}/auth/login`,
        {
          email: config.SHIPROCKET_EMAIL,
          password: config.SHIPROCKET_PASSWORD,
        }
      );

      this.token = response.data.token;
      // Set expiry to 9 days (token valid for 10 days)
      this.tokenExpiry = now + 9 * 24 * 60 * 60 * 1000;

      return this.token!;
    } catch (error: any) {
      console.error('Shiprocket auth error:', error.response?.data || error.message);
      throw new InternalServerError('Failed to authenticate with Shiprocket');
    }
  }

  private async makeRequest(method: string, endpoint: string, data?: any) {
    try {
      const token = await this.getAuthToken();
      
      const response = await this.client.request({
        method,
        url: endpoint,
        data,
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      return response.data;
    } catch (error: any) {
      console.error(`Shiprocket ${method} ${endpoint} error:`, error.response?.data || error.message);
      throw error;
    }
  }

  async createQuickCheckout(params: IShiprocketCheckoutParams) {
    try {
      const payload = {
        ...params,
        payment_method: params.payment_method || 'prepaid',
        redirect_url: params.redirect_url || `${config.FRONTEND_URL}/order/payment/success`,
        notify_url: params.notify_url || `${config.BACKEND_URL}/api/webhooks/shiprocket/payment`,
      };

      return await this.makeRequest('POST', '/checkout/create', payload);
    } catch (error: any) {
      console.error('Shiprocket checkout creation error:', error.response?.data || error.message);
      throw new InternalServerError('Failed to create Shiprocket checkout');
    }
  }

  async createOrder(params: IShiprocketOrderParams) {
    try {
      return await this.makeRequest('POST', '/orders/create/adhoc', params);
    } catch (error: any) {
      console.error('Shiprocket order creation error:', error.response?.data || error.message);
      throw new InternalServerError('Failed to create Shiprocket order');
    }
  }

  async getOrderDetails(orderId: string) {
    try {
      return await this.makeRequest('GET', `/orders/show/${orderId}`);
    } catch (error: any) {
      console.error('Shiprocket get order error:', error.response?.data || error.message);
      throw error;
    }
  }

  async getAvailableCouriers(params: IShiprocketCourierParams) {
    try {
      return await this.makeRequest('GET', '/courier/serviceability', { params });
    } catch (error: any) {
      console.error('Shiprocket courier serviceability error:', error.response?.data || error.message);
      throw error;
    }
  }

  async assignCourier(shipmentId: number, courierId: number) {
    try {
      return await this.makeRequest('POST', '/courier/assign/awb', {
        shipment_id: shipmentId,
        courier_id: courierId,
      });
    } catch (error: any) {
      console.error('Shiprocket assign courier error:', error.response?.data || error.message);
      throw error;
    }
  }

  async generatePickup(shipmentId: number) {
    try {
      return await this.makeRequest('POST', '/courier/generate/pickup', {
        shipment_id: [shipmentId],
      });
    } catch (error: any) {
      console.error('Shiprocket generate pickup error:', error.response?.data || error.message);
      throw error;
    }
  }

  async trackShipment(awb: string) {
    try {
      return await this.makeRequest('GET', `/courier/track/awb/${awb}`);
    } catch (error: any) {
      console.error('Shiprocket track shipment error:', error.response?.data || error.message);
      throw error;
    }
  }

  async generateLabel(shipmentId: number[]) {
    try {
      return await this.makeRequest('POST', '/courier/generate/label', {
        shipment_id: shipmentId,
      });
    } catch (error: any) {
      console.error('Shiprocket generate label error:', error.response?.data || error.message);
      throw error;
    }
  }

  async generateManifest(shipmentId: number[]) {
    try {
      return await this.makeRequest('POST', '/manifests/generate', {
        shipment_id: shipmentId,
      });
    } catch (error: any) {
      console.error('Shiprocket generate manifest error:', error.response?.data || error.message);
      throw error;
    }
  }

  async generateInvoice(orderIds: number[]) {
    try {
      return await this.makeRequest('POST', '/orders/print/invoice', {
        ids: orderIds,
      });
    } catch (error: any) {
      console.error('Shiprocket generate invoice error:', error.response?.data || error.message);
      throw error;
    }
  }

  async cancelShipment(shipmentIds: number[]) {
    try {
      return await this.makeRequest('POST', '/orders/cancel/shipment/awbs', {
        awbs: shipmentIds,
      });
    } catch (error: any) {
      console.error('Shiprocket cancel shipment error:', error.response?.data || error.message);
      throw error;
    }
  }
}

export default new ShiprocketService();