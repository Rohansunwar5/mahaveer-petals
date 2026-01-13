import mongoose from "mongoose";

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxLength: 100,
    },
    productCode: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
      maxLength: 2000,
    },
    bulletPoints: {
      type: [String],
      default: [],
      validate: {
        validator: (arr: string[]) => arr.length <= 10,
        message: 'Maximum 10 bullet points allowed',
      },
    },
    tags: {
      type: [String],
      lowercase: true,
      trim: true,
      index: true,
      default: [],
    },
    categoryId: {
      type: mongoose.Types.ObjectId,
      required: true,
    },

    subcategoryId: {
      type: mongoose.Types.ObjectId,
    },
    baseImage: {
      type: String,
      required: true,
    },
    images: {
      type: [String],
      default: [],
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    originalPrice: {
      type: Number,
      min: 0,
    },
    priceRange: {
      min: Number,
      max: Number,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
    },
    totalStock: {
      type: Number,
      default: 0,
      min: 0,
    },

    isActive: {
      type: Boolean,
      default: true,
    },

    isFeatured: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

productSchema.index({ categoryId: 1, isActive: 1 });
productSchema.index({ slug: 1 });
productSchema.index({ productCode: 1 });

export interface IProduct {
  _id: string;
  name: string;
  productCode: string;
  description?: string;
  tags: string[];
  bulletPoints: string[];
  categoryId: mongoose.Types.ObjectId;
  subcategoryId?: mongoose.Types.ObjectId;
  baseImage: string;
  images: string[];
  price: number;
  originalPrice?: number;
  priceRange?: {
    min: number;
    max: number;
  };
  slug: string;
  totalStock: number;
  isActive: boolean;
  isFeatured: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export default mongoose.model<IProduct>("Product", productSchema);