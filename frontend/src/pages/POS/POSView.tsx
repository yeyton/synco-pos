import { useState, useEffect, useRef } from 'react';
import { Header } from '../../components/Header';
import { CartSection } from '../../components/CartSection';
import { CatalogSection } from '../../components/CatalogSection';
import { CustomerSearchSection } from '../../components/CustomerSearchSection';
import { PaymentSection } from '../../components/PaymentSection';
import { DraftsSection } from '../../components/DraftsSection';
import { FeaturedSection } from '../../components/FeaturedSection';
import { ReprintSection } from '../../components/ReprintSection';
import { DispatchSection } from '../../components/DispatchSection';
import { TicketModal } from '../../components/TicketModal';
import { CustomerModal } from '../../components/CustomerModal';
import { DiscountModal } from '../../components/DiscountModal';
import type { Customer } from '../../components/CustomerModal';
import type { CartItem, TicketData, PaymentMethod } from '../../types/pos';
import { CheckCircle2 } from 'lucide-react';

import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const DEFAULT_STORE_ID = '76123456-7890-4123-8123-123456789012';
const DEFAULT_WAREHOUSE_ID = '11111111-2222-3333-4444-555555555555';

export function POSView() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState<CartItem[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [ticket, setTicket] = useState<TicketData | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  const [isDiscountModalOpen, setIsDiscountModalOpen] = useState(false);
  const [discountAmount, setDiscountAmount] = useState(0);
  const [couponCode, setCouponCode] = useState('');
  const [isDark, setIsDark] = useState(false);
  const [activeView, setActiveView] = useState<'ventas' | 'reprint' | 'despachos'>('ventas');
  const [activeRightPanel, setActiveRightPanel] = useState<'catalog' | 'customers' | 'payment' | 'drafts' | 'featured' | 'none'>('featured');

  type ActivePanelType = 'catalog' | 'customers' | 'payment' | 'drafts' | 'featured' | 'none';

  const handleSetRightPanel = (panel: string) => {
    if (panel === 'none' && window.innerWidth >= 768) {
      setActiveRightPanel('catalog');
    } else {
      setActiveRightPanel(panel as ActivePanelType);
    }
  };

  const barcodeBufferRef = useRef<string>('');
  const lastKeyTimeRef = useRef<number>(0);

  // ... the rest remains the same, but we update the usages below ...

  // To avoid replacing the whole file, I will just replace the rendering part.
  // Wait, I can replace the specific lines for each component.
  // Let me replace from the state declaration to the return to add the handler, 
  // but it's better to replace the render block.

  // Mover clases base para theme al effect
  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDark]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F12') {
        e.preventDefault();
        if (items.length > 0) setActiveRightPanel('payment');
        return;
      }
      if (e.key === 'F3') {
        e.preventDefault();
        if (activeView === 'ventas') {
          setActiveRightPanel('customers');
        }
        return;
      }
      if (e.key === 'F4') {
        e.preventDefault();
        setActiveView(prev => prev === 'ventas' ? 'reprint' : 'ventas');
        return;
      }
      if (e.key === 'F5') {
        e.preventDefault();
        if (activeView === 'ventas') {
          setActiveRightPanel('featured');
        }
        return;
      }
      if (e.key === 'Escape') {
        setTicket(null);
        setIsCustomerModalOpen(false);
        setCustomer(null);
        if (activeView === 'reprint') setActiveView('ventas');
        if (['customers', 'payment', 'drafts', 'featured'].includes(activeRightPanel)) {
          setActiveRightPanel(window.innerWidth < 768 ? 'none' : 'catalog');
        } else if (activeRightPanel === 'catalog' && window.innerWidth < 768) {
          setActiveRightPanel('none');
        }
        return;
      }

      const currentTime = Date.now();
      const timeDiff = currentTime - lastKeyTimeRef.current;
      lastKeyTimeRef.current = currentTime;

      // Detectar si la pulsación es súper rápida (lector de barras)
      const isScannerSpeed = timeDiff < 50;

      const target = e.target as HTMLElement;
      const isInput = target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA');

      if (e.key === 'Enter') {
        if (barcodeBufferRef.current.length > 2) {
          const scannedCode = barcodeBufferRef.current.trim();
          barcodeBufferRef.current = '';
          fetchAndAddProduct(scannedCode);
          
          // Si estábamos en un input (ej. buscador), podemos limpiar el valor si lo deseamos, 
          // pero al menos prevenimos el default.
          e.preventDefault();
          return;
        }
        barcodeBufferRef.current = '';
      } else if (e.key.length === 1) {
        if (timeDiff > 100) {
          barcodeBufferRef.current = e.key;
        } else {
          barcodeBufferRef.current += e.key;
        }
      }

      if (isInput && !isScannerSpeed) {
        // Si el usuario está escribiendo manualmente en un input, no hacemos preventDefault
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown, true); // use capture to intercept before inputs sometimes
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [items, activeView, activeRightPanel]);

  const fetchAndAddProduct = async (code: string): Promise<boolean> => {
    try {
      const response = await fetch(`/api/v1/inventory/lookup?code=${encodeURIComponent(code)}`);
      const data = await response.json();

      if (!response.ok || !data.success) {
        showToast(`❌ Producto no encontrado (${code})`);
        return false;
      }

      const foundVariant = data.item;
      addItemToCart({
        variant_id: foundVariant.variant_id,
        product_name: foundVariant.product_name,
        sku: foundVariant.sku,
        barcode: foundVariant.barcode,
        unit_net_price: parseFloat(foundVariant.net_price),
        unit_gross_price: parseFloat(foundVariant.gross_price),
        vat_rate: parseFloat(foundVariant.vat_rate),
        quantity: 1,
        stock_available: parseFloat(foundVariant.stock_available),
      });

      showToast(`⚡ Agregado: ${foundVariant.product_name}`);
      return true;
    } catch {
      showToast(`❌ Error buscando producto (${code})`);
      return false;
    }
  };

  const addItemToCart = (newItem: CartItem) => {
    setItems((prev) => {
      const existingIndex = prev.findIndex((i) => i.variant_id === newItem.variant_id);
      if (existingIndex > -1) {
        const updated = [...prev];
        updated[existingIndex] = { ...updated[existingIndex], quantity: updated[existingIndex].quantity + 1 };
        return updated;
      }
      return [...prev, newItem];
    });
  };

  const handleUpdateQuantity = (variantId: string, delta: number) => {
    setItems((prev) =>
      prev
        .map((i) => {
          if (i.variant_id === variantId) {
            const newQty = i.quantity + delta;
            return newQty > 0 ? { ...i, quantity: newQty } : null;
          }
          return i;
        })
        .filter(Boolean) as CartItem[]
    );
  };

  const handleSetQuantity = (variantId: string, quantity: number) => {
    setItems((prev) =>
      prev.map((i) => (i.variant_id === variantId ? { ...i, quantity: Math.max(1, quantity) } : i))
    );
  };

  const handleRemoveItem = (variantId: string) => {
    setItems((prev) => prev.filter((i) => i.variant_id !== variantId));
  };

  const subtotal = items.reduce((acc, i) => acc + i.unit_gross_price * i.quantity, 0);
  const grossTotal = Math.max(0, subtotal - discountAmount);
  const netTotal = Math.round(grossTotal / 1.19);
  const vatTotal = grossTotal - netTotal;

  const handleSaveDraft = async () => {
    if (items.length === 0) return;
    setIsProcessing(true);
    try {
      const payload = {
        store_id: DEFAULT_STORE_ID,
        user_id: user?.id,
        customer_id: customer?.id || null,
        items,
        total_amount: grossTotal
      };
      
      const res = await fetch('/api/v1/drafts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      const data = await res.json();
      if (res.ok && data.success) {
        showToast('💾 Borrador guardado exitosamente');
        setItems([]);
        setCustomer(null);
      } else {
        showToast('❌ Error guardando borrador');
      }
    } catch (e) {
      console.error(e);
      showToast('❌ Error guardando borrador');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCheckout = async (paymentDetails: {
    deliveryType: 'IMMEDIATE' | 'DISPATCH' | 'PICKUP';
    paymentMethod: string;
    amountPaid: number;
    requiresCollection?: boolean;
    collectionMethod?: string;
  }) => {
    if (items.length === 0 || isProcessing) return;

    setIsProcessing(true);
    const startTime = Date.now();

    const checkoutPayload = {
      store_id: DEFAULT_STORE_ID,
      warehouse_id: DEFAULT_WAREHOUSE_ID,
      user_id: user?.id,
      customer_id: customer?.id,
      source: 'POS',
      delivery_type: paymentDetails.deliveryType,
      shipping_amount: 0, // Por defecto 0, podría modificarse luego si el despacho cobra
      discount_amount: discountAmount,
      coupon_code: couponCode || null,
      requires_collection: paymentDetails.requiresCollection,
      collection_amount: paymentDetails.requiresCollection ? grossTotal : 0,
      collection_method: paymentDetails.collectionMethod,
      items: items.map((i) => ({
        variant_id: i.variant_id,
        quantity: i.quantity,
        unit_net_price: i.unit_net_price,
        unit_gross_price: i.unit_gross_price,
      })),
      payments: [
        {
          payment_method: paymentDetails.paymentMethod,
          amount: grossTotal,
        },
      ],
    };

    try {
      const response = await fetch('/api/v1/sales/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(checkoutPayload),
      });

      const data = await response.json();
      const latency = Date.now() - startTime;

      if (response.ok && data.success) {
        setTicket({
          order_number: data.order_number || `ORD-${Date.now()}`,
          folio: Math.floor(1000 + Math.random() * 9000),
          dte_type: customer ? 33 : 39,
          date: new Date().toLocaleString('es-CL'),
          items: [...items],
          net_amount: netTotal,
          vat_amount: vatTotal,
          total_amount: grossTotal,
          payment_method: paymentDetails.paymentMethod as any,
          latency_ms: data.latency_ms || latency,
        });

        setItems([]);
        setActiveRightPanel(window.innerWidth < 768 ? 'none' : 'catalog');
      } else {
        showToast('❌ Error procesando el pago: ' + (data.message || 'Error desconocido'));
      }
    } catch {
      showToast('❌ Error de conexión procesando el pago');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden text-text-main bg-bg-main transition-colors duration-300">
      {/* Modal de Alerta Flotante */}
      {toastMessage && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200 p-4">
          <div className="bg-white dark:bg-bg-panel rounded-xl shadow-2xl w-full max-w-sm flex flex-col items-center text-center animate-in zoom-in-95 duration-200 overflow-hidden">
            <div className="p-8 w-full flex items-center justify-center min-h-[140px]">
              <p className="text-text-main text-lg font-medium">{toastMessage}</p>
            </div>
            <div className="w-full p-4 bg-gray-50 dark:bg-bg-main border-t border-border-color flex justify-center">
              <button 
                onClick={() => setToastMessage(null)}
                className="w-[120px] py-2 bg-[#2cb2e6] hover:bg-[#209bc9] text-white font-bold rounded flex items-center justify-center gap-2 transition-colors shadow-sm"
              >
                OK <CheckCircle2 className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      )}

      <Header 
        onToggleTheme={() => setIsDark(!isDark)} 
        isDark={isDark} 
        activeView={activeView as any}
        onSetView={setActiveView as any}
        onToggleCatalog={() => setActiveRightPanel(activeRightPanel === 'catalog' ? 'none' : 'catalog')}
        onLogout={() => {
          logout();
          navigate('/login');
        }}
        onGoHub={() => navigate('/hub')}
      />

      <main className="flex-1 flex overflow-hidden">
        
        {activeView === 'ventas' ? (
          <>
            {/* Lado Izquierdo (Carrito y Checkout) */}
            <div className="w-full h-full md:flex-1 flex flex-col">
              <CartSection 
                items={items}
                customer={customer}
              onUpdateQuantity={handleUpdateQuantity}
              onSetQuantity={handleSetQuantity}
              onRemoveItem={handleRemoveItem}
              onClearCart={() => { setItems([]); setDiscountAmount(0); setCouponCode(''); }}
              onOpenCustomerModal={() => setActiveRightPanel('customers')}
              onCheckout={() => setActiveRightPanel('payment')}
              onManualAddProduct={fetchAndAddProduct}
              isProcessing={isProcessing}
              netTotal={netTotal}
              vatTotal={vatTotal}
              grossTotal={grossTotal}
              onSaveDraft={handleSaveDraft}
              onOpenCatalog={() => setActiveRightPanel('catalog')}
              onOpenDiscountModal={() => setIsDiscountModalOpen(true)}
            />
            </div>

            {/* Lado Derecho (Catálogo o Clientes) */}
            <div className={`fixed inset-0 z-50 md:relative md:z-0 md:flex-1 flex flex-col h-full bg-bg-main transform transition-transform duration-300 ease-in-out md:transform-none ${
              activeRightPanel !== 'none' ? 'translate-x-0' : 'translate-x-full md:translate-x-0 md:flex hidden'
            }`}>
              {activeRightPanel === 'featured' && (
              <FeaturedSection 
                onAddProduct={addItemToCart} 
                activePanel={activeRightPanel}
                onSetPanel={handleSetRightPanel}
              />
            )}
              {activeRightPanel === 'catalog' && (
              <CatalogSection 
                onAddProduct={addItemToCart} 
                activePanel={activeRightPanel}
                onSetPanel={handleSetRightPanel}
              />
            )}
            {activeRightPanel === 'customers' && (
              <CustomerSearchSection
                onSelectCustomer={setCustomer}
                onNewCustomer={() => setIsCustomerModalOpen(true)}
                activePanel={activeRightPanel}
                onSetPanel={handleSetRightPanel}
              />
            )}
            {activeRightPanel === 'payment' && (
              <PaymentSection
                grossTotal={grossTotal}
                isProcessing={isProcessing}
                onConfirmPayment={handleCheckout}
                onSetPanel={handleSetRightPanel}
              />
            )}
            {activeRightPanel === 'drafts' && (
              <DraftsSection 
                onLoadDraft={(draft) => {
                  setCustomer(draft.customer_id ? { id: draft.customer_id, name: draft.customer_name, rut: draft.customer_rut } as any : null);
                  setItems(draft.items);
                  handleSetRightPanel('none');
                }}
                activePanel={activeRightPanel}
                onSetPanel={handleSetRightPanel}
              />
            )}
            </div>
          </>
        ) : activeView === 'reprint' ? (
          <ReprintSection onPrintTicket={setTicket} />
        ) : activeView === 'despachos' ? (
          <DispatchSection onSetView={setActiveView} />
        ) : null}
        
      </main>

      <CustomerModal
        isOpen={isCustomerModalOpen}
        onClose={() => setIsCustomerModalOpen(false)}
        onSave={setCustomer}
      />

      <DiscountModal 
        isOpen={isDiscountModalOpen}
        onClose={() => setIsDiscountModalOpen(false)}
        onApplyDiscount={(code, amount) => {
          setCouponCode(code);
          setDiscountAmount(amount);
          setIsDiscountModalOpen(false);
          showToast(amount > 0 ? `✅ Descuento de ${new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(amount)} aplicado` : '❌ Descuento eliminado');
        }}
        grossTotal={items.reduce((acc, i) => acc + i.unit_gross_price * i.quantity, 0)}
      />

      <TicketModal ticket={ticket} onClose={() => setTicket(null)} />
    </div>
  );
}

export default POSView;
