import React, { useState, useEffect, useRef } from 'react';
import { Store, Moon, Sun, HelpCircle, Printer, CheckCircle2, ArrowRightCircle, XCircle, ShoppingBag, Truck, Undo2, CreditCard, Banknote, Vault, PackageOpen, FileBarChart2, Menu } from 'lucide-react';

export type ViewType = 'ventas' | 'reprint' | 'despachos';

interface HeaderProps {
  onToggleTheme: () => void;
  isDark: boolean;
  activeView: ViewType;
  onSetView: (view: ViewType) => void;
  onToggleCatalog: () => void;
  onLogout?: () => void;
  onGoHub?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onToggleTheme, isDark, activeView, onSetView, onToggleCatalog, onLogout, onGoHub }) => {
  const [time, setTime] = useState(new Date());
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const operationsOptions = [
    { id: 'reprint', label: 'Reimprimir', icon: <Printer className="w-5 h-5" />, desc: 'Última boleta' },
    { id: 'ventas', label: 'Ventas', icon: <ShoppingBag className="w-5 h-5 text-color-brand" />, desc: 'Módulo actual', isActive: true },
    { id: 'devolucion', label: 'Hacer una devolución', icon: <Undo2 className="w-5 h-5" />, desc: 'Notas de crédito' },
    { id: 'abono', label: 'Abono de cliente', icon: <CreditCard className="w-5 h-5" />, desc: 'Pagar deudas' },
  ];

  const managementOptions = [
    { id: 'despachos', label: 'Despacho', icon: <Truck className="w-5 h-5" />, desc: 'Envíos y retiros' },
    { id: 'efectivo', label: 'Movimientos de efectivo', icon: <Banknote className="w-5 h-5" />, desc: 'Ingreso/Egreso' },
    { id: 'cierre', label: 'Cierre de caja', icon: <Vault className="w-5 h-5" />, desc: 'Cuadratura' },
    { id: 'stock', label: 'Recepción de stock', icon: <PackageOpen className="w-5 h-5" />, desc: 'Inventario' },
    { id: 'reportes', label: 'Reportes', icon: <FileBarChart2 className="w-5 h-5" />, desc: 'Métricas' },
  ];

  return (
    <header className="bg-bg-panel border-b border-border-color border-t-4 border-t-[#ea580c] px-6 py-3 flex items-center justify-between shadow-sm select-none transition-colors duration-300 relative z-40">
      
      {/* Lado Izquierdo: Sucursal y Usuario con Mega Menu */}
      <div className="flex items-center gap-3 relative" ref={menuRef}>
        <button 
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          className={`flex items-center gap-2 border px-4 py-2 rounded-md text-sm font-bold transition-all relative z-50 ${
            isMenuOpen 
              ? 'bg-bg-panel border-red-500 shadow-lg text-text-main' 
              : 'border-border-color bg-input-bg text-text-main hover:border-red-500 hover:bg-bg-panel'
          }`}
        >
          {activeView === 'ventas' && <ShoppingBag className="w-5 h-5 text-red-500" />}
          {activeView === 'reprint' && <Printer className="w-5 h-5 text-red-500" />}
          {activeView === 'despachos' && <Truck className="w-5 h-5 text-red-500" />}
          <span className="uppercase tracking-wide text-text-main">
            {activeView === 'reprint' ? 'Reimprimir' : activeView === 'despachos' ? 'Despachos' : 'Ventas'}
          </span>
          <svg className={`w-4 h-4 ml-1 transition-transform duration-200 ${isMenuOpen ? 'rotate-180 text-red-500' : 'text-text-muted'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
        </button>

        {/* Mega Menu Dropdown */}
        {isMenuOpen && (
          <div className="absolute top-full left-0 mt-3 w-[calc(100vw-3rem)] md:w-[640px] max-h-[75vh] overflow-y-auto bg-bg-panel border border-red-500 rounded-2xl shadow-2xl flex flex-col z-50 animate-in fade-in slide-in-from-top-2 duration-200">
            
            <div className="grid grid-cols-1 md:grid-cols-2 p-3 gap-3">
              
              {/* Columna 1: Operaciones */}
              <div className="flex flex-col">
                <div className="px-3 py-2 text-xs font-bold uppercase tracking-wider text-text-muted mb-1">
                  Operaciones de Caja
                </div>
                <div className="flex flex-col gap-1">
                  {operationsOptions.map((opt) => {
                    const isActive = activeView === opt.id || (activeView === 'ventas' && opt.id === 'ventas');
                    
                    return (
                      <button 
                        key={opt.id} 
                        onClick={() => {
                          if (opt.id === 'ventas' || opt.id === 'reprint') {
                            onSetView(opt.id as 'ventas' | 'reprint' | 'despachos');
                            setIsMenuOpen(false);
                          }
                        }}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-left ${isActive ? 'bg-color-brand/10 border border-color-brand/20' : 'hover:bg-input-bg border border-transparent'}`}
                      >
                        <div className={`p-2 rounded-lg ${isActive ? 'bg-bg-panel text-color-brand shadow-sm' : 'bg-bg-main text-text-muted'}`}>
                          {opt.icon}
                        </div>
                        <div className="flex flex-col">
                          <span className={`text-sm font-bold ${isActive ? 'text-color-brand' : 'text-text-main'}`}>{opt.label}</span>
                          <span className="text-xs text-text-muted">{opt.desc}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Columna 2: Gestión */}
              <div className="flex flex-col border-t md:border-t-0 md:border-l border-border-color pt-3 md:pt-0 md:pl-3">
                <div className="px-3 py-2 text-xs font-bold uppercase tracking-wider text-text-muted mb-1">
                  Gestión y Tienda
                </div>
                <div className="flex flex-col gap-1">
                  {managementOptions.map((opt, idx) => {
                    const isActive = activeView === 'despachos' && opt.id === 'despachos';
                    return (
                    <button 
                      key={idx} 
                      onClick={() => {
                        if (opt.id === 'despachos') {
                          onSetView('despachos');
                          setIsMenuOpen(false);
                        }
                      }}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-left ${isActive ? 'bg-color-brand/10 border border-color-brand/20' : 'hover:bg-input-bg border border-transparent'} group`}
                    >
                      <div className={`p-2 rounded-lg transition-colors ${isActive ? 'bg-bg-panel text-color-brand shadow-sm' : 'bg-bg-main text-text-muted group-hover:text-color-brand'}`}>
                        {opt.icon}
                      </div>
                      <div className="flex flex-col">
                        <span className={`text-sm font-bold ${isActive ? 'text-color-brand' : 'text-text-main'}`}>{opt.label}</span>
                        <span className="text-xs text-text-muted">{opt.desc}</span>
                      </div>
                    </button>
                    );
                  })}
                </div>
              </div>

            </div>

            {/* Footer del Menu */}
            <div className="bg-input-bg border-t border-border-color px-6 py-4 flex flex-col md:flex-row md:items-center justify-end gap-4">
              
              <div className="flex flex-wrap items-center justify-end gap-4 w-full md:w-auto">
                <div className="flex items-center gap-2 border-r border-border-color pr-4">
                  <button 
                    onClick={onToggleTheme}
                    className="p-2 rounded-full hover:bg-bg-panel text-text-muted hover:text-text-main transition-colors"
                    title="Alternar Tema"
                  >
                    {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                  </button>

                  <button className="p-2 rounded-full border border-border-color text-text-muted hover:text-text-main hover:bg-bg-panel transition-colors" title="Ayuda">
                    <HelpCircle className="w-5 h-5" />
                  </button>
                </div>

                <div className="flex items-center gap-2 flex-1 lg:flex-none justify-end">
                  <button 
                    onClick={() => {
                      setIsMenuOpen(false);
                      onGoHub && onGoHub();
                    }}
                    className="flex-1 lg:flex-none flex justify-center items-center gap-2 px-4 py-2 bg-bg-panel border border-border-color hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/30 text-blue-500 font-semibold rounded-lg transition-colors shadow-sm text-sm"
                  >
                    <ArrowRightCircle className="w-4 h-4" />
                    Volver al Hub
                  </button>

                  <button 
                    onClick={() => {
                      setIsMenuOpen(false);
                      onLogout && onLogout();
                    }}
                    className="flex-1 lg:flex-none flex justify-center items-center gap-2 px-4 py-2 bg-bg-panel border border-border-color hover:border-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 text-red-500 font-semibold rounded-lg transition-colors shadow-sm text-sm"
                  >
                    <XCircle className="w-4 h-4" />
                    Cerrar Sesión
                  </button>
                </div>
              </div>
            </div>

          </div>
        )}
      </div>

      {/* Lado Derecho: Menú Hamburguesa para Móvil */}
      <div className="flex items-center">
        <button 
          onClick={onToggleCatalog}
          className="md:hidden p-2 rounded-md border border-border-color text-text-muted hover:text-text-main hover:bg-input-bg transition-colors"
          title="Abrir Catálogo"
        >
          <Menu className="w-5 h-5" />
        </button>
      </div>
    </header>
  );
};
