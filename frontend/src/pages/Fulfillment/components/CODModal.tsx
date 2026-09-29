import React, { useState } from 'react';
import { X, DollarSign, CreditCard, Banknote, CheckCircle2 } from 'lucide-react';

interface Props {
  isOpen: boolean;
  amount: number;
  onClose: () => void;
  onConfirm: (data: { received: boolean, method: string, reference?: string }) => void;
}

export const CODModal: React.FC<Props> = ({ isOpen, amount, onClose, onConfirm }) => {
  const [method, setMethod] = useState<'CASH' | 'POS'>('CASH');
  const [reference, setReference] = useState('');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-bg-panel w-full max-w-md rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        <div className="px-6 py-4 bg-red-600 text-white flex justify-between items-center">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <DollarSign className="w-6 h-6" /> Cobro Contra Entrega
          </h2>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-white/20 transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 flex flex-col gap-6">
          <div className="text-center">
            <p className="text-text-muted mb-1">Monto a cobrar al cliente</p>
            <p className="text-4xl font-black text-text-main">${amount.toLocaleString('es-CL')}</p>
          </div>

          <div>
            <label className="block text-sm font-bold text-text-muted mb-2">¿Cómo pagó el cliente?</label>
            <div className="grid grid-cols-2 gap-3">
              <button 
                onClick={() => setMethod('CASH')}
                className={`p-4 rounded-xl border-2 flex flex-col items-center gap-2 transition-colors ${
                  method === 'CASH' 
                    ? 'border-color-brand bg-color-brand/10 text-color-brand' 
                    : 'border-border-color text-text-muted hover:border-text-main'
                }`}
              >
                <Banknote className="w-8 h-8" />
                <span className="font-bold">Efectivo</span>
              </button>
              
              <button 
                onClick={() => setMethod('POS')}
                className={`p-4 rounded-xl border-2 flex flex-col items-center gap-2 transition-colors ${
                  method === 'POS' 
                    ? 'border-color-brand bg-color-brand/10 text-color-brand' 
                    : 'border-border-color text-text-muted hover:border-text-main'
                }`}
              >
                <CreditCard className="w-8 h-8" />
                <span className="font-bold">Tarjeta (POS)</span>
              </button>
            </div>
          </div>

          {method === 'POS' && (
            <div>
              <label className="block text-sm font-bold text-text-muted mb-2">Código de Autorización (Opcional)</label>
              <input 
                type="text" 
                value={reference}
                onChange={e => setReference(e.target.value)}
                placeholder="Ej: 123456"
                className="w-full bg-input-bg border border-border-color rounded-xl px-4 py-3 text-text-main focus:outline-none focus:border-color-brand"
              />
            </div>
          )}

        </div>

        <div className="px-6 py-4 bg-input-bg border-t border-border-color flex justify-end gap-3">
          <button 
            onClick={onClose}
            className="px-6 py-3 rounded-xl font-semibold border border-border-color hover:bg-bg-main transition-colors text-text-main"
          >
            Cancelar
          </button>
          <button 
            onClick={() => onConfirm({ received: true, method, reference })}
            className="flex items-center gap-2 px-6 py-3 rounded-xl font-bold bg-green-600 text-white hover:bg-green-700 transition-colors shadow-md"
          >
            <CheckCircle2 className="w-5 h-5" /> Confirmar Pago
          </button>
        </div>

      </div>
    </div>
  );
};
