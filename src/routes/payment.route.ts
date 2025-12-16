import { Router } from 'express';
import { asyncHandler } from '../utils/asynchandler';
import {
  getPaymentByOrderId,
  getPaymentById,
  retryPayment,
  initiateRefund,
} from '../controllers/payment.controller';
import isLoggedIn from '../middlewares/isLoggedIn.middleware';

const paymentRouter = Router();

// Get payment by order ID
paymentRouter.get('/order/:orderId', asyncHandler(getPaymentByOrderId));

// Get payment by payment ID
paymentRouter.get('/:paymentId', asyncHandler(getPaymentById));

// Retry payment for failed order
paymentRouter.post('/order/:orderId/retry', asyncHandler(retryPayment));

// Initiate refund (Admin only - add admin middleware)
paymentRouter.post('/:paymentId/refund', asyncHandler(initiateRefund));

export default paymentRouter;