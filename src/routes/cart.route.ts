import { Router } from 'express';
import { asyncHandler } from '../utils/asynchandler';
import {
  getCart,
  addToCart,
  updateCartItem,
  removeCartItem,
  clearCart,
  getCartForCheckout,
  mergeGuestCart,
} from '../controllers/cart.controller';
import isLoggedIn from '../middlewares/isLoggedIn.middleware';
import { addToCartValidator, updateCartValidator } from '../middlewares/validators/cart.validators';
import { optionalAuth } from '../middlewares/optionalAuth.middleware';
import { generateCheckoutToken } from '../controllers/shipment.controller';

const cartRouter = Router();

cartRouter.get('/', optionalAuth, asyncHandler(getCart));
cartRouter.post('/add', optionalAuth, addToCartValidator,asyncHandler(addToCart));
cartRouter.patch('/update', optionalAuth, updateCartValidator, asyncHandler(updateCartItem));
cartRouter.delete('/remove/:variantId', optionalAuth, asyncHandler(removeCartItem));
cartRouter.delete('/clear', optionalAuth, asyncHandler(clearCart));
cartRouter.get('/checkout-data', optionalAuth, asyncHandler(getCartForCheckout));
cartRouter.post( '/checkout/token', optionalAuth, asyncHandler(generateCheckoutToken));
cartRouter.post('/merge', isLoggedIn, asyncHandler(mergeGuestCart));

export default cartRouter;