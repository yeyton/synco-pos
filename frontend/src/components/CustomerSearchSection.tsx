import React, { useState, useEffect, useRef } from 'react';
import { Search, UserPlus, Star, FileText, Grid, User, UserCircle, X } from 'lucide-react';
import type { Customer } from './CustomerModal';

interface CustomerSearchSectionProps {
  onSelectCustomer: (customer: Customer) => void;
  onNewCustomer: () => void;
  activePanel: string;
  onSetPanel: (panel: string) => void;
}

export const CustomerSearchSection: React.FC<CustomerSearchSectionProps> = ({
  onSelectCustomer,
  onNewCustomer,
  activePanel,
  onSetPanel,
}) => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);

  const searchInputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Focus search input when panel becomes active
    if (activePanel === 'customers') {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 100);
    }
  }, [activePanel]);

  useEffect(() => {
    const fetchCustomers = async () => {
      setIsLoading(true);
      try {
        const query = search ? `?query=${encodeURIComponent(search)}` : '';
        const res = await fetch(`/api/v1/customers/search${query}`);
        const data = await res.json();
        if (Array.isArray(data)) {
          setCustomers(data);
          setSelectedIndex(0); // Reset selection on new search
        }
      } catch (e) {
        console.error('Error fetching customers', e);
      } finally {
        setIsLoading(false);
      }
    };

    const timer = setTimeout(() => {
      fetchCustomers();
    }, 300);

    return () => clearTimeout(timer);
  }, [search]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (activePanel !== 'customers') return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => Math.min(prev + 1, customers.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => Math.max(prev - 1, 0));
      } else if (e.key === 'Enter') {
        if (customers.length > 0 && customers[selectedIndex]) {
          e.preventDefault();
          onSelectCustomer(customers[selectedIndex]);
          onSetPanel('catalog');
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        setSearch('');
        onSetPanel('catalog');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activePanel, customers, selectedIndex, onSelectCustomer, onSetPanel]);

  // Auto-scroll to selected item
  useEffect(() => {
    if (listRef.current) {
      const selectedEl = listRef.current.children[selectedIndex] as HTMLElement;
      if (selectedEl) {
        selectedEl.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
    }
  }, [selectedIndex]);

  return (
    <div className="flex-1 flex flex-col h-full bg-bg-main border-l border-border-color relative">
      
      {/* Header */}
      <div className="p-6 pb-2">
        <div className="flex items-center justify-between gap-3 mb-6">
          <div className="flex items-center gap-3">
            <UserCircle className="w-6 h-6 text-[#0ea5e9]" />
            <h2 className="text-xl font-light text-text-main">Buscar Cliente</h2>
          </div>
          <button 
            onClick={() => onSetPanel?.('none')}
            className="md:hidden p-2 rounded-full hover:bg-bg-panel text-text-muted transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="relative mb-4">
          <input 
            ref={searchInputRef}
            type="text" 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por RUT, nombre o correo"
            className="w-full bg-transparent border-b border-border-color border-dashed pb-2 text-text-main focus:outline-none focus:border-[#0ea5e9] placeholder-text-muted transition-colors text-lg"
          />
          <Search className="absolute right-2 top-1 w-5 h-5 text-[#0ea5e9]" />
        </div>
      </div>

      {/* Lista de Clientes */}
      <div className="flex-1 overflow-y-auto p-6 pt-4 custom-scrollbar" ref={listRef}>
        {isLoading ? (
          <div className="flex justify-center items-center h-32">
            <div className="w-8 h-8 border-4 border-[#0ea5e9] border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {customers.map((c, index) => (
              <button
                key={c.id || c.rut}
                onClick={() => {
                  onSelectCustomer(c);
                  onSetPanel('catalog');
                }}
                className={`text-left p-4 rounded-xl border transition-all flex items-center gap-4 ${
                  index === selectedIndex 
                    ? 'bg-[#0ea5e9]/10 border-[#0ea5e9] shadow-md' 
                    : 'bg-bg-panel border-border-color hover:border-[#0ea5e9]/50'
                }`}
              >
                <div className={`p-2 rounded-full ${index === selectedIndex ? 'bg-[#0ea5e9] text-white' : 'bg-input-bg text-text-muted'}`}>
                  <UserCircle className="w-6 h-6" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className={`font-semibold text-lg truncate ${index === selectedIndex ? 'text-[#0ea5e9]' : 'text-text-main'}`}>
                    {c.name}
                  </div>
                  <div className="text-sm text-text-muted flex gap-3 mt-1">
                    <span className="font-mono">{c.rut}</span>
                    {c.email && <span className="truncate">• {c.email}</span>}
                  </div>
                </div>
              </button>
            ))}
            {customers.length === 0 && !isLoading && (
              <div className="text-center text-text-muted py-10">
                No se encontraron clientes.
              </div>
            )}
          </div>
        )}
      </div>

      {/* Botón NUEVO flotante */}
      <div className="absolute bottom-24 right-6">
        <button 
          onClick={onNewCustomer}
          className="bg-[#0ea5e9] hover:bg-[#0284c7] text-white px-6 py-3 rounded-lg font-bold shadow-lg flex items-center gap-2 transition-all active:scale-95"
        >
          <span>NUEVO</span>
          <UserPlus className="w-5 h-5" />
        </button>
      </div>

      {/* Footer Nav (Decorativos estilo Bsale) */}
      <div className="h-16 border-t border-border-color bg-bg-panel flex items-center justify-around px-10">
        <button 
          onClick={() => onSetPanel?.('featured')}
          className={`p-3 rounded-full border-2 transition-colors ${
            activePanel === 'featured' 
              ? 'border-[#2cb2e6] text-[#2cb2e6] bg-[#2cb2e6]/10' 
              : 'border-border-color text-text-muted hover:border-[#2cb2e6] hover:text-[#2cb2e6]'
          }`}
        >
          <Star className="w-5 h-5" />
        </button>
        <button 
          onClick={() => onSetPanel?.('drafts')}
          className={`p-3 rounded-full border-2 transition-colors ${
            activePanel === 'drafts' 
              ? 'border-[#2cb2e6] text-[#2cb2e6] bg-[#2cb2e6]/10' 
              : 'border-border-color text-text-muted hover:border-[#2cb2e6] hover:text-[#2cb2e6]'
          }`}
        >
          <FileText className="w-5 h-5" />
        </button>
        <button 
          onClick={() => onSetPanel?.('catalog')}
          className={`p-3 rounded-full border-2 transition-colors ${
            activePanel === 'catalog' 
              ? 'border-color-brand text-color-brand bg-color-brand-light dark:bg-color-brand/20' 
              : 'border-border-color text-text-muted hover:border-color-brand hover:text-color-brand'
          }`}
        >
          <Grid className="w-5 h-5" />
        </button>
        <button 
          onClick={() => onSetPanel?.('customers')}
          className={`p-3 rounded-full border-2 transition-colors ${
            activePanel === 'customers' 
              ? 'border-[#0ea5e9] text-[#0ea5e9] bg-[#0ea5e9]/10' 
              : 'border-border-color text-text-muted hover:border-[#0ea5e9] hover:text-[#0ea5e9]'
          }`}
        >
          <User className="w-5 h-5" />
        </button>
      </div>

    </div>
  );
};
