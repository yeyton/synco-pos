import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Store, Package, LogOut } from 'lucide-react';

export function HubView() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const hasFulfillmentPermission = user?.role === 'ADMIN' || user?.permissions?.some(p => p.startsWith('fulfillment:'));

  return (
    <div className="min-h-screen bg-bg-main flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-2xl bg-bg-panel rounded-2xl shadow-xl p-8 border border-border-color">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold text-text-main">Bienvenido, {user?.name}</h1>
          <p className="text-text-muted mt-2">Selecciona el módulo al que deseas acceder</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* Módulo POS */}
          <button
            onClick={() => navigate('/pos')}
            className="flex flex-col items-center justify-center gap-4 p-8 rounded-2xl bg-bg-main border-2 border-border-color hover:border-accent-blue hover:bg-accent-blue/5 transition-all group active:scale-95"
          >
            <div className="w-20 h-20 rounded-full bg-accent-blue/10 text-accent-blue flex items-center justify-center group-hover:scale-110 transition-transform">
              <Store className="w-10 h-10" />
            </div>
            <div className="text-center">
              <h2 className="text-xl font-bold text-text-main mb-1">Caja / POS</h2>
              <p className="text-sm text-text-muted">Punto de venta y facturación</p>
            </div>
          </button>

          {/* Módulo Fulfillment */}
          {hasFulfillmentPermission && (
            <button
              onClick={() => navigate('/fulfillment')}
              className="flex flex-col items-center justify-center gap-4 p-8 rounded-2xl bg-bg-main border-2 border-border-color hover:border-[#10b981] hover:bg-[#10b981]/5 transition-all group active:scale-95"
            >
              <div className="w-20 h-20 rounded-full bg-[#10b981]/10 text-[#10b981] flex items-center justify-center group-hover:scale-110 transition-transform">
                <Package className="w-10 h-10" />
              </div>
              <div className="text-center">
                <h2 className="text-xl font-bold text-text-main mb-1">Preparación</h2>
                <p className="text-sm text-text-muted">Despachos y retiros</p>
              </div>
            </button>
          )}
        </div>

        <div className="flex justify-center border-t border-border-color pt-8">
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-6 py-3 rounded-lg text-red-500 font-medium hover:bg-red-50 transition-colors"
          >
            <LogOut className="w-5 h-5" />
            Cerrar Sesión
          </button>
        </div>
      </div>
    </div>
  );
}
