import { OrderRepository } from '../repository/order.repository';
import { CartRepository } from '../repository/cart.repository';
import { NotFoundError } from '../errors/not-found.error';
import { BadRequestError } from '../errors/bad-request.error';
import productVariantModel from '../models/productVariant.model';
import productModel from '../models/product.model';
import mongoose from 'mongoose';
import mailService from './mail.service';

class OrderService {
  constructor(
    private readonly _orderRepository: OrderRepository,
    private readonly _cartRepository: CartRepository
  ) {}

  async createOrderFromWebhook(webhookData: any) {
    const {
      order_id,
      cart_data,
      status,
      phone,
      email,
      payment_type,
      payment_status,
      total_amount_payable,
      shipping_address,
      billing_address,
      coupon_codes,
      coupon_discount,
      prepaid_discount,
      total_discount,
      subtotal_price,
      shipping_charges,
      shipping_plan,
      rto_prediction,
      edd, // Estimated delivery date
      cart_id,
      fastrr_order_id,
      discount_detail,
    } = webhookData;

    // ✅ Validate order status
    if (status !== 'SUCCESS') {
      throw new BadRequestError('Order status is not SUCCESS');
    }

    // ✅ Check for duplicate orders (webhook may be sent multiple times)
    const existingOrder = await this._orderRepository.getOrderByShiprocketId(order_id);
    if (existingOrder) {
      console.log('[Order Service] Duplicate order webhook ignored:', order_id);
      return existingOrder;
    }

    // ✅ Generate order number
    const orderNumber = await this.generateOrderNumber();

    // ✅ Map cart items to order items
    const orderItems = await Promise.all(
      cart_data.items.map(async (item: any) => {
        const variant = await productVariantModel.findOne({
          shiprocketVariantId: item.variant_id,
        });

        if (!variant) {
          throw new NotFoundError(
            `Variant not found for Shiprocket ID: ${item.variant_id}`
          );
        }

        const product = await productModel.findById(variant.productId);
        if (!product) {
          throw new NotFoundError(
            `Product not found for variant: ${variant._id}`
          );
        }

        return {
          variantId: variant._id,
          shiprocketVariantId: variant.shiprocketVariantId,
          productName: product.name,
          sku: variant.sku,
          attributes: variant.attributes,
          image: variant.image,
          quantity: item.quantity,
          price: variant.price,
          subtotal: variant.price * item.quantity,
        };
      })
    );

    // ✅ Map payment type (PREPAID only, no COD)
    const paymentTypeMap: Record<string, string> = {
      PREPAID: 'PREPAID',
      UPI: 'UPI',
      CARD: 'CARD',
      WALLET: 'WALLET',
    };

    // ✅ Map payment status
    const paymentStatusMap: Record<string, string> = {
      Success: 'PAID',
      Pending: 'PENDING',
      Failed: 'FAILED',
    };

    // ✅ Helper function to format address
    const formatAddress = (addr: any, fallbackPhone?: string, fallbackEmail?: string) => {
      if (!addr) return undefined;
      
      return {
        name: addr.first_name && addr.last_name
          ? `${addr.first_name} ${addr.last_name}`.trim()
          : addr.first_name || addr.last_name || '',
        phone: addr.phone || fallbackPhone || '',
        email: addr.email || fallbackEmail || '',
        addressLine1: addr.line1 || '',
        addressLine2: addr.line2 || '',
        city: addr.city || '',
        state: addr.state || '',
        pinCode: addr.pincode || '',
        country: addr.country || 'India',
      };
    };

    // ✅ Calculate pricing
    const pricing = {
      subtotal: subtotal_price || orderItems.reduce((sum, item) => sum + item.subtotal, 0),
      discount: coupon_discount || 0,
      prepaidDiscount: prepaid_discount || 0,
      shippingCharges: shipping_charges || 0,
      tax: 0,
      total: total_amount_payable,
    };

    // ✅ Parse estimated delivery date
    let estimatedDeliveryDate: Date | undefined;
    if (edd) {
      try {
        estimatedDeliveryDate = new Date(edd);
      } catch (error) {
        console.error('[Order Service] Failed to parse EDD:', edd);
      }
    }

    // ✅ Create order with all fields
    const order = await this._orderRepository.createOrder({
      shiprocketOrderId: order_id,
      orderNumber,
      items: orderItems,

      // ✅ Shipping address
      shippingAddress: formatAddress(shipping_address, phone, email),

      // ✅ Billing address
      ...(billing_address && {
        billingAddress: formatAddress(billing_address, phone, email),
      }),

      // ✅ Payment info
      paymentType: paymentTypeMap[payment_type] || 'PREPAID',
      paymentStatus: paymentStatusMap[payment_status] || 'PENDING',

      // ✅ Pricing
      pricing,

      // ✅ Coupon (take first code if multiple)
      ...(coupon_codes && coupon_codes.length > 0 && {
        appliedCoupon: {
          code: coupon_codes[0],
          discountAmount: coupon_discount || 0,
        },
      }),

      // ✅ Shiprocket specific fields
      ...(shipping_plan && { shippingPlan: shipping_plan }),
      ...(rto_prediction && { rtoPrediction: rto_prediction }),
      ...(estimatedDeliveryDate && { estimatedDeliveryDate }),
      ...(cart_id && { shiprocketCartId: cart_id }),
      ...(fastrr_order_id && { shiprocketFastrrOrderId: fastrr_order_id }),

      // Set initial order status
      orderStatus: 'CONFIRMED',
    });

    // ✅ Update stock
    await this.updateStock(orderItems);

    // ✅ Send confirmation email
    const recipientEmail = shipping_address?.email || email;
    if (recipientEmail) {
      await this.sendOrderConfirmationEmail(order);
    }

    console.log('[Order Service] Order created successfully:', {
      orderId: order._id,
      orderNumber: order.orderNumber,
      shiprocketOrderId: order_id,
      paymentType: order.paymentType,
      total: order.pricing.total,
    });

    return order;
  }

  async getOrderById(orderId: string) {
    const order = await this._orderRepository.getOrderById(orderId);
    if (!order) throw new NotFoundError('Order not found');
    return order;
  }

  async getOrderByShiprocketId(shiprocketOrderId: string) {
    return this._orderRepository.getOrderByShiprocketId(shiprocketOrderId);
  }

  async getUserOrders(params: {
    userId: string;
    page?: number;
    limit?: number;
    orderStatus?: string;
    paymentStatus?: string;
  }) {
    const { userId, page, limit, orderStatus, paymentStatus } = params;
    return this._orderRepository.getOrdersWithFilters({
      userId,
      orderStatus,
      paymentStatus,
      page,
      limit,
    });
  }

  async updateOrderStatus(params: { orderId: string; orderStatus: string }) {
    const order = await this._orderRepository.updateOrderStatus(params);
    if (!order) throw new NotFoundError('Order not found');
    return order;
  }

  async updatePaymentStatus(params: { orderId: string; paymentStatus: string }) {
    const order = await this._orderRepository.updatePaymentStatus(params);
    if (!order) throw new NotFoundError('Order not found');
    return order;
  }

  async updateTrackingInfo(params: {
    orderId: string;
    trackingNumber: string;
    shiprocketShipmentId?: string;
  }) {
    const order = await this._orderRepository.updateTrackingInfo(params);
    if (!order) throw new NotFoundError('Order not found');
    return order;
  }

  async cancelOrder(params: { orderId: string; cancellationReason: string }) {
    const order = await this._orderRepository.cancelOrder(params);
    if (!order) throw new NotFoundError('Order not found');
    await this.restoreStock(order.items);
    return order;
  }

  private async generateOrderNumber(): Promise<string> {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000)
      .toString()
      .padStart(3, '0');
    return `ORD${timestamp}${random}`;
  }

  private async restoreStock(items: any[]) {
    // Optimize with bulkWrite
    const bulkOps = items.map((item) => ({
      updateOne: {
        filter: { _id: item.variantId },
        update: { $inc: { stock: item.quantity } },
      },
    }));

    if (bulkOps.length > 0) {
      await productVariantModel.bulkWrite(bulkOps);
    }
  }

  private async updateStock(items: any[]) {
    // Optimize with bulkWrite
    const bulkOps = items.map((item) => ({
      updateOne: {
        filter: { _id: item.variantId },
        update: { $inc: { stock: -item.quantity } },
      },
    }));

    if (bulkOps.length > 0) {
      await productVariantModel.bulkWrite(bulkOps);
    }
  }

  private async sendOrderConfirmationEmail(order: any) {
    try {
      await mailService.sendEmail(
        order.shippingAddress.email,
        'order-confirmation.ejs',
        {
          orderNumber: order.orderNumber,
          customerName: order.shippingAddress.name,
          items: order.items,
          subtotal: order.pricing.subtotal,
          discount: order.pricing.discount,
          prepaidDiscount: order.pricing.prepaidDiscount,
          shippingCharges: order.pricing.shippingCharges,
          total: order.pricing.total,
          shippingAddress: order.shippingAddress,
          paymentType: order.paymentType,
          estimatedDeliveryDate: order.estimatedDeliveryDate,
        },
        `Order Confirmation - ${order.orderNumber}`
      );
      console.log('[Order Service] Confirmation email sent:', order.orderNumber);
    } catch (error) {
      console.error('[Order Service] Failed to send confirmation email:', error);
    }
  }
}

export default new OrderService(new OrderRepository(), new CartRepository());