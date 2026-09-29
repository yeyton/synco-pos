import type { Fulfillment } from '../../../../types/fulfillment';
import { MapPin, Phone, ExternalLink, Navigation, AlertTriangle } from 'lucide-react';
import { IssueModal } from '../components/IssueModal';
import { useState } from 'react';

interface Props {
  fulfillment: Fulfillment;
  onBack: () => void;
  onAction: (action: string) => void;
  isLoading: boolean;
}

export const FulfillmentRouteView: React.FC<Props> = ({ fulfillment, onBack, onAction, isLoading }) => {
  const [isIssueModalOpen, setIsIssueModalOpen] = useState(false);
  
  const address = fulfillment.shipping_address || '';
  const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
  const wazeUrl = `https://waze.com/ul?q=${encodeURIComponent(address)}&navigate=yes`;

  return (
    <div className="flex flex-col h-full bg-bg-main relative overflow-hidden">
      
      {/* Header Block */}
      <div className="bg-bg-panel border-b border-border-color p-4 shadow-sm z-10 shrink-0">
        <div className="flex items-center gap-4 mb-2">
          <button className="md:hidden text-text-muted font-bold hover:bg-input-bg p-2 rounded-lg" onClick={onBack}>
            ← Volver
          </button>
          <span className="bg-blue-100 text-blue-900 px-3 py-1 rounded-full text-xs font-black border border-blue-300">En Camino</span>
          <span className="text-xs font-bold text-text-muted ml-auto">#{fulfillment.order_id.substring(0, 8)}</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto pb-32 p-6 flex flex-col items-center">
        
        <div className="w-full max-w-md flex flex-col gap-6">
          <div className="text-center">
            <h1 className="text-4xl font-black text-text-main mb-2">
              {fulfillment.recipient_name || 'Cliente sin nombre'}
            </h1>
            <p className="font-bold text-xl text-text-muted flex items-center justify-center gap-2">
              <Phone className="w-6 h-6" /> {fulfillment.recipient_phone || 'No registrado'}
            </p>
          </div>

          <div className="bg-input-bg border-2 border-border-color rounded-2xl p-6 text-center shadow-sm">
            <MapPin className="w-10 h-10 text-blue-600 mx-auto mb-3" />
            <p className="font-black text-2xl text-text-main leading-tight">
              {fulfillment.shipping_address || 'Dirección no especificada'}
            </p>
          </div>

          <div className="flex flex-col gap-3 mt-4">
            <a 
              href={googleMapsUrl} 
              target="_blank" 
              rel="noreferrer"
              className="w-full bg-white text-gray-800 font-black text-lg py-4 rounded-xl hover:bg-gray-100 transition-colors shadow-md flex items-center justify-center gap-3 border border-gray-300"
            >
              <ExternalLink className="w-6 h-6 text-blue-500" /> [ GOOGLE MAPS ]
            </a>
            
            <a 
              href={wazeUrl} 
              target="_blank" 
              rel="noreferrer"
              className="w-full bg-[#33ccff] text-white font-black text-lg py-4 rounded-xl hover:bg-[#2cb4e3] transition-colors shadow-md flex items-center justify-center gap-3"
            >
              <Navigation className="w-6 h-6" /> [ WAZE ]
            </a>
          </div>

          <div className="mt-8">
            <button 
              onClick={() => setIsIssueModalOpen(true)}
              className="w-full bg-red-100 text-red-900 border-2 border-red-200 font-bold text-lg py-4 rounded-xl hover:bg-red-200 transition-colors flex items-center justify-center gap-2"
            >
              <AlertTriangle className="w-6 h-6" /> PROBLEMA CON LA ENTREGA
            </button>
          </div>
        </div>

      </div>

      <IssueModal 
        isOpen={isIssueModalOpen} 
        onClose={() => setIsIssueModalOpen(false)} 
        onConfirm={(type, notes) => {
          onAction('issue', { issue_type: type, notes });
          setIsIssueModalOpen(false);
        }}
      />

      {/* Floating Action */}
      <div className="absolute bottom-0 left-0 right-0 bg-bg-panel border-t-2 border-border-color p-4 shadow-[0_-10px_40px_rgba(0,0,0,0.1)] z-20">
        <div className="max-w-2xl mx-auto flex justify-center">
          <button 
            onClick={() => onAction('arrived')}
            disabled={isLoading}
            className="w-full bg-text-main text-bg-main font-black text-xl py-6 rounded-2xl hover:bg-gray-800 transition-transform active:scale-95 shadow-xl flex items-center justify-center gap-3 uppercase tracking-wider"
          >
            <MapPin className="w-7 h-7" /> [ YA LLEGUÉ ]
          </button>
        </div>
      </div>
    </div>
  );
};
