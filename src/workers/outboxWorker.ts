import { dbPool } from '../db.js';
import { DTEProviderFactory } from '../services/dteAdapter.js';
import { MarketplaceService } from '../services/marketplaceService.js';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Worker Asíncrono de Procesamiento de Outbox (BullMQ / Polling Loop)
 * Garantiza que la venta física en POS devuelva respuesta en <50ms 
 * mientras el DTE y la sincronización con Shopify/MercadoLibre corren en segundo plano.
 */
export async function processOutboxBatch() {
  const client = await dbPool.connect();
  try {
    // Polling con SKIP LOCKED para concurrencia limpia entre múltiples réplicas de workers
    const selectQuery = `
      SELECT id, aggregate_type, aggregate_id, event_type, payload
      FROM outbox_events
      WHERE status = 'PENDING'
      ORDER BY created_at ASC
      LIMIT 10
      FOR UPDATE SKIP LOCKED;
    `;

    const res = await client.query(selectQuery);
    if (res.rows.length === 0) {
      return;
    }

    const dteProvider = DTEProviderFactory.getProvider();

    for (const event of res.rows) {
      try {
        console.log(`[OUTBOX WORKER] Processing Event ${event.id} (${event.event_type})`);

        if (event.event_type === 'ORDER_COMPLETED') {
          const { order_id, total_amount, warehouse_id } = event.payload;

          // 1. Emitir DTE (Boleta Electrónica 39) en segundo plano
          const dteResponse = await dteProvider.emitirBoleta({
            orderId: order_id,
            storeRut: '76123456-7',
            dteType: 39,
            items: [],
            netAmount: Math.round(total_amount / 1.19),
            vatAmount: Math.round(total_amount - total_amount / 1.19),
            totalAmount: total_amount,
          });

          // Registrar resultado del DTE en dte_invoices
          await client.query(
            `INSERT INTO dte_invoices (order_id, dte_type, folio, sii_status, track_id, pdf_url, xml_payload, ted_xml)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
             ON CONFLICT (order_id) DO UPDATE SET sii_status = EXCLUDED.sii_status, updated_at = NOW();`,
            [
              order_id,
              dteResponse.dteType,
              dteResponse.folio,
              dteResponse.siiStatus,
              dteResponse.trackId || null,
              dteResponse.pdfUrl || null,
              dteResponse.xmlPayload || null,
              dteResponse.tedXml || null,
            ]
          );

          // 2. Sincronizar stock con marketplaces omnicanal si existen mapeos
          const orderItems = await client.query(
            `SELECT oi.variant_id, i.stock_physical - i.stock_reserved AS available_stock
             FROM order_items oi
             JOIN inventory i ON i.variant_id = oi.variant_id AND i.warehouse_id = $1
             WHERE oi.order_id = $2`,
            [warehouse_id, order_id]
          );

          for (const item of orderItems.rows) {
            await MarketplaceService.syncVariantStockToMarketplaces(item.variant_id, parseFloat(item.available_stock));
          }
        }

        // Marcar evento como PROCESSED
        await client.query(
          `UPDATE outbox_events SET status = 'PROCESSED', processed_at = NOW() WHERE id = $1;`,
          [event.id]
        );
      } catch (err: any) {
        console.error(`[OUTBOX WORKER ERROR] Event ${event.id} failed:`, err.message);
        await client.query(
          `UPDATE outbox_events SET status = 'FAILED', error_message = $1, retry_count = retry_count + 1 WHERE id = $2;`,
          [err.message, event.id]
        );
      }
    }
  } finally {
    client.release();
  }
}

// Bucle de worker continuo si se ejecuta directamente
if (process.argv[1] && process.argv[1].endsWith('outboxWorker.ts')) {
  console.log('🚀 Outbox Async Background Worker Started...');
  setInterval(async () => {
    try {
      await processOutboxBatch();
    } catch (err) {
      console.error('Worker loop error:', err);
    }
  }, 2000);
}
