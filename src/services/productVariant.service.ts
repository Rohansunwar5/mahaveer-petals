// productVariant.service.ts
import { BadRequestError } from '../errors/bad-request.error';
import { NotFoundError } from '../errors/not-found.error';
import { InternalServerError } from '../errors/internal-server.error';
import {
  ProductVariantRepository,
  ICreateVariantParams,
  IUpdateVariantParams,
} from '../repository/productVariant.repository';
import { ProductRepository } from '../repository/product.repository';
import productService from './product.service';

class ProductVariantService {
  constructor(
    private readonly _variantRepository: ProductVariantRepository,
    private readonly _productRepository: ProductRepository
  ) {}

  async createVariant(params: ICreateVariantParams) {
    const product = await this._productRepository.getProductById(params.productId);
    if (!product) {
      throw new NotFoundError('Product not found');
    }

    const existingVariantBySku = await this._variantRepository.getVariantBySku(params.sku);
    if (existingVariantBySku) {
      throw new BadRequestError('SKU already exists');
    }

    const existingVariantByCode = await this._variantRepository.getVariantByCode(params.variantCode);
    if (existingVariantByCode) {
      throw new BadRequestError('Variant code already exists');
    }

    if (params.useBasePrice) {
      params.price = product.price;
      params.originalPrice = product.originalPrice;
    }

    const { variants } = await this._variantRepository.getVariantsByProductId(params.productId, 1, 1);
    if (variants.length === 0 || params.isDefault) {
      // Clear existing defaults if setting a new one
      if (params.isDefault) {
        await this._variantRepository.clearDefaultVariants(params.productId);
      }
      params.isDefault = true;
    }

    const variant = await this._variantRepository.createVariant(params);
    if (!variant) {
      throw new InternalServerError('Failed to create variant');
    }

    // Sync product metrics after creating variant
    await productService.syncProductMetrics(params.productId);
    productService.sendProductWebhookAsync(params.productId);

    return variant;
  }

  async getVariantById(id: string) {
    const variant = await this._variantRepository.getVariantById(id);
    if (!variant) {
      throw new NotFoundError('Variant not found');
    }
    return variant;
  }

  async getVariantsByProductId(productId: string, page = 1, limit = 100) {
    return this._variantRepository.getVariantsByProductId(productId, page, limit);
  }

  async getAllVariants(page = 1, limit = 100, isActive?: boolean) {
    return this._variantRepository.getAllVariants(page, limit, isActive);
  }

  async updateVariant(params: IUpdateVariantParams) {
    const existingVariant = await this._variantRepository.getVariantById(params._id);
    if (!existingVariant) {
      throw new NotFoundError('Variant not found');
    }

    // If updating to use base price, fetch product price
    if (params.useBasePrice) {
      const product = await this._productRepository.getProductById(existingVariant.productId.toString());
      if (product) {
        params.price = product.price;
        params.originalPrice = product.originalPrice;
      }
    }

    // If setting as default, clear other defaults first
    if (params.isDefault) {
      await this._variantRepository.clearDefaultVariants(existingVariant.productId.toString());
    }

    const variant = await this._variantRepository.updateVariant(params);
    if (!variant) {
      throw new NotFoundError('Variant not found');
    }

    await productService.syncProductMetrics(variant.productId.toString());
    productService.sendProductWebhookAsync(variant.productId.toString());


    return variant;
  }

  async updateStock(variantId: string, quantity: number) {
    const variant = await this._variantRepository.getVariantById(variantId);
    if (!variant) {
      throw new NotFoundError('Variant not found');
    }

    if (variant.stock + quantity < 0) {
      throw new BadRequestError('Insufficient stock');
    }

    const updatedVariant = await this._variantRepository.updateStock(variantId, quantity);

    // Sync product total stock after updating variant stock
    if (updatedVariant) {
      await productService.syncProductMetrics(updatedVariant.productId.toString());
      productService.sendProductWebhookAsync(updatedVariant.productId.toString());

    }

    return updatedVariant;
  }

  async deleteVariant(id: string) {
    const variant = await this._variantRepository.deleteVariant(id);
    if (!variant) {
      throw new NotFoundError('Variant not found');
    }

    // Sync product metrics after deleting variant
    await productService.syncProductMetrics(variant.productId.toString());
    productService.sendProductWebhookAsync(variant.productId.toString());


    return { message: 'Variant deleted successfully' };
  }
}

export default new ProductVariantService(new ProductVariantRepository(), new ProductRepository());