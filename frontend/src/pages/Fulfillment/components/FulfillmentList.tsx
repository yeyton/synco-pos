import React from 'react';
import type { Fulfillment } from '../../../types/fulfillment';
import { Truck, Store, Clock, DollarSign } from 'lucide-react';

interface Props {
  items: Fulfillment[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

export const FulfillmentList: React.FC<Props> = ({ items, selectedId, onSelect }) => {
  return (
    <>
      {items.map(f => {
        const isSelected = f.id === selectedId;
        const isCOD = f.requires_collection;
        const date = new Date(f.created_at);
        const timeString = date.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' });

        return (
          <button
            key={f.id}
            onClick={() => onSelect(f.id)}
            className={`w-full text-left p-5 rounded-2xl border-2 transition-all flex flex-col gap-3 ${
              isSelected 
                ? 'bg-white dark:bg-gray-800 border-l-8 border-color-brand shadow-lg scale-[1.02]' 
                : 'bg-bg-panel border-border-color hover:border-text-muted hover:shadow-md'
            }`}
          >
            <div className="flex justify-between items-start">
              <span className="text-sm font-black px-3 py-1 bg-input-bg text-text-main rounded-lg border border-border-color">
                #{f.order_id.substring(0, 8)}
              </span>
              <span className="text-sm font-bold text-text-muted flex items-center gap-1 bg-input-bg px-2 py-1 rounded-lg">
                <Clock className="w-4 h-4" /> {timeString}
              </span>
            </div>
            
            <h3 className="font-black text-text-main text-xl line-clamp-1">
              {f.recipient_name || f.customer_name || 'Cliente sin nombre'}
            </h3>
            
            <div className="flex items-center gap-3">
              <span className={`text-sm font-black px-3 py-1.5 rounded-lg flex items-center gap-1 border ${
                f.fulfillment_type === 'DISPATCH' 
                  ? 'bg-blue-100 text-blue-900 border-blue-200 dark:bg-blue-900/40 dark:text-blue-100 dark:border-blue-800' 
                  : 'bg-purple-100 text-purple-900 border-purple-200 dark:bg-purple-900/40 dark:text-purple-100 dark:border-purple-800'
              }`}>
                {f.fulfillment_type === 'DISPATCH' ? <Truck className="w-4 h-4" /> : <Store className="w-4 h-4" />}
                {f.fulfillment_type === 'DISPATCH' ? 'Despacho' : 'Retiro'}
              </span>

              {isCOD && (
                <span className="text-sm font-black px-3 py-1.5 rounded-lg bg-red-100 text-red-900 border border-red-300 dark:bg-red-900/50 dark:text-red-100 dark:border-red-800 flex items-center gap-1 animate-pulse">
                  <DollarSign className="w-4 h-4" />
                  COD
                </span>
              )}
            </div>
          </button>
        );
      })}
    </>
  );
};
