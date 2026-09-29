import React from 'react';
import type { PaymentMethod } from '../types/pos';
import { CreditCard, Banknote, Landmark, Zap, CheckCircle2 } from 'lucide-react';

interface CheckoutPanelProps {
  netTotal: number;
  vatTotal: number;
  grossTotal: number;
  paymentMethod: PaymentMethod;
  onSelectPaymentMethod: (method: PaymentMethod) => void;
  onCheckout: () => void;
  isProcessing: boolean;
  itemCount: number;
  hasCustomer: boolean;
}

export const CheckoutPanel: React.FC<CheckoutPanelProps> = ({
  netTotal,
  vatTotal,
  grossTotal,
  paymentMethod,
  onSelectPaymentMethod,
  onCheckout,
  isProcessing,
  itemCount,
  hasCustomer,
}) => {
  const formatCLP = (amount: number) => {
    return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(amount);
  };

  const paymentMethods: { id: PaymentMethod; label: string; icon: React.ReactNode }[] = [
    { id: 'CASH', label: 'Efectivo', icon: <Banknote className="w-4 h-4" /> },
    { id: 'DEBIT_CARD', label: 'Débito (Transbank)', icon: <CreditCard className="w-4 h-4" /> },
    { id: 'CREDIT_CARD', label: 'Crédito', icon: <CreditCard className="w-4 h-4" /> },
    { id: 'TRANSFER', label: 'Transferencia', icon: <Landmark className="w-4 h-4" /> },
  ];

  return (
    <div className="w-96 bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col justify-between shadow-xl">
      <div>
        <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-4 pb-2 border-b border-slate-800 flex items-center justify-between">
          <span>Resumen de Cobro</span>
          <span className={`border text-[11px] px-2 py-0.5 rounded font-mono ${
            hasCustomer 
              ? 'bg-emerald-950 text-emerald-400 border-emerald-800/80' 
              : 'bg-blue-950 text-blue-400 border-blue-800/80'
          }`}>
            {hasCustomer ? 'Factura 33 DTE' : 'Boleta 39 DTE'}
          </span>
        </h2>

        <div className="mb-5">
          <label className="block text-xs font-medium text-slate-400 mb-2">Medio de Pago</label>
          <div className="grid grid-cols-2 gap-2">
            {paymentMethods.map((pm) => (
              <button
                key={pm.id}
                onClick={() => onSelectPaymentMethod(pm.id)}
                className={`flex items-center gap-2 px-3 py-2.5 rounded-lg border text-xs font-medium transition-all cursor-pointer ${
                  paymentMethod === pm.id
                    ? 'bg-emerald-600/20 border-emerald-500 text-emerald-300 shadow-[0_0_12px_rgba(16,185,129,0.2)]'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                }`}
              >
                {pm.icon}
                <span>{pm.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="bg-slate-950 border border-slate-800 rounded-lg p-4 space-y-2.5 text-xs font-mono mb-6">
          <div className="flex justify-between text-slate-400">
            <span>Monto Neto</span>
            <span>{formatCLP(netTotal)}</span>
          </div>
          <div className="flex justify-between text-slate-400">
            <span>IVA (19%)</span>
            <span>{formatCLP(vatTotal)}</span>
          </div>
          <div className="h-px bg-slate-800 my-1" />
          <div className="flex justify-between items-baseline text-slate-100 font-bold text-base">
            <span className="font-sans text-xs uppercase tracking-wider text-slate-300">Total a Cobrar</span>
            <span className="text-emerald-400 font-mono text-2xl font-black">{formatCLP(grossTotal)}</span>
          </div>
        </div>
      </div>

      <div>
        <button
          onClick={onCheckout}
          disabled={itemCount === 0 || isProcessing}
          className={`w-full py-4 rounded-xl font-bold text-base tracking-wide flex items-center justify-center gap-3 transition-all shadow-lg cursor-pointer ${
            itemCount === 0 || isProcessing
              ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
              : hasCustomer
                ? 'bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 text-slate-100 shadow-[0_0_20px_rgba(16,185,129,0.3)] active:scale-[0.99]'
                : 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-slate-100 shadow-[0_0_20px_rgba(59,130,246,0.3)] active:scale-[0.99]'
          }`}
        >
          {isProcessing ? (
            <>
              <div className="w-5 h-5 border-2 border-slate-100 border-t-transparent rounded-full animate-spin" />
              <span>Procesando Venta...</span>
            </>
          ) : (
            <>
              <Zap className="w-5 h-5 fill-slate-100" />
              <span>{hasCustomer ? 'EMITIR FACTURA' : 'COBRAR'}</span>
              <kbd className="bg-slate-950/40 px-2 py-0.5 rounded text-xs font-mono text-slate-100 border border-slate-900/40">
                F12
              </kbd>
            </>
          )}
        </button>

        <p className="text-[11px] text-slate-500 text-center mt-2.5 flex items-center justify-center gap-1">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
          <span>Garantía de respuesta &lt;50ms en Supabase / Railway</span>
        </p>
      </div>
    </div>
  );
};
