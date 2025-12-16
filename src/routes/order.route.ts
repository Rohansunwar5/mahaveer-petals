import { Router } from 'express';
import { asyncHandler } from '../utils/asynchandler';
import {
  createOrder,
  initiatePayment,
  getOrderById,
  getOrderByOrderNumber,
  getMyOrders,
  getGuestOrders,
  cancelOrder,
  updateOrderStatus,
} from '../controllers/order.controller';
import isLoggedIn from '../middlewares/isLoggedIn.middleware';
// import { orderValidator } from '../middlewares/validators/order.validator';

const orderRouter = Router();

// Create order from cart
orderRouter.post('/',  asyncHandler(createOrder));

// Initiate payment for order
orderRouter.post('/:orderId/payment', asyncHandler(initiatePayment));

// Get order by ID
orderRouter.get('/:orderId', asyncHandler(getOrderById));

// Get order by order number
orderRouter.get('/number/:orderNumber', asyncHandler(getOrderByOrderNumber));

// Get logged-in user's orders
orderRouter.get('/user/my-orders', isLoggedIn, asyncHandler(getMyOrders));

// Get guest orders by session ID
orderRouter.get('/guest/:sessionId', asyncHandler(getGuestOrders));

// Cancel order
orderRouter.post('/:orderId/cancel', asyncHandler(cancelOrder));

// Update order status (Admin only - add admin middleware)
orderRouter.patch('/:orderId/status', asyncHandler(updateOrderStatus));

export default orderRouter;