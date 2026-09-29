import React, { useState, useEffect } from 'react';
import { FileText, Search, Calendar, Star, Grid, User, X } from 'lucide-react';

interface DraftsSectionProps {
  onLoadDraft: (draft: any) => void;
  activePanel: string;
  onSetPanel: (panel: any) => void;
}

export const DraftsSection: React.FC<DraftsSectionProps> = ({
  onLoadDraft,
  activePanel,
  onSetPanel,
}) => {
  const [drafts, setDrafts] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (activePanel === 'drafts') {
      fetchDrafts();
    }
  }, [activePanel]);

  const fetchDrafts = async () => {
    setIsLoading(true);
    try {
      // Usar store por defecto
      const storeId = '76123456-7890-4123-8123-123456789012';
      const res = await fetch(`/api/v1/drafts?store_id=${storeId}`);
      const data = await res.json();
      if (data.success) {
        setDrafts(data.drafts);
      }
    } catch (e) {
      console.error('Error fetching drafts:', e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectDraft = async (draft: any) => {
    try {
      // Eliminar borrador de la base de datos al cargarlo al carrito
      await fetch(`/api/v1/drafts/${draft.id}`, { method: 'DELETE' });
    } catch (e) {
      console.error('Error deleting draft:', e);
    }
    onLoadDraft(draft);
  };

  const filteredDrafts = drafts.filter(d => 
    (d.customer_name || '').toLowerCase().includes(search.toLowerCase()) ||
    (d.customer_rut || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex-1 flex flex-col h-full bg-bg-main border-l border-border-color">
      
      {/* Header */}
      <div className="p-6 pb-2">
        <div className="flex items-center justify-between gap-3 mb-6">
          <div className="flex items-center gap-3">
            <FileText className="w-6 h-6 text-[#0ea5e9]" />
            <h2 className="text-xl font-light text-text-main">Borradores de Venta</h2>
          </div>
          <button 
            onClick={() => onSetPanel?.('none')}
            className="md:hidden p-2 rounded-full hover:bg-bg-panel text-text-muted transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="flex flex-col gap-4 mb-4">
          <div className="flex items-center gap-2 border-b border-border-color border-dashed pb-2 sm:w-1/3">
            <span className="text-text-main flex-1">{new Date().toLocaleDateString('es-CL')}</span>
            <Calendar className="w-4 h-4 text-text-muted" />
          </div>

          <div className="relative">
            <input 
              type="text" 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar"
              className="w-full bg-transparent border-b border-border-color border-dashed pb-2 text-text-main focus:outline-none focus:border-[#0ea5e9] placeholder-text-muted transition-colors text-lg"
            />
            <Search className="absolute right-2 top-1 w-5 h-5 text-[#0ea5e9]" />
          </div>
        </div>
      </div>

      {/* Lista de Borradores */}
      <div className="flex-1 overflow-y-auto p-6 pt-2 custom-scrollbar">
        {isLoading ? (
          <div className="flex justify-center items-center h-32">
            <div className="w-8 h-8 border-4 border-[#0ea5e9] border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : filteredDrafts.length === 0 ? (
          <div>
            <p className="text-text-muted mb-4">Borrador de Venta no encontrado</p>
            <hr className="border-border-color" />
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {filteredDrafts.map((draft) => (
              <button
                key={draft.id}
                onClick={() => handleSelectDraft(draft)}
                className="text-left p-4 rounded-xl border border-border-color bg-bg-panel hover:border-[#0ea5e9]/50 transition-all flex flex-col gap-2"
              >
                <div className="flex justify-between items-start w-full">
                  <span className="font-semibold text-[#0ea5e9]">
                    {new Date(draft.created_at).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                  <span className="font-bold text-text-main">
                    $ {parseFloat(draft.total_amount).toLocaleString('es-CL')}
                  </span>
                </div>
                {draft.customer_name && (
                  <div className="text-sm text-text-muted">
                    Cliente: {draft.customer_name} ({draft.customer_rut})
                  </div>
                )}
                <div className="text-sm text-text-muted">
                  {draft.items.length} {draft.items.length === 1 ? 'producto' : 'productos'}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Footer Nav (Decorativos estilo Bsale) */}
      <div className="h-16 border-t border-border-color bg-bg-panel flex items-center justify-around px-10 shrink-0">
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
