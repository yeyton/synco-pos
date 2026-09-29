import { dbPool } from '../db.js';

export interface MarketplaceSyncPayload {
  variantId: string;
  newStockPhysical: number;
  newStockReserved: number;
}

export class MarketplaceService {
  /**
   * Dispatches real-time stock updates to external platforms mapped in `marketplace_mappings`
   */
  static async syncVariantStockToMarketplaces(variantId: string, availableStock: number): Promise<void> {
    const client = await dbPool.connect();
    try {
      const res = await client.query(
        `SELECT platform, external_item_id, external_variation_id 
         FROM marketplace_mappings 
         WHERE variant_id = $1 AND is_sync_enabled = true`,
        [variantId]
      );

      if (res.rows.length === 0) {
        return; // No external marketplace mapping for this variant
      }

      for (const mapping of res.rows) {
        console.log(
          `[MARKETPLACE SYNC] Dispatching Stock=${availableStock} to ${mapping.platform} (ItemID: ${mapping.external_item_id})`
        );
        // Here we trigger external API calls (Shopify Admin GraphQL / MercadoLibre API / WooCommerce REST)
        // e.g. await shopifyClient.setInventory(mapping.external_item_id, availableStock);
      }
    } finally {
      client.release();
    }
  }
}
