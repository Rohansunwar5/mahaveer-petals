import orderModel, { IOrder } from '../models/order.model';
import mongoose from 'mongoose';

export interface ICreateOrderParams {
  userId?: string;
  sessionId?: string;
  shiprocketOrderId: string;
  orderNumber: string;
  items: Array<{
    variantId: mongoose.Types.ObjectId;
    shiprocketVariantId?: string;
    productName: string;
    sku: string;
    attributes: {
      size?: string;
      colorName?: string;
      colorHex?: string;
    };
    image?: string;
    quantity: number;
    price: number;
    subtotal: number;
  }>;
  shippingAddress: {
    name?: string;
    phone?: string;
    email?: string;
    addressLine1?: string;
    addressLine2?: string;
    city?: string;
    state?: string;
    pinCode?: string;
    country?: string;
  };
  // ✅ Added billing address
  billingAddress?: {
    name?: string;
    phone?: string;
    email?: string;
    addressLine1?: string;
    addressLine2?: string;
    city?: string;
    state?: string;
    pinCode?: string;
    country?: string;
  };
  paymentType: string;
  paymentStatus?: string; // ✅ Made optional with default in model
  orderStatus?: string; // ✅ Made optional with default in model
  pricing: {
    subtotal: number;
    discount: number;
    prepaidDiscount?: number; // ✅ Added prepaid discount
    shippingCharges: number;
    tax: number;
    total: number;
  };
  appliedCoupon?: {
    code: string;
    discountAmount: number;
  };
  appliedVoucher?: {
    code: string;
    discountAmount: number;
  };
  // ✅ Added Shiprocket specific fields
  shippingPlan?: string;
  rtoPrediction?: string;
  estimatedDeliveryDate?: Date;
  shiprocketCartId?: string;
  shiprocketFastrrOrderId?: string;
  trackingNumber?: string;
  shiprocketShipmentId?: string;
  notes?: string;
}

export class OrderRepository {
  private _model = orderModel;

  async createOrder(params: ICreateOrderParams): Promise<IOrder> {
    return this._model.create(params);
  }

  async getOrderById(orderId: string): Promise<IOrder | null> {
    return this._model.findById(orderId);
  }

  async getOrderByShiprocketId(
    shiprocketOrderId: string
  ): Promise<IOrder | null> {
    return this._model.findOne({ shiprocketOrderId });
  }

  async getOrderByOrderNumber(orderNumber: string): Promise<IOrder | null> {
    return this._model.findOne({ orderNumber });
  }

  async getOrdersByUserId(userId: string): Promise<IOrder[]> {
    return this._model.find({ userId }).sort({ createdAt: -1 });
  }

  // ✅ Added method to get orders by session (for guest checkout)
  async getOrdersBySessionId(sessionId: string): Promise<IOrder[]> {
    return this._model.find({ sessionId }).sort({ createdAt: -1 });
  }

  // ✅ Added method to get order by Shiprocket cart ID
  async getOrderByShiprocketCartId(cartId: string): Promise<IOrder | null> {
    return this._model.findOne({ shiprocketCartId: cartId });
  }

  async updateOrderStatus(params: {
    orderId: string;
    orderStatus: string;
  }): Promise<IOrder | null> {
    const { orderId, orderStatus } = params;

    const updateData: any = { orderStatus };

    // ✅ Set deliveredAt when order is delivered
    if (orderStatus === 'DELIVERED') {
      updateData.deliveredAt = new Date();
    }

    return this._model.findByIdAndUpdate(orderId, updateData, { new: true });
  }

  async updatePaymentStatus(params: {
    orderId: string;
    paymentStatus: string;
  }): Promise<IOrder | null> {
    const { orderId, paymentStatus } = params;

    return this._model.findByIdAndUpdate(
      orderId,
      { paymentStatus },
      { new: true }
    );
  }

  async updateTrackingInfo(params: {
    orderId: string;
    trackingNumber: string;
    shiprocketShipmentId?: string;
  }): Promise<IOrder | null> {
    const { orderId, trackingNumber, shiprocketShipmentId } = params;

    return this._model.findByIdAndUpdate(
      orderId,
      {
        trackingNumber,
        ...(shiprocketShipmentId && { shiprocketShipmentId }),
      },
      { new: true }
    );
  }

  // ✅ Updated to handle order status change as well
  async cancelOrder(params: {
    orderId: string;
    cancellationReason: string;
  }): Promise<IOrder | null> {
    const { orderId, cancellationReason } = params;

    return this._model.findByIdAndUpdate(
      orderId,
      {
        orderStatus: 'CANCELLED',
        paymentStatus: 'REFUNDED', // ✅ Auto-refund on cancellation
        cancellationReason,
        cancelledAt: new Date(),
      },
      { new: true }
    );
  }

  async addOrderNotes(params: {
    orderId: string;
    notes: string;
  }): Promise<IOrder | null> {
    const { orderId, notes } = params;

    return this._model.findByIdAndUpdate(orderId, { notes }, { new: true });
  }

  // ✅ Added method to link guest order to user after registration/login
  async linkOrderToUser(params: {
    orderId: string;
    userId: string;
  }): Promise<IOrder | null> {
    const { orderId, userId } = params;

    return this._model.findByIdAndUpdate(
      orderId,
      { userId, sessionId: null }, // Clear session when linking to user
      { new: true }
    );
  }

  // ✅ Added bulk link orders (useful when user logs in after multiple guest orders)
  async linkOrdersToUserByEmail(params: {
    email: string;
    userId: string;
  }): Promise<number> {
    const { email, userId } = params;

    const result = await this._model.updateMany(
      {
        'shippingAddress.email': email,
        userId: { $exists: false }, // Only guest orders
      },
      {
        $set: { userId },
        $unset: { sessionId: '' },
      }
    );

    return result.modifiedCount;
  }

  async getOrdersWithFilters(params: {
    userId?: string;
    sessionId?: string; // ✅ Added session filter for guest orders
    orderStatus?: string;
    paymentStatus?: string;
    paymentType?: string; // ✅ Added payment type filter
    startDate?: Date;
    endDate?: Date;
    page?: number;
    limit?: number;
  }): Promise<{ orders: IOrder[]; total: number }> {
    const {
      userId,
      sessionId,
      orderStatus,
      paymentStatus,
      paymentType,
      startDate,
      endDate,
      page = 1,
      limit = 10,
    } = params;

    const query: any = {};

    if (userId) query.userId = userId;
    if (sessionId) query.sessionId = sessionId;
    if (orderStatus) query.orderStatus = orderStatus;
    if (paymentStatus) query.paymentStatus = paymentStatus;
    if (paymentType) query.paymentType = paymentType;

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = startDate;
      if (endDate) query.createdAt.$lte = endDate;
    }

    const skip = (page - 1) * limit;

    const [orders, total] = await Promise.all([
      this._model.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit),
      this._model.countDocuments(query),
    ]);

    return { orders, total };
  }

  // ✅ Added method to get order statistics (useful for admin dashboard)
  async getOrderStats(params?: {
    userId?: string;
    startDate?: Date;
    endDate?: Date;
  }): Promise<{
    totalOrders: number;
    totalRevenue: number;
    pendingOrders: number;
    deliveredOrders: number;
    cancelledOrders: number;
  }> {
    const query: any = {};

    if (params?.userId) query.userId = params.userId;
    if (params?.startDate || params?.endDate) {
      query.createdAt = {};
      if (params.startDate) query.createdAt.$gte = params.startDate;
      if (params.endDate) query.createdAt.$lte = params.endDate;
    }

    const [
      totalOrders,
      totalRevenue,
      pendingOrders,
      deliveredOrders,
      cancelledOrders,
    ] = await Promise.all([
      this._model.countDocuments(query),
      this._model.aggregate([
        { $match: query },
        { $match: { orderStatus: { $ne: 'CANCELLED' } } },
        { $group: { _id: null, total: { $sum: '$pricing.total' } } },
      ]),
      this._model.countDocuments({ ...query, orderStatus: 'PENDING' }),
      this._model.countDocuments({ ...query, orderStatus: 'DELIVERED' }),
      this._model.countDocuments({ ...query, orderStatus: 'CANCELLED' }),
    ]);

    return {
      totalOrders,
      totalRevenue: totalRevenue[0]?.total || 0,
      pendingOrders,
      deliveredOrders,
      cancelledOrders,
    };
  }

  // ✅ Added method to get recent orders (useful for admin dashboard)
  async getRecentOrders(limit: number = 10): Promise<IOrder[]> {
    return this._model
      .find()
      .sort({ createdAt: -1 })
      .limit(limit);
  }

  // ✅ Added method to search orders
  async searchOrders(params: {
    searchTerm: string;
    page?: number;
    limit?: number;
  }): Promise<{ orders: IOrder[]; total: number }> {
    const { searchTerm, page = 1, limit = 10 } = params;

    const query = {
      $or: [
        { orderNumber: { $regex: searchTerm, $options: 'i' } },
        { shiprocketOrderId: { $regex: searchTerm, $options: 'i' } },
        { 'shippingAddress.email': { $regex: searchTerm, $options: 'i' } },
        { 'shippingAddress.phone': { $regex: searchTerm, $options: 'i' } },
        { 'shippingAddress.name': { $regex: searchTerm, $options: 'i' } },
      ],
    };

    const skip = (page - 1) * limit;

    const [orders, total] = await Promise.all([
      this._model.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit),
      this._model.countDocuments(query),
    ]);

    return { orders, total };
  }
}