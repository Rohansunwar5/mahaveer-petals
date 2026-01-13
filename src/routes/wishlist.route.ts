// wishlist.route.ts
import { Router } from 'express';
import { asyncHandler } from '../utils/asynchandler';
import {
  getWishlist,
  addToWishlist,
  removeFromWishlist,
  clearWishlist,
  checkItemInWishlist,
  getWishlistItemCount,
  deleteWishlist,
  mergeGuestWishlist,
  moveToCart,
} from '../controllers/wishlist.controller';
import isLoggedIn from '../middlewares/isLoggedIn.middleware';

const wishlistRouter = Router();

wishlistRouter.get('/', asyncHandler(getWishlist));
wishlistRouter.post('/add', asyncHandler(addToWishlist));
wishlistRouter.post('/remove', asyncHandler(removeFromWishlist));
wishlistRouter.post('/move-to-cart', asyncHandler(moveToCart));
wishlistRouter.delete('/clear', asyncHandler(clearWishlist));
wishlistRouter.get('/check', asyncHandler(checkItemInWishlist));
wishlistRouter.get('/count', asyncHandler(getWishlistItemCount));
wishlistRouter.delete('/', asyncHandler(deleteWishlist));

wishlistRouter.post('/merge', isLoggedIn, asyncHandler(mergeGuestWishlist));

export default wishlistRouter;