import React from 'react';
import type { Fulfillment, FulfillmentItem } from '../../../../types/fulfillment';
import { PackageSearch, Truck, AlertTriangle, DollarSign, MapPin, Phone } from 'lucide-react';
import { formatCurrency, formatQuantity } from '../../../utils/formatters';

interface Props {
  fulfillment: Fulfillment;
  items: FulfillmentItem[];
  onBack: () => void;
  onAction: (action: string) => void;
  isLoading: boolean;
}

export const FulfillmentDetailView: React.FC<Props> = ({ fulfillment, items, onBack, onAction, isLoading }) => {
  const isCOD = fulfillment.requires_collection;

  const getStatusBadge = () => {
    switch (fulfillment.status) {
      case 'PENDING': return <span className="bg-gray-200 text-gray-800 px-3 py-1 rounded-full text-sm font-black border border-gray-300">Pendiente</span>;
      case 'PREPARED': return <span className="bg-green-100 text-green-900 px-3 py-1 rounded-full text-sm font-black border border-green-300">Listo</span>;
      default: return <span className="bg-gray-200 text-gray-800 px-3 py-1 rounded-full text-sm font-black">{fulfillment.status}</span>;
    }
  };

  return (
    <div className="flex flex-col h-full bg-bg-main relative overflow-hidden">
      <div className="flex-1 overflow-y-auto pb-32 p-6">
        
        {/* Header Block */}
        <div className="flex justify-between items-start mb-6">
          <button 
            className="md:hidden px-4 py-2 border-2 border-border-color rounded-xl font-bold text-text-muted hover:bg-input-bg transition-colors" 
            onClick={onBack}
          >
            ← Volver
          </button>
          <div className="flex items-center gap-3 ml-auto">
            {getStatusBadge()}
          </div>
        </div>

        <div className="flex flex-col gap-1 mb-8">
          <span className="text-sm font-bold text-text-muted uppercase tracking-wider">Orden #{fulfillment.order_id.substring(0, 8)}</span>
          <h1 className="text-4xl font-black text-text-main leading-tight">
            {fulfillment.recipient_name || fulfillment.customer_name || 'Cliente sin nombre'}
          </h1>
        </div>

        {/* Info Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          
          <div className="flex flex-col p-4 bg-input-bg rounded-xl border border-border-color">
            <span className="text-xs font-bold text-text-muted uppercase tracking-wider mb-1">Tipo de Entrega</span>
            <span className="font-black text-lg flex items-center gap-2">
              {fulfillment.fulfillment_type === 'DISPATCH' ? <Truck className="w-5 h-5 text-blue-600" /> : <PackageSearch className="w-5 h-5 text-purple-600" />}
              {fulfillment.fulfillment_type === 'DISPATCH' ? 'Despacho' : 'Retiro en Local'}
            </span>
          </div>

          <div className="flex flex-col p-4 bg-input-bg rounded-xl border border-border-color">
            <span className="text-xs font-bold text-text-muted uppercase tracking-wider mb-1">Total del Pedido</span>
            <span className="font-black text-lg flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-green-600" />
              {formatCurrency(fulfillment.order_total_amount)}
            </span>
          </div>

          <div className="flex flex-col p-4 bg-input-bg rounded-xl border border-border-color">
            <span className="text-xs font-bold text-text-muted uppercase tracking-wider mb-1">Teléfono</span>
            <span className="font-bold text-lg flex items-center gap-2 text-text-main">
              <Phone className="w-5 h-5 text-text-muted" />
              {fulfillment.recipient_phone || fulfillment.customer_phone || 'No registrado'}
            </span>
          </div>

          {fulfillment.fulfillment_type === 'DISPATCH' && (
            <div className="flex flex-col p-4 bg-input-bg rounded-xl border border-border-color">
              <span className="text-xs font-bold text-text-muted uppercase tracking-wider mb-1">Dirección</span>
              <span className="font-bold text-base flex items-start gap-2 text-text-main leading-tight">
                <MapPin className="w-5 h-5 text-text-muted shrink-0" />
                {fulfillment.shipping_address || fulfillment.customer_address || 'Sin dirección'}
              </span>
            </div>
          )}
        </div>

        {/* Cantidad de Productos */}
        <div className="flex items-center gap-3 p-4 bg-bg-panel border-2 border-border-color rounded-xl mb-6">
          <PackageSearch className="w-6 h-6 text-text-muted" />
          <span className="font-bold text-lg">
            {items.length} productos en el pedido
          </span>
        </div>

        {/* Alerta de Cobro (COD) */}
        {isCOD && (
          <div className="bg-red-100 dark:bg-red-900/20 border-2 border-red-500 p-5 rounded-2xl flex flex-col gap-2 text-red-900 dark:text-red-300 shadow-sm">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-8 h-8 shrink-0 text-red-600 dark:text-red-400" />
              <p className="font-black text-2xl uppercase">Cobrar ${formatCurrency(fulfillment.collection_amount)}</p>
            </div>
            <p className="font-bold text-lg ml-11">
              {fulfillment.collection_method === 'POS_ON_DELIVERY' && '💳 Debe cobrar con TERMINAL POS'}
              {fulfillment.collection_method === 'CASH_ON_DELIVERY' && '💵 Debe cobrar en EFECTIVO'}
              {fulfillment.collection_method === 'TRANSFER_ON_DELIVERY' && '📱 Debe verificar TRANSFERENCIA'}
              {fulfillment.collection_method === 'UNDEFINED_ON_DELIVERY' && 'Medio de pago NO DEFINIDO. Pregunte al cliente.'}
              {(!fulfillment.collection_method || !['POS_ON_DELIVERY', 'CASH_ON_DELIVERY', 'TRANSFER_ON_DELIVERY', 'UNDEFINED_ON_DELIVERY'].includes(fulfillment.collection_method)) && 'Asegúrese de cobrar al entregar el pedido.'}
            </p>
          </div>
        )}

        {/* Previsualización de Productos */}
        <div className="flex flex-col gap-2 mb-8">
          <span className="text-xs font-bold text-text-muted uppercase tracking-wider px-2">Detalle de Productos (Solo Lectura)</span>
          <div className="bg-bg-panel border-2 border-border-color rounded-xl overflow-hidden divide-y-2 divide-border-color">
            {items.map(item => (
              <div key={item.id} className="p-3 flex justify-between items-center bg-input-bg opacity-90">
                <div className="flex flex-col">
                  <span className="font-bold text-text-main leading-tight">{item.product_name}</span>
                  <span className="text-xs text-text-muted">{item.sku}</span>
                  {item.location && <span className="text-xs text-blue-600 font-bold mt-1">📍 {item.location}</span>}
                </div>
                <div className="bg-bg-panel px-3 py-1 rounded-lg border border-border-color shrink-0 ml-3 font-black text-text-main">
                  x{formatQuantity(item.required_qty)}
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* Floating Action Area */}
      <div className="absolute bottom-0 left-0 right-0 bg-bg-panel border-t-2 border-border-color p-4 shadow-[0_-10px_40px_rgba(0,0,0,0.1)] dark:shadow-[0_-10px_40px_rgba(0,0,0,0.5)] z-20">
        <div className="max-w-2xl mx-auto flex justify-center">
          {fulfillment.status === 'PENDING' && (
            <button 
              onClick={() => onAction('start-preparing')}
              disabled={isLoading}
              className="w-full bg-text-main text-bg-main font-black text-xl py-6 rounded-2xl hover:bg-gray-800 dark:hover:bg-gray-200 transition-transform active:scale-95 shadow-xl flex items-center justify-center gap-3 uppercase tracking-wider"
            >
              [ INICIAR ]
            </button>
          )}

          {fulfillment.status === 'PREPARED' && fulfillment.fulfillment_type === 'DISPATCH' && (
            <button 
              onClick={() => onAction('dispatch')}
              disabled={isLoading}
              className="w-full bg-blue-600 text-white font-black text-xl py-6 rounded-2xl hover:bg-blue-700 transition-transform active:scale-95 shadow-xl flex items-center justify-center gap-3 border-2 border-blue-700"
            >
              <Truck className="w-7 h-7" /> [ SALIR A RUTA ]
            </button>
          )}

          {fulfillment.status === 'PREPARED' && fulfillment.fulfillment_type === 'PICKUP' && (
            <button 
              onClick={() => onAction('deliver-mode')}
              disabled={isLoading}
              className="w-full bg-color-brand text-white font-black text-xl py-6 rounded-2xl hover:bg-color-brand-hover transition-transform active:scale-95 shadow-xl flex items-center justify-center gap-3 border-2 border-[#b91c1c]"
            >
              [ ENTREGAR EN MOSTRADOR ]
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
