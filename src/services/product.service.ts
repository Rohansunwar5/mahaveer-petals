// product.service.ts
import { BadRequestError } from '../errors/bad-request.error';
import { NotFoundError } from '../errors/not-found.error';
import { InternalServerError } from '../errors/internal-server.error';
import {
  ProductRepository,
  ICreateProductParams,
  IUpdateProductParams,
  IGetProductsParams,
} from '../repository/product.repository';
import { ProductVariantRepository } from '../repository/productVariant.repository';
import shiprocketWebhookService from './shiprocketWebhook.service';
import { uploadProductImageToS3 } from '../utils/s3.util';

class ProductService {
  constructor(
    private readonly _productRepository: ProductRepository,
    private readonly _variantRepository: ProductVariantRepository
  ) {}

  async createProduct(params: ICreateProductParams) {
    const existingProduct = await this._productRepository.getProductByCode(params.productCode);
    if (existingProduct) {
      throw new BadRequestError('Product code already exists');
    }

    const existingSlug = await this._productRepository.getProductBySlug(params.slug);
    if (existingSlug) {
      throw new BadRequestError('Slug already exists');
    }

    const product = await this._productRepository.createProduct(params);
    if (!product) {
      throw new InternalServerError('Failed to create product');
    }

    this.sendProductWebhookAsync(product._id.toString());

    return product;
  }

  async sendProductWebhookAsync(productId: string) {
    try {
      await shiprocketWebhookService.sendProductUpdateWebhook(productId);
    } catch (error) {
      console.error('[Product Service] Failed to send webhook to Shiprocket:', {
        productId,
        error: error instanceof Error ? error.message : error,
      });
      
      // TODO: Implement retry queue or dead letter queue
      // Consider using a job queue like Bull or BullMQ for reliability
    }
  }

  async getProductById(id: string) {
    const product = await this._productRepository.getProductById(id);
    if (!product) {
      throw new NotFoundError('Product not found');
    }
    return product;
  }

  async getProductBySlug(slug: string) {
    const product = await this._productRepository.getProductBySlug(slug);
    if (!product) {
      throw new NotFoundError('Product not found');
    }
    return product;
  }

  async getProducts(params: IGetProductsParams) {
    return this._productRepository.getProducts(params);
  }

  async updateProduct(params: IUpdateProductParams) {
    const product = await this._productRepository.updateProduct(params);
    
    if (!product) {
      throw new NotFoundError('Product not found');
    }

    // ✅ Send webhook to Shiprocket asynchronously
    // Don't await - let it run in background
    this.sendProductWebhookAsync(product._id.toString());

    return product;
  }

  async deleteProduct(id: string) {
    const product = await this._productRepository.deleteProduct(id);
    if (!product) {
      throw new NotFoundError('Product not found');
    }
    return { message: 'Product deleted successfully' };
  }

  async getProductWithVariants(productId: string) {
    const product = await this._productRepository.getProductById(productId);
    if (!product) {
      throw new NotFoundError('Product not found');
    }

    const { variants } = await this._variantRepository.getVariantsByProductId(productId, 1, 1000);

    return {
      product,
      variants,
    };
  }

  async getProductsByCategory(categoryId: string, page = 1, limit = 100) {
    return this._productRepository.getProductsByCategory(categoryId, page, limit);
  }

  async handleImageUploads(params: { files?: Express.Multer.File[]; existingImages?: string[] }): Promise<string[]> {
      let imageUrls: string[] = [];

      if (params.existingImages) {
          imageUrls = Array.isArray(params.existingImages) ? params.existingImages : [params.existingImages];
      }

      if (params.files && params.files.length > 0) {
          const uploadPromises = params.files.map((file) => uploadProductImageToS3(file));
          const newImageUrls = await Promise.all(uploadPromises);
          imageUrls = [...imageUrls, ...newImageUrls.map(img => img.url)];
      }

      if (imageUrls.length === 0) throw new BadRequestError('At least one product image is required');

      return imageUrls;
  }

  // Helper method to sync product metrics when variants change
  async syncProductMetrics(productId: string) {
    const { variants } = await this._variantRepository.getVariantsByProductId(productId, 1, 1000);
    const activeVariants = variants.filter(v => v.isActive);

    if (activeVariants.length === 0) {
      await this._productRepository.syncProductMetrics(productId, {
        totalStock: 0,
        basePrice: 0,
      });
      return;
    }

    const prices = activeVariants.map(v => v.price);
    const totalStock = activeVariants.reduce((sum, v) => sum + v.stock, 0);

    await this._productRepository.syncProductMetrics(productId, {
      totalStock,
      basePrice: Math.min(...prices),
      priceRange: {
        min: Math.min(...prices),
        max: Math.max(...prices),
      },
    });
  }
}

export default new ProductService(new ProductRepository(), new ProductVariantRepository());

