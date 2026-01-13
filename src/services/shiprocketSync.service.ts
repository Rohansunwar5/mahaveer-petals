import shiprocketCatalogPull from "../integrations/shiprocketCatalog.pull";
import productVariantModel from "../models/productVariant.model";
import shiprocketWebhookService from "./shiprocketWebhook.service";

class ShiprocketSyncService {
  async syncProduct(productId: string) {
    // 1. Push product to Shiprocket
    await shiprocketWebhookService.sendProductUpdateWebhook(productId);

    // 2. Fetch catalog from Shiprocket
    const shiprocketProducts = await shiprocketCatalogPull.fetchCatalogFromShiprocket();

    // 3. Map SKUs → shiprocketVariantId
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