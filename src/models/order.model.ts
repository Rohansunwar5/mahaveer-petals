import mongoose from 'mongoose';

const orderItemSchema = new mongoose.Schema(
  {
    variantId: {
      type: mongoose.Types.ObjectId,
      required: true,
    },
    shiprocketVariantId: {
      type: String,
    },
    productName: {
      type: String,
      required: true,
    },
    sku: {
      type: String,
      required: true,
    },
    attributes: {
      size: String,
      colorName: String,
      colorHex: String,
    },
    image: {
      type: String,
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
    },
    price: {
      type: Number,
      required: true,
    },
    subtotal: {
      type: Number,
      required: true,
    },
  },
  { _id: false }
);

const shippingAddressSchema = new mongoose.Schema(
  {
    name: String,
    phone: String,
    email: String,
    addressLine1: String,
    addressLine2: String,
    city: String,
    state: String,
    pinCode: String,
    country: String,
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Types.ObjectId,
    },
    sessionId: {
      type: String,
    },
    shiprocketOrderId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    orderNumber: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    items: [orderItemSchema],
    shippingAddress: shippingAddressSchema,
    
    // ✅ Added billing address (Shiprocket provides this)
    billingAddress: shippingAddressSchema,

    paymentType: {
      type: String,
      enum: ['PREPAID', 'UPI', 'CARD', 'WALLET'], // ✅ Removed COD options
      required: true,
    },
    paymentStatus: {
      type: String,
      enum: ['PENDING', 'PAID', 'FAILED', 'REFUNDED'],
      default: 'PENDING',
    },
    orderStatus: {
      type: String,
      enum: [
        'PENDING',
        'CONFIRMED',
        'PROCESSING',
        'SHIPPED',
        'OUT_FOR_DELIVERY',
        'DELIVERED',
        'CANCELLED',
        'RETURNED',
      ],
      default: 'PENDING',
    },
    pricing: {
      subtotal: {
        type: Number,
        required: true,
      },
      discount: {
        type: Number,
        default: 0,
      },
      // ✅ Added prepaid discount field
      prepaidDiscount: {
        type: Number,
        default: 0,
      },
      shippingCharges: {
        type: Number,
        default: 0,
      },
      tax: {
        type: Number,
        default: 0,
      },
      total: {
        type: Number,
        required: true,
      },
    },
    appliedCoupon: {
      code: String,
      discountAmount: Number,
    },
    appliedVoucher: {
      code: String,
      discountAmount: Number,
    },
    
    // ✅ Added Shiprocket specific fields
    shippingPlan: {
      type: String, // e.g., "Express", "Standard"
    },
    rtoPrediction: {
      type: String, // e.g., "low", "medium", "high"
    },
    estimatedDeliveryDate: {
      type: Date,
    },
    shiprocketCartId: {
      type: String,
    },
    shiprocketFastrrOrderId: {
      type: String,
    },

    trackingNumber: {
      type: String,
    },
    shiprocketShipmentId: {
      type: String,
    },
    notes: {
      type: String,
    },
    cancellationReason: {
      type: String,
    },
    cancelledAt: {
      type: Date,
    },
    deliveredAt: {
      type: Date,
    },
  },
  { timestamps: true }
);

orderSchema.index({ userId: 1, createdAt: -1 });
orderSchema.index({ orderStatus: 1, createdAt: -1 });
orderSchema.index({ shiprocketOrderId: 1 });

export interface IOrder {
  _id: string;
  userId?: mongoose.Types.ObjectId;
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
  paymentStatus: string;
  orderStatus: string;
  pricing: {
    subtotal: number;
    discount: number;
    prepaidDiscount: number;
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
  shippingPlan?: string;
  rtoPrediction?: string;
  estimatedDeliveryDate?: Date;
  shiprocketCartId?: string;
  shiprocketFastrrOrderId?: string;
  trackingNumber?: string;
  shiprocketShipmentId?: string;
  notes?: string;
  cancellationReason?: string;
  cancelledAt?: Date;
  deliveredAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export default mongoose.model<IOrder>('Order', orderSchema);