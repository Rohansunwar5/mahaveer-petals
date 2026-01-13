// wishlist.controller.ts
import { NextFunction, Request, Response } from 'express';
import wishlistService from '../services/wishlist.service';

export const getWishlist = async (req: Request, res: Response, next: NextFunction) => {
  const userId = req.user?._id;
  const sessionId = req.headers['x-session-id'] as string;

  const response = await wishlistService.getWishlist({
    userId,
    sessionId,
  });

  next(response);
};

export const addToWishlist = async (req: Request, res: Response, next: NextFunction) => {
  const userId = req.user?._id;
  const sessionId = req.headers['x-session-id'] as string;
  const { productId, variantId } = req.body;

  const response = await wishlistService.addToWishlist({
    userId,
    sessionId,
    productId,
    variantId,
  });

  next(response);
};

export const removeFromWishlist = async (req: Request, res: Response, next: NextFunction) => {
  const userId = req.user?._id;
  const sessionId = req.headers['x-session-id'] as string;
  const { productId, variantId } = req.body;

  const response = await wishlistService.removeFromWishlist({
    userId,
    sessionId,
    productId,
    variantId,
  });

  next(response);
};

export const clearWishlist = async (req: Request, res: Response, next: NextFunction) => {
  const userId = req.user?._id;
  const sessionId = req.headers['x-session-id'] as string;

  const response = await wishlistService.clearWishlist({
    userId,
    sessionId,
  });

  next(response);
};

export const checkItemInWishlist = async (req: Request, res: Response, next: NextFunction) => {
  const userId = req.user?._id;
  const sessionId = req.headers['x-session-id'] as string;
  const { productId, variantId } = req.query;

  const response = await wishlistService.checkItemInWishlist({
    userId,
    sessionId,
    productId: productId as string,
    variantId: variantId as string | undefined,
  });

  next(response);
};

export const getWishlistItemCount = async (req: Request, res: Response, next: NextFunction) => {
  const userId = req.user?._id;
  const sessionId = req.headers['x-session-id'] as string;

  const response = await wishlistService.getWishlistItemCount({
    userId,
    sessionId,
  });

  next(response);
};

export const deleteWishlist = async (req: Request, res: Response, next: NextFunction) => {
  const userId = req.user?._id;
  const sessionId = req.headers['x-session-id'] as string;

  const response = await wishlistService.deleteWishlist({
    userId,
    sessionId,
  });

  next(response);
};

export const mergeGuestWishlist = async (req: Request, res: Response, next: NextFunction) => {
  const userId = req.user?._id;
  const sessionId = req.headers['x-session-id'] as string;

  const response = await wishlistService.mergeGuestWishlistToUser(userId, sessionId);
  next(response);
};

export const moveToCart = async (req: Request, res: Response, next: NextFunction) => {
  const userId = req.user?._id;
  const sessionId = req.headers['x-session-id'] as string;
  const { productId, variantId, quantity } = req.body;

  const response = await wishlistService.moveToCart({
    userId,
    sessionId,
    productId,
    variantId,
    quantity,
  });

  next(response);
};