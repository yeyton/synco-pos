import React, { useState } from 'react';
import { Barcode, Search, Trash2, Plus, Minus, CheckCircle, Save, X } from 'lucide-react';
import type { CartItem, PaymentMethod } from '../types/pos';
import type { Customer } from './CustomerModal';

interface CartSectionProps {
  items: CartItem[];
  customer: Customer | null;
  onUpdateQuantity: (variantId: string, delta: number) => void;
  onSetQuantity: (variantId: string, quantity: number) => void;
  onRemoveItem: (variantId: string) => void;
  onClearCart: () => void;
  onOpenCustomerModal: () => void;
  onCheckout: () => void;
  onManualAddProduct: (code: string) => void;
  isProcessing: boolean;
  netTotal: number;
  vatTotal: number;
  grossTotal: number;
  onSaveDraft: () => void;
  onOpenCatalog: () => void;
  onOpenDiscountModal: () => void;
}

export const CartSection: React.FC<CartSectionProps> = ({
  items,
  customer,
  onUpdateQuantity,
  onSetQuantity,
  onRemoveItem,
  onClearCart,
  onOpenCustomerModal,
  onCheckout,
  onManualAddProduct,
  isProcessing,
  netTotal,
  vatTotal,
  grossTotal,
  onSaveDraft,
  onOpenCatalog,
  onOpenDiscountModal,
}) => {
  const [discount, setDiscount] = useState<number>(0);
  const [barcode, setBarcode] = useState('');

  const formatCLP = (amount: number) => {
    return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(amount);
  };

  const handleManualBarcodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (barcode.trim()) {
      onManualAddProduct(barcode.trim());
      setBarcode('');
    }
  };

  return (
    <div className="w-full flex flex-col h-full bg-bg-main">
      
      {/* Top Search Bar */}
      <div className="p-4 border-b border-border-color bg-bg-panel flex items-center gap-3">
        <Barcode className="w-6 h-6 text-text-muted" />
        <form onSubmit={handleManualBarcodeSubmit} className="flex-1 relative">
          <input 
            type="text" 
            value={barcode}
            onChange={(e) => setBarcode(e.target.value)}
            placeholder="ingresa aquí el producto o servicio"
            className="w-full bg-transparent border-b border-border-color border-dashed pb-1 text-text-main focus:outline-none focus:border-color-brand placeholder-text-muted transition-colors text-base"
          />
          <Search className="absolute right-2 top-0.5 w-4 h-4 text-color-brand" />
        </form>
      </div>

      {/* Cart Items List */}
      <div className="flex-1 overflow-y-auto custom-scrollbar bg-bg-main">
        {items.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-text-muted opacity-50">
            <Barcode className="w-16 h-16 mb-4" />
            <p>Escanea un producto para agregarlo al carrito</p>
          </div>
        ) : (
          <div className="flex flex-col">
            {items.map((item) => (
              <div key={item.variant_id} className="border-b border-border-color py-1.5 px-3 flex items-stretch gap-3 bg-bg-panel hover:bg-bg-main transition-colors">
                
                {/* Controles de Cantidad: Botones apilados y luego el input al costado */}
                <div className="flex items-center gap-2 shrink-0">
                  <div className="flex flex-col gap-1.5">
                    <button onClick={() => onUpdateQuantity(item.variant_id, 1)} className="w-6 h-6 flex items-center justify-center text-[#2cb2e6] hover:bg-[#2cb2e6] hover:text-white rounded-full border border-[#2cb2e6] transition-colors"><Plus className="w-3 h-3" /></button>
                    <button onClick={() => onUpdateQuantity(item.variant_id, -1)} className="w-6 h-6 flex items-center justify-center text-[#2cb2e6] hover:bg-[#2cb2e6] hover:text-white rounded-full border border-[#2cb2e6] transition-colors"><Minus className="w-3 h-3" /></button>
                  </div>
                  <input 
                    type="number" 
                    value={item.quantity} 
                    onChange={(e) => onSetQuantity(item.variant_id, parseInt(e.target.value) || 1)}
                    className="w-12 text-center border border-gray-400 rounded text-base font-medium text-text-main bg-white focus:outline-none focus:border-[#2cb2e6]"
                    style={{ height: '36px' }}
                  />
                </div>

                {/* Detalles del Producto y Precios */}
                <div className="flex-1 flex justify-between min-w-0">
                  {/* Nombre y Precio Unitario */}
                  <div className="flex flex-col justify-between py-1 min-w-0 pr-2">
                    <div>
                      <div className="text-[15px] text-text-main leading-snug truncate">{item.product_name}</div>
                      <div className="text-sm text-text-muted mt-0.5 truncate">{item.sku}</div>
                    </div>
                    <div className="text-sm text-text-muted font-medium mt-2">
                      $ {new Intl.NumberFormat('es-CL').format(item.unit_gross_price)}
                    </div>
                  </div>

                  {/* Total y Botones de Acción */}
                  <div className="flex flex-col items-end justify-between py-1 shrink-0">
                    <div className="text-[14.5px] text-text-main font-medium">
                      $ {new Intl.NumberFormat('es-CL').format(item.unit_gross_price * item.quantity)}
                    </div>
                    <div className="flex items-center gap-1 mt-1">
                      <button className="w-7 h-7 flex items-center justify-center rounded-full border border-border-color text-text-muted hover:text-[#2cb2e6] hover:border-[#2cb2e6] transition-colors" title="Editar precio">
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                        </svg>
                      </button>
                      <button onClick={() => onRemoveItem(item.variant_id)} className="w-7 h-7 flex items-center justify-center rounded-full border border-border-color text-text-muted hover:text-red-500 hover:border-red-500 transition-colors" title="Quitar item">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>

              </div>
            ))}
          </div>
        )}
      </div>

      {/* Checkout Footer (Bsale Style) */}
      <div className="border-t border-border-color bg-bg-main px-3 py-2 flex flex-col gap-1.5 shadow-[0_-4px_10px_rgba(0,0,0,0.03)]">
        
        {/* Nr Lineas */}
        <div className="text-[11px] text-text-muted font-medium mb-0.5">
          Nr. Líneas: {items.length} / Tot. Ítems: {items.reduce((acc, i) => acc + i.quantity, 0)}
        </div>

        {/* Document Type Dropdown */}
        <div className="w-1/2 min-w-[180px]">
          <select className="w-full bg-white border border-gray-300 text-text-main text-sm rounded px-2 py-1 outline-none focus:border-color-brand">
            <option>boleta electrónica</option>
            <option>factura electrónica</option>
          </select>
        </div>

        {/* Cliente y Total Row */}
        <div className="flex items-center justify-between gap-4 border-b border-gray-200 border-dashed pb-1.5 mt-1">
          <button 
            onClick={onOpenCustomerModal}
            className="flex-1 flex items-center justify-between text-sm text-text-muted hover:text-text-main focus:outline-none transition-colors"
          >
            {customer ? (
              <span className="font-bold text-color-brand truncate text-left">Cliente: {customer.name}</span>
            ) : (
              <span className="truncate text-left">Cliente: nom</span>
            )}
            <Search className="w-5 h-5 text-[#0ea5e9]" />
          </button>

          <div className="flex items-center gap-2 shrink-0">
            <span className="text-sm text-text-muted">Total</span>
            <div className="border border-gray-400 rounded px-3 py-1 bg-white min-w-[120px] text-right text-lg font-bold text-text-main">
              {formatCLP(grossTotal)}
            </div>
            <svg onClick={onOpenDiscountModal} className="w-4 h-4 text-text-muted cursor-pointer hover:text-color-brand transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
            </svg>
          </div>
        </div>

        {/* Action Buttons Row */}
        <div className="flex items-center justify-between gap-2 mt-0.5">
          <div className="flex gap-1.5">
            <button 
              className="p-1.5 px-3 bg-[#e5e7eb] hover:bg-gray-300 rounded border border-gray-300 text-gray-700 transition-colors shadow-sm flex items-center justify-center gap-1.5 disabled:opacity-50"
              title="Cancelar Venta"
              onClick={onClearCart}
              disabled={items.length === 0}
            >
              <X className="w-4 h-4" />
            </button>
            <button 
              className="p-1.5 px-3 bg-[#e5e7eb] hover:bg-gray-300 rounded border border-gray-300 text-gray-700 transition-colors shadow-sm flex items-center justify-center gap-1.5 disabled:opacity-50"
              title="Guardar Borrador"
              onClick={onSaveDraft}
              disabled={items.length === 0}
            >
              <Save className="w-4 h-4" />
            </button>
          </div>
          
          <button 
            className={`flex-1 md:flex-none md:w-1/2 py-2 rounded text-white font-bold text-sm shadow-sm flex items-center justify-center gap-2 transition-colors ${
              items.length === 0 || isProcessing
                ? 'bg-text-muted cursor-not-allowed'
                : 'bg-[#2cb2e6] hover:bg-[#209bc9]'
            }`}
            onClick={onCheckout}
            disabled={items.length === 0 || isProcessing}
          >
            {isProcessing ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <>PAGAR <CheckCircle className="w-4 h-4" /></>
            )}
          </button>
        </div>

      </div>

    </div>
  );
};
