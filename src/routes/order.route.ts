import { Router } from 'express';
import { asyncHandler } from '../utils/asynchandler';
import {
  getOrderById,
  getUserOrders,
  updateOrderStatus,
  updateTrackingInfo,
  cancelOrder,
} from '../controllers/order.controller';
import isLoggedIn from '../middlewares/isLoggedIn.middleware';
import { cancelOrderValidator, updateOrderStatusValidator } from '../middlewares/validators/order.validator';


const orderRouter = Router();

// Get all orders for logged-in user
orderRouter.get('/', isLoggedIn, asyncHandler(getUserOrders));

// Get specific order by ID
orderRouter.get('/:orderId', isLoggedIn, asyncHandler(getOrderById));

// Update order status (admin/internal use)
orderRouter.patch(
  '/:orderId/status',
  isLoggedIn,
  updateOrderStatusValidator,
  asyncHandler(updateOrderStatus)
);

orderRouter.patch(
  '/:orderId/tracking',
  isLoggedIn,
  asyncHandler(updateTrackingInfo)
);

// Cancel order
orderRouter.post(
  '/:orderId/cancel',
  isLoggedIn,
  cancelOrderValidator,
  asyncHandler(cancelOrder)
);

export default orderRouter;