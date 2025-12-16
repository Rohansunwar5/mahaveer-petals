import { ShipmentRepository } from '../repository/shipment.repository';
import { OrderRepository } from '../repository/order.repository';
import shiprocketService from './shiprocket.service';
import { NotFoundError } from '../errors/not-found.error';
import { BadRequestError } from '../errors/bad-request.error';
import { InternalServerError } from '../errors/internal-server.error';
import config from '../config';

class ShipmentService {
  constructor(
    private readonly _shipmentRepo: ShipmentRepository,
    private readonly _orderRepo: OrderRepository
  ) {}

  async createShipmentFromOrder(orderId: string) {
    const order = await this._orderRepo.getOrderById(orderId);
    if (!order) {
      throw new NotFoundError('Order not found');
    }

    // Check if order is confirmed
    if (order.status !== 'confirmed') {
      throw new BadRequestError('Order must be confirmed before creating shipment');
    }

    // Check if shipment already exists
    const existingShipment = await this._shipmentRepo.getShipmentByOrderId(orderId);
    if (existingShipment) {
      return existingShipment;
    }

    // Prepare shipment items
    const shipmentItems = order.items.map((item) => ({
      productId: item.productId,
      name: item.name,
      sku: item.productCode,
      units: item.quantity,
      sellingPrice: item.price,
      hsn: item.hsn,
    }));

    // Calculate package dimensions and weight
    const weight = this.calculateWeight(order.items);
    const dimensions = this.calculateDimensions(order.items);

    // Create shipment record
    const shipment = await this._shipmentRepo.createShipment({
      orderId: order._id,
      orderNumber: order.orderNumber,
      userId: order.userId,
      items: shipmentItems,
      weight,
      dimensions,
      isCod: order.paymentStatus === 'pending',
      codAmount: order.paymentStatus === 'pending' ? order.totalAmount : 0,
    });

    // Link shipment to order
    await this._orderRepo.updateOrderShipmentId(order._id, shipment._id);

    return shipment;
  }

  async createShiprocketOrder(shipmentId: string) {
    const shipment = await this._shipmentRepo.getShipmentById(shipmentId);
    if (!shipment) {
      throw new NotFoundError('Shipment not found');
    }

    const order = await this._orderRepo.getOrderById(shipment.orderId);
    if (!order) {
      throw new NotFoundError('Order not found');
    }

    // Check if already created
    if (shipment.shiprocketOrderId) {
      return shipment;
    }

    try {
      // Prepare order data for Shiprocket
      const orderData = {
        order_id: order.orderNumber,
        order_date: new Date().toISOString().split('T')[0],
        pickup_location: config.SHIPROCKET_PICKUP_LOCATION || 'Primary',
        billing_customer_name: order.billingAddress.name.split(' ')[0],
        billing_last_name: order.billingAddress.name.split(' ').slice(1).join(' ') || '',
        billing_address: order.billingAddress.addressLine1,
        billing_address_2: order.billingAddress.addressLine2,
        billing_city: order.billingAddress.city,
        billing_pincode: order.billingAddress.pincode,
        billing_state: order.billingAddress.state,
        billing_country: order.billingAddress.country,
        billing_email: order.billingAddress.email || order.shippingAddress.email || '',
        billing_phone: order.billingAddress.phone,
        shipping_is_billing: this.isSameAddress(order.shippingAddress, order.billingAddress),
        shipping_customer_name: order.shippingAddress.name.split(' ')[0],
        shipping_last_name: order.shippingAddress.name.split(' ').slice(1).join(' ') || '',
        shipping_address: order.shippingAddress.addressLine1,
        shipping_address_2: order.shippingAddress.addressLine2,
        shipping_city: order.shippingAddress.city,
        shipping_pincode: order.shippingAddress.pincode,
        shipping_country: order.shippingAddress.country,
        shipping_state: order.shippingAddress.state,
        shipping_email: order.shippingAddress.email || '',
        shipping_phone: order.shippingAddress.phone,
        order_items: shipment.items.map((item) => ({
          name: item.name,
          sku: item.sku,
          units: item.units,
          selling_price: item.sellingPrice,
          hsn: item.hsn,
        })),
        payment_method: (shipment.isCod ? 'COD' : 'Prepaid') as 'COD' | 'Prepaid',
        sub_total: order.subtotal,
        length: shipment.dimensions?.length || 10,
        breadth: shipment.dimensions?.breadth || 10,
        height: shipment.dimensions?.height || 10,
        weight: shipment.weight || 0.5,
      };

      const response = await shiprocketService.createOrder(orderData);

      // Update shipment with Shiprocket details
      await this._shipmentRepo.updateShipmentShiprocketDetails(
        shipment._id,
        response.order_id.toString(),
        response.shipment_id.toString(),
        response.channel_order_id,
        response
      );

      // Update order status
      await this._orderRepo.updateOrderStatus({
        orderId: order._id,
        status: 'processing',
        shipmentStatus: 'pending',
      });

      return this._shipmentRepo.getShipmentById(shipment._id);
    } catch (error: any) {
      console.error('Shiprocket order creation error:', error);
      await this._shipmentRepo.updateShipmentError(
        shipment._id,
        error.message || 'Failed to create Shiprocket order'
      );
      throw new InternalServerError('Failed to create shipment order');
    }
  }

