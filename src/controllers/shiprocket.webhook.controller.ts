import { NextFunction, Request, Response } from 'express';
// import shipmentService from '../services/shipment.service';
import config from '../config';
import shiprocketWebhookService from '../services/shiprocketWebhook.service';

// export const handleShiprocketWebhook = async (req: Request, res: Response) => {
//   try {
//     // Verify webhook secret
//     const webhookSecret = req.headers['x-shiprocket-secret'] || req.headers['authorization'];
    
//     if (webhookSecret !== config.SHIPROCKET_WEBHOOK_SECRET) {
//       console.warn('[Webhook] Invalid Shiprocket webhook secret');
//       return res.status(401).json({ success: false, message: 'Unauthorized' });
//     }

//     const payload = req.body;
//     const eventType = payload.event_type || payload.event;

//     console.log('[Webhook] Received event:', eventType, 'for order:', payload.order_id || payload.order_number);

//     switch (eventType) {
//       // Payment Events
//       case 'payment_success':
//       case 'payment.success':
//         await handlePaymentSuccess(payload);
//         break;

//       case 'payment_failed':
//       case 'payment.failed':
//         await handlePaymentFailure(payload);
//         break;

//       // Shipment Events
//       case 'shipment_created':
//       case 'shipment.created':
//         await handleShipmentCreated(payload);
//         break;

//       case 'awb_assigned':
//       case 'awb.assigned':
//         await handleAwbAssigned(payload);
//         break;

//       case 'pickup_scheduled':
//       case 'pickup.scheduled':
//         await handlePickupScheduled(payload);
//         break;

//       case 'in_transit':
//       case 'shipment.in_transit':
//         await handleInTransit(payload);
//         break;

//       case 'out_for_delivery':
//       case 'shipment.out_for_delivery':
//         await handleOutForDelivery(payload);
//         break;

//       case 'delivered':
//       case 'shipment.delivered':
//         await handleDelivered(payload);
//         break;

//       case 'rto_initiated':
//       case 'shipment.rto_initiated':
//         await handleRtoInitiated(payload);
//         break;

//       case 'cancelled':
//       case 'shipment.cancelled':
//         await handleCancelled(payload);
//         break;

//       default:
//         console.warn('[Webhook] Unhandled event type:', eventType);
//     }

//     return res.status(200).json({ success: true });
//   } catch (error: any) {
//     console.error('[Webhook] Error processing webhook:', error.message);
//     // Return 200 to prevent Shiprocket from retrying
//     return res.status(200).json({ success: false, error: error.message });
//   }
// };

// async function handlePaymentSuccess(payload: any) {
//   const {
//     order_id,
//     order_number,
//     checkout_id,
//     transaction_id,
//     gateway_transaction_id,
//     payment_method,
//     amount,
//   } = payload;

//   await paymentService.handlePaymentSuccess({
//     checkoutId: checkout_id,
//     transactionId: transaction_id,
//     gatewayTransactionId: gateway_transaction_id,
//     orderNumber: order_number || order_id,
//     method: payment_method,
//     amount,
//     webhookData: payload,
//   });

//   console.log('[Webhook] Payment success processed for order:', order_number || order_id);
// }

// async function handlePaymentFailure(payload: any) {
//   const {
//     order_id,
//     order_number,
//     checkout_id,
//     transaction_id,
//     error_code,
//     error_message,
//     failure_reason,
//   } = payload;

//   await paymentService.handlePaymentFailure({
//     checkoutId: checkout_id,
//     transactionId: transaction_id,
//     orderNumber: order_number || order_id,
//     errorCode: error_code,
//     errorMessage: error_message,
//     failureReason: failure_reason,
//     webhookData: payload,
//   });

//   console.log('[Webhook] Payment failure processed for order:', order_number || order_id);
// }

// async function handleShipmentCreated(payload: any) {
//   const { shipment_id, order_id, order_number } = payload;

//   // Shipment creation is typically handled in the service layer
//   console.log('[Webhook] Shipment created:', shipment_id, 'for order:', order_number || order_id);
// }

// async function handleAwbAssigned(payload: any) {
//   const { shipment_id, awb, courier_name, courier_id, tracking_url } = payload;

//   // AWB assignment is typically handled in the service layer
//   console.log('[Webhook] AWB assigned:', awb, 'for shipment:', shipment_id);
// }

// async function handlePickupScheduled(payload: any) {
//   // Implementation depends on your shipment service structure
//   console.log('[Webhook] Pickup scheduled for shipment:', payload.shipment_id);
// }

// async function handleInTransit(payload: any) {
//   const { shipment_id, awb } = payload;

//   // Find shipment by AWB or shipment ID and update status
//   console.log('[Webhook] Shipment in transit:', awb || shipment_id);
// }

// async function handleOutForDelivery(payload: any) {
//   const { shipment_id, awb } = payload;

//   console.log('[Webhook] Shipment out for delivery:', awb || shipment_id);
// }

// async function handleDelivered(payload: any) {
//   const { shipment_id, awb, delivered_date } = payload;

//   console.log('[Webhook] Shipment delivered:', awb || shipment_id, 'on', delivered_date);
// }

// async function handleRtoInitiated(payload: any) {
//   const { shipment_id, awb } = payload;

//   console.log('[Webhook] RTO initiated for shipment:', awb || shipment_id);
// }

// async function handleCancelled(payload: any) {
//   const { shipment_id, awb, cancellation_reason } = payload;

//   console.log('[Webhook] Shipment cancelled:', awb || shipment_id, 'reason:', cancellation_reason);
// }

export const shiprocketOrderWebhook = async (req:any, res: Response, next: NextFunction) => {
  const hmac = req.headers['x-api-hmac-sha256'] as string;
  const rawBody = req.rawBody; // 👈 THIS is the key

  try {
    await shiprocketWebhookService.handleOrderWebhook(rawBody, hmac);
  } catch (err) {
    console.error('[Shiprocket webhook] error:', err);
    // DO NOT throw
  }

  res.status(200).json({ success: true });
};
