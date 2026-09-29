import React, { useState, useEffect } from 'react';
import { Search, Grid, FileText, Star, User, X } from 'lucide-react';

interface CatalogItem {
  variant_id: string;
  product_name: string;
  brand: string;
  sku: string;
  barcode: string;
  gross_price: string;
  stock_available: string;
  vat_rate: string;
  net_price: string;
}

interface CatalogSectionProps {
  onAddProduct: (item: any) => void;
  activePanel?: string;
  onSetPanel?: (panel: string) => void;
}

export const CatalogSection: React.FC<CatalogSectionProps> = ({ onAddProduct, activePanel = 'catalog', onSetPanel }) => {
  const [items, setItems] = useState<CatalogItem[]>([]);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const fetchCatalog = async () => {
      setIsLoading(true);
      try {
        const query = search ? `?search=${encodeURIComponent(search)}` : '';
        const res = await fetch(`/api/v1/inventory/catalog${query}`);
        const data = await res.json();
        if (data.success) {
          setItems(data.items);
        }
      } catch (e) {
        console.error('Error fetching catalog', e);
      } finally {
        setIsLoading(false);
      }
    };

    const timer = setTimeout(() => {
      fetchCatalog();
    }, 300);

    return () => clearTimeout(timer);
  }, [search]);

  const handleItemClick = (item: CatalogItem) => {
    onAddProduct({
      variant_id: item.variant_id,
      product_name: item.product_name,
      sku: item.sku,
      barcode: item.barcode,
      unit_net_price: parseFloat(item.net_price),
      unit_gross_price: parseFloat(item.gross_price),
      vat_rate: parseFloat(item.vat_rate),
      quantity: 1,
      stock_available: parseFloat(item.stock_available),
    });
  };

  const formatCLP = (amount: string | number) => {
    return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(Number(amount));
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-bg-main border-l border-border-color">
      
      {/* Header */}
      <div className="p-6 pb-2">
        <div className="flex items-center justify-between gap-3 mb-6">
          <div className="flex items-center gap-3">
            <Grid className="w-6 h-6 text-color-brand" />
            <h2 className="text-xl font-light text-text-main">Productos/Servicios</h2>
          </div>
          <button 
            onClick={() => onSetPanel?.('none')}
            className="md:hidden p-2 rounded-full hover:bg-bg-panel text-text-muted transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="relative">
          <input 
            type="text" 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="ingresa aquí el producto o servicio"
            className="w-full bg-transparent border-b border-border-color border-dashed pb-2 text-text-main focus:outline-none focus:border-color-brand placeholder-text-muted transition-colors text-lg"
          />
          <Search className="absolute right-2 top-1 w-5 h-5 text-color-brand" />
        </div>
      </div>

      {/* Grid de Productos */}
      <div className="flex-1 overflow-y-auto p-6 pt-4 custom-scrollbar">
        {isLoading ? (
          <div className="flex justify-center items-center h-32">
            <div className="w-8 h-8 border-4 border-color-brand border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {items.map((item) => (
              <button
                key={item.variant_id}
                onClick={() => handleItemClick(item)}
                className="bg-bg-panel border border-border-color rounded-xl p-4 flex flex-col gap-2 text-left hover:border-color-brand hover:shadow-lg transition-all active:scale-95 group"
              >
                <div className="text-sm font-semibold text-text-main line-clamp-2 leading-snug group-hover:text-color-brand transition-colors">
                  {item.product_name}
                </div>
                <div className="text-xs text-text-muted mt-auto flex justify-between items-center w-full pt-2">
                  <span className="font-mono">{item.sku}</span>
                  <span className="font-bold text-sm text-text-main">{formatCLP(item.gross_price)}</span>
                </div>
              </button>
            ))}
            {items.length === 0 && !isLoading && (
              <div className="col-span-full text-center text-text-muted py-10">
                No se encontraron productos.
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer Icons (Decorativos estilo Bsale) */}
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
