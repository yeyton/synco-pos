import React from 'react';
import type { Fulfillment, FulfillmentItem } from '../../../../types/fulfillment';
import { CheckCircle2, MapPin, Phone } from 'lucide-react';
import { Checklist } from '../components/Checklist';

interface Props {
  fulfillment: Fulfillment;
  items: FulfillmentItem[];
  onBack: () => void;
  onAction: (action: string) => void;
  onItemUpdated: () => void;
  isLoading: boolean;
}

export const FulfillmentPreparationView: React.FC<Props> = ({ 
  fulfillment, items, onBack, onAction, onItemUpdated, isLoading 
}) => {
  const allPrepared = items.length > 0 && items.every(i => i.is_prepared);

  return (
    <div className="flex flex-col h-full bg-bg-main relative overflow-hidden">
      
      {/* Top Header Minimized */}
      <div className="bg-bg-panel border-b border-border-color p-4 shadow-sm z-10 shrink-0">
        <div className="flex items-center gap-4 mb-2">
          <button className="md:hidden text-text-muted font-bold hover:bg-input-bg p-2 rounded-lg" onClick={onBack}>
            ← Volver
          </button>
          <span className="bg-yellow-100 text-yellow-900 px-3 py-1 rounded-full text-xs font-black border border-yellow-300">Preparando</span>
          <span className="text-xs font-bold text-text-muted ml-auto">#{fulfillment.order_id.substring(0, 8)}</span>
        </div>
        
        <h2 className="text-2xl font-black text-text-main line-clamp-1">{fulfillment.recipient_name || 'Cliente'}</h2>
        
        <div className="flex items-center gap-4 mt-2 text-sm font-bold text-text-muted">
          <span className="flex items-center gap-1"><Phone className="w-4 h-4" /> {fulfillment.recipient_phone || 'Sin teléfono'}</span>
          {fulfillment.fulfillment_type === 'DISPATCH' && (
            <span className="flex items-center gap-1 truncate"><MapPin className="w-4 h-4" /> {fulfillment.shipping_address}</span>
          )}
        </div>
      </div>

      {/* Main Content: Checklist */}
      <div className="flex-1 overflow-y-auto pb-32 p-4 md:p-6 bg-input-bg/30">
        <Checklist 
          fulfillmentId={fulfillment.id} 
          items={items} 
          onItemUpdated={onItemUpdated}
          type="PREPARE"
          disabled={false}
        />
      </div>

      {/* Floating Action */}
      <div className="absolute bottom-0 left-0 right-0 bg-bg-panel border-t-2 border-border-color p-4 shadow-[0_-10px_40px_rgba(0,0,0,0.1)] z-20">
        <div className="max-w-2xl mx-auto flex justify-center">
          <button 
            onClick={() => onAction('confirm-prepared')}
            disabled={isLoading || !allPrepared}
            className="w-full bg-green-600 disabled:bg-gray-300 disabled:text-gray-500 disabled:border-transparent text-white font-black text-xl py-6 rounded-2xl hover:bg-green-700 transition-transform active:scale-95 shadow-xl flex items-center justify-center gap-3 border-2 border-green-700"
          >
            <CheckCircle2 className="w-7 h-7" /> [ LISTO PARA DESPACHAR ]
          </button>
        </div>
      </div>
    </div>
  );
};
