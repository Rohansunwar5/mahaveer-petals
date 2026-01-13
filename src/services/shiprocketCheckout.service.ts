import crypto from 'crypto';
import axios from 'axios';
import config from '../config';
import cartService from './cart.service';
import { BadRequestError } from '../errors/bad-request.error';

class ShiprocketCheckoutService {
  private baseUrl =
  config.NODE_ENV === 'production'
    ? 'https://checkout-api.shiprocket.com'
    : 'https://fastrr-api-dev.pickrr.com';
  private apiKey = config.SHIPROCKET_API_KEY;
  private secretKey = config.SHIPROCKET_SECRET_KEY;

  private sign(payload: any): string {
    return crypto
      .createHmac('sha256', this.secretKey)
      .update(JSON.stringify(payload))
      .digest('base64');
  }

  async generateToken(params: { userId?: string; sessionId?: string }) {
    const { userId, sessionId } = params;

    if (!userId && !sessionId) {
      throw new BadRequestError('User ID or Session ID is required');
    }

    // ✅ SINGLE SOURCE OF TRUTH
    const { cartData } = await cartService.getCartForShiprocketCheckout({
      userId,
      sessionId,
    });

    const payload = {
      cart_data: cartData,
      redirect_url: `${config.FRONTEND_URL}/checkout/success`,
      timestamp: new Date().toISOString(),
    };

    const hmac = this.sign(payload);

    const response = await axios.post(
      `${this.baseUrl}/api/v1/access-token/checkout`,
      payload,
      {
        headers: {
          'X-Api-Key': this.apiKey,
          'X-Api-HMAC-SHA256': hmac,
          'Content-Type': 'application/json',
        },
      }
    );

    const token = response.data?.result?.token;

    if (!token) {
      throw new BadRequestError('Failed to generate Shiprocket checkout token');
    }

    return token;
  }
}

export default new ShiprocketCheckoutService();