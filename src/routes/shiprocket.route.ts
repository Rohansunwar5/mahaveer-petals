// import { Router } from 'express';
// import { asyncHandler } from '../utils/asynchandler';
// import {
//   createShipment,
//   createShiprocketOrder,
//   assignCourierAndGenerateAWB,
//   schedulePickup,
//   trackShipment,
//   getShipmentByOrderId,
// } from '../controllers/shipment.controller';

// const shipmentRouter = Router();

// // Create shipment from order (Admin only - add admin middleware)
// shipmentRouter.post('/order/:orderId', asyncHandler(createShipment));

// // Create Shiprocket order (Admin only)
// shipmentRouter.post('/:shipmentId/shiprocket', asyncHandler(createShiprocketOrder));

// // Assign courier and generate AWB (Admin only)
// shipmentRouter.post('/:shipmentId/awb', asyncHandler(assignCourierAndGenerateAWB));

// // Schedule pickup (Admin only)
// shipmentRouter.post('/:shipmentId/pickup', asyncHandler(schedulePickup));

// // Track shipment
// shipmentRouter.get('/:shipmentId/track', asyncHandler(trackShipment));

// // Get shipment by order ID
// shipmentRouter.get('/order/:orderId', asyncHandler(getShipmentByOrderId));

// export default shipmentRouter;