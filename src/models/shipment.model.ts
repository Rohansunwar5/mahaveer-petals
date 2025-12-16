import mongoose, { Document } from 'mongoose';

const shipmentItemSchema = new mongoose.Schema({
  productId: {
    type: String,
    required: true,
  },
  name: {
    type: String,
    required: true,
  },
  sku: {
    type: String,
    required: true,
  },
  units: {
    type: Number,
    required: true,
    min: 1,
  },
  sellingPrice: {
    type: Number,
    required: true,
    min: 0,
  },
  hsn: {
    type: String,
  },
});

const shipmentSchema = new mongoose.Schema(
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
    provider: {
      type: String,
      enum: ['shiprocket'],
      default: 'shiprocket',
      required: true,
    },
    shiprocketOrderId: {
      type: String,
      index: true,
    },
    shiprocketShipmentId: {
      type: String,
      index: true,
    },
    channelOrderId: {
      type: String,
    },
    awb: {
      type: String,
      index: true,
    },
    courierName: {
      type: String,
    },
    courierId: {
      type: String,
    },
    status: {
      type: String,
      enum: [
        'pending',
        'pickup_scheduled',
        'pickup_generated',
        'manifested',
        'in_transit',
        'out_for_delivery',
        'delivered',
        'rto_initiated',
        'rto_in_transit',
        'rto_delivered',
        'cancelled',
        'lost',
        'damaged',
      ],
      default: 'pending',
      index: true,
    },
    trackingUrl: {
      type: String,
    },
    estimatedDeliveryDate: {
      type: Date,
    },
    pickupScheduledDate: {
      type: Date,
    },
    shippedDate: {
      type: Date,
    },
    deliveredDate: {
      type: Date,
    },
    rtoInitiatedDate: {
      type: Date,
    },
    items: [shipmentItemSchema],
    weight: {
      type: Number,
      min: 0,
    },
    dimensions: {
      length: Number,
      breadth: Number,
      height: Number,
    },
    shippingCharges: {
      type: Number,
      min: 0,
    },
    codCharges: {
      type: Number,
      default: 0,
    },
    isCod: {
      type: Boolean,
      default: false,
    },
    codAmount: {
      type: Number,
      default: 0,
    },
    shiprocketResponse: {
      type: mongoose.Schema.Types.Mixed,
    },
    webhookData: {
      type: mongoose.Schema.Types.Mixed,
    },
    trackingEvents: [
      {
        status: String,
        statusCode: String,
        location: String,
        timestamp: Date,
        description: String,
      },
    ],
    label: {
      type: String,
    },
    manifest: {
      type: String,
    },
    invoice: {
      type: String,
    },
    errorMessage: {
      type: String,
    },
  },
  { timestamps: true }
);

shipmentSchema.index({ orderId: 1, status: 1 });
shipmentSchema.index({ awb: 1 });
shipmentSchema.index({ createdAt: -1 });

export interface IShipmentItem {
  productId: string;
  name: string;
  sku: string;
  units: number;
  sellingPrice: number;
  hsn?: string;
}

export interface ITrackingEvent {
  status: string;
  statusCode: string;
  location: string;
  timestamp: Date;
  description: string;
}

export interface IShipment extends Document {
  _id: string;
  orderId: string;
  orderNumber: string;
  userId?: string;
  provider: string;
  shiprocketOrderId?: string;
  shiprocketShipmentId?: string;
  channelOrderId?: string;
  awb?: string;
  courierName?: string;
  courierId?: string;
  status: string;
  trackingUrl?: string;
  estimatedDeliveryDate?: Date;
  pickupScheduledDate?: Date;
  shippedDate?: Date;
  deliveredDate?: Date;
  rtoInitiatedDate?: Date;
  items: IShipmentItem[];
  weight?: number;
  dimensions?: {
    length: number;
    breadth: number;
    height: number;
  };
  shippingCharges?: number;
  codCharges: number;
  isCod: boolean;
  codAmount: number;
  shiprocketResponse?: any;
  webhookData?: any;
  trackingEvents: ITrackingEvent[];
  label?: string;
  manifest?: string;
  invoice?: string;
  errorMessage?: string;
  createdAt: Date;
  updatedAt: Date;
}

export default mongoose.model<IShipment>('Shipment', shipmentSchema);