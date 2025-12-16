import { OrderRepository } from '../repository/order.repository';
import productModel from '../models/product.model';
import cartModel from '../models/cart.model';
import { NotFoundError } from '../errors/not-found.error';
import { BadRequestError } from '../errors/bad-request.error';
import { IOrderAddress, IOrderItem } from '../models/order.model';
import { nanoid } from 'nanoid';

class OrderService {
  constructor(private readonly _orderRepo: OrderRepository) {}

  private generateOrderNumber(): string {
    const timestamp = Date.now();
    const random = nanoid(8).toUpperCase();
    return `ORD-${timestamp}-${random}`;
  }

  private async validateCartItems(cartItems: any[]) {
    const validatedItems: IOrderItem[] = [];

    for (const item of cartItems) {
      // Fetch product details
      const product = await productModel.findById(item.product);
      if (!product) {
        throw new NotFoundError(`Product ${item.product} not found`);
      }

      if (!product.isActive) {
        throw new BadRequestError(`Product ${product.name} is no longer available`);
      }

      // Find the specific color
      const productColor = product.colors.find(
        (c) => c.colorName === item.color.colorName
      );
      if (!productColor) {
        throw new BadRequestError(
          `Color ${item.color.colorName} not available for ${product.name}`
        );
      }

      // Find the specific size stock
      const sizeStock = productColor.sizeStock.find((s) => s.size === item.size);
      if (!sizeStock) {
        throw new BadRequestError(
          `Size ${item.size} not available for ${product.name} in ${item.color.colorName}`
        );
      }

      // Check stock availability
      if (sizeStock.stock < item.quantity) {
        throw new BadRequestError(
          `Insufficient stock for ${product.name} - ${item.color.colorName} - ${item.size}. Available: ${sizeStock.stock}`
        );
      }

      validatedItems.push({
        productId: product._id,
        productCode: product.productCode,
        name: product.name,
        price: product.price,
        quantity: item.quantity,
        size: item.size,
        color: {
          colorName: item.color.colorName,
          colorHex: item.color.colorHex,
        },
        selectedImage: item.selectedImage,
        hsn: product.hsn,
        gstRate: 0, // Configure GST rate as needed
      });
    }

    return validatedItems;
  }

  private calculateOrderTotals(params: {
    items: IOrderItem[];
    appliedCoupon?: { discountAmount: number };
    appliedVoucher?: { discountAmount: number };
    shippingAmount?: number;
  }) {
    const subtotal = params.items.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0
    );

    const couponDiscount = params.appliedCoupon?.discountAmount || 0;
    const voucherDiscount = params.appliedVoucher?.discountAmount || 0;
    const discountAmount = couponDiscount + voucherDiscount;

    const shippingAmount = params.shippingAmount || 0;

    // Calculate GST (if applicable)
    const gstAmount = params.items.reduce(
      (sum, item) => sum + (item.price * item.quantity * item.gstRate) / 100,
      0
    );

    const totalAmount = subtotal - discountAmount + shippingAmount + gstAmount;

    return {
      subtotal,
      discountAmount,
      shippingAmount,
      gstAmount,
      totalAmount: Math.max(totalAmount, 0),
    };
  }

  async createOrderFromCart(params: {
    userId?: string;
    sessionId?: string;
    shippingAddress: IOrderAddress;
    billingAddress?: IOrderAddress;
    customerNotes?: string;
    source?: string;
  }) {
    // Fetch cart
    const cart = await cartModel.findOne(
      params.userId
        ? { user: params.userId, isActive: true }
        : { sessionId: params.sessionId, isActive: true }
    );

    if (!cart || !cart.items.length) {
      throw new BadRequestError('Cart is empty');
    }

    // Validate cart items and get product details
    const validatedItems = await this.validateCartItems(cart.items);

    // Calculate totals
    const totals = this.calculateOrderTotals({
      items: validatedItems,
      appliedCoupon: cart.appliedCoupon,
      appliedVoucher: cart.appliedVoucher,
    });

    // Create order
    const order = await this._orderRepo.createOrder({
      orderNumber: this.generateOrderNumber(),
      userId: params.userId,
      sessionId: params.sessionId,
      isGuestOrder: !params.userId,
      items: validatedItems,
      subtotal: totals.subtotal,
      discountAmount: totals.discountAmount,
      shippingAmount: totals.shippingAmount,
      gstAmount: totals.gstAmount,
      totalAmount: totals.totalAmount,
      appliedCoupon: cart.appliedCoupon ? {
        code: cart.appliedCoupon.code,
        discountId: cart.appliedCoupon.discountId.toString(),
        discountAmount: cart.appliedCoupon.discountAmount,
      } : undefined,
      appliedVoucher: cart.appliedVoucher ? {
        code: cart.appliedVoucher.code,
        discountId: cart.appliedVoucher.discountId.toString(),
        discountAmount: cart.appliedVoucher.discountAmount,
      } : undefined,
      shippingAddress: params.shippingAddress,
      billingAddress: params.billingAddress || params.shippingAddress,
      customerNotes: params.customerNotes,
      source: params.source || 'web',
    });

    // Deactivate cart after order creation
    await cartModel.findByIdAndUpdate(cart._id, { isActive: false });

    return order;
  }

  async getOrderById(orderId: string) {
    const order = await this._orderRepo.getOrderById(orderId);
    if (!order) {
      throw new NotFoundError('Order not found');
    }
    return order;
  }

  async getOrderByOrderNumber(orderNumber: string) {
    const order = await this._orderRepo.getOrderByOrderNumber(orderNumber);
    if (!order) {
      throw new NotFoundError('Order not found');
    }
    return order;
  }

  async getUserOrders(userId: string, limit?: number) {
    return this._orderRepo.getOrdersByUserId(userId, limit);
  }

  async getGuestOrders(sessionId: string, limit?: number) {
    return this._orderRepo.getOrdersBySessionId(sessionId, limit);
  }

  async updateOrderStatus(params: {
    orderId: string;
    status: string;
    paymentStatus?: string;
    shipmentStatus?: string;
  }) {
    const order = await this._orderRepo.updateOrderStatus(params);
    if (!order) {
      throw new NotFoundError('Order not found');
    }
    return order;
  }

  async cancelOrder(params: {
    orderId: string;
    cancelledBy: string;
    cancellationReason?: string;
  }) {
    const order = await this._orderRepo.getOrderById(params.orderId);
    if (!order) {
      throw new NotFoundError('Order not found');
    }

    // Check if order can be cancelled
    const cancellableStatuses = [
      'created',
      'payment_pending',
      'payment_failed',
      'confirmed',
    ];
    if (!cancellableStatuses.includes(order.status)) {
      throw new BadRequestError(
        `Order cannot be cancelled in ${order.status} status`
      );
    }

    // Update product stock back
    for (const item of order.items) {
      const product = await productModel.findById(item.productId);
      if (product) {
        const color = product.colors.find(
          (c) => c.colorName === item.color.colorName
        );
        if (color) {
          const sizeStock = color.sizeStock.find((s) => s.size === item.size);
          if (sizeStock) {
            sizeStock.stock += item.quantity;
            await product.save();
          }
        }
      }
    }

    return this._orderRepo.cancelOrder(
      params.orderId,
      params.cancelledBy,
      params.cancellationReason
    );
  }

  async getOrdersByStatus(status: string, limit?: number, skip?: number) {
    return this._orderRepo.getOrdersByStatus(status, limit, skip);
  }

  async getRecentOrders(limit: number = 10) {
    return this._orderRepo.getRecentOrders(limit);
  }

  async linkPaymentToOrder(orderId: string, paymentId: string) {
    return this._orderRepo.updateOrderPaymentId(orderId, paymentId);
  }

  async linkShipmentToOrder(orderId: string, shipmentId: string) {
    return this._orderRepo.updateOrderShipmentId(orderId, shipmentId);
  }
}

export default new OrderService(new OrderRepository());