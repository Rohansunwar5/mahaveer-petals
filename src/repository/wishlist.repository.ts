import wishlistModel, { IWishlist } from '../models/wishlist.model';
import mongoose from 'mongoose';

export interface ICreateWishlistParams {
  userId?: string;
  sessionId?: string;
  items?: {
    productId: mongoose.Types.ObjectId;
    variantId?: mongoose.Types.ObjectId;
    addedAt: Date;
  }[];
}

export interface IAddToWishlistParams {
  userId?: string;
  sessionId?: string;
  productId: string;
  variantId?: string;
}

export interface IRemoveFromWishlistParams {
  userId?: string;
  sessionId?: string;
  productId: string;
  variantId?: string;
}

export class WishlistRepository {
  private _model = wishlistModel;

  async getWishlistByUserId(userId: string): Promise<IWishlist | null> {
    return this._model.findOne({
      userId: new mongoose.Types.ObjectId(userId),
      isActive: true,
    });
  }

  async getWishlistBySessionId(sessionId: string): Promise<IWishlist | null> {
    return this._model.findOne({
      sessionId,
      isActive: true,
    });
  }

  async createWishlist(params: ICreateWishlistParams): Promise<IWishlist> {
    const { userId, sessionId, items = [] } = params;

    return this._model.create({
      userId: userId ? new mongoose.Types.ObjectId(userId) : undefined,
      sessionId,
      items,
      isActive: true,
    });
  }

  async addItem(wishlistId: string, productId: string, variantId?: string): Promise<IWishlist | null> {
    return this._model.findByIdAndUpdate(
      wishlistId,
      {
        $push: {
          items: {
            productId: new mongoose.Types.ObjectId(productId),
            variantId: variantId ? new mongoose.Types.ObjectId(variantId) : undefined,
            addedAt: new Date(),
          },
        },
      },
      { new: true }
    );
  }

  async removeItem(wishlistId: string, productId: string, variantId?: string): Promise<IWishlist | null> {
    const pullQuery: any = {
      productId: new mongoose.Types.ObjectId(productId),
    };

    if (variantId) {
      pullQuery.variantId = new mongoose.Types.ObjectId(variantId);
    }

    return this._model.findByIdAndUpdate(
      wishlistId,
      { $pull: { items: pullQuery } },
      { new: true }
    );
  }

  async clearWishlist(wishlistId: string): Promise<IWishlist | null> {
    return this._model.findByIdAndUpdate(
      wishlistId,
      { $set: { items: [] } },
      { new: true }
    );
  }

  async checkItemExists(wishlist: IWishlist, productId: string, variantId?: string): Promise<boolean> {
    return wishlist.items.some(item => {
      const productMatch = item.productId.toString() === productId;
      if (!variantId) return productMatch;
      return productMatch && item.variantId?.toString() === variantId;
    });
  }

  async getWishlistItemCount(wishlist: IWishlist): Promise<number> {
    return wishlist.items.length;
  }

  async deleteWishlist(wishlistId: string): Promise<IWishlist | null> {
    return this._model.findByIdAndUpdate(
      wishlistId,
      { isActive: false },
      { new: true }
    );
  }

  async mergeWishlists(guestWishlistId: string, userWishlistId: string): Promise<IWishlist | null> {
    const guestWishlist = await this._model.findById(guestWishlistId);
    const userWishlist = await this._model.findById(userWishlistId);

    if (!guestWishlist || !userWishlist) return null;

    // Get items from guest wishlist that don't exist in user wishlist
    const itemsToAdd = guestWishlist.items.filter(guestItem => {
      return !userWishlist.items.some(userItem => {
        const productMatch = userItem.productId.toString() === guestItem.productId.toString();
        if (!guestItem.variantId) return productMatch;
        return productMatch && userItem.variantId?.toString() === guestItem.variantId?.toString();
      });
    });

    // Add unique items to user wishlist
    if (itemsToAdd.length > 0) {
      await this._model.findByIdAndUpdate(
        userWishlistId,
        { $push: { items: { $each: itemsToAdd } } }
      );
    }

    // Deactivate guest wishlist
    await this._model.findByIdAndUpdate(guestWishlistId, { isActive: false });

    return this._model.findById(userWishlistId);
  }

    async getWishlistItem(wishlist: IWishlist, productId: string, variantId?: string) {
        return wishlist.items.find(item => {
        const productMatch = item.productId.toString() === productId;
        if (!variantId) return productMatch && !item.variantId;
        return productMatch && item.variantId?.toString() === variantId;
        });
    }
}