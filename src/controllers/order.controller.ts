import { Request, Response, NextFunction } from 'express';
import orderService from '../services/order.service';
import paymentService from '../services/payment.service';

export const createOrder = async (req: Request, res: Response, next: NextFunction) => {
  const userId = req.user?._id;
  const { sessionId, shippingAddress, billingAddress, customerNotes, source } = req.body;

  const order = await orderService.createOrderFromCart({
    userId,
    sessionId,
    shippingAddress,
    billingAddress,
    customerNotes,
    source,
  });

  next({ success: true, data: order });
};

export const initiatePayment = async (req: Request, res: Response, next: NextFunction) => {
  const { orderId } = req.params;
  const { shippingAddress } = req.body;

  const paymentDetails = await paymentService.initiateShiprocketCheckout({
    orderId,
    shippingAddress,
  });

  next({ success: true, data: paymentDetails });
};

export const getOrderById = async (req: Request, res: Response, next: NextFunction) => {
  const { orderId } = req.params;

  const order = await orderService.getOrderById(orderId);

  next({ success: true, data: order });
};

export const getOrderByOrderNumber = async (req: Request, res: Response, next: NextFunction) => {
  const { orderNumber } = req.params;

  const order = await orderService.getOrderByOrderNumber(orderNumber);

  next({ success: true, data: order });
};

export const getMyOrders = async (req: Request, res: Response, next: NextFunction) => {
  const userId = req.user._id;
  const { limit } = req.query;

  const orders = await orderService.getUserOrders(userId, limit ? parseInt(limit as string) : undefined);

  next({ success: true, data: orders });
};

export const getGuestOrders = async (req: Request, res: Response, next: NextFunction) => {
  const { sessionId } = req.params;
  const { limit } = req.query;

  const orders = await orderService.getGuestOrders(sessionId, limit ? parseInt(limit as string) : undefined);

  next({ success: true, data: orders });
};

export const cancelOrder = async (req: Request, res: Response, next: NextFunction) => {
  const { orderId } = req.params;
  const { cancellationReason } = req.body;
  const userId = req.user?._id || 'guest';

  const order = await orderService.cancelOrder({
    orderId,
    cancelledBy: userId,
    cancellationReason,
  });

  next({ success: true, data: order });
};

export const updateOrderStatus = async (req: Request, res: Response, next: NextFunction) => {
  const { orderId } = req.params;
  const { status, paymentStatus, shipmentStatus } = req.body;

  const order = await orderService.updateOrderStatus({
    orderId,
    status,
    paymentStatus,
    shipmentStatus,
  });

  next({ success: true, data: order });
};