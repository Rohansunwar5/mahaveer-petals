import crypto from 'crypto';
import config from '../config';
import axios from 'axios';
import shiprocketCatalogService from './shiprocketCatalog.service';
import orderService from './order.service';
import { CategoryRepository } from '../repository/category.repository';

class ShiprocketWebhookService {
  private baseUrl = 'https://checkout-api.shiprocket.com';
  private apiKey = config.SHIPROCKET_API_KEY;
  private secretKey = config.SHIPROCKET_SECRET_KEY;
  private categoryRepository = new CategoryRepository();

  /**
   * Generate HMAC-SHA256 signature in Base64 format
   * Used for outgoing webhooks TO Shiprocket
   */
  private generateHMAC(data: any): string {
    const dataString = JSON.stringify(data);
    return crypto
      .createHmac('sha256', this.secretKey)
      .update(dataString)
      .digest('base64');
  }

  /**
   * Send product update webhook to Shiprocket
   * Triggered when product is created or updated
   */
  async sendProductUpdateWebhook(productId: string) {
    try {
      const productData = await shiprocketCatalogService.formatProductUpdateWebhook(productId);
      const hmac = this.generateHMAC(productData);

      console.log('[Shiprocket Webhook] Sending product update:', {
        productId,
        url: `${this.baseUrl}/wh/v1/custom/product`,
      });

      const response = await axios.post(
        `${this.baseUrl}/wh/v1/custom/product`,
        productData,
        {
          headers: {
            'X-Api-Key': this.apiKey,
            'X-Api-HMAC-SHA256': hmac,
            'Content-Type': 'application/json',
          },
          timeout: 10000,
        }
      );

      console.log('[Shiprocket Webhook] Product update sent successfully:', response.status);
      return response.data;
    } catch (error: any) {
      console.error('[Shiprocket Webhook] Error sending product update:', {
        productId,
        error: error.response?.data || error.message,
        status: error.response?.status,
      });
      return null;
    }
  }

  /**
   * Send collection update webhook to Shiprocket
   * Triggered when collection/category is created or updated
   */
  async sendCollectionUpdateWebhook(collectionId: string) {
    try {
      const collection = await this.categoryRepository.getCategoryById(collectionId);

      if (!collection) {
        throw new Error(`Collection ${collectionId} not found`);
      }

      const data = {
        id: collection.shiprocketCollectionId || collection._id.toString(),
        updated_at: (collection as any).updatedAt?.toISOString() || new Date().toISOString(),
        body_html: collection.description || '',
        handle: collection.handle,
        image: {
          src: collection.image || '',
        },
        title: collection.name,
        created_at: (collection as any).createdAt?.toISOString() || new Date().toISOString(),
      };

      const hmac = this.generateHMAC(data);

      console.log('[Shiprocket Webhook] Sending collection update:', {
        collectionId,
        url: `${this.baseUrl}/wh/v1/custom/collection`,
      });

      const response = await axios.post(
        `${this.baseUrl}/wh/v1/custom/collection`,
        data,
        {
          headers: {
            'X-Api-Key': this.apiKey,
            'X-Api-HMAC-SHA256': hmac,
            'Content-Type': 'application/json',
          },
          timeout: 10000,
        }
      );

      console.log('[Shiprocket Webhook] Collection update sent successfully:', response.status);
      return response.data;
    } catch (error: any) {
      console.error('[Shiprocket Webhook] Error sending collection update:', {
        collectionId,
        error: error.response?.data || error.message,
        status: error.response?.status,
      });
      return null;
    }
  }

  /**
   * Handle incoming webhooks FROM Shiprocket
   * These are order status updates, payment confirmations, etc.
   */
  async handleOrderWebhook(rawBody: string, hmacHeader?: string) {
    // 1️⃣ Security first - verify HMAC
    this.verifyIncomingHMAC(rawBody, hmacHeader);

    // 2️⃣ Parse AFTER verification
    const payload = JSON.parse(rawBody);

    const eventType = this.resolveEventType(payload);

    console.log('[Shiprocket Webhook] Received order webhook:', {
      eventType,
      orderId: payload.order_id,
      status: payload.status,
    });

    try {
      switch (eventType) {
        case 'ORDER_SUCCESS':
          return await this.handleOrderSuccess(payload);

        case 'ORDER_FAILED':
          return await this.handleOrderFailed(payload);

        case 'ORDER_CANCELLED':
          return await this.handleOrderCancelled(payload);

        case 'ORDER_STATUS_UPDATE':
          return await this.handleOrderStatusUpdate(payload);

        case 'ORDER_INITIATED':
          // Just log, don't create order yet
          console.log('[Shiprocket Webhook] Order initiated:', payload.order_id);
          return { acknowledged: true };

        default:
          console.warn('[Shiprocket Webhook] Unknown event type:', eventType);
          return { ignored: true };
      }
    } catch (error: any) {
      console.error('[Shiprocket Webhook] Error processing webhook:', {
        eventType,
        orderId: payload.order_id,
        error: error.message,
      });
      // Re-throw so controller can handle
      throw error;
    }
  }

  // ============================================================================
  // Private methods for handling incoming order webhooks
  // ============================================================================

  private async handleOrderSuccess(payload: any) {
    console.log('[Shiprocket Webhook] Processing order success:', payload.order_id);

    // ✅ Create order from webhook data
    const order = await orderService.createOrderFromWebhook(payload);

    // ✅ Clear cart if user/session info available
    // Note: Shiprocket webhook doesn't provide user_id/session_id
    // You'll need to handle cart clearing differently
    // Option 1: Store cart_id in your cart and clear by cart_id
    // Option 2: Clear cart when user completes checkout on frontend
    
    if (payload.cart_id) {
      try {
        // If you have a method to clear cart by Shiprocket cart_id
        // await cartService.clearCartByShiprocketId(payload.cart_id);
      } catch (error) {
        console.error('[Shiprocket Webhook] Failed to clear cart:', error);
      }
    }

    return { success: true, order };
  }

  private async handleOrderFailed(payload: any) {
    console.log('[Shiprocket Webhook] Processing order failure:', payload.order_id);

    // ✅ Check if order exists first
    const order = await orderService.getOrderByShiprocketId(payload.order_id);
    
    if (!order) {
      console.warn('[Shiprocket Webhook] Order not found for failure update:', payload.order_id);
      // This is OK - order might not have been created yet if payment failed early
      return { acknowledged: true };
    }

    // ✅ Update payment status
    await orderService.updatePaymentStatus({
      orderId: order._id,
      paymentStatus: 'FAILED',
    });

    return { success: true };
  }

  private async handleOrderCancelled(payload: any) {
    console.log('[Shiprocket Webhook] Processing order cancellation:', payload.order_id);

    const order = await orderService.getOrderByShiprocketId(payload.order_id);
    
    if (!order) {
      console.warn('[Shiprocket Webhook] Order not found for cancellation:', payload.order_id);
      return { acknowledged: true };
    }

    // ✅ Cancel order and restore stock
    await orderService.cancelOrder({
      orderId: order._id,
      cancellationReason: payload.reason || payload.cancellation_reason || 'Cancelled via Shiprocket',
    });

    return { success: true };
  }

  private async handleOrderStatusUpdate(payload: any) {
    console.log('[Shiprocket Webhook] Processing order status update:', {
      orderId: payload.order_id,
      shipmentStatus: payload.shipment_status,
    });

    const order = await orderService.getOrderByShiprocketId(payload.order_id);
    
    if (!order) {
      console.warn('[Shiprocket Webhook] Order not found for status update:', payload.order_id);
      return { acknowledged: true };
    }

    // ✅ Map and update order status
    const newStatus = this.mapShipmentStatus(payload.shipment_status);
    await orderService.updateOrderStatus({
      orderId: order._id,
      orderStatus: newStatus,
    });

    // ✅ Update tracking info if provided
    if (payload.tracking_number || payload.shipment_id) {
      await orderService.updateTrackingInfo({
        orderId: order._id,
        trackingNumber: payload.tracking_number,
        shiprocketShipmentId: payload.shipment_id,
      });
    }

    return { success: true };
  }

  /**
   * Map Shiprocket shipment status to your order status
   */
  private mapShipmentStatus(status: string): string {
    const statusMap: Record<string, string> = {
      // Shiprocket statuses
      PICKED_UP: 'PROCESSING',
      IN_TRANSIT: 'SHIPPED',
      OUT_FOR_DELIVERY: 'OUT_FOR_DELIVERY',
      DELIVERED: 'DELIVERED',
      RTO: 'RETURNED',
      CANCELLED: 'CANCELLED',
      
      // Additional possible statuses
      PICKUP_SCHEDULED: 'PROCESSING',
      MANIFESTED: 'PROCESSING',
      DISPATCHED: 'SHIPPED',
      RETURNED: 'RETURNED',
      RTO_DELIVERED: 'RETURNED',
    };

    const mappedStatus = statusMap[status?.toUpperCase()];
    
    if (!mappedStatus) {
      console.warn('[Shiprocket Webhook] Unknown shipment status:', status);
      return 'PROCESSING';
    }

    return mappedStatus;
  }

  /**
   * Determine event type from webhook payload
   */
  private resolveEventType(payload: any): string {
    // Check explicit event field first
    if (payload.event) {
      return payload.event.toUpperCase();
    }

    // Check status field
    const status = payload.status?.toUpperCase();
    if (status === 'SUCCESS') return 'ORDER_SUCCESS';
    if (status === 'FAILED') return 'ORDER_FAILED';
    if (status === 'CANCELLED') return 'ORDER_CANCELLED';
    if (status === 'INITIATED') return 'ORDER_INITIATED';

    // Check shipment status
    if (payload.shipment_status) {
      return 'ORDER_STATUS_UPDATE';
    }

    return 'UNKNOWN';
  }

  /**
   * Verify incoming HMAC signature from Shiprocket
   * CRITICAL: This must use the raw request body
   */
  private verifyIncomingHMAC(rawBody: string, receivedHmac?: string): void {
    if (!receivedHmac) {
      throw new Error('Missing Shiprocket HMAC signature in X-Api-HMAC-SHA256 header');
    }

    // ✅ Compute HMAC from raw body
    const computedHmac = crypto
      .createHmac('sha256', this.secretKey)
      .update(rawBody)
      .digest('base64');

    // ✅ Use timing-safe comparison to prevent timing attacks
    const isValid = crypto.timingSafeEqual(
      new Uint8Array(Buffer.from(computedHmac, 'base64')),
      new Uint8Array(Buffer.from(receivedHmac, 'base64'))
    );

    if (!isValid) {
      console.error('[Shiprocket Webhook] HMAC verification failed:', {
        received: receivedHmac,
        computed: computedHmac,
      });
      throw new Error('Invalid Shiprocket webhook signature - possible tampering detected');
    }

    console.log('[Shiprocket Webhook] HMAC verification successful ✓');
  }
}

export default new ShiprocketWebhookService();