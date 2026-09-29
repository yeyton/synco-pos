import React, { useState } from 'react';
import type { FulfillmentItem } from '../../../types/fulfillment';
import { useAuth } from '../../../context/AuthContext';
import { Check, CheckCircle2, Circle } from 'lucide-react';
import { formatQuantity } from '../../../utils/formatters';

interface Props {
  fulfillmentId: string;
  items: FulfillmentItem[];
  onItemUpdated: () => void;
  type: 'PREPARE' | 'DELIVER';
  disabled?: boolean;
}

export const Checklist: React.FC<Props> = ({ fulfillmentId, items, onItemUpdated, type, disabled = false }) => {
  const { token } = useAuth();
  const [loadingItemId, setLoadingItemId] = useState<string | null>(null);

  const toggleFullQty = async (item: FulfillmentItem) => {
    if (disabled) return;
    const isDone = type === 'PREPARE' ? item.is_prepared : item.is_delivered;
    // If it's already done, touching it again shouldn't reverse it unless we want to, but standard operation is forward-only, or maybe we can allow undo. Let's allow undo.
    const newQty = isDone ? 0 : item.required_qty;
    
    setLoadingItemId(item.id);
    try {
      const endpoint = type === 'PREPARE' ? 'prepare' : 'deliver';
      const res = await fetch(`/api/v1/fulfillment/${fulfillmentId}/items/${item.id}/${endpoint}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ quantity: Number(newQty) })
      });
      if (res.ok) {
        onItemUpdated();
      } else {
        const error = await res.json();
        alert(error.message || 'Error al actualizar cantidad');
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingItemId(null);
    }
  };

  return (
    <div className="bg-bg-panel border-2 border-border-color rounded-2xl overflow-hidden shadow-sm">
      <div className="px-6 py-4 border-b-2 border-border-color bg-input-bg flex justify-between items-center">
        <h3 className="font-black text-xl text-text-main">Lista de Productos</h3>
        <span className="font-bold text-text-muted bg-bg-panel px-3 py-1 rounded-lg border border-border-color">
          {items.length} ítems
        </span>
      </div>
      <div className="divide-y-2 divide-border-color">
        {items.map(item => {
          const isDone = type === 'PREPARE' ? item.is_prepared : item.is_delivered;
          const isLoading = loadingItemId === item.id;

          return (
            <button 
              key={item.id} 
              onClick={() => toggleFullQty(item)}
              disabled={disabled || isLoading}
              className={`w-full p-5 flex items-center gap-5 transition-all text-left ${
                isDone 
                  ? 'bg-green-50 dark:bg-green-900/10' 
                  : 'hover:bg-input-bg'
              } ${disabled ? 'cursor-default opacity-70' : 'cursor-pointer active:bg-input-bg/80'}`}
            >
              <div className="shrink-0">
                {isDone ? (
                  <CheckCircle2 className="w-8 h-8 text-green-600 dark:text-green-500" />
                ) : (
                  <Circle className="w-8 h-8 text-border-color dark:text-gray-600" />
                )}
              </div>

              <div className="flex-1 pr-4">
                <p className={`font-black text-lg ${isDone ? 'text-green-800 dark:text-green-400 line-through opacity-70' : 'text-text-main'} line-clamp-2`}>
                  {item.product_name}
                </p>
                <div className="flex flex-col gap-1 mt-1">
                  <p className="text-sm font-bold text-text-muted font-mono">{item.sku}</p>
                  {item.location && (
                    <p className="text-sm font-bold text-blue-600 dark:text-blue-400">📍 {item.location}</p>
                  )}
                </div>
              </div>

              <div className="shrink-0 flex items-center justify-center bg-input-bg border border-border-color rounded-xl min-w-14 min-h-14">
                <span className={`font-black text-xl px-2 ${isDone ? 'text-green-700 dark:text-green-400' : 'text-text-main'}`}>
                  x{formatQuantity(item.required_qty)}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