  async assignCourierAndGenerateAWB(shipmentId: string, courierId?: number) {
    const shipment = await this._shipmentRepo.getShipmentById(shipmentId);
    if (!shipment) {
      throw new NotFoundError('Shipment not found');
    }

    if (!shipment.shiprocketShipmentId) {
      throw new BadRequestError('Shiprocket order must be created first');
    }

    try {
      let selectedCourierId = courierId;

      // If courier not specified, get recommended courier
      if (!selectedCourierId) {
        const order = await this._orderRepo.getOrderById(shipment.orderId);
        if (!order) {
          throw new NotFoundError('Order not found');
        }

        const couriers = await shiprocketService.getAvailableCouriers({
          pickup_postcode: config.SHIPROCKET_PICKUP_PINCODE || '110001',
          delivery_postcode: order.shippingAddress.pincode,
          weight: shipment.weight || 0.5,
          cod: shipment.isCod ? 1 : 0,
          order_amount: shipment.codAmount,
        });

        if (!couriers.data?.available_courier_companies?.length) {
          throw new BadRequestError('No courier services available for this location');
        }

        // Select courier with lowest rate
        const recommendedCourier = couriers.data.available_courier_companies.sort(
          (a: any, b: any) => a.rate - b.rate
        )[0];
        selectedCourierId = recommendedCourier.courier_company_id;
      }

      // Assign courier and get AWB
      const awbResponse = await shiprocketService.assignCourier(
        parseInt(shipment.shiprocketShipmentId),
        selectedCourierId
      );

      // Update shipment with AWB details
      await this._shipmentRepo.updateShipmentAwb(
        shipment._id,
        awbResponse.response.data.awb_code,
        awbResponse.response.data.courier_name,
        selectedCourierId.toString(),
        awbResponse.response.data.tracking_url
      );

      // Update order status
      await this._orderRepo.updateOrderStatus({
        orderId: shipment.orderId,
        status: 'processing',
        shipmentStatus: 'pickup_scheduled',
      });

      return this._shipmentRepo.getShipmentById(shipment._id);
    } catch (error: any) {
      console.error('AWB generation error:', error);
      throw new InternalServerError('Failed to assign courier and generate AWB');
    }
  }

  async schedulePickup(shipmentId: string) {
    const shipment = await this._shipmentRepo.getShipmentById(shipmentId);
    if (!shipment) {
      throw new NotFoundError('Shipment not found');
    }

    if (!shipment.awb) {
      throw new BadRequestError('AWB must be generated before scheduling pickup');
    }

    try {
      await shiprocketService.generatePickup(parseInt(shipment.shiprocketShipmentId!));

      await this._shipmentRepo.updateShipmentStatus(shipment._id, 'pickup_scheduled');

      await this._orderRepo.updateOrderStatus({
        orderId: shipment.orderId,
        status: 'processing',
        shipmentStatus: 'pickup_scheduled',
      });

      return this._shipmentRepo.getShipmentById(shipment._id);
    } catch (error: any) {
      console.error('Pickup scheduling error:', error);
      throw new InternalServerError('Failed to schedule pickup');
    }
  }

  async trackShipment(shipmentId: string) {
    const shipment = await this._shipmentRepo.getShipmentById(shipmentId);
    if (!shipment) {
      throw new NotFoundError('Shipment not found');
    }

    if (!shipment.awb) {
      throw new BadRequestError('Shipment has not been assigned AWB yet');
    }

    try {
      const trackingData = await shiprocketService.trackShipment(shipment.awb);
      return trackingData;
    } catch (error: any) {
      console.error('Shipment tracking error:', error);
      throw new InternalServerError('Failed to track shipment');
    }
  }

  async updateShipmentStatus(params: {
    shipmentId: string;
    status: string;
    webhookData?: any;
  }) {
    const shipment = await this._shipmentRepo.updateShipmentStatus(
      params.shipmentId,
      params.status,
      params.webhookData
    );

    if (!shipment) {
      throw new NotFoundError('Shipment not found');
    }

    // Sync order status with shipment status
    const orderStatus = this.mapShipmentStatusToOrderStatus(params.status);
    await this._orderRepo.updateOrderStatus({
      orderId: shipment.orderId,
      status: orderStatus,
      shipmentStatus: params.status,
    });

    return shipment;
  }

  async getShipmentByOrderId(orderId: string) {
    const shipment = await this._shipmentRepo.getShipmentByOrderId(orderId);
    if (!shipment) {
      throw new NotFoundError('Shipment not found for this order');
    }
    return shipment;
  }

  private calculateWeight(items: any[]): number {
    // Default weight calculation: 0.5kg per item
    return items.reduce((total, item) => total + item.quantity * 0.5, 0);
  }

  private calculateDimensions(items: any[]): { length: number; breadth: number; height: number } {
    // Default dimensions for a package
    return {
      length: 10,
      breadth: 10,
      height: 10,
    };
  }

  private isSameAddress(addr1: any, addr2: any): boolean {
    return (
      addr1.addressLine1 === addr2.addressLine1 &&
      addr1.city === addr2.city &&
      addr1.pincode === addr2.pincode
    );
  }

  private mapShipmentStatusToOrderStatus(shipmentStatus: string): string {
    const statusMap: { [key: string]: string } = {
      pending: 'processing',
      pickup_scheduled: 'processing',
      pickup_generated: 'processing',
      manifested: 'shipped',
      in_transit: 'shipped',
      out_for_delivery: 'shipped',
      delivered: 'delivered',
      rto_initiated: 'cancelled',
      rto_in_transit: 'cancelled',
      rto_delivered: 'cancelled',
      cancelled: 'cancelled',
    };

    return statusMap[shipmentStatus] || 'processing';
  }
}

export default new ShipmentService(
  new ShipmentRepository(),
  new OrderRepository()
);