import shipmentModel, { IShipment, IShipmentItem, ITrackingEvent } from '../models/shipment.model';

export interface ICreateShipmentParams {
  orderId: string;
  orderNumber: string;
  userId?: string;
  items: IShipmentItem[];
  weight?: number;
  dimensions?: {
    length: number;
    breadth: number;
    height: number;
  };
  isCod: boolean;
  codAmount?: number;
}

export class ShipmentRepository {
  private _model = shipmentModel;

  async createShipment(params: ICreateShipmentParams): Promise<IShipment> {
    return this._model.create({
      ...params,
      provider: 'shiprocket',
      status: 'pending',
      trackingEvents: [],
    });
  }

  async getShipmentById(shipmentId: string): Promise<IShipment | null> {
    return this._model.findById(shipmentId);
  }

  async getShipmentByOrderId(orderId: string): Promise<IShipment | null> {
    return this._model.findOne({ orderId }).sort({ createdAt: -1 });
  }

  async getShipmentByAwb(awb: string): Promise<IShipment | null> {
    return this._model.findOne({ awb });
  }

  async getShipmentByShiprocketOrderId(shiprocketOrderId: string): Promise<IShipment | null> {
    return this._model.findOne({ shiprocketOrderId });
  }

  async updateShipmentShiprocketDetails(
    shipmentId: string,
    shiprocketOrderId: string,
    shiprocketShipmentId: string,
    channelOrderId: string,
    shiprocketResponse?: any
  ): Promise<IShipment | null> {
    return this._model.findByIdAndUpdate(
      shipmentId,
      {
        shiprocketOrderId,
        shiprocketShipmentId,
        channelOrderId,
        shiprocketResponse,
      },
      { new: true }
    );
  }

  async updateShipmentAwb(
    shipmentId: string,
    awb: string,
    courierName: string,
    courierId?: string,
    trackingUrl?: string
  ): Promise<IShipment | null> {
    return this._model.findByIdAndUpdate(
      shipmentId,
      {
        awb,
        courierName,
        courierId,
        trackingUrl,
        status: 'pickup_scheduled',
      },
      { new: true }
    );
  }

  async updateShipmentStatus(
    shipmentId: string,
    status: string,
    webhookData?: any
  ): Promise<IShipment | null> {
    const updateData: any = { status };

    if (webhookData) {
      updateData.webhookData = webhookData;
    }

    // Update specific date fields based on status
    if (status === 'pickup_scheduled' || status === 'pickup_generated') {
      updateData.pickupScheduledDate = new Date();
    } else if (status === 'in_transit' && !updateData.shippedDate) {
      updateData.shippedDate = new Date();
    } else if (status === 'delivered') {
      updateData.deliveredDate = new Date();
    } else if (status === 'rto_initiated') {
      updateData.rtoInitiatedDate = new Date();
    }

    return this._model.findByIdAndUpdate(shipmentId, updateData, { new: true });
  }

  async addTrackingEvent(
    shipmentId: string,
    trackingEvent: ITrackingEvent
  ): Promise<IShipment | null> {
    return this._model.findByIdAndUpdate(
      shipmentId,
      {
        $push: { trackingEvents: trackingEvent },
      },
      { new: true }
    );
  }

  async updateShipmentCharges(
    shipmentId: string,
    shippingCharges: number,
    codCharges?: number
  ): Promise<IShipment | null> {
    const updateData: any = { shippingCharges };
    if (codCharges !== undefined) {
      updateData.codCharges = codCharges;
    }

    return this._model.findByIdAndUpdate(shipmentId, updateData, { new: true });
  }

  async updateShipmentDocuments(
    shipmentId: string,
    label?: string,
    manifest?: string,
    invoice?: string
  ): Promise<IShipment | null> {
    const updateData: any = {};
    if (label) updateData.label = label;
    if (manifest) updateData.manifest = manifest;
    if (invoice) updateData.invoice = invoice;

    return this._model.findByIdAndUpdate(shipmentId, updateData, { new: true });
  }

  async updateShipmentError(
    shipmentId: string,
    errorMessage: string
  ): Promise<IShipment | null> {
    return this._model.findByIdAndUpdate(
      shipmentId,
      { errorMessage, status: 'cancelled' },
      { new: true }
    );
  }

  async getShipmentsByUserId(userId: string, limit?: number): Promise<IShipment[]> {
    const query = this._model.find({ userId }).sort({ createdAt: -1 });
    if (limit) {
      query.limit(limit);
    }
    return query;
  }

  async getShipmentsByStatus(
    status: string,
    limit?: number,
    skip?: number
  ): Promise<IShipment[]> {
    const query = this._model.find({ status }).sort({ createdAt: -1 });
    
    if (skip) {
      query.skip(skip);
    }
    if (limit) {
      query.limit(limit);
    }
    
    return query;
  }

  async updateShipment(
    shipmentId: string,
    updateData: Partial<IShipment>
  ): Promise<IShipment | null> {
    return this._model.findByIdAndUpdate(shipmentId, updateData, { new: true });
  }
}

export default new ShipmentRepository();