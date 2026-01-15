import shiprocketCatalogPull from "../integrations/shiprocketCatalog.pull";
import productVariantModel from "../models/productVariant.model";
import shiprocketWebhookService from "./shiprocketWebhook.service";

class ShiprocketSyncService {
  async syncProduct(productId: string) {
    await shiprocketWebhookService.sendProductUpdateWebhook(productId);

    const shiprocketProducts = await shiprocketCatalogPull.fetchCatalogFromShiprocket();

    for (const product of shiprocketProducts) {
      for (const variant of product.variants) {
          await productVariantModel.updateOne(
          { sku: variant.sku },
          { $setOnInsert: { shiprocketVariantId: variant.id } }
        );
      }
    }
  }
}

export default new ShiprocketSyncService();