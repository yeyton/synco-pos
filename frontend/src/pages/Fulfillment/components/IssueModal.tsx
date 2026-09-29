import React, { useState } from 'react';
import { X, AlertTriangle, Send } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (issue_type: string, notes: string) => void;
}

export const IssueModal: React.FC<Props> = ({ isOpen, onClose, onConfirm }) => {
  const [issueType, setIssueType] = useState('CLIENT_ABSENT');
  const [notes, setNotes] = useState('');

  if (!isOpen) return null;

  const handleConfirm = () => {
    onConfirm(issueType, notes);
    setNotes('');
  };

  const issueTypes = [
    { id: 'CLIENT_ABSENT', label: 'Cliente ausente' },
    { id: 'WRONG_ADDRESS', label: 'Dirección incorrecta o inubicable' },
    { id: 'REJECTED', label: 'Cliente rechazó el pedido' },
    { id: 'ACCESS_PROBLEM', label: 'Problema de acceso (condominio/edificio)' },
    { id: 'PARTIAL_DELIVERY', label: 'Entrega parcial / Faltan productos' },
    { id: 'OTHER', label: 'Otro motivo' }
  ];

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-bg-panel w-full max-w-lg rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        <div className="px-6 py-4 border-b border-border-color flex justify-between items-center bg-red-50 dark:bg-red-900/10">
          <h2 className="text-xl font-black text-red-900 dark:text-red-400 flex items-center gap-2">
            <AlertTriangle className="w-6 h-6" />
            Reportar Incidencia
          </h2>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-red-100 text-red-900 transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 flex flex-col gap-5">
          <p className="text-text-muted font-bold text-sm">
            Al reportar una incidencia, el pedido se mantendrá en ruta pero la incidencia quedará registrada en el sistema.
          </p>

          <div>
            <label className="block text-sm font-bold text-text-muted mb-2">Motivo principal</label>
            <div className="flex flex-col gap-2">
              {issueTypes.map(type => (
                <label key={type.id} className={`flex items-center gap-3 p-3 border-2 rounded-xl cursor-pointer transition-colors ${issueType === type.id ? 'border-red-500 bg-red-50 dark:bg-red-900/20 text-red-900 dark:text-red-300' : 'border-border-color hover:bg-input-bg'}`}>
                  <input 
                    type="radio" 
                    name="issue_type" 
                    value={type.id} 
                    checked={issueType === type.id}
                    onChange={(e) => setIssueType(e.target.value)}
                    className="w-5 h-5 accent-red-600"
                  />
                  <span className="font-bold">{type.label}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-text-muted mb-2">Notas adicionales (Opcional)</label>
            <textarea 
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Detalles sobre lo ocurrido..."
              rows={3}
              className="w-full bg-input-bg border-2 border-border-color rounded-xl p-3 font-bold text-text-main focus:border-red-500 outline-none resize-none transition-colors"
            />
          </div>
        </div>

        <div className="px-6 py-4 bg-input-bg border-t border-border-color flex justify-end gap-3">
          <button 
            onClick={onClose}
            className="px-6 py-2 rounded-xl font-bold border-2 border-border-color hover:bg-bg-panel transition-colors"
          >
            Cancelar
          </button>
          <button 
            onClick={handleConfirm}
            className="flex items-center gap-2 px-6 py-2 rounded-xl font-black bg-red-600 text-white hover:bg-red-700 transition-transform active:scale-95 shadow-md"
          >
            <Send className="w-5 h-5" /> Enviar Reporte
          </button>
        </div>

      </div>
    </div>
  );
};
