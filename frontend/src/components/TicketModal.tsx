import React from 'react';
import type { TicketData } from '../types/pos';
import { Printer, X, Zap } from 'lucide-react';

interface TicketModalProps {
  ticket: TicketData | null;
  onClose: () => void;
}

export const TicketModal: React.FC<TicketModalProps> = ({ ticket, onClose }) => {
  if (!ticket) return null;

  const formatCLP = (amount: number) => {
    return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(amount);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-bg-panel border border-border-color rounded-2xl w-full max-w-sm p-6 shadow-2xl relative flex flex-col items-center">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-text-muted hover:text-text-main transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-1.5 bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border border-green-200 dark:border-green-800/50 text-xs px-3 py-1 rounded-full mb-3">
          <Zap className="w-3.5 h-3.5" />
          <span className="font-semibold">Venta Aprobada en {ticket.latency_ms} ms</span>
        </div>

        <h3 className="text-sm font-bold text-text-main uppercase tracking-wider mb-4">
          {ticket.isReprint && <span className="text-color-brand mr-2">(COPIA)</span>}
          {ticket.dte_type === 33 ? 'Factura Electrónica (DTE)' : 'Boleta Electrónica (DTE)'}
        </h3>

        <div className="w-full bg-white text-black font-mono text-[11px] p-5 rounded-lg shadow-sm border border-slate-300 leading-tight space-y-2 select-text">
          <div className="text-center pb-2 border-b border-dashed border-slate-400">
            <p className="font-bold text-sm">COMERCIAL SYNCO SPAL</p>
            <p>R.U.T.: 76.123.456-7</p>
            <p>GIRO: RETAIL Y COMERCIO OMNICANAL</p>
            <p>SUCURSAL: CASA MATRIZ / CAJA 01</p>
            <p>AV. LIBERTADOR 1234</p>
          </div>

          <div className="text-center py-1.5 border-b border-dashed border-slate-400 font-bold">
            {ticket.isReprint && <p className="text-xs uppercase text-color-brand mb-1">*** COPIA DE REIMPRESIÓN ***</p>}
            <p className="text-xs uppercase">{ticket.dte_type === 33 ? 'FACTURA ELECTRÓNICA' : 'BOLETA ELECTRÓNICA'} N° {ticket.folio}</p>
            <p className="text-[10px] text-slate-600 font-normal">S.I.I. - SANTIAGO CENTRO</p>
          </div>

          <div className="py-1 border-b border-dashed border-slate-400 text-[10px] space-y-0.5">
            <p>ORDEN: {ticket.order_number}</p>
            <p>FECHA: {ticket.date}</p>
            <p>MEDIO PAGO: {ticket.payment_method}</p>
          </div>

          <div className="py-2 border-b border-dashed border-slate-400 space-y-1">
            {ticket.items.map((item) => (
              <div key={item.variant_id} className="flex justify-between items-start">
                <div>
                  <p className="font-bold">{item.product_name}</p>
                  <p className="text-[10px] text-slate-600">
                    {item.quantity} x {formatCLP(item.unit_gross_price)}
                  </p>
                </div>
                <p className="font-bold">{formatCLP(item.unit_gross_price * item.quantity)}</p>
              </div>
            ))}
          </div>

          <div className="py-1 text-right space-y-0.5 font-bold">
            <div className="flex justify-between font-normal text-[10px]">
              <span>MONTO NETO:</span>
              <span>{formatCLP(ticket.net_amount)}</span>
            </div>
            <div className="flex justify-between font-normal text-[10px]">
              <span>I.V.A. (19%):</span>
              <span>{formatCLP(ticket.vat_amount)}</span>
            </div>
            <div className="flex justify-between text-xs pt-1 border-t border-slate-400">
              <span>TOTAL:</span>
              <span className="text-sm">{formatCLP(ticket.total_amount)}</span>
            </div>
          </div>

          <div className="pt-3 text-center border-t border-dashed border-slate-400 flex flex-col items-center">
            <div className="w-28 h-10 border border-slate-800 bg-slate-100 flex items-center justify-center font-bold text-[9px] tracking-widest uppercase">
              |||||| | ||||| |||| |||||
            </div>
            <p className="text-[8px] text-slate-500 mt-1">Timbre Electrónico DTE (TED)</p>
            <p className="text-[8px] text-slate-500">Verifique documento en sii.cl</p>
          </div>
        </div>

        <div className="flex gap-2 w-full mt-5">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl bg-input-bg border border-border-color hover:bg-border-color text-text-main text-xs font-bold transition-colors cursor-pointer"
          >
            Nueva Venta (Esc)
          </button>
          <button
            onClick={handlePrint}
            className="flex-1 py-2.5 rounded-xl bg-color-brand hover:bg-color-brand-hover text-white text-xs font-bold transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-lg"
          >
            <Printer className="w-4 h-4" />
            <span>Imprimir Ticket</span>
          </button>
        </div>
      </div>
    </div>
  );
};
