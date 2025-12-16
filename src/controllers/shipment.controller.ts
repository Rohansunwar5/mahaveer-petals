import { Request, Response, NextFunction } from 'express';
import shipmentService from '../services/shipment.service';

export const createShipment = async (req: Request, res: Response, next: NextFunction) => {
  const { orderId } = req.params;

  const shipment = await shipmentService.createShipmentFromOrder(orderId);

  next({ success: true, data: shipment });
};

export const createShiprocketOrder = async (req: Request, res: Response, next: NextFunction) => {
  const { shipmentId } = req.params;

  const shipment = await shipmentService.createShiprocketOrder(shipmentId);

  next({ success: true, data: shipment });
};

export const assignCourierAndGenerateAWB = async (req: Request, res: Response, next: NextFunction) => {
  const { shipmentId } = req.params;
  const { courierId } = req.body;

  const shipment = await shipmentService.assignCourierAndGenerateAWB(shipmentId, courierId);

  next({ success: true, data: shipment });
};

export const schedulePickup = async (req: Request, res: Response, next: NextFunction) => {
  const { shipmentId } = req.params;

  const shipment = await shipmentService.schedulePickup(shipmentId);

  next({ success: true, data: shipment });
};

export const trackShipment = async (req: Request, res: Response, next: NextFunction) => {
  const { shipmentId } = req.params;

  const trackingData = await shipmentService.trackShipment(shipmentId);

  next({ success: true, data: trackingData });
};

export const getShipmentByOrderId = async (req: Request, res: Response, next: NextFunction) => {
  const { orderId } = req.params;

  const shipment = await shipmentService.getShipmentByOrderId(orderId);

  next({ success: true, data: shipment });
};