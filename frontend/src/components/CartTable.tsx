import React from 'react';
import type { CartItem } from '../types/pos';
import { Plus, Minus, Trash2, Barcode } from 'lucide-react';

interface CartTableProps {
  items: CartItem[];
  onUpdateQuantity: (variantId: string, delta: number) => void;
  onSetQuantity: (variantId: string, quantity: number) => void;
  onRemoveItem: (variantId: string) => void;
  onClearCart: () => void;
}

export const CartTable: React.FC<CartTableProps> = ({
  items,
  onUpdateQuantity,
  onSetQuantity,
  onRemoveItem,
  onClearCart,
}) => {
  const formatCLP = (amount: number) => {
    return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(amount);
  };

  return (
    <div className="flex-1 flex flex-col bg-slate-900/60 border border-slate-800 rounded-xl overflow-hidden shadow-inner">
      <div className="bg-slate-900 border-b border-slate-800 px-5 py-3 grid grid-cols-12 text-xs font-semibold text-slate-400 tracking-wider uppercase">
        <span className="col-span-5">Producto / SKU</span>
        <span className="col-span-2 text-right">Precio Neto</span>
        <span className="col-span-2 text-right">Precio Total</span>
        <span className="col-span-2 text-center">Cantidad</span>
        <span className="col-span-1 text-center">Acción</span>
      </div>

      <div className="flex-1 overflow-y-auto divide-y divide-slate-800/60">
        {items.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-500 gap-3 py-16">
            <div className="w-16 h-16 rounded-full bg-slate-800/80 border border-slate-700/60 flex items-center justify-center text-slate-400 shadow-inner">
              <Barcode className="w-8 h-8 opacity-70" />
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-slate-400">Escanea un código de barras para comenzar</p>
              <p className="text-xs text-slate-500 mt-1">Usa la pistola lectora o presiona F2 para buscar manualmente</p>
            </div>
          </div>
        ) : (
          items.map((item) => {
            const itemTotal = item.unit_gross_price * item.quantity;
            return (
              <div
                key={item.variant_id}
                className="px-5 py-3.5 grid grid-cols-12 items-center hover:bg-slate-800/40 transition-colors text-sm"
              >
                <div className="col-span-5 pr-2">
                  <div className="font-semibold text-slate-100 truncate">{item.product_name}</div>
                  <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
                    <span className="font-mono bg-slate-800 px-1.5 py-0.5 rounded text-[11px] border border-slate-700">
                      SKU: {item.sku}
                    </span>
                    {item.barcode && (
                      <span className="font-mono text-slate-500">[{item.barcode}]</span>
                    )}
                  </div>
                </div>

                <div className="col-span-2 text-right text-slate-300 font-mono text-xs">
                  {formatCLP(item.unit_net_price)}
                </div>

                <div className="col-span-2 text-right font-bold font-mono text-emerald-400">
                  {formatCLP(itemTotal)}
                </div>

                <div className="col-span-2 flex items-center justify-center gap-1.5">
                  <button
                    onClick={() => onUpdateQuantity(item.variant_id, -1)}
                    className="w-7 h-7 rounded bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 flex items-center justify-center transition-colors cursor-pointer"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <input
                    type="number"
                    min="1"
                    value={item.quantity}
                    onChange={(e) => onSetQuantity(item.variant_id, parseInt(e.target.value) || 1)}
                    className="w-11 text-center bg-slate-950 border border-slate-700 rounded py-0.5 text-xs font-bold text-slate-100 font-mono focus:outline-none focus:border-emerald-500"
                  />
                  <button
                    onClick={() => onUpdateQuantity(item.variant_id, 1)}
                    className="w-7 h-7 rounded bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 flex items-center justify-center transition-colors cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="col-span-1 text-center">
                  <button
                    onClick={() => onRemoveItem(item.variant_id)}
                    className="p-1.5 rounded hover:bg-rose-950/60 text-slate-400 hover:text-rose-400 transition-colors cursor-pointer"
                    title="Eliminar producto"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {items.length > 0 && (
        <div className="bg-slate-900/90 border-t border-slate-800 px-5 py-2.5 flex items-center justify-between text-xs text-slate-400">
          <span>{items.reduce((acc, i) => acc + i.quantity, 0)} unidades en {items.length} ítems</span>
          <button
            onClick={onClearCart}
            className="text-rose-400 hover:text-rose-300 hover:underline flex items-center gap-1 cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Vaciar Carrito</span>
          </button>
        </div>
      )}
    </div>
  );
};
