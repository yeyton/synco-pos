import React, { useState } from 'react';
import { Percent, X } from 'lucide-react';

interface DiscountModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyDiscount: (couponCode: string, discountAmount: number) => void;
  grossTotal: number;
}

export const DiscountModal: React.FC<DiscountModalProps> = ({ isOpen, onClose, onApplyDiscount, grossTotal }) => {
  const [activeTab, setActiveTab] = useState<'coupon' | 'manual'>('coupon');
  const [couponCode, setCouponCode] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [manualDiscount, setManualDiscount] = useState<number | ''>('');
  const [discountType, setDiscountType] = useState<'amount' | 'percent'>('amount');

  if (!isOpen) return null;

  const handleApply = () => {
    let finalDiscount = 0;
    
    if (activeTab === 'coupon') {
      if (!couponCode) {
        // Remove discount if empty
        onApplyDiscount('', 0);
        return;
      }
      
      // Simulate a coupon validation
      if (couponCode.toUpperCase() === 'PROMO10') {
        finalDiscount = grossTotal * 0.10;
      } else if (couponCode.toUpperCase() === 'PROMO5') {
        finalDiscount = grossTotal * 0.05;
      } else {
        // Fallback for demo: Any other code gives 5% discount
        finalDiscount = grossTotal * 0.05;
      }
      onApplyDiscount(couponCode, Math.round(finalDiscount));
    } else {
      // Manual discount
      const value = Number(manualDiscount) || 0;
      if (discountType === 'amount') {
        finalDiscount = value;
      } else {
        finalDiscount = grossTotal * (value / 100);
      }
      onApplyDiscount('MANUAL', Math.round(finalDiscount));
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-xl shadow-2xl w-[90%] max-w-[400px] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="bg-[#4b4b4b] text-white py-3 px-4 flex items-center justify-center relative">
          <h2 className="text-lg font-bold">Ajusta el Total</h2>
          <button onClick={onClose} className="absolute right-4 text-gray-300 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 flex flex-col items-center">
          
          <div className="w-16 h-16 rounded-full border-2 border-[#ff7b52] flex items-center justify-center text-[#ff7b52] mb-6 shadow-sm">
            <Percent className="w-8 h-8" />
          </div>

          <div className="w-full mb-4">
            <div className="flex bg-gray-100 rounded-md p-1 mb-4">
              <button 
                onClick={() => setActiveTab('coupon')}
                className={`flex-1 py-1.5 text-sm font-medium rounded-sm transition-colors ${activeTab === 'coupon' ? 'bg-white shadow-sm text-text-main' : 'text-text-muted hover:text-text-main'}`}
              >
                Cupón
              </button>
              <button 
                onClick={() => setActiveTab('manual')}
                className={`flex-1 py-1.5 text-sm font-medium rounded-sm transition-colors ${activeTab === 'manual' ? 'bg-white shadow-sm text-text-main' : 'text-text-muted hover:text-text-main'}`}
              >
                Manual
              </button>
            </div>

            {activeTab === 'coupon' ? (
              <div className="flex gap-2">
                <input 
                  type="email" 
                  placeholder="Email de cliente" 
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                  className="w-1/2 px-3 py-2 border border-gray-300 rounded text-sm outline-none focus:border-[#2cb2e6] text-text-main bg-white"
                />
                <input 
                  type="text" 
                  placeholder="Código de cupón" 
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value)}
                  className="w-1/2 px-3 py-2 border border-gray-300 rounded text-sm outline-none focus:border-[#2cb2e6] text-text-main bg-white"
                />
              </div>
            ) : (
              <div className="flex gap-2">
                <select 
                  value={discountType}
                  onChange={(e) => setDiscountType(e.target.value as 'amount' | 'percent')}
                  className="w-1/3 px-2 py-2 border border-gray-300 rounded text-sm outline-none focus:border-[#2cb2e6] bg-white text-text-main"
                >
                  <option value="amount">$ Monto</option>
                  <option value="percent">% Porcen</option>
                </select>
                <input 
                  type="number" 
                  placeholder={discountType === 'amount' ? 'Ej: 1500' : 'Ej: 10'} 
                  value={manualDiscount}
                  onChange={(e) => setManualDiscount(Number(e.target.value) || '')}
                  className="w-2/3 px-3 py-2 border border-gray-300 rounded text-sm outline-none focus:border-[#2cb2e6] text-text-main bg-white"
                />
              </div>
            )}
          </div>

          <div className="flex gap-3 w-full mt-2">
            <button 
              onClick={handleApply}
              className="flex-1 py-2 bg-[#2cb2e6] hover:bg-[#209bc9] text-white font-bold rounded flex items-center justify-center gap-1 transition-colors shadow-sm"
            >
              APLICAR ✓
            </button>
            <button 
              onClick={onClose}
              className="flex-1 py-2 bg-[#f3f4f6] hover:bg-gray-200 border border-gray-300 text-gray-700 font-medium rounded flex items-center justify-center transition-colors shadow-sm"
            >
              cancelar
            </button>
          </div>

        </div>
      </div>
    </div>
  );
};
