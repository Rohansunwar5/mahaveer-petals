import categoryModel, { ICategory } from '../models/category.model';
import mongoose from 'mongoose';

export interface ICreateCategoryParams {
  name: string;
  handle: string;
  description?: string;
  image?: string;
  shiprocketCollectionId?: string;
  hsn?: string;
  isActive?: boolean;
}

export interface IUpdateCategoryParams {
  _id: string;
  name?: string;
  handle?: string;
  description?: string;
  image?: string;
  shiprocketCollectionId?: string;
  hsn?: string;
  isActive?: boolean;
}

export interface IGetCategoriesParams {
  page?: number;
  limit?: number;
  isActive?: boolean;
  searchQuery?: string;
}

export class CategoryRepository {
  private _model = categoryModel;

  async createCategory(params: ICreateCategoryParams): Promise<ICategory> {
    return this._model.create({
      name: params.name,
      handle: params.handle,
      description: params.description || '',
      image: params.image || '',
      shiprocketCollectionId: params.shiprocketCollectionId,
      hsn: params.hsn || '',
      isActive: params.isActive !== undefined ? params.isActive : true,
    });
  }

  async getCategoryById(id: string): Promise<ICategory | null> {
    return this._model.findById(id);
  }

  async getCategoryByName(name: string): Promise<ICategory | null> {
    return this._model.findOne({ name: { $regex: new RegExp(`^${name}$`, 'i') } });
  }
  
  async getCategoryByHandle(handle: string): Promise<ICategory | null> {
    return this._model.findOne({ handle: handle.toLowerCase() });
  }

  async getCategories(params: IGetCategoriesParams) {
    const page = params.page || 1;
    const limit = params.limit || 100;
    const skip = (page - 1) * limit;

    const filter: any = {};

    if (params.isActive !== undefined) {
      filter.isActive = params.isActive;
    }

    if (params.searchQuery) {
      filter.$or = [
        { name: { $regex: params.searchQuery, $options: 'i' } },
        { description: { $regex: params.searchQuery, $options: 'i' } }
      ];
    }

    const categories = await this._model.find(filter)
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 });

    const total = await this._model.countDocuments(filter);

    return {
      categories,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async updateCategory(params: IUpdateCategoryParams): Promise<ICategory | null> {
    const { _id, ...updateData } = params;

    const updateObject: any = {};

    if (updateData.name) updateObject.name = updateData.name;
    if (updateData.handle) updateObject.handle = updateData.handle;
    if (updateData.description !== undefined) updateObject.description = updateData.description;
    if (updateData.image !== undefined) updateObject.image = updateData.image;
    if (updateData.shiprocketCollectionId !== undefined) updateObject.shiprocketCollectionId = updateData.shiprocketCollectionId;
    if (updateData.hsn !== undefined) updateObject.hsn = updateData.hsn;
    if (updateData.isActive !== undefined) updateObject.isActive = updateData.isActive;

    return this._model.findByIdAndUpdate(_id, updateObject, { new: true });
  }

  async deleteCategory(id: string): Promise<ICategory | null> {
    return this._model.findByIdAndUpdate(id, { isActive: false }, { new: true });
  }
}