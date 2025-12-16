import paymentModel, { IPayment } from '../models/payment.model';

export interface ICreatePaymentParams {
  orderId: string;
  orderNumber: string;
  userId?: string;
  sessionId?: string;
  provider: string;
  amount: number;
  currency?: string;
  method?: string;
  metadata?: any;
}

export interface IUpdatePaymentStatusParams {
  paymentId: string;
  status: string;
  transactionId?: string;
  gatewayTransactionId?: string;
  method?: string;
  paidAt?: Date;
  errorCode?: string;
  errorMessage?: string;
  failureReason?: string;
  webhookData?: any;
}

export class PaymentRepository {
  private _model = paymentModel;

  async createPayment(params: ICreatePaymentParams): Promise<IPayment> {
    return this._model.create({
      ...params,
      status: 'pending',
      currency: params.currency || 'INR',
    });
  }

  async getPaymentById(paymentId: string): Promise<IPayment | null> {
    return this._model.findById(paymentId);
  }

  async getPaymentByOrderId(orderId: string): Promise<IPayment | null> {
    return this._model.findOne({ orderId }).sort({ createdAt: -1 });
  }

  async getPaymentsByOrderId(orderId: string): Promise<IPayment[]> {
    return this._model.find({ orderId }).sort({ createdAt: -1 });
  }

  async getPaymentByCheckoutId(shiprocketCheckoutId: string): Promise<IPayment | null> {
    return this._model.findOne({ shiprocketCheckoutId });
  }

  async getPaymentByTransactionId(transactionId: string): Promise<IPayment | null> {
    return this._model.findOne({ transactionId });
  }

  async updatePaymentCheckoutDetails(
    paymentId: string,
    shiprocketCheckoutId: string,
    shiprocketOrderId: string,
    checkoutUrl: string,
    shiprocketResponse?: any
  ): Promise<IPayment | null> {
    return this._model.findByIdAndUpdate(
      paymentId,
      {
        shiprocketCheckoutId,
        shiprocketOrderId,
        checkoutUrl,
        shiprocketResponse,
      },
      { new: true }
    );
  }

  async updatePaymentStatus(params: IUpdatePaymentStatusParams): Promise<IPayment | null> {
    const {
      paymentId,
      status,
      transactionId,
      gatewayTransactionId,
      method,
      paidAt,
      errorCode,
      errorMessage,
      failureReason,
      webhookData,
    } = params;

    const updateData: any = { status };

    if (transactionId) updateData.transactionId = transactionId;
    if (gatewayTransactionId) updateData.gatewayTransactionId = gatewayTransactionId;
    if (method) updateData.method = method;
    if (paidAt) updateData.paidAt = paidAt;
    if (errorCode) updateData.errorCode = errorCode;
    if (errorMessage) updateData.errorMessage = errorMessage;
    if (failureReason) updateData.failureReason = failureReason;
    if (webhookData) updateData.webhookData = webhookData;

    return this._model.findByIdAndUpdate(paymentId, updateData, { new: true });
  }

  async markPaymentCompleted(
    paymentId: string,
    transactionId: string,
    gatewayTransactionId?: string,
    method?: string,
    webhookData?: any
  ): Promise<IPayment | null> {
    return this._model.findByIdAndUpdate(
      paymentId,
      {
        status: 'completed',
        transactionId,
        gatewayTransactionId,
        method,
        paidAt: new Date(),
        webhookData,
      },
      { new: true }
    );
  }

  async markPaymentFailed(
    paymentId: string,
    errorCode?: string,
    errorMessage?: string,
    failureReason?: string,
    webhookData?: any
  ): Promise<IPayment | null> {
    return this._model.findByIdAndUpdate(
      paymentId,
      {
        status: 'failed',
        errorCode,
        errorMessage,
        failureReason,
        webhookData,
        $inc: { retryCount: 1 },
      },
      { new: true }
    );
  }

  async initiateRefund(
    paymentId: string,
    refundAmount: number,
    refundTransactionId?: string
  ): Promise<IPayment | null> {
    return this._model.findByIdAndUpdate(
      paymentId,
      {
        status: 'refunded',
        refundAmount,
        refundTransactionId,
        refundedAt: new Date(),
      },
      { new: true }
    );
  }

  async getPaymentsByUserId(userId: string, limit?: number): Promise<IPayment[]> {
    const query = this._model.find({ userId }).sort({ createdAt: -1 });
    if (limit) {
      query.limit(limit);
    }
    return query;
  }

  async updatePayment(paymentId: string, updateData: Partial<IPayment>): Promise<IPayment | null> {
    return this._model.findByIdAndUpdate(paymentId, updateData, { new: true });
  }
}

export default new PaymentRepository();