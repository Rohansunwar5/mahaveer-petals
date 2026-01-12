import { ProductRepository } from '../repository/product.repository';
import { ProductVariantRepository } from '../repository/productVariant.repository';
import { CategoryRepository } from '../repository/category.repository';
import { NotFoundError } from '../errors/not-found.error';
import { IProduct } from '../models/product.model';
import { IProductVariant } from '../models/productVariant.model';

interface ShiprocketVariant {
  id: string;
  title: string;
  price: string;
  quantity: number;
  sku: string;
  updated_at: string;
  image: {
    src: string;
  };
  weight: number;
  hsn?: string;
}

interface ShiprocketProduct {
  id: string;
  title: string;
  body_html: string;
  vendor: string;
  product_type: string;
  handle: string;
  created_at: string;
  updated_at: string;
  status: string;
  variants: ShiprocketVariant[];
  image: {
    src: string;
  };
}

interface ShiprocketCollection {
  id: string;
  updated_at: string;
  body_html: string;
  handle: string;
  image: {
    src: string;
  };
  title: string;
  created_at: string;
}

class ShiprocketCatalogService {
  constructor(
    private readonly _productRepository: ProductRepository,
    private readonly _variantRepository: ProductVariantRepository,
    private readonly _categoryRepository: CategoryRepository
  ) {}

  /**
   * Fetch all products in Shiprocket format
   * Endpoint: GET /shiprocket/products?page=1&limit=100
   */
  async fetchProducts(page = 1, limit = 100) {
    const { products, pagination } = await this._productRepository.getProducts({
      page,
      limit,
      isActive: true,
    });

    const shiprocketProducts: ShiprocketProduct[] = [];

    for (const product of products) {
      const formattedProduct = await this.formatProduct(product);
      if (formattedProduct) {
        shiprocketProducts.push(formattedProduct);
      }
    }

    // ✅ CORRECTED: Match Shiprocket's exact response format
    return {
      data: {
        total: pagination.total,
        products: shiprocketProducts,
      },
    };
  }

  /**
   * Fetch products by collection/category
   * Endpoint: GET /shiprocket/products?collection_id=1234&page=1&limit=100
   */
  async fetchProductsByCollection(collectionId: string, page = 1, limit = 100) {
    const { products, pagination } = await this._productRepository.getProductsByCategory(
      collectionId,
      page,
      limit
    );

    const shiprocketProducts: ShiprocketProduct[] = [];

    for (const product of products) {
      const formattedProduct = await this.formatProduct(product);
      if (formattedProduct) {
        shiprocketProducts.push(formattedProduct);
      }
    }

    // ✅ CORRECTED: Match Shiprocket's exact response format
    return {
      data: {
        total: pagination.total,
        products: shiprocketProducts,
      },
    };
  }

  /**
   * Fetch all collections/categories
   * Endpoint: GET /shiprocket/collections?page=1&limit=100
   */
  async fetchCollections(page = 1, limit = 100) {
    const { categories, pagination } = await this._categoryRepository.getCategories({
      page,
      limit,
      isActive: true,
    });

    const shiprocketCollections: ShiprocketCollection[] = categories.map(category => {
      const categoryDoc = category as any;
      
      return {
        id: categoryDoc.shiprocketCollectionId || category._id.toString(),
        updated_at: categoryDoc.updatedAt?.toISOString() || new Date().toISOString(),
        body_html: category.description || '',
        handle: category.handle, // ✅ ADDED: Required field
        image: {
          src: category.image || '',
        },
        title: category.name,
        created_at: categoryDoc.createdAt?.toISOString() || new Date().toISOString(), // ✅ ADDED: Required field
      };
    });

    // ✅ CORRECTED: Match Shiprocket's exact response format
    return {
      data: {
        total: pagination.total,
        collections: shiprocketCollections,
      },
    };
  }

  /**
   * Format product for webhook updates
   * Internal endpoint: GET /shiprocket/webhook-data/:productId
   */
  async formatProductUpdateWebhook(productId: string) {
    const product = await this._productRepository.getProductById(productId);

    if (!product) {
      throw new NotFoundError('Product not found');
    }

    const formattedProduct = await this.formatProduct(product, true);

    if (!formattedProduct) {
      throw new Error('Product has no active variants with Shiprocket IDs');
    }

    return formattedProduct;
  }

  /**
   * Private helper to format a single product
   * @param product - The product document
   * @param strictMode - If true, throw error if variants missing shiprocketVariantId
   */
  private async formatProduct(
    product: IProduct,
    strictMode = false
  ): Promise<ShiprocketProduct | null> {
    const { variants } = await this._variantRepository.getVariantsByProductId(
      product._id.toString(),
      1,
      1000
    );

    const validVariants = variants.filter(
      v => v.isActive && !!v.shiprocketVariantId
    );

    if (validVariants.length === 0) {
      if (strictMode) {
        throw new Error(
          `All active variants must be synced with Shiprocket before webhook update`
        );
      }
      return null; // Skip this product in catalog sync
    }

    const category = await this._categoryRepository.getCategoryById(
      product.categoryId.toString()
    );

    const productDoc = product as IProduct & { createdAt?: Date; updatedAt?: Date };
    const firstVariant = validVariants[0];

    return {
      id: product._id.toString(),
      title: product.name,
      body_html: product.description || '',
      vendor: 'Daadis', // ✅ Your store name
      product_type: category?.name || '',
      handle: product.slug, // ✅ ADDED: Required field
      created_at: productDoc.createdAt?.toISOString() || new Date().toISOString(), // ✅ ADDED: Required field
      updated_at: productDoc.updatedAt?.toISOString() || new Date().toISOString(),
      status: product.isActive ? 'active' : 'inactive',
      variants: validVariants.map(variant => this.formatVariant(variant)),
      image: {
        src: firstVariant.image,
      },
    };
  }

  /**
   * Private helper to format a single variant
   */
  private formatVariant(variant: IProductVariant): ShiprocketVariant {
    const variantDoc = variant as IProductVariant & { updatedAt?: Date };

    return {
      id: variant.shiprocketVariantId!, // ✅ Guaranteed to exist due to filtering
      title: this.formatVariantTitle(variant.attributes),
      price: variant.price.toString(),
      quantity: variant.stock,
      sku: variant.sku,
      updated_at: variantDoc.updatedAt?.toISOString() || new Date().toISOString(),
      image: { src: variant.image },
      weight: variant.weight,
      hsn: variant.hsn || '', // ✅ ADDED: HSN code for tax compliance
    };
  }

  /**
   * Format variant title from attributes
   */
  private formatVariantTitle(attributes: { 
    size?: string; 
    colorName?: string; 
    colorHex?: string 
  }): string {
    const parts: string[] = [];
    
    if (attributes.colorName) {
      parts.push(attributes.colorName);
    }
    
    if (attributes.size) {
      parts.push(attributes.size);
    }
    
    return parts.length > 0 ? parts.join(' / ') : 'Default';
  }
}

export default new ShiprocketCatalogService(
  new ProductRepository(), 
  new ProductVariantRepository(),
  new CategoryRepository()
);