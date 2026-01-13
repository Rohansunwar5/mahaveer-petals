import { BadRequestError } from '../errors/bad-request.error';
import { NotFoundError } from '../errors/not-found.error';
import { InternalServerError } from '../errors/internal-server.error';
import {
  WishlistRepository,
  IAddToWishlistParams,
  IRemoveFromWishlistParams,
} from '../repository/wishlist.repository';
import { ProductRepository } from '../repository/product.repository';
import { ProductVariantRepository } from '../repository/productVariant.repository';
import mongoose from 'mongoose';

class WishlistService {
  constructor(
    private readonly _wishlistRepository: WishlistRepository,
    private readonly _productRepository: ProductRepository,
    private readonly _variantRepository: ProductVariantRepository
  ) {}

  async getWishlist(params: { userId?: string; sessionId?: string }) {
    const { userId, sessionId } = params;

    if (!userId && !sessionId) {
      throw new BadRequestError('User ID or Session ID is required');
    }

    let wishlist = userId
      ? await this._wishlistRepository.getWishlistByUserId(userId)
      : await this._wishlistRepository.getWishlistBySessionId(sessionId!);

    if (!wishlist) {
      wishlist = await this._wishlistRepository.createWishlist({
        userId,
        sessionId,
      });
    }

    return wishlist;
  }

  async addToWishlist(params: IAddToWishlistParams) {
    const { userId, sessionId, productId, variantId } = params;

    if (!userId && !sessionId) {
      throw new BadRequestError('User ID or Session ID is required');
    }

    // Validate product exists
    const product = await this._productRepository.getProductById(productId);
    if (!product) {
      throw new NotFoundError('Product not found');
    }

    if (!product.isActive) {
      throw new BadRequestError('Product is not active');
    }

    // Validate variant if provided
    if (variantId) {
      const variant = await this._variantRepository.getVariantById(variantId);
      if (!variant) {
        throw new NotFoundError('Variant not found');
      }

      if (!variant.isActive) {
        throw new BadRequestError('Variant is not active');
      }

      if (variant.productId.toString() !== productId) {
        throw new BadRequestError('Variant does not belong to this product');
      }
    }

    let wishlist = userId
      ? await this._wishlistRepository.getWishlistByUserId(userId)
      : await this._wishlistRepository.getWishlistBySessionId(sessionId!);

    if (!wishlist) {
      wishlist = await this._wishlistRepository.createWishlist({
        userId,
        sessionId,
        items: [
          {
            productId: new mongoose.Types.ObjectId(productId),
            variantId: variantId ? new mongoose.Types.ObjectId(variantId) : undefined,
            addedAt: new Date(),
          },
        ],
      });
    } else {
      // Check if item already exists in wishlist
      const itemExists = await this._wishlistRepository.checkItemExists(wishlist, productId, variantId);
      if (itemExists) {
        throw new BadRequestError('Item already exists in wishlist');
      }

      wishlist = await this._wishlistRepository.addItem(wishlist._id, productId, variantId);
    }

    if (!wishlist) {
      throw new InternalServerError('Failed to add item to wishlist');
    }

    return wishlist;
  }

  async removeFromWishlist(params: IRemoveFromWishlistParams) {
    const { userId, sessionId, productId, variantId } = params;

    if (!userId && !sessionId) {
      throw new BadRequestError('User ID or Session ID is required');
    }

    const wishlist = userId
      ? await this._wishlistRepository.getWishlistByUserId(userId)
      : await this._wishlistRepository.getWishlistBySessionId(sessionId!);

    if (!wishlist) {
      throw new NotFoundError('Wishlist not found');
    }

    // Check if item exists before removing
    const itemExists = await this._wishlistRepository.checkItemExists(wishlist, productId, variantId);
    if (!itemExists) {
      throw new NotFoundError('Item not found in wishlist');
    }

    const updatedWishlist = await this._wishlistRepository.removeItem(wishlist._id, productId, variantId);
    if (!updatedWishlist) {
      throw new InternalServerError('Failed to remove item from wishlist');
    }

    return updatedWishlist;
  }

  async clearWishlist(params: { userId?: string; sessionId?: string }) {
    const { userId, sessionId } = params;

    if (!userId && !sessionId) {
      throw new BadRequestError('User ID or Session ID is required');
    }

    const wishlist = userId
      ? await this._wishlistRepository.getWishlistByUserId(userId)
      : await this._wishlistRepository.getWishlistBySessionId(sessionId!);

    if (!wishlist) {
      throw new NotFoundError('Wishlist not found');
    }

    const clearedWishlist = await this._wishlistRepository.clearWishlist(wishlist._id);
    if (!clearedWishlist) {
      throw new InternalServerError('Failed to clear wishlist');
    }

    return { message: 'Wishlist cleared successfully' };
  }

  async checkItemInWishlist(params: { userId?: string; sessionId?: string; productId: string; variantId?: string }) {
    const { userId, sessionId, productId, variantId } = params;

    if (!userId && !sessionId) {
      throw new BadRequestError('User ID or Session ID is required');
    }

    const wishlist = userId
      ? await this._wishlistRepository.getWishlistByUserId(userId)
      : await this._wishlistRepository.getWishlistBySessionId(sessionId!);

    if (!wishlist) {
      return { exists: false };
    }

    const itemExists = await this._wishlistRepository.checkItemExists(wishlist, productId, variantId);
    return { exists: itemExists };
  }

  async getWishlistItemCount(params: { userId?: string; sessionId?: string }) {
    const { userId, sessionId } = params;

    if (!userId && !sessionId) {
      throw new BadRequestError('User ID or Session ID is required');
    }

    const wishlist = userId
      ? await this._wishlistRepository.getWishlistByUserId(userId)
      : await this._wishlistRepository.getWishlistBySessionId(sessionId!);

    if (!wishlist) {
      return { count: 0 };
    }

    const count = await this._wishlistRepository.getWishlistItemCount(wishlist);
    return { count };
  }

  async deleteWishlist(params: { userId?: string; sessionId?: string }) {
    const { userId, sessionId } = params;

    if (!userId && !sessionId) {
      throw new BadRequestError('User ID or Session ID is required');
    }

    const wishlist = userId
      ? await this._wishlistRepository.getWishlistByUserId(userId)
      : await this._wishlistRepository.getWishlistBySessionId(sessionId!);

    if (!wishlist) {
      throw new NotFoundError('Wishlist not found');
    }

    await this._wishlistRepository.deleteWishlist(wishlist._id);
    return { message: 'Wishlist deleted successfully' };
  }

  async mergeGuestWishlistToUser(userId: string, sessionId: string) {
    const userWishlist = await this._wishlistRepository.getWishlistByUserId(userId);
    const guestWishlist = await this._wishlistRepository.getWishlistBySessionId(sessionId);

    if (!guestWishlist) {
      return userWishlist || await this._wishlistRepository.createWishlist({ userId });
    }

    if (!userWishlist) {
      // Convert guest wishlist to user wishlist
      const wishlist = await this._wishlistRepository.createWishlist({
        userId,
        items: guestWishlist.items,
      });
      await this._wishlistRepository.deleteWishlist(guestWishlist._id);
      return wishlist;
    }

    // Merge both wishlists
    return this._wishlistRepository.mergeWishlists(guestWishlist._id, userWishlist._id);
  }

  async moveToCart(params: {  userId?: string;  sessionId?: string;  productId: string;  variantId?: string;  quantity?: number }) {
    const { userId, sessionId, productId, variantId, quantity = 1 } = params;

    if (!userId && !sessionId) {
      throw new BadRequestError('User ID or Session ID is required');
    }

    // Get wishlist
    const wishlist = userId
      ? await this._wishlistRepository.getWishlistByUserId(userId)
      : await this._wishlistRepository.getWishlistBySessionId(sessionId!);

    if (!wishlist) {
      throw new NotFoundError('Wishlist not found');
    }

    // Check if item exists in wishlist
    const wishlistItem = await this._wishlistRepository.getWishlistItem(wishlist, productId, variantId);
    if (!wishlistItem) {
      throw new NotFoundError('Item not found in wishlist');
    }

    // Get variant - if variantId is provided, use it; otherwise get default variant
    let variantToAdd = variantId;
    
    if (!variantToAdd) {
      // Get default variant for the product
      const defaultVariant = await this._variantRepository.getDefaultVariant(productId);
      if (!defaultVariant) {
        throw new NotFoundError('No default variant found for this product');
      }
      variantToAdd = defaultVariant._id;
    }

    // Validate variant exists and is active
    const variant = await this._variantRepository.getVariantById(variantToAdd);
    if (!variant) {
      throw new NotFoundError('Variant not found');
    }

    if (!variant.isActive) {
      throw new BadRequestError('Variant is not active');
    }

    if (variant.stock < quantity) {
      throw new BadRequestError(`Insufficient stock. Available: ${variant.stock}`);
    }

    // Import cart service dynamically to avoid circular dependency
    const { default: cartService } = await import('./cart.service');

    // Add to cart
    await cartService.addToCart({
      userId,
      sessionId,
      variantId: variantToAdd,
      quantity,
    });

    // Remove from wishlist
    const updatedWishlist = await this._wishlistRepository.removeItem(
      wishlist._id,
      productId,
      wishlistItem.variantId?.toString()
    );

    return {
      message: 'Item moved to cart successfully',
      wishlist: updatedWishlist,
    };
  }
}

export default new WishlistService(
  new WishlistRepository(),
  new ProductRepository(),
  new ProductVariantRepository()
);