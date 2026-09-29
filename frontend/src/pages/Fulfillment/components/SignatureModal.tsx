import React, { useRef, useState } from 'react';
import SignatureCanvas from 'react-signature-canvas';
import { X, Eraser, Check } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (signatureDataUrl: string) => void;
}

export const SignatureModal: React.FC<Props> = ({ isOpen, onClose, onConfirm }) => {
  const sigCanvas = useRef<SignatureCanvas>(null);
  const [error, setError] = useState(false);

  if (!isOpen) return null;

  const handleClear = () => {
    sigCanvas.current?.clear();
    setError(false);
  };

  const handleConfirm = () => {
    if (sigCanvas.current?.isEmpty()) {
      setError(true);
      return;
    }
    const dataUrl = sigCanvas.current?.getTrimmedCanvas().toDataURL('image/png');
    if (dataUrl) {
      onConfirm(dataUrl);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-bg-panel w-full max-w-2xl rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        <div className="px-6 py-4 border-b border-border-color flex justify-between items-center bg-input-bg">
          <h2 className="text-xl font-bold text-text-main">Firma de Recepción</h2>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-bg-panel text-text-muted transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 flex flex-col items-center">
          <p className="text-text-muted mb-4 text-center">Por favor, firme dentro del recuadro para confirmar la recepción del pedido.</p>
          
          <div className={`w-full bg-white border-2 rounded-xl overflow-hidden ${error ? 'border-red-500 animate-pulse' : 'border-gray-300'}`}>
            <SignatureCanvas 
              ref={sigCanvas}
              penColor="black"
              canvasProps={{
                className: 'w-full h-64 cursor-crosshair'
              }}
              onBegin={() => setError(false)}
            />
          </div>
          {error && <p className="text-red-500 text-sm mt-2 font-bold">La firma es obligatoria.</p>}
        </div>

        <div className="px-6 py-4 bg-input-bg border-t border-border-color flex justify-between items-center">
          <button 
            onClick={handleClear}
            className="flex items-center gap-2 px-4 py-2 text-text-muted hover:text-text-main font-semibold transition-colors"
          >
            <Eraser className="w-5 h-5" /> Limpiar
          </button>

          <div className="flex gap-3">
            <button 
              onClick={onClose}
              className="px-6 py-2 rounded-xl font-semibold border border-border-color hover:bg-bg-main transition-colors"
            >
              Cancelar
            </button>
            <button 
              onClick={handleConfirm}
              className="flex items-center gap-2 px-6 py-2 rounded-xl font-bold bg-color-brand text-white hover:bg-[#e0500b] transition-colors shadow-md"
            >
              <Check className="w-5 h-5" /> Confirmar Entrega
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
