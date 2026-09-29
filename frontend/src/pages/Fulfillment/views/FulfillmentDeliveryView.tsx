import React, { useState } from 'react';
import type { Fulfillment, FulfillmentItem } from '../../../../types/fulfillment';
import { Zap, ListChecks, ArrowLeft, AlertTriangle } from 'lucide-react';
import { Checklist } from '../components/Checklist';
import { FulfillmentDeliveryForm } from './FulfillmentDeliveryForm';
import { IssueModal } from '../components/IssueModal';

interface Props {
  fulfillment: Fulfillment;
  items: FulfillmentItem[];
  onItemUpdated: () => void;
  onBack: () => void;
  onAction: (action: string, payload?: any) => void;
  isLoading: boolean;
}

export const FulfillmentDeliveryView: React.FC<Props> = ({ 
  fulfillment, items, onItemUpdated, onBack, onAction, isLoading 
}) => {
  const [mode, setMode] = useState<'SELECT' | 'QUICK' | 'CHECKLIST'>('SELECT');
  const [isIssueModalOpen, setIsIssueModalOpen] = useState(false);
  const allChecked = items.length > 0 && items.every(i => i.is_delivered);

  const handleConfirmDelivery = (payload: any) => {
    onAction('deliver', payload);
  };

  if (mode === 'SELECT') {
    return (
      <div className="flex flex-col h-full bg-bg-main relative overflow-hidden p-6">
        <div className="flex items-center mb-8">
          <button className="text-text-muted font-bold hover:bg-input-bg p-2 rounded-lg flex items-center gap-2" onClick={onBack}>
            <ArrowLeft className="w-5 h-5" /> Volver
          </button>
        </div>

        <div className="text-center mb-10">
          <h1 className="text-4xl font-black text-text-main mb-4">ENTREGA</h1>
          <p className="text-lg text-text-muted font-bold">¿Cómo quieres realizar la entrega?</p>
        </div>

        <div className="flex flex-col gap-6 max-w-md mx-auto w-full">
          <button 
            onClick={() => setMode('QUICK')}
            className="w-full bg-input-bg border-2 border-color-brand hover:bg-color-brand/10 transition-colors rounded-2xl p-6 text-left flex gap-5 items-start shadow-sm"
          >
            <div className="bg-color-brand text-white p-3 rounded-xl shrink-0">
              <Zap className="w-8 h-8" />
            </div>
            <div>
              <h2 className="font-black text-xl text-text-main mb-1 uppercase">Entrega Rápida</h2>
              <p className="text-text-muted text-sm font-bold leading-tight">
                Confirmar la entrega de forma global sin revisar producto por producto. Mantiene comprobantes.
              </p>
            </div>
          </button>

          <button 
            onClick={() => setMode('CHECKLIST')}
            className="w-full bg-input-bg border-2 border-border-color hover:border-gray-400 transition-colors rounded-2xl p-6 text-left flex gap-5 items-start shadow-sm"
          >
            <div className="bg-bg-panel text-text-muted border-2 border-border-color p-3 rounded-xl shrink-0">
              <ListChecks className="w-8 h-8" />
            </div>
            <div>
              <h2 className="font-black text-xl text-text-main mb-1 uppercase">Revisar Productos</h2>
              <p className="text-text-muted text-sm font-bold leading-tight">
                Comprobar manualmente cada producto de la lista antes de entregar.
              </p>
            </div>
          </button>
        </div>

        <div className="mt-12 max-w-md mx-auto w-full">
          <button 
            onClick={() => setIsIssueModalOpen(true)}
            className="w-full bg-red-100 text-red-900 border-2 border-red-200 font-bold text-lg py-4 rounded-xl hover:bg-red-200 transition-colors flex items-center justify-center gap-2"
          >
            <AlertTriangle className="w-6 h-6" /> PROBLEMA CON LA ENTREGA
          </button>
        </div>

        <IssueModal 
          isOpen={isIssueModalOpen} 
          onClose={() => setIsIssueModalOpen(false)} 
          onConfirm={(type, notes) => {
            onAction('issue', { issue_type: type, notes });
            setIsIssueModalOpen(false);
          }}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-bg-main relative overflow-hidden">
      <div className="bg-bg-panel border-b border-border-color p-4 shadow-sm z-10 shrink-0 flex items-center justify-between">
        <button className="text-blue-500 font-bold flex items-center gap-1" onClick={() => setMode('SELECT')}>
          <ArrowLeft className="w-4 h-4" /> Cambiar Modo
        </button>
        <span className="font-black text-sm uppercase tracking-wider text-text-muted">
          {mode === 'QUICK' ? '⚡ Rápida' : '☑ Checklist'}
        </span>
      </div>

      <div className="flex-1 overflow-y-auto pb-32 p-4 md:p-6 bg-input-bg/30">
        <div className="max-w-2xl mx-auto flex flex-col gap-6">
          
          {mode === 'CHECKLIST' && (
            <Checklist 
              fulfillmentId={fulfillment.id} 
              items={items} 
              onItemUpdated={onItemUpdated}
              type="DELIVER"
              disabled={false}
            />
          )}

          <FulfillmentDeliveryForm 
            fulfillment={fulfillment}
            items={items}
            mode={mode}
            onBack={() => setMode('SELECT')}
            onConfirm={handleConfirmDelivery}
            isLoading={isLoading}
            allChecked={allChecked}
          />

        </div>
      </div>
    </div>
  );
};
