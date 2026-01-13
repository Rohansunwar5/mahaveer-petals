import { Router } from 'express';
import { asyncHandler } from '../utils/asynchandler';
import {
  createVariant,
  getVariantById,
  getVariantsByProductId,
  getAllVariants,
  updateVariant,
  updateStock,
  deleteVariant,
} from '../controllers/productVariant.controller';
import isAdminLoggedIn from '../middlewares/isAdminLoggedIn.middleware';

const productVariantRouter = Router();

productVariantRouter.post('/', isAdminLoggedIn, asyncHandler(createVariant));
productVariantRouter.get( '/', asyncHandler(getAllVariants));
productVariantRouter.get( '/:id', asyncHandler(getVariantById));
productVariantRouter.get( '/product/:productId', asyncHandler(getVariantsByProductId));
productVariantRouter.patch( '/:id', isAdminLoggedIn, asyncHandler(updateVariant));
productVariantRouter.patch('/:id/stock',isAdminLoggedIn, asyncHandler(updateStock));
productVariantRouter.delete('/:id', isAdminLoggedIn, asyncHandler(deleteVariant));

export default productVariantRouter;