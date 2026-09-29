import React, { useState } from 'react';
import { DollarSign, ShoppingBag, Truck, Banknote, CreditCard, ArrowRightLeft, Clock, Smartphone, AlertTriangle } from 'lucide-react';
import type { PaymentMethod, CollectionMethod } from '../types/pos';

interface PaymentSectionProps {
  grossTotal: number;
  isProcessing: boolean;
  onConfirmPayment: (details: {
    deliveryType: 'IMMEDIATE' | 'DISPATCH' | 'PICKUP';
    paymentMethod: PaymentMethod;
    amountPaid: number;
    requiresCollection?: boolean;
    collectionMethod?: CollectionMethod;
  }) => void;
  onSetPanel?: (panel: any) => void;
}

export const PaymentSection: React.FC<PaymentSectionProps> = ({ 
  grossTotal, 
  isProcessing, 
  onConfirmPayment,
  onSetPanel
}) => {
  const [deliveryType, setDeliveryType] = useState<'IMMEDIATE' | 'DISPATCH' | 'PICKUP'>('IMMEDIATE');
  
  // Opciones principales de pago
  const [paymentType, setPaymentType] = useState<'IMMEDIATE_PAYMENT' | 'PAY_ON_DELIVERY'>('IMMEDIATE_PAYMENT');
  
  // Opciones específicas
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('CASH');
  const [collectionMethod, setCollectionMethod] = useState<CollectionMethod>('UNDEFINED_ON_DELIVERY');
  
  const [amountPaidStr, setAmountPaidStr] = useState<string>(grossTotal.toString());

  // Actualizar amountPaid al cambiar grossTotal
  React.useEffect(() => {
    setAmountPaidStr(grossTotal.toString());
  }, [grossTotal]);

  const amountPaid = parseFloat(amountPaidStr) || 0;
  const vuelto = Math.max(0, amountPaid - grossTotal);

  const handleDeliveryTypeChange = (type: 'IMMEDIATE' | 'DISPATCH' | 'PICKUP') => {
    setDeliveryType(type);
    if (type !== 'DISPATCH' && paymentType === 'PAY_ON_DELIVERY') {
      setPaymentType('IMMEDIATE_PAYMENT');
      setPaymentMethod('CASH');
    }
  };

  const handleConfirm = () => {
    if (isProcessing) return;
    
    if (paymentType === 'IMMEDIATE_PAYMENT') {
      onConfirmPayment({
        deliveryType,
        paymentMethod,
        amountPaid,
        requiresCollection: false
      });
    } else {
      onConfirmPayment({
        deliveryType,
        paymentMethod: 'OTHER', // Backend requires a payment method, we can use OTHER or CASH
        amountPaid: 0, // No amount paid yet
        requiresCollection: true,
        collectionMethod
      });
    }
  };

  const setAmountTotal = () => setAmountPaidStr(grossTotal.toString());
  const addAmount = (amount: number) => setAmountPaidStr((parseFloat(amountPaidStr || '0') + amount).toString());

  return (
    <div className="flex-1 flex flex-col h-full bg-bg-main border-l border-border-color overflow-hidden">
      {/* Header Modal/Panel en Celular */}
      <div className="md:hidden flex items-center justify-between p-4 bg-bg-panel border-b border-border-color shrink-0">
        <h2 className="text-xl font-bold text-text-main flex items-center gap-2">
          <DollarSign className="w-6 h-6 text-[#0ea5e9]" />
          Cobro
        </h2>
        <button 
          onClick={() => onSetPanel?.('none')}
          className="p-2 rounded-full hover:bg-input-bg text-text-muted transition-colors"
        >
          Cerrar
        </button>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col">
        
        {/* TOTAL GIGANTE */}
        <div className="bg-bg-panel p-6 border-b border-border-color flex flex-col items-center justify-center shrink-0">
          <span className="text-text-muted font-bold tracking-widest uppercase mb-2">Total a Cobrar</span>
          <div className="text-5xl md:text-6xl font-black text-[#0ea5e9] tracking-tighter">
            ${grossTotal.toLocaleString('es-CL')}
          </div>
        </div>

        {/* TIPO DE ENTREGA */}
        <div className="p-4 bg-bg-main shrink-0">
          <div className="flex bg-input-bg p-1 rounded-xl border border-border-color">
            <button 
              onClick={() => handleDeliveryTypeChange('IMMEDIATE')}
              className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg font-bold text-sm transition-colors ${
                deliveryType === 'IMMEDIATE' 
                  ? 'bg-bg-panel text-text-main shadow-sm' 
                  : 'text-text-muted hover:text-text-main'
              }`}
            >
              <ShoppingBag className="w-5 h-5" />
              Directa
            </button>
            <button 
              onClick={() => handleDeliveryTypeChange('PICKUP')}
              className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg font-bold text-sm transition-colors ${
                deliveryType === 'PICKUP' 
                  ? 'bg-bg-panel text-text-main shadow-sm' 
                  : 'text-text-muted hover:text-text-main'
              }`}
            >
              <ShoppingBag className="w-5 h-5" />
              Retiro
            </button>
            <button 
              onClick={() => handleDeliveryTypeChange('DISPATCH')}
              className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg font-bold text-sm transition-colors ${
                deliveryType === 'DISPATCH' 
                  ? 'bg-bg-panel text-text-main shadow-sm' 
                  : 'text-text-muted hover:text-text-main'
              }`}
            >
              <Truck className="w-5 h-5" />
              Despacho
            </button>
          </div>
        </div>

        {/* MÉTODOS DE PAGO */}
        <div className="p-4 flex-1 flex flex-col gap-6">
          
          {/* PAGO INMEDIATO */}
          <div>
            <h3 className="text-sm font-bold text-text-muted uppercase tracking-wider mb-3">Pago Inmediato</h3>
            <div className="grid grid-cols-2 gap-3">
              <button 
                onClick={() => { setPaymentType('IMMEDIATE_PAYMENT'); setPaymentMethod('CASH'); }}
                className={`flex flex-col items-center justify-center gap-2 p-4 rounded-2xl border-2 transition-all ${
                  paymentType === 'IMMEDIATE_PAYMENT' && paymentMethod === 'CASH'
                    ? 'border-green-500 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400'
                    : 'border-border-color bg-bg-panel text-text-muted hover:border-text-muted'
                }`}
              >
                <Banknote className="w-8 h-8" />
                <span className="font-bold">Efectivo</span>
              </button>
              
              <button 
                onClick={() => { setPaymentType('IMMEDIATE_PAYMENT'); setPaymentMethod('DEBIT_CARD'); }}
                className={`flex flex-col items-center justify-center gap-2 p-4 rounded-2xl border-2 transition-all ${
                  paymentType === 'IMMEDIATE_PAYMENT' && paymentMethod === 'DEBIT_CARD'
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400'
                    : 'border-border-color bg-bg-panel text-text-muted hover:border-text-muted'
                }`}
              >
                <CreditCard className="w-8 h-8" />
                <span className="font-bold">Débito</span>
              </button>

              <button 
                onClick={() => { setPaymentType('IMMEDIATE_PAYMENT'); setPaymentMethod('CREDIT_CARD'); }}
                className={`flex flex-col items-center justify-center gap-2 p-4 rounded-2xl border-2 transition-all ${
                  paymentType === 'IMMEDIATE_PAYMENT' && paymentMethod === 'CREDIT_CARD'
                    ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-400'
                    : 'border-border-color bg-bg-panel text-text-muted hover:border-text-muted'
                }`}
              >
                <CreditCard className="w-8 h-8" />
                <span className="font-bold">Crédito</span>
              </button>

              <button 
                onClick={() => { setPaymentType('IMMEDIATE_PAYMENT'); setPaymentMethod('TRANSFER'); }}
                className={`flex flex-col items-center justify-center gap-2 p-4 rounded-2xl border-2 transition-all ${
                  paymentType === 'IMMEDIATE_PAYMENT' && paymentMethod === 'TRANSFER'
                    ? 'border-orange-500 bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-400'
                    : 'border-border-color bg-bg-panel text-text-muted hover:border-text-muted'
                }`}
              >
                <ArrowRightLeft className="w-8 h-8" />
                <span className="font-bold">Transferencia</span>
              </button>
            </div>
          </div>

          {/* OPCIONES DE EFECTIVO */}
          {paymentType === 'IMMEDIATE_PAYMENT' && paymentMethod === 'CASH' && (
            <div className="bg-input-bg p-4 rounded-2xl border border-border-color animate-in fade-in slide-in-from-top-2">
              <div className="flex items-center justify-between mb-4">
                <span className="text-text-muted font-bold">Pagó con:</span>
                <input 
                  type="number"
                  value={amountPaidStr}
                  onChange={(e) => setAmountPaidStr(e.target.value)}
                  onFocus={(e) => e.target.select()}
                  className="bg-bg-panel text-text-main text-right text-2xl font-black py-2 px-4 rounded-xl border border-border-color focus:border-[#0ea5e9] focus:outline-none w-1/2"
                />
              </div>
              
              <div className="grid grid-cols-4 gap-2 mb-4">
                <button onClick={() => addAmount(1000)} className="py-2 bg-bg-panel border border-border-color rounded-lg font-bold hover:bg-input-bg active:scale-95 transition-transform text-text-main">+1k</button>
                <button onClick={() => addAmount(5000)} className="py-2 bg-bg-panel border border-border-color rounded-lg font-bold hover:bg-input-bg active:scale-95 transition-transform text-text-main">+5k</button>
                <button onClick={() => addAmount(10000)} className="py-2 bg-bg-panel border border-border-color rounded-lg font-bold hover:bg-input-bg active:scale-95 transition-transform text-text-main">+10k</button>
                <button onClick={() => setAmountTotal()} className="py-2 bg-[#0ea5e9]/10 text-[#0ea5e9] border border-[#0ea5e9]/20 rounded-lg font-bold hover:bg-[#0ea5e9]/20 active:scale-95 transition-transform">Exacto</button>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-border-color border-dashed">
                <span className="text-text-muted font-bold">Su Cambio:</span>
                <span className={`text-2xl font-black ${vuelto > 0 ? 'text-green-500' : 'text-text-main'}`}>
                  ${vuelto.toLocaleString('es-CL')}
                </span>
              </div>
            </div>
          )}

          {/* COBRO POSTERIOR (SOLO DESPACHO) */}
          {deliveryType === 'DISPATCH' && (
            <div>
              <h3 className="text-sm font-bold text-text-muted uppercase tracking-wider mb-3">Cobro Posterior</h3>
              <button 
                onClick={() => setPaymentType('PAY_ON_DELIVERY')}
                className={`w-full flex items-center gap-4 p-4 rounded-2xl border-2 transition-all ${
                  paymentType === 'PAY_ON_DELIVERY'
                    ? 'border-[#0ea5e9] bg-[#0ea5e9]/10 text-[#0ea5e9]'
                    : 'border-border-color bg-bg-panel text-text-muted hover:border-text-muted'
                }`}
              >
                <div className={`p-3 rounded-xl ${paymentType === 'PAY_ON_DELIVERY' ? 'bg-[#0ea5e9] text-white' : 'bg-input-bg text-text-muted'}`}>
                  <Clock className="w-6 h-6" />
                </div>
                <div className="text-left">
                  <div className="font-black text-lg">Por Cobrar</div>
                  <div className="text-sm opacity-80">Pago contra entrega</div>
                </div>
              </button>

              {paymentType === 'PAY_ON_DELIVERY' && (
                <div className="mt-4 p-4 bg-yellow-50 dark:bg-yellow-900/10 border-2 border-yellow-400 dark:border-yellow-600 rounded-2xl animate-in fade-in slide-in-from-top-2">
                  <p className="font-bold text-yellow-800 dark:text-yellow-500 mb-3 text-center">
                    ¿Cómo pagará al recibir?
                  </p>
                  
                  <div className="grid grid-cols-2 gap-2 mb-4">
                    <button 
                      onClick={() => setCollectionMethod('CASH_ON_DELIVERY')}
                      className={`py-2 px-2 rounded-xl font-bold text-sm transition-all border ${
                        collectionMethod === 'CASH_ON_DELIVERY'
                          ? 'bg-yellow-400 text-yellow-900 border-yellow-500'
                          : 'bg-white dark:bg-bg-panel text-text-main border-border-color hover:bg-yellow-100 dark:hover:bg-yellow-900/30'
                      }`}
                    >
                      💵 Efectivo
                    </button>
                    <button 
                      onClick={() => setCollectionMethod('POS_ON_DELIVERY')}
                      className={`py-2 px-2 rounded-xl font-bold text-sm transition-all border ${
                        collectionMethod === 'POS_ON_DELIVERY'
                          ? 'bg-yellow-400 text-yellow-900 border-yellow-500'
                          : 'bg-white dark:bg-bg-panel text-text-main border-border-color hover:bg-yellow-100 dark:hover:bg-yellow-900/30'
                      }`}
                    >
                      💳 POS
                    </button>
                    <button 
                      onClick={() => setCollectionMethod('TRANSFER_ON_DELIVERY')}
                      className={`py-2 px-2 rounded-xl font-bold text-sm transition-all border ${
                        collectionMethod === 'TRANSFER_ON_DELIVERY'
                          ? 'bg-yellow-400 text-yellow-900 border-yellow-500'
                          : 'bg-white dark:bg-bg-panel text-text-main border-border-color hover:bg-yellow-100 dark:hover:bg-yellow-900/30'
                      }`}
                    >
                      🏦 Transferencia
                    </button>
                    <button 
                      onClick={() => setCollectionMethod('UNDEFINED_ON_DELIVERY')}
                      className={`py-2 px-2 rounded-xl font-bold text-sm transition-all border ${
                        collectionMethod === 'UNDEFINED_ON_DELIVERY'
                          ? 'bg-yellow-400 text-yellow-900 border-yellow-500'
                          : 'bg-white dark:bg-bg-panel text-text-main border-border-color hover:bg-yellow-100 dark:hover:bg-yellow-900/30'
                      }`}
                    >
                      ❓ No definido
                    </button>
                  </div>

                  <div className="flex items-center gap-2 p-3 bg-white dark:bg-bg-panel rounded-xl text-yellow-800 dark:text-yellow-400 font-bold border border-yellow-200 dark:border-yellow-800/50">
                    <AlertTriangle className="w-5 h-5 shrink-0" />
                    <span className="text-sm">
                      {collectionMethod === 'POS_ON_DELIVERY' && 'LLEVAR TERMINAL POS'}
                      {collectionMethod === 'CASH_ON_DELIVERY' && `COBRAR $${grossTotal.toLocaleString('es-CL')} EN EFECTIVO`}
                      {collectionMethod === 'TRANSFER_ON_DELIVERY' && 'SE SOLICITARÁ TRANSFERENCIA AL ENTREGAR'}
                      {collectionMethod === 'UNDEFINED_ON_DELIVERY' && `COBRAR $${grossTotal.toLocaleString('es-CL')} (MEDIO NO DEFINIDO)`}
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}
          
        </div>
      </div>

      {/* FOOTER CONFIRMAR */}
      <div className="p-4 bg-bg-panel border-t border-border-color shrink-0">
        <button 
          onClick={handleConfirm}
          disabled={isProcessing || (paymentType === 'IMMEDIATE_PAYMENT' && paymentMethod === 'CASH' && amountPaid < grossTotal)}
          className={`w-full py-5 rounded-2xl font-black text-xl flex justify-center items-center gap-3 transition-all shadow-lg uppercase tracking-wider ${
            isProcessing || (paymentType === 'IMMEDIATE_PAYMENT' && paymentMethod === 'CASH' && amountPaid < grossTotal)
              ? 'bg-gray-300 text-gray-500 dark:bg-gray-800 dark:text-gray-600 cursor-not-allowed'
              : 'bg-[#0ea5e9] hover:bg-[#0284c7] text-white active:scale-95'
          }`}
        >
          {isProcessing ? 'PROCESANDO...' : 'CONFIRMAR PAGO'}
        </button>
      </div>
    </div>
  );
};
