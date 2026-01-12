// import { Request, Response, NextFunction } from 'express';
// import paymentService from '../services/payment.service';

// export const getPaymentByOrderId = async (req: Request, res: Response, next: NextFunction) => {
//   const { orderId } = req.params;

//   const payment = await paymentService.getPaymentByOrderId(orderId);

//   next({ success: true, data: payment });
// };

// export const getPaymentById = async (req: Request, res: Response, next: NextFunction) => {
//   const { paymentId } = req.params;

//   const payment = await paymentService.getPaymentById(paymentId);

//   next({ success: true, data: payment });
// };

// export const retryPayment = async (req: Request, res: Response, next: NextFunction) => {
//   const { orderId } = req.params;

//   const paymentDetails = await paymentService.retryPayment(orderId);

//   next({ success: true, data: paymentDetails });
// };

// export const initiateRefund = async (req: Request, res: Response, next: NextFunction) => {
//   const { paymentId } = req.params;
//   const { refundAmount, refundTransactionId } = req.body;

//   const payment = await paymentService.initiateRefund({
//     paymentId,
//     refundAmount,
//     refundTransactionId,
//   });

//   next({ success: true, data: payment });
// };