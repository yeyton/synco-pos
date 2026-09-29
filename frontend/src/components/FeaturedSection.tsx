import React, { useState, useEffect } from 'react';
import { Star, X, DollarSign, LayoutGrid, FileText, Grid, User } from 'lucide-react';

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
  variant_name?: string;
}

interface FeaturedSectionProps {
  onAddProduct: (item: any) => void;
  activePanel?: 'catalog' | 'customers' | 'payment' | 'drafts' | 'featured' | 'none';
  onSetPanel?: (panel: any) => void;
}

export const FeaturedSection: React.FC<FeaturedSectionProps> = ({ onAddProduct, activePanel, onSetPanel }) => {
  const [items, setItems] = useState<CatalogItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState<number>(-1);

  useEffect(() => {
    const fetchFeatured = async () => {
      setIsLoading(true);
      try {
        const res = await fetch('/api/v1/inventory/featured');
        const data = await res.json();
        if (data.success) {
          setItems(data.items);
        }
      } catch (e) {
        console.error('Error fetching featured', e);
      } finally {
        setIsLoading(false);
      }
    };
    fetchFeatured();
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (activePanel !== 'featured' || items.length === 0) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setFocusedIndex(prev => (prev < items.length - 1 ? prev + 1 : prev));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setFocusedIndex(prev => (prev > 0 ? prev - 1 : prev));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (focusedIndex >= 0 && focusedIndex < items.length) {
          handleItemClick(items[focusedIndex]);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [items, focusedIndex, activePanel]);

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
    if (onSetPanel) onSetPanel('none');
  };

  const formatCLP = (amount: string | number) => {
    return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(Number(amount));
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-bg-main border-l border-border-color animate-in slide-in-from-right duration-200">
      {/* Header */}
      <div className="p-6 pb-2 border-b border-border-color">
        <div className="flex items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-3 text-[#2cb2e6]">
            <Star className="w-6 h-6" />
            <h2 className="text-xl font-light text-text-main">Destacados y más Vendidos</h2>
          </div>
          <button 
            onClick={() => onSetPanel?.('none')}
            className="md:hidden p-2 rounded-full hover:bg-bg-panel text-text-muted transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
      </div>

      {/* Lista */}
      <div className="flex-1 overflow-y-auto p-4 pt-2 custom-scrollbar">
        {isLoading ? (
           <div className="flex justify-center items-center h-32">
             <div className="w-8 h-8 border-4 border-color-brand border-t-transparent rounded-full animate-spin"></div>
           </div>
        ) : (
          <div className="flex flex-col">
            {items.map((item, index) => (
              <div
                key={item.variant_id}
                onClick={() => handleItemClick(item)}
                className={`flex items-center justify-between border-b border-gray-200 py-3 px-2 cursor-pointer transition-colors ${
                  focusedIndex === index ? 'bg-blue-50/50' : 'hover:bg-gray-50'
                }`}
              >
                <div className="flex-1 flex flex-col pr-4">
                  <span className="text-[14px] text-text-main font-medium leading-tight">{item.product_name}</span>
                  {item.variant_name && <span className="text-xs text-text-muted mt-0.5">{item.variant_name}</span>}
                </div>
                
                <div className="flex items-center gap-4 shrink-0">
                  <div className="flex flex-col items-center">
                    <div className="w-9 h-9 rounded-full border border-[#2cb2e6] flex items-center justify-center text-[#2cb2e6]">
                      <DollarSign className="w-5 h-5" />
                    </div>
                    <span className="text-[11px] text-text-main font-medium mt-1">{formatCLP(item.gross_price)}</span>
                  </div>

                  <div className="flex flex-col items-center">
                    <div className="w-9 h-9 rounded-full border border-[#2cb2e6] flex items-center justify-center text-[#2cb2e6]">
                      <LayoutGrid className="w-5 h-5" />
                    </div>
                    <span className="text-[11px] text-text-main font-medium mt-1">Stk: {item.stock_available}</span>
                  </div>
                </div>
              </div>
            ))}
            {items.length === 0 && !isLoading && (
              <div className="text-center text-text-muted py-10 text-sm">
                Aún no hay productos con ventas.
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer Nav */}
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
