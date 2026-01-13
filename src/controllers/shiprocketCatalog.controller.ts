import { NextFunction, Request, Response } from 'express';
import shiprocketCatalogService from '../services/shiprocketCatalog.service';

export const fetchProducts = async ( req: Request, res: Response, next: NextFunction ) => {
  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 100;
  const collectionId = req.query.collection_id as string | undefined;

  let response;

  if (collectionId) {
    response = await shiprocketCatalogService.fetchProductsByCollection(
      collectionId,
      page,
      limit
    );
  } else {
    response = await shiprocketCatalogService.fetchProducts(page, limit);
  }
  return next(response);
};

export const fetchProductsByCollection = async (req: Request, res: Response, next: NextFunction) => {
  const { collection_id } = req.query;
  const { page, limit } = req.query;

  if (!collection_id) {
    return next({ error: 'collection_id is required' });
  }

  const response = await shiprocketCatalogService.fetchProductsByCollection(
    collection_id as string,
    page ? parseInt(page as string) : 1,
    limit ? parseInt(limit as string) : 100
  );

  next(response);
};

export const fetchCollections = async (req: Request, res: Response, next: NextFunction) => {
  const { page, limit } = req.query;

  const response = await shiprocketCatalogService.fetchCollections(
    page ? parseInt(page as string) : 1,
    limit ? parseInt(limit as string) : 100
  );

  next(response);
};

export const getProductWebhookData = async (req: Request, res: Response, next: NextFunction) => {
  const { productId } = req.params;

  const response = await shiprocketCatalogService.formatProductUpdateWebhook(productId);

  next(response);
};