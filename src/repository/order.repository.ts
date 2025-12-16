import orderModel, { IOrder, IOrderItem, IOrderAddress } from '../models/order.model';

export interface ICreateOrderParams {
  orderNumber: string;
  userId?: string;
  sessionId?: string;
  isGuestOrder: boolean;
  items: IOrderItem[];
  subtotal: number;
  discountAmount: number;
  shippingAmount: number;
  gstAmount: number;
  totalAmount: number;
  appliedCoupon?: {
    code: string;
    discountId: string;
    discountAmount: number;
  };
  appliedVoucher?: {
    code: string;
    discountId: string;
    discountAmount: number;
  };
  shippingAddress: IOrderAddress;
  billingAddress: IOrderAddress;
  customerNotes?: string;
  source?: string;
}

export interface IUpdateOrderStatusParams {
  orderId: string;
  status: string;
  paymentStatus?: string;
  shipmentStatus?: string;
}

export class OrderRepository {
  private _model = orderModel;

  async createOrder(params: ICreateOrderParams): Promise<IOrder> {
    return this._model.create(params);
  }

  async getOrderById(orderId: string): Promise<IOrder | null> {
    return this._model.findById(orderId);
  }

  async getOrderByOrderNumber(orderNumber: string): Promise<IOrder | null> {
    return this._model.findOne({ orderNumber });
  }

  async getOrdersByUserId(userId: string, limit?: number): Promise<IOrder[]> {
    const query = this._model.find({ userId }).sort({ createdAt: -1 });
    if (limit) {
      query.limit(limit);
    }
    return query;
  }

  async getOrdersBySessionId(sessionId: string, limit?: number): Promise<IOrder[]> {
    const query = this._model.find({ sessionId }).sort({ createdAt: -1 });
    if (limit) {
      query.limit(limit);
    }
    return query;
  }

  async updateOrderStatus(params: IUpdateOrderStatusParams): Promise<IOrder | null> {
    const { orderId, status, paymentStatus, shipmentStatus } = params;
    const updateData: any = { status };
    
    if (paymentStatus) {
      updateData.paymentStatus = paymentStatus;
    }
    if (shipmentStatus) {
      updateData.shipmentStatus = shipmentStatus;
    }

    return this._model.findByIdAndUpdate(orderId, updateData, { new: true });
  }

  async updateOrderPaymentId(orderId: string, paymentId: string): Promise<IOrder | null> {
    return this._model.findByIdAndUpdate(
      orderId,
      { paymentId },
      { new: true }
    );
  }

  async updateOrderShipmentId(orderId: string, shipmentId: string): Promise<IOrder | null> {
    return this._model.findByIdAndUpdate(
      orderId,
      { shipmentId },
      { new: true }
    );
  }

  async cancelOrder(
    orderId: string,
    cancelledBy: string,
    cancellationReason?: string
  ): Promise<IOrder | null> {
    return this._model.findByIdAndUpdate(
      orderId,
      {
        status: 'cancelled',
        cancelledAt: new Date(),
        cancelledBy,
        cancellationReason,
      },
      { new: true }
    );
  }

  async updateOrder(orderId: string, updateData: Partial<IOrder>): Promise<IOrder | null> {
    return this._model.findByIdAndUpdate(orderId, updateData, { new: true });
  }

  async getOrdersByStatus(
    status: string,
    limit?: number,
    skip?: number
  ): Promise<IOrder[]> {
    const query = this._model.find({ status }).sort({ createdAt: -1 });
    
    if (skip) {
      query.skip(skip);
    }
    if (limit) {
      query.limit(limit);
    }
    
    return query;
  }

  async getOrdersCount(filters: any): Promise<number> {
    return this._model.countDocuments(filters);
  }

  async getRecentOrders(limit: number = 10): Promise<IOrder[]> {
    return this._model.find().sort({ createdAt: -1 }).limit(limit);
  }
}

export default new OrderRepository();