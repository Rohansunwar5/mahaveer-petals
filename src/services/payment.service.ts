import { PaymentRepository } from '../repository/payment.repository';
import { OrderRepository } from '../repository/order.repository';
import shiprocketService from './shiprocket.service';
import { NotFoundError } from '../errors/not-found.error';
import { BadRequestError } from '../errors/bad-request.error';
import { InternalServerError } from '../errors/internal-server.error';

class PaymentService {
  constructor(
    private readonly _paymentRepo: PaymentRepository,
    private readonly _orderRepo: OrderRepository
  ) {}

  async createPayment(params: {
    orderId: string;
    orderNumber: string;
    userId?: string;
    sessionId?: string;
    provider: string;
    amount: number;
    method?: string;
  }) {
    const payment = await this._paymentRepo.createPayment({
      orderId: params.orderId,
      orderNumber: params.orderNumber,
      userId: params.userId,
      sessionId: params.sessionId,
      provider: params.provider,
      amount: params.amount,
      method: params.method,
    });

    // Link payment to order
    await this._orderRepo.updateOrderPaymentId(params.orderId, payment._id);

    return payment;
  }

  async initiateShiprocketCheckout(params: {
    orderId: string;
    shippingAddress: {
      name: string;
      email: string;
      phone: string;
      addressLine1: string;
      city: string;
      state: string;
      pincode: string;
      country: string;
    };
  }) {
    const order = await this._orderRepo.getOrderById(params.orderId);
    if (!order) {
      throw new NotFoundError('Order not found');
    }

    // Check if payment already exists for this order
    let payment = await this._paymentRepo.getPaymentByOrderId(params.orderId);

    if (!payment) {
      // Create payment record
      payment = await this.createPayment({
        orderId: order._id,
        orderNumber: order.orderNumber,
        userId: order.userId,
        sessionId: order.sessionId,
        provider: 'shiprocket',
        amount: order.totalAmount,
      });
    }

    // Check if checkout already created
    if (payment.shiprocketCheckoutId && payment.checkoutUrl) {
      return {
        paymentId: payment._id,
        checkoutUrl: payment.checkoutUrl,
        shiprocketCheckoutId: payment.shiprocketCheckoutId,
      };
    }

    try {
      // Create Shiprocket Quick Checkout
      const checkoutResponse = await shiprocketService.createQuickCheckout({
        order_id: order.orderNumber,
        order_amount: order.totalAmount,
        customer_name: params.shippingAddress.name,
        customer_email: params.shippingAddress.email,
        customer_phone: params.shippingAddress.phone,
        billing_address: params.shippingAddress.addressLine1,
        billing_city: params.shippingAddress.city,
        billing_state: params.shippingAddress.state,
        billing_pincode: params.shippingAddress.pincode,
        billing_country: params.shippingAddress.country,
        payment_method: 'prepaid',
      });

      // Update payment with checkout details
      await this._paymentRepo.updatePaymentCheckoutDetails(
        payment._id,
        checkoutResponse.checkout_id,
        checkoutResponse.order_id,
        checkoutResponse.checkout_url,
        checkoutResponse
      );

      // Update order status
      await this._orderRepo.updateOrderStatus({
        orderId: order._id,
        status: 'payment_pending',
        paymentStatus: 'pending',
      });

      return {
        paymentId: payment._id,
        checkoutUrl: checkoutResponse.checkout_url,
        shiprocketCheckoutId: checkoutResponse.checkout_id,
      };
    } catch (error: any) {
      console.error('Shiprocket checkout initiation error:', error);
      throw new InternalServerError('Failed to initiate payment checkout');
    }
  }

  async handlePaymentSuccess(params: {
    checkoutId?: string;
    transactionId: string;
    gatewayTransactionId?: string;
    orderNumber?: string;
    method?: string;
    amount?: number;
    webhookData?: any;
  }) {
    let payment;

    if (params.checkoutId) {
      payment = await this._paymentRepo.getPaymentByCheckoutId(params.checkoutId);
    } else if (params.orderNumber) {
      const order = await this._orderRepo.getOrderByOrderNumber(params.orderNumber);
      if (order) {
        payment = await this._paymentRepo.getPaymentByOrderId(order._id);
      }
    } else if (params.transactionId) {
      payment = await this._paymentRepo.getPaymentByTransactionId(params.transactionId);
    }

    if (!payment) {
      throw new NotFoundError('Payment not found');
    }

    // Idempotency check - if already completed, return
    if (payment.status === 'completed') {
      return payment;
    }

    // Mark payment as completed
    const updatedPayment = await this._paymentRepo.markPaymentCompleted(
      payment._id,
      params.transactionId,
      params.gatewayTransactionId,
      params.method,
      params.webhookData
    );

    // Update order status
    await this._orderRepo.updateOrderStatus({
      orderId: payment.orderId,
      status: 'confirmed',
      paymentStatus: 'completed',
    });

    return updatedPayment;
  }

  async handlePaymentFailure(params: {
    checkoutId?: string;
    transactionId?: string;
    orderNumber?: string;
    errorCode?: string;
    errorMessage?: string;
    failureReason?: string;
    webhookData?: any;
  }) {
    let payment;

    if (params.checkoutId) {
      payment = await this._paymentRepo.getPaymentByCheckoutId(params.checkoutId);
    } else if (params.orderNumber) {
      const order = await this._orderRepo.getOrderByOrderNumber(params.orderNumber);
      if (order) {
        payment = await this._paymentRepo.getPaymentByOrderId(order._id);
      }
    } else if (params.transactionId) {
      payment = await this._paymentRepo.getPaymentByTransactionId(params.transactionId);
    }

    if (!payment) {
      throw new NotFoundError('Payment not found');
    }

    // Mark payment as failed
    const updatedPayment = await this._paymentRepo.markPaymentFailed(
      payment._id,
      params.errorCode,
      params.errorMessage,
      params.failureReason,
      params.webhookData
    );

    // Update order status
    await this._orderRepo.updateOrderStatus({
      orderId: payment.orderId,
      status: 'payment_failed',
      paymentStatus: 'failed',
    });

    return updatedPayment;
  }

  async getPaymentById(paymentId: string) {
    const payment = await this._paymentRepo.getPaymentById(paymentId);
    if (!payment) {
      throw new NotFoundError('Payment not found');
    }
    return payment;
  }

  async getPaymentByOrderId(orderId: string) {
    const payment = await this._paymentRepo.getPaymentByOrderId(orderId);
    if (!payment) {
      throw new NotFoundError('Payment not found for this order');
    }
    return payment;
  }

  async initiateRefund(params: {
    paymentId: string;
    refundAmount: number;
    refundTransactionId?: string;
  }) {
    const payment = await this._paymentRepo.getPaymentById(params.paymentId);
    if (!payment) {
      throw new NotFoundError('Payment not found');
    }

    if (payment.status !== 'completed') {
      throw new BadRequestError('Can only refund completed payments');
    }

    if (params.refundAmount > payment.amount) {
      throw new BadRequestError('Refund amount cannot exceed payment amount');
    }

    // Initiate refund
    const updatedPayment = await this._paymentRepo.initiateRefund(
      payment._id,
      params.refundAmount,
      params.refundTransactionId
    );

    // Update order status
    await this._orderRepo.updateOrderStatus({
      orderId: payment.orderId,
      status: 'refunded',
      paymentStatus: 'refunded',
    });

    return updatedPayment;
  }

  async retryPayment(orderId: string) {
    const payment = await this._paymentRepo.getPaymentByOrderId(orderId);
    if (!payment) {
      throw new NotFoundError('Payment not found');
    }

    if (payment.status === 'completed') {
      throw new BadRequestError('Payment already completed');
    }

    // Reset payment status to pending
    await this._paymentRepo.updatePaymentStatus({
      paymentId: payment._id,
      status: 'pending',
    });

    // Return existing checkout URL if available
    if (payment.checkoutUrl) {
      return {
        checkoutUrl: payment.checkoutUrl,
        paymentId: payment._id,
      };
    }

    throw new BadRequestError('No checkout URL available for retry');
  }
}

export default new PaymentService(
  new PaymentRepository(),
  new OrderRepository()
);