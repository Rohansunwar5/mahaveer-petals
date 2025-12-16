import mongoose, { Document } from 'mongoose';

const paymentSchema = new mongoose.Schema(
  {
    orderId: {
      type: String,
      required: true,
      index: true,
    },
    orderNumber: {
      type: String,
      required: true,
      index: true,
    },
    userId: {
      type: String,
      index: true,
    },
    sessionId: {
      type: String,
      index: true,
    },
    provider: {
      type: String,
      enum: ['shiprocket', 'razorpay', 'cod'],
      default: 'shiprocket',
      required: true,
    },
    method: {
      type: String,
      enum: ['upi', 'card', 'netbanking', 'wallet', 'cod', 'emi'],
      required: false,
    },
    status: {
      type: String,
      enum: ['pending', 'processing', 'completed', 'failed', 'refunded', 'cancelled'],
      default: 'pending',
      index: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    currency: {
      type: String,
      default: 'INR',
      uppercase: true,
    },
    shiprocketCheckoutId: {
      type: String,
      index: true,
    },
    shiprocketOrderId: {
      type: String,
      index: true,
    },
    transactionId: {
      type: String,
      index: true,
    },
    gatewayTransactionId: {
      type: String,
      index: true,
    },
    checkoutUrl: {
      type: String,
    },
    shiprocketResponse: {
      type: mongoose.Schema.Types.Mixed,
    },
    webhookData: {
      type: mongoose.Schema.Types.Mixed,
    },
    errorCode: {
      type: String,
    },
    errorMessage: {
      type: String,
      trim: true,
    },
    failureReason: {
      type: String,
      trim: true,
    },
    paidAt: {
      type: Date,
    },
    refundedAt: {
      type: Date,
    },
    refundAmount: {
      type: Number,
      min: 0,
    },
    refundTransactionId: {
      type: String,
    },
    retryCount: {
      type: Number,
      default: 0,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
    },
  },
  { timestamps: true }
);

paymentSchema.index({ orderId: 1, status: 1 });
paymentSchema.index({ shiprocketCheckoutId: 1 });
paymentSchema.index({ transactionId: 1 });
paymentSchema.index({ createdAt: -1 });

export interface IPayment extends Document {
  _id: string;
  orderId: string;
  orderNumber: string;
  userId?: string;
  sessionId?: string;
  provider: string;
  method?: string;
  status: string;
  amount: number;
  currency: string;
  shiprocketCheckoutId?: string;
  shiprocketOrderId?: string;
  transactionId?: string;
  gatewayTransactionId?: string;
  checkoutUrl?: string;
  shiprocketResponse?: any;
  webhookData?: any;
  errorCode?: string;
  errorMessage?: string;
  failureReason?: string;
  paidAt?: Date;
  refundedAt?: Date;
  refundAmount?: number;
  refundTransactionId?: string;
  retryCount: number;
  metadata?: any;
  createdAt: Date;
  updatedAt: Date;
}

export default mongoose.model<IPayment>('Payment', paymentSchema);