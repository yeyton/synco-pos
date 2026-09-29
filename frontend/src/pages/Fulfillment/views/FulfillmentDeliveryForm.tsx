import React, { useState } from 'react';
import type { Fulfillment, FulfillmentItem } from '../../../../types/fulfillment';
import { Camera, PenTool, AlertTriangle, Check, FileText, User } from 'lucide-react';
import { SignatureModal } from '../components/SignatureModal';
import { CODModal } from '../components/CODModal';

interface Props {
  fulfillment: Fulfillment;
  items: FulfillmentItem[];
  mode: 'QUICK' | 'CHECKLIST';
  onBack: () => void;
  onConfirm: (payload: any) => void;
  isLoading: boolean;
  allChecked: boolean;
}

export const FulfillmentDeliveryForm: React.FC<Props> = ({ 
  fulfillment, items, mode, onBack, onConfirm, isLoading, allChecked 
}) => {
  const [recipientName, setRecipientName] = useState(fulfillment.recipient_name || '');
  const [recipientRut, setRecipientRut] = useState(fulfillment.recipient_rut || '');
  const [deliveryNotes, setDeliveryNotes] = useState(fulfillment.delivery_notes || '');
  const [signatureUrl, setSignatureUrl] = useState(fulfillment.recipient_signature_url || '');
  
  const [isSigModalOpen, setIsSigModalOpen] = useState(false);
  const [isCODModalOpen, setIsCODModalOpen] = useState(false);
  const [codReceived, setCodReceived] = useState(false);
  const [codReference, setCodReference] = useState('');

  const requiresCOD = fulfillment.requires_collection && fulfillment.collection_status !== 'COLLECTED';
  
  // Can only confirm if:
  // 1. COD is paid (if required)
  // 2. Name is filled (minimum requirement)
  // 3. Checklist is fully checked (if mode is CHECKLIST)
  const isFormValid = recipientName.trim().length >= 2 && (!requiresCOD || codReceived) && (mode === 'QUICK' || allChecked);

  const handleFinalConfirm = () => {
    if (!isFormValid) return;
    onConfirm({
      delivery_mode: mode,
      recipient_name: recipientName,
      recipient_rut: recipientRut,
      recipient_signature_url: signatureUrl,
      delivery_notes: deliveryNotes,
      collection_received: codReceived,
      collection_reference: codReference
    });
  };

  const handleCODClick = () => {
    setIsCODModalOpen(true);
  };

  return (
    <div className="flex flex-col gap-6">
      
      {/* Resumen del pedido en modo QUICK */}
      {mode === 'QUICK' && (
        <div className="bg-input-bg border-2 border-border-color rounded-2xl p-4 flex justify-between items-center">
          <div>
            <p className="font-bold text-text-muted text-sm uppercase">Resumen</p>
            <p className="font-black text-xl text-text-main">{items.length} productos en total</p>
          </div>
          <span className="bg-color-brand/20 text-color-brand px-3 py-1 rounded-full font-black text-xs uppercase">Entrega Rápida</span>
        </div>
      )}

      {/* COD Block */}
      {requiresCOD && (
        <div className={`border-2 p-5 rounded-2xl flex flex-col gap-4 shadow-sm transition-colors ${
          codReceived ? 'bg-green-100 border-green-500 text-green-900' : 'bg-red-100 border-red-500 text-red-900'
        }`}>
          <div className="flex items-center gap-3">
            <AlertTriangle className={`w-8 h-8 shrink-0 ${codReceived ? 'text-green-600' : 'text-red-600'}`} />
            <div>
              <p className="font-black text-xl uppercase">Cobro Contra Entrega</p>
              <p className="font-bold text-sm">
                ${(fulfillment.collection_amount || 0).toLocaleString('es-CL')} — 
                {fulfillment.collection_method === 'POS_ON_DELIVERY' && ' POS'}
                {fulfillment.collection_method === 'CASH_ON_DELIVERY' && ' Efectivo'}
                {fulfillment.collection_method === 'TRANSFER_ON_DELIVERY' && ' Transferencia'}
              </p>
            </div>
            {codReceived && <Check className="w-8 h-8 ml-auto text-green-600" />}
          </div>
          
          {!codReceived ? (
            <button 
              onClick={handleCODClick}
              className="w-full bg-red-600 text-white font-black text-lg py-3 rounded-xl hover:bg-red-700 shadow-md transition-transform active:scale-95 uppercase"
            >
              Confirmar Recepción de Pago
            </button>
          ) : (
            <button 
              onClick={() => setCodReceived(false)}
              className="w-full bg-green-200 text-green-900 font-bold text-sm py-2 rounded-xl hover:bg-green-300 transition-colors"
            >
              Revertir Pago
            </button>
          )}
        </div>
      )}

      {/* Receptor Form */}
      <div className="bg-bg-panel border-2 border-border-color rounded-2xl p-5 shadow-sm flex flex-col gap-4">
        <h3 className="font-black text-lg uppercase flex items-center gap-2">
          <User className="w-5 h-5 text-text-muted" />
          Datos de Recepción
        </h3>
        
        <div>
          <label className="block text-sm font-bold text-text-muted mb-1">Nombre de quien recibe *</label>
          <input 
            type="text" 
            value={recipientName}
            onChange={e => setRecipientName(e.target.value)}
            placeholder="Ej. Juan Pérez"
            className="w-full bg-input-bg border-2 border-border-color rounded-xl px-4 py-3 font-bold text-text-main focus:border-color-brand outline-none transition-colors"
          />
        </div>
        
        <div>
          <label className="block text-sm font-bold text-text-muted mb-1">RUT (Opcional)</label>
          <input 
            type="text" 
            value={recipientRut}
            onChange={e => setRecipientRut(e.target.value)}
            placeholder="12.345.678-9"
            className="w-full bg-input-bg border-2 border-border-color rounded-xl px-4 py-3 font-bold text-text-main focus:border-color-brand outline-none transition-colors"
          />
        </div>
      </div>

      {/* Evidencia Extra */}
      <div className="bg-bg-panel border-2 border-border-color rounded-2xl p-5 shadow-sm flex flex-col gap-4">
        <h3 className="font-black text-lg uppercase flex items-center gap-2">
          <FileText className="w-5 h-5 text-text-muted" />
          Evidencias
        </h3>
        
        <div className="grid grid-cols-2 gap-4">
          <button 
            onClick={() => setIsSigModalOpen(true)}
            className={`flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-colors ${
              signatureUrl ? 'bg-green-50 border-green-500 text-green-700' : 'bg-input-bg border-border-color text-text-muted hover:border-gray-400'
            }`}
          >
            <PenTool className="w-8 h-8 mb-2" />
            <span className="font-bold">{signatureUrl ? 'Firma Lista' : 'Pedir Firma'}</span>
          </button>
          
          <button 
            disabled // Placeholder para foto futura
            className="flex flex-col items-center justify-center p-4 rounded-xl border-2 bg-input-bg border-border-color text-text-muted opacity-50 cursor-not-allowed"
          >
            <Camera className="w-8 h-8 mb-2" />
            <span className="font-bold">Tomar Foto</span>
          </button>
        </div>

        <div>
          <label className="block text-sm font-bold text-text-muted mb-1">Observaciones</label>
          <textarea 
            value={deliveryNotes}
            onChange={e => setDeliveryNotes(e.target.value)}
            placeholder="Comentarios sobre la entrega..."
            rows={2}
            className="w-full bg-input-bg border-2 border-border-color rounded-xl px-4 py-3 font-bold text-text-main focus:border-color-brand outline-none transition-colors resize-none"
          />
        </div>
      </div>

      {/* Main Action is handled by parent, but we can put it here for simplicity since it's the bottom of the form */}
      <button 
        onClick={handleFinalConfirm}
        disabled={isLoading || !isFormValid}
        className="w-full bg-color-brand disabled:bg-gray-300 disabled:text-gray-500 disabled:border-transparent text-white font-black text-xl py-6 rounded-2xl hover:bg-color-brand-hover transition-transform active:scale-95 shadow-xl flex items-center justify-center gap-3 border-2 border-[#b91c1c] uppercase tracking-wider mt-4"
      >
        <Check className="w-7 h-7" /> [ CONFIRMAR ENTREGA ]
      </button>

      <SignatureModal 
        isOpen={isSigModalOpen} 
        onClose={() => setIsSigModalOpen(false)} 
        onConfirm={(url) => {
          setSignatureUrl(url);
          setIsSigModalOpen(false);
        }} 
      />
      <CODModal 
        isOpen={isCODModalOpen} 
        amount={fulfillment.collection_amount}
        onClose={() => setIsCODModalOpen(false)} 
        onConfirm={(data) => {
          setCodReceived(data.received);
          setCodReference(data.reference || '');
          setIsCODModalOpen(false);
        }} 
      />
    </div>
  );
};
