import React, { useState, useEffect, useRef } from 'react';

export interface Customer {
  id?: string;
  rut: string;
  name: string;
  business_line?: string;
  address?: string;
  commune?: string;
  email?: string;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSave: (customer: Customer) => void;
}

export function CustomerModal({ isOpen, onClose, onSave }: Props) {
  const [rut, setRut] = useState('');
  const [name, setName] = useState('');
  const [businessLine, setBusinessLine] = useState('');
  const [address, setAddress] = useState('');
  const [commune, setCommune] = useState('');
  const [email, setEmail] = useState('');
  
  const [isLoading, setIsLoading] = useState(false);
  const [isNew, setIsNew] = useState(true);

  const rutInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setRut('');
      setName('');
      setBusinessLine('');
      setAddress('');
      setCommune('');
      setEmail('');
      setIsNew(true);
      setTimeout(() => rutInputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const searchCustomer = async (searchRut: string) => {
    if (searchRut.length < 8) return;
    setIsLoading(true);
    try {
      const res = await fetch(`/api/v1/customers/${searchRut}`);
      if (res.ok) {
        const data = await res.json();
        setName(data.name || '');
        setBusinessLine(data.business_line || '');
        setAddress(data.address || '');
        setCommune(data.commune || '');
        setEmail(data.email || '');
        setIsNew(false);
      } else {
        setIsNew(true);
      }
    } catch (e) {
      console.error(e);
      setIsNew(true);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRutBlur = () => {
    searchCustomer(rut);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    }
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSave();
    }
  };

  const handleSave = async () => {
    if (!rut || !name) return;
    
    setIsLoading(true);
    try {
      const payload = {
        rut,
        name,
        business_line: businessLine,
        address,
        commune,
        email
      };
      
      const res = await fetch('/api/v1/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      if (res.ok) {
        const savedCustomer = await res.json();
        onSave(savedCustomer);
        onClose();
      }
    } catch (e) {
      console.error('Error saving customer', e);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 text-text-main transition-colors">
      <div 
        className="bg-bg-panel border border-border-color shadow-2xl rounded-2xl w-full max-w-lg p-6 flex flex-col gap-6"
        onKeyDown={handleKeyDown}
      >
        <div className="flex justify-between items-center border-b border-border-color pb-4">
          <h2 className="text-xl font-bold text-text-main tracking-tight">
            Datos de Facturación
          </h2>
          <button onClick={onClose} className="text-text-muted hover:text-color-brand transition-colors">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex flex-col gap-4">
          <div>
            <label className="block text-sm font-medium text-text-muted mb-1">RUT (Sin puntos, con guión)</label>
            <input 
              ref={rutInputRef}
              type="text" 
              value={rut}
              onChange={(e) => setRut(e.target.value)}
              onBlur={handleRutBlur}
              placeholder="12345678-9"
              className="w-full bg-input-bg border border-border-color text-text-main rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-color-brand focus:border-transparent font-mono text-lg transition-all"
            />
            {isLoading && <span className="text-xs text-color-brand mt-1">Buscando...</span>}
          </div>

          <div>
            <label className="block text-sm font-medium text-text-muted mb-1">Razón Social o Nombre</label>
            <input 
              type="text" 
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej: Empresa SPA"
              className="w-full bg-input-bg border border-border-color text-text-main rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-color-brand focus:border-transparent transition-all"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-text-muted mb-1">Giro</label>
              <input 
                type="text" 
                value={businessLine}
                onChange={(e) => setBusinessLine(e.target.value)}
                placeholder="Comercio"
                className="w-full bg-input-bg border border-border-color text-text-main rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-color-brand focus:border-transparent transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-muted mb-1">Correo Electrónico</label>
              <input 
                type="email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="dte@empresa.cl"
                className="w-full bg-input-bg border border-border-color text-text-main rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-color-brand focus:border-transparent transition-all"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-1">
              <label className="block text-sm font-medium text-text-muted mb-1">Dirección</label>
              <input 
                type="text" 
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Av. Central 123"
                className="w-full bg-input-bg border border-border-color text-text-main rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-color-brand focus:border-transparent transition-all"
              />
            </div>
            <div className="col-span-1">
              <label className="block text-sm font-medium text-text-muted mb-1">Comuna</label>
              <input 
                type="text" 
                value={commune}
                onChange={(e) => setCommune(e.target.value)}
                placeholder="Centro"
                className="w-full bg-input-bg border border-border-color text-text-main rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-color-brand focus:border-transparent transition-all"
              />
            </div>
          </div>
        </div>

        <div className="mt-4 flex flex-col gap-2">
          <button 
            onClick={handleSave}
            disabled={!rut || !name || isLoading}
            className="w-full bg-color-brand hover:bg-color-brand-hover disabled:opacity-50 text-white font-semibold py-4 rounded-xl transition-all shadow-lg flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <span className="animate-pulse">Procesando...</span>
            ) : (
              <>
                <span>Guardar y Asociar a Venta</span>
                <span className="bg-black/20 text-xs px-2 py-1 rounded text-white/90">Enter ↵</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
