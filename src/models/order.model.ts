import mongoose, { Document } from 'mongoose';

const orderItemSchema = new mongoose.Schema({
  productId: {
    type: String,
    required: true,
  },
  productCode: {
    type: String,
    required: true,
  },
  name: {
    type: String,
    required: true,
    trim: true,
  },
  price: {
    type: Number,
    required: true,
    min: 0,
  },
  quantity: {
    type: Number,
    required: true,
    min: 1,
  },
  size: {
    type: String,
    required: true,
  },
  color: {
    colorName: {
      type: String,
      required: true,
    },
    colorHex: {
      type: String,
      required: true,
    },
  },
  selectedImage: {
    type: String,
    required: true,
  },
  hsn: {
    type: String,
    trim: true,
  },
  gstRate: {
    type: Number,
    default: 0,
  },
});

const addressSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  phone: {
    type: String,
    required: true,
    trim: true,
  },
  email: {
    type: String,
    trim: true,
  },
  addressLine1: {
    type: String,
    required: true,
    trim: true,
  },
  addressLine2: {
    type: String,
    trim: true,
  },
  city: {
    type: String,
    required: true,
    trim: true,
  },
  state: {
    type: String,
    required: true,
    trim: true,
  },
  pincode: {
    type: String,
    required: true,
    trim: true,
  },
  country: {
    type: String,
    default: 'India',
    trim: true,
  },
});

const orderSchema = new mongoose.Schema(
  {
    orderNumber: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
      index: true,
    },
    userId: {
      type: String,
      required: false,
      index: true,
    },
    sessionId: {
      type: String,
      required: false,
      index: true,
    },
    isGuestOrder: {
      type: Boolean,
      default: false,
    },
    items: {
      type: [orderItemSchema],
      required: true,
      validate: {
        validator: (v: any[]) => v && v.length > 0,
        message: 'Order must have at least one item',
      },
    },
    subtotal: {
      type: Number,
      required: true,
      min: 0,
    },
    discountAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    shippingAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    gstAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    totalAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    appliedCoupon: {
      code: {
        type: String,
        trim: true,
      },
      discountId: {
        type: String,
      },
      discountAmount: {
        type: Number,
        min: 0,
      },
    },
    appliedVoucher: {
      code: {
        type: String,
        trim: true,
      },
      discountId: {
        type: String,
      },
      discountAmount: {
        type: Number,
        min: 0,
      },
    },
    shippingAddress: {
      type: addressSchema,
      required: true,
    },
    billingAddress: {
      type: addressSchema,
      required: true,
    },
    paymentId: {
      type: String,
      index: true,
    },
    shipmentId: {
      type: String,
      index: true,
    },
    status: {
      type: String,
      enum: [
        'created',
        'payment_pending',
        'payment_processing',
        'payment_failed',
        'confirmed',
        'processing',
        'shipped',
        'delivered',
        'cancelled',
        'refund_initiated',
        'refunded',
        'failed',
      ],
      default: 'created',
      index: true,
    },
    paymentStatus: {
      type: String,
      enum: ['pending', 'processing', 'completed', 'failed', 'refunded'],
      default: 'pending',
    },
    shipmentStatus: {
      type: String,
      enum: [
        'not_created',
        'pending',
        'pickup_scheduled',
        'in_transit',
        'out_for_delivery',
        'delivered',
        'rto_initiated',
        'rto_in_transit',
        'rto_delivered',
        'cancelled',
        'failed',
      ],
      default: 'not_created',
    },
    notes: {
      type: String,
      trim: true,
      maxLength: 500,
    },
    customerNotes: {
      type: String,
      trim: true,
      maxLength: 500,
    },
    source: {
      type: String,
      enum: ['web', 'mobile', 'admin'],
      default: 'web',
    },
    cancelledAt: {
      type: Date,
    },
    cancelledBy: {
      type: String,
    },
    cancellationReason: {
      type: String,
      trim: true,
      maxLength: 500,
    },
  },
  { timestamps: true }
);

orderSchema.index({ userId: 1, status: 1 });
orderSchema.index({ sessionId: 1, status: 1 });
orderSchema.index({ createdAt: -1 });
orderSchema.index({ orderNumber: 1, userId: 1 });

export interface IOrderItem {
  productId: string;
  productCode: string;
  name: string;
  price: number;
  quantity: number;
  size: string;
  color: {
    colorName: string;
    colorHex: string;
  };
  selectedImage: string;
  hsn?: string;
  gstRate: number;
}

export interface IOrderAddress {
  name: string;
  phone: string;
  email?: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  pincode: string;
  country: string;
}

export interface IAppliedDiscount {
  code: string;
  discountId: string;
  discountAmount: number;
}

export interface IOrder extends Document {
  _id: string;
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
  appliedCoupon?: IAppliedDiscount;
  appliedVoucher?: IAppliedDiscount;
  shippingAddress: IOrderAddress;
  billingAddress: IOrderAddress;
  paymentId?: string;
  shipmentId?: string;
  status: string;
  paymentStatus: string;
  shipmentStatus: string;
  notes?: string;
  customerNotes?: string;
  source: string;
  cancelledAt?: Date;
  cancelledBy?: string;
  cancellationReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

export default mongoose.model<IOrder>('Order', orderSchema);