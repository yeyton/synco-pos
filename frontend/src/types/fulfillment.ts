export type FulfillmentStatus = 'PENDING' | 'PREPARING' | 'PREPARED' | 'IN_TRANSIT' | 'DELIVERED' | 'PICKED_UP' | 'CANCELED' | 'FAILED';
export type FulfillmentType = 'DISPATCH' | 'PICKUP';
export type PaymentStatus = 'PENDING' | 'PARTIAL' | 'COMPLETED';
export type PaymentMethod = 'CASH' | 'DEBIT_CARD' | 'CREDIT_CARD' | 'TRANSFER' | 'WEBPAY' | 'POS_ON_DELIVERY';

export interface FulfillmentItem {
  id: string;
  fulfillment_id: string;
  order_item_id: string;
  product_name: string;
  sku: string;
  required_qty: number;
  prepared_qty: number;
  is_prepared: boolean;
  delivered_qty: number;
  is_delivered: boolean;
  location?: string;
}

export interface Fulfillment {
  id: string;
  order_id: string;
  store_id: string;
  warehouse_id: string;
  fulfillment_type: FulfillmentType;
  status: FulfillmentStatus;
  payment_method: PaymentMethod;
  payment_status: PaymentStatus;
  order_total_amount: number;
  requires_collection: boolean;
  collection_amount: number;
  collection_method?: string | null;
  collection_status?: string | null;
  recipient_name: string | null;
  recipient_rut: string | null;
  recipient_signature_url: string | null;
  delivery_photo_url: string | null;
  delivery_notes: string | null;
  collection_received: boolean;
  collection_reference: string | null;
  created_at: string;
  updated_at: string;
  items?: FulfillmentItem[]; // usually populated on detail fetch or list
}
