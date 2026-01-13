import { Router } from 'express';
import { asyncHandler } from '../utils/asynchandler';
import {
  fetchProducts,
  fetchProductsByCollection,
  fetchCollections,
  getProductWebhookData,
} from '../controllers/shiprocketCatalog.controller';
import { shiprocketIpMiddleware } from '../middlewares/shiprocketIp.midlleware';

const shiprocketCatalogRouter = Router();

// These endpoints will be called BY Shiprocket
// You should add shiprocketAuthMiddleware to verify HMAC signature
// For now, they're open - add your authentication middleware

// Catalog Sync APIs - Called by Shiprocket
shiprocketCatalogRouter.get(
  '/products',
  asyncHandler(fetchProducts)
);

shiprocketCatalogRouter.get(
  '/products-by-collection',
  shiprocketIpMiddleware,
  asyncHandler(fetchProductsByCollection)
);

shiprocketCatalogRouter.get(
  '/collections',
  asyncHandler(fetchCollections)
);

shiprocketCatalogRouter.get(
  '/webhook-data/:productId',
  asyncHandler(getProductWebhookData)
);

export default shiprocketCatalogRouter;