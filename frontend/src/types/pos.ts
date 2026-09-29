export interface ProductVariant {
  variant_id: string;
  product_id: string;
  product_name: string;
  brand?: string;
  attributes?: Record<string, any>;
  sku: string;
  barcode: string;
  variant_name?: string;
  net_price: number;
  vat_rate: number;
  gross_price: number;
  stock_available: number;
}

export interface CartItem {
  variant_id: string;
  product_name: string;
  sku: string;
  barcode: string;
  unit_net_price: number;
  unit_gross_price: number;
  vat_rate: number;
  quantity: number;
  stock_available: number;
}

export type PaymentMethod = 'CASH' | 'DEBIT_CARD' | 'CREDIT_CARD' | 'TRANSFER' | 'WEBPAY' | 'OTHER';
export type CollectionMethod = 'CASH_ON_DELIVERY' | 'POS_ON_DELIVERY' | 'TRANSFER_ON_DELIVERY' | 'UNDEFINED_ON_DELIVERY';

export interface CheckoutResponse {
  success: boolean;
  order_id: string;
  order_number: string;
  total_amount: number;
  latency_ms: number;
}

export interface TicketData {
  order_number: string;
  folio: number;
  dte_type: 39 | 33;
  date: string;
  items: CartItem[];
  net_amount: number;
  vat_amount: number;
  total_amount: number;
  payment_method: PaymentMethod;
  latency_ms: number;
  isReprint?: boolean;
  copies?: number;
  ted_xml?: string;
  pdf_url?: string;
}
