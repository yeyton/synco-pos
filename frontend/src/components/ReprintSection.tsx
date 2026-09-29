import React, { useState, useEffect, useRef } from 'react';
import { Search, Calendar, FileText, Printer, FileBadge2, AlertCircle } from 'lucide-react';

interface HistoryItem {
  id: string;
  order_number: string;
  created_at: string;
  total_amount: string;
  net_amount: string;
  vat_amount: string;
  dte_type: number;
  folio: number;
  customer_name: string | null;
  customer_rut: string | null;
  items: Array<{
    variant_id: string;
    quantity: number;
    unit_gross_price: string;
    product_name: string;
  }>;
}

interface ReprintSectionProps {
  onPrintTicket: (ticketData: any) => void;
}

export const ReprintSection: React.FC<ReprintSectionProps> = ({ onPrintTicket }) => {
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [query, setQuery] = useState('');
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<HistoryItem | null>(null);
  const [copies, setCopies] = useState(1);

  const searchInputRef = useRef<HTMLInputElement>(null);

  // Autofocus al montar
  useEffect(() => {
    searchInputRef.current?.focus();
  }, []);

  useEffect(() => {
    const fetchHistory = async () => {
      setIsLoading(true);
      try {
        const params = new URLSearchParams();
        if (date) params.append('date', date);
        if (query) params.append('query', query);

        const res = await fetch(`/api/v1/sales/history?${params.toString()}`);
        if (res.ok) {
          const data = await res.json();
          setHistory(data.history || []);
        }
      } catch (e) {
        console.error('Error fetching history:', e);
      } finally {
        setIsLoading(false);
      }
    };

    const debounce = setTimeout(() => {
      fetchHistory();
    }, 300);

    return () => clearTimeout(debounce);
  }, [date, query]);

  // Atajo Enter para imprimir
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && selectedDoc) {
        // Asegurar que no estemos en el input de búsqueda para no imprimir accidentalmente al buscar
        if (document.activeElement === searchInputRef.current && query !== '') {
          return;
        }
        e.preventDefault();
        handleReprint();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedDoc, copies, query]);

  const formatCLP = (amount: string | number) => {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(num || 0);
  };

  const getDteName = (type: number) => {
    if (type === 33) return 'FACTURA ELECTRÓNICA';
    if (type === 39) return 'BOLETA ELECTRÓNICA';
    return 'DOCUMENTO';
  };

  const handleReprint = () => {
    if (!selectedDoc) return;
    
    // Preparar el ticketData para TicketModal
    const ticketData = {
      order_number: selectedDoc.order_number,
      folio: selectedDoc.folio || 'N/A',
      dte_type: selectedDoc.dte_type || 39,
      date: new Date(selectedDoc.created_at).toLocaleString('es-CL'),
      items: selectedDoc.items ? selectedDoc.items.map(i => ({
        variant_id: i.variant_id,
        product_name: i.product_name,
        quantity: i.quantity,
        unit_gross_price: parseFloat(i.unit_gross_price)
      })) : [],
      net_amount: parseFloat(selectedDoc.net_amount || '0'),
      vat_amount: parseFloat(selectedDoc.vat_amount || '0'),
      total_amount: parseFloat(selectedDoc.total_amount || '0'),
      payment_method: 'CASH', // Asumido por ahora
      latency_ms: 0,
      isReprint: true,
      copies
    };

    onPrintTicket(ticketData);
  };

  return (
    <div className="flex-1 flex overflow-hidden">
      {/* Columna Izquierda: Previsualización */}
      <div className="w-1/2 flex flex-col bg-bg-main border-r border-border-color overflow-y-auto">
        {selectedDoc ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 animate-in fade-in duration-300">
            <h2 className="text-xl font-bold text-text-main mb-6 uppercase tracking-wider text-center">
              {getDteName(selectedDoc.dte_type)} N° {selectedDoc.folio || 'S/F'}
            </h2>
            
            <div className="bg-bg-panel border border-border-color shadow-lg rounded-2xl w-full max-w-sm p-8 flex flex-col items-center gap-4 relative">
              <FileBadge2 className="w-16 h-16 text-color-brand opacity-80" />
              <div className="text-center">
                <p className="text-text-muted text-sm">Fecha de emisión</p>
                <p className="font-semibold text-text-main">
                  {new Date(selectedDoc.created_at).toLocaleString('es-CL')}
                </p>
              </div>
              
              <div className="w-full border-t border-dashed border-border-color my-2"></div>
              
              <div className="w-full flex justify-between text-sm">
                <span className="text-text-muted">Total:</span>
                <span className="font-bold text-lg text-text-main">{formatCLP(selectedDoc.total_amount)}</span>
              </div>
              
              {selectedDoc.customer_name && (
                <div className="w-full text-center mt-2 bg-input-bg rounded-lg py-2">
                  <p className="text-xs text-text-muted">Cliente</p>
                  <p className="text-sm font-semibold truncate px-2">{selectedDoc.customer_name}</p>
                </div>
              )}
            </div>

            <div className="mt-8 flex items-end gap-4">
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-text-muted">Copias</label>
                <div className="flex items-center gap-1 border border-border-color bg-input-bg rounded-lg overflow-hidden">
                  <button 
                    onClick={() => setCopies(Math.max(1, copies - 1))}
                    className="w-10 h-10 flex items-center justify-center text-text-main hover:bg-bg-panel transition-colors"
                  >-</button>
                  <input 
                    type="number" 
                    value={copies} 
                    readOnly 
                    className="w-12 h-10 bg-transparent text-center font-bold text-text-main outline-none"
                  />
                  <button 
                    onClick={() => setCopies(copies + 1)}
                    className="w-10 h-10 flex items-center justify-center text-text-main hover:bg-bg-panel transition-colors"
                  >+</button>
                </div>
              </div>
              
              <button 
                onClick={handleReprint}
                className="h-10 px-8 bg-color-brand hover:bg-color-brand-hover text-white font-bold rounded-lg transition-colors flex items-center gap-2 shadow-lg"
              >
                <span>REIMPRIMIR</span>
                <span className="bg-black/20 text-xs px-2 py-0.5 rounded">Enter ↵</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-text-muted opacity-50 p-8 text-center">
            <FileText className="w-24 h-24 mb-4" />
            <p className="text-lg">Selecciona un documento de la lista para previsualizarlo y reimprimirlo.</p>
          </div>
        )}
      </div>

      {/* Columna Derecha: Búsqueda y Lista */}
      <div className="w-1/2 flex flex-col bg-bg-panel">
        <div className="p-6 border-b border-border-color flex flex-col gap-4">
          <div className="flex items-center gap-2 text-text-main">
            <FileText className="w-5 h-5 text-color-brand" />
            <h2 className="text-lg font-semibold tracking-tight">Documentos Disponibles</h2>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 border-b border-border-color pb-1 group focus-within:border-color-brand transition-colors w-40">
              <input 
                type="date" 
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="bg-transparent text-text-main text-sm font-medium outline-none w-full cursor-pointer"
              />
              <Calendar className="w-4 h-4 text-text-muted group-focus-within:text-color-brand" />
            </div>

            <div className="flex-1 flex items-center gap-2 border-b border-border-color pb-1 group focus-within:border-color-brand transition-colors">
              <input 
                ref={searchInputRef}
                type="text" 
                placeholder="Buscar folio, nombre o rut..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="bg-transparent text-text-main text-sm outline-none w-full"
              />
              <Search className="w-4 h-4 text-text-muted group-focus-within:text-color-brand" />
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-2">
          {isLoading ? (
            <div className="p-8 text-center text-text-muted animate-pulse">Cargando documentos...</div>
          ) : history.length === 0 ? (
            <div className="p-8 flex flex-col items-center justify-center text-text-muted opacity-60">
              <AlertCircle className="w-12 h-12 mb-2" />
              <p>No se encontraron documentos.</p>
            </div>
          ) : (
            history.map((doc) => (
              <button 
                key={doc.id}
                onClick={() => setSelectedDoc(doc)}
                className={`w-full text-left p-4 rounded-xl border transition-all flex items-center justify-between ${
                  selectedDoc?.id === doc.id 
                    ? 'bg-color-brand/5 border-color-brand shadow-sm' 
                    : 'bg-input-bg border-transparent hover:border-border-color hover:bg-bg-main'
                }`}
              >
                <div className="flex flex-col gap-1">
                  <span className={`text-sm font-bold uppercase ${selectedDoc?.id === doc.id ? 'text-color-brand' : 'text-text-main'}`}>
                    {getDteName(doc.dte_type)} N° {doc.folio || 'S/F'}
                  </span>
                  <span className="text-xs text-text-muted font-mono">{doc.order_number}</span>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className="text-sm font-bold text-text-main">{formatCLP(doc.total_amount)}</span>
                  <Printer className={`w-4 h-4 ${selectedDoc?.id === doc.id ? 'text-color-brand' : 'text-text-muted'}`} />
                </div>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
