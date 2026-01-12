import { BadRequestError } from '../errors/bad-request.error';
import { NotFoundError } from '../errors/not-found.error';
import { InternalServerError } from '../errors/internal-server.error';
import { CategoryRepository, ICreateCategoryParams, IUpdateCategoryParams, IGetCategoriesParams } from '../repository/category.repository';
import shiprocketWebhookService from './shiprocketWebhook.service';

class CategoryService {
  constructor(private readonly _categoryRepository: CategoryRepository) {}

  async createCategory(params: ICreateCategoryParams) {
    const existingCategory = await this._categoryRepository.getCategoryByName(params.name);

    if (existingCategory) {
      throw new BadRequestError('Category with this name already exists');
    }

    const category = await this._categoryRepository.createCategory(params);

    if (!category) {
      throw new InternalServerError('Failed to create category');
    }

    // Sync with Shiprocket if needed
    this.syncWithShiprocket(category._id.toString()).catch(err => {
      console.error('Shiprocket sync failed:', err);
    });

    return category;
  }

  async getCategoryById(id: string) {
    const category = await this._categoryRepository.getCategoryById(id);

    if (!category) {
      throw new NotFoundError('Category not found');
    }

    return category;
  }

  async getCategories(params: IGetCategoriesParams) {
    return this._categoryRepository.getCategories(params);
  }

  async updateCategory(params: IUpdateCategoryParams) {
    const category = await this._categoryRepository.updateCategory(params);

    if (!category) {
      throw new NotFoundError('Category not found');
    }

    // Sync with Shiprocket
    this.syncWithShiprocket(category._id.toString()).catch(err => {
      console.error('Shiprocket sync failed:', err);
    });

    return category;
  }

  async deleteCategory(id: string) {
    const category = await this._categoryRepository.deleteCategory(id);

    if (!category) {
      throw new NotFoundError('Category not found');
    }
    this.syncWithShiprocket(category._id.toString());

    return { message: 'Category deleted successfully' };
  }

  private async syncWithShiprocket(categoryId: string) {
    try {
      await shiprocketWebhookService.sendCollectionUpdateWebhook(categoryId);
    } catch (error) {
      console.error(`Failed to sync category ${categoryId} with Shiprocket:`, error);
    }
  }

}

export default new CategoryService(new CategoryRepository());