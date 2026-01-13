// wishlist.model.ts
import mongoose from "mongoose";

const wishlistItemSchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Types.ObjectId,
      required: true,
      index: true,
    },

    variantId: {
      type: mongoose.Types.ObjectId,
    },

    addedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

const wishlistSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Types.ObjectId,
      index: true,
    },

    sessionId: {
      type: String,
      index: true,
    },

    items: [wishlistItemSchema],

    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

wishlistSchema.index({ userId: 1, isActive: 1 }, { 
  unique: true, 
  partialFilterExpression: { userId: { $exists: true }, isActive: true } 
});

wishlistSchema.index({ sessionId: 1, isActive: 1 }, { 
  unique: true, 
  partialFilterExpression: { sessionId: { $exists: true }, isActive: true } 
});

wishlistSchema.index({ "items.productId": 1 });

export interface IWishlist {
  _id: string;
  userId?: mongoose.Types.ObjectId;
  sessionId?: string;
  items: {
    productId: mongoose.Types.ObjectId;
    variantId?: mongoose.Types.ObjectId;
    addedAt: Date;
  }[];
  isActive: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export default mongoose.model<IWishlist>("Wishlist", wishlistSchema);