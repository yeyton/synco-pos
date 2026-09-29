import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Truck, PackageSearch, ArrowLeft, RefreshCw, Package } from 'lucide-react';
import { FulfillmentList } from './components/FulfillmentList';
import { FulfillmentDetail } from './components/FulfillmentDetail';
import type { Fulfillment, FulfillmentType, FulfillmentStatus } from '../../types/fulfillment';

export function FulfillmentView() {
  const { token } = useAuth();
  const navigate = useNavigate();
  
  const [fulfillments, setFulfillments] = useState<Fulfillment[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // Filtros
  const [activeType, setActiveType] = useState<FulfillmentType>('DISPATCH');
  const [activeStatus, setActiveStatus] = useState<FulfillmentStatus | 'ALL'>('ALL');

  const fetchFulfillments = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/v1/fulfillment`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setFulfillments(data.items);
      }
    } catch (error) {
      console.error('Error fetching fulfillments:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchFulfillments();
    const interval = setInterval(fetchFulfillments, 30000);
    return () => clearInterval(interval);
  }, [token]);

  // Si cambia el tipo principal, resetear estado secundario a 'ALL' y desechar selección
  useEffect(() => {
    setActiveStatus('ALL');
    setSelectedId(null);
  }, [activeType]);

  const selectedFulfillment = useMemo(() => 
    fulfillments.find(f => f.id === selectedId) || null,
  [fulfillments, selectedId]);

  // Filtro de estado dinámico
  const statusFilters = useMemo(() => {
    if (activeType === 'PICKUP') {
      return [
        { id: 'ALL', label: 'Todos' },
        { id: 'PENDING', label: 'Pendientes' },
        { id: 'PREPARING', label: 'Preparando' },
        { id: 'PREPARED', label: 'Listos' }
      ];
    } else {
      return [
        { id: 'ALL', label: 'Todos' },
        { id: 'PENDING', label: 'Pendientes' },
        { id: 'PREPARING', label: 'Preparando' },
        { id: 'PREPARED', label: 'Listos' },
        { id: 'IN_TRANSIT', label: 'En Ruta' }
      ];
    }
  }, [activeType]);

  const filteredFulfillments = useMemo(() => {
    return fulfillments.filter(f => {
      const matchType = f.fulfillment_type === activeType;
      const matchStatus = activeStatus === 'ALL' || f.status === activeStatus;
      // Filter out DELIVERED and PICKED_UP from the main active view unless specifically queried later
      const isNotArchived = f.status !== 'DELIVERED' && f.status !== 'PICKED_UP' && f.status !== 'CANCELED' && f.status !== 'FAILED';
      
      return matchType && matchStatus && isNotArchived;
    });
  }, [fulfillments, activeType, activeStatus]);

  return (
    <div className="flex h-screen bg-bg-main overflow-hidden text-text-main font-sans">
      
      {/* Panel Izquierdo: Filtros y Lista */}
      <div className={`w-full md:w-1/3 lg:w-1/3 flex flex-col bg-bg-panel border-r border-border-color shadow-xl md:shadow-none z-10 ${selectedId ? 'hidden md:flex' : 'flex'}`}>
        
        {/* Header superior */}
        <div className="p-4 border-b border-border-color flex items-center justify-between bg-bg-panel">
          <button 
            onClick={() => navigate('/hub')}
            className="flex items-center gap-2 text-text-muted hover:text-text-main transition-colors text-sm font-bold px-3 py-2 rounded-lg hover:bg-input-bg"
          >
            <ArrowLeft className="w-5 h-5" />
            Volver al Hub
          </button>
          <button 
            onClick={fetchFulfillments}
            className={`p-3 rounded-xl hover:bg-input-bg text-text-muted transition-all border border-border-color shadow-sm ${isLoading ? 'animate-spin text-color-brand border-color-brand' : ''}`}
          >
            <RefreshCw className="w-5 h-5" />
          </button>
        </div>

        {/* Zona de Filtros */}
        <div className="p-4 border-b border-border-color bg-input-bg/50">
          
          {/* Nivel 1: Retiro vs Despacho */}
          <div className="flex gap-3 mb-4">
            <button
              onClick={() => setActiveType('PICKUP')}
              className={`flex-1 flex flex-col items-center justify-center py-4 px-2 rounded-2xl border-2 font-bold transition-all ${
                activeType === 'PICKUP' 
                  ? 'border-purple-600 bg-purple-50 dark:bg-purple-900/20 text-purple-800 dark:text-purple-300 shadow-md scale-105'
                  : 'border-border-color bg-bg-panel text-text-muted hover:border-text-muted opacity-80 hover:opacity-100'
              }`}
            >
              <Package className="w-6 h-6 mb-1" />
              RETIROS
            </button>
            <button
              onClick={() => setActiveType('DISPATCH')}
              className={`flex-1 flex flex-col items-center justify-center py-4 px-2 rounded-2xl border-2 font-bold transition-all ${
                activeType === 'DISPATCH' 
                  ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20 text-blue-800 dark:text-blue-300 shadow-md scale-105'
                  : 'border-border-color bg-bg-panel text-text-muted hover:border-text-muted opacity-80 hover:opacity-100'
              }`}
            >
              <Truck className="w-6 h-6 mb-1" />
              DESPACHOS
            </button>
          </div>

          {/* Nivel 2: Estados adaptativos */}
          <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-2">
            {statusFilters.map(status => {
              const isActive = activeStatus === status.id;
              // Contar cuántos hay en este estado general (sin filtro de estado, pero sí de tipo)
              const count = status.id === 'ALL' 
                ? fulfillments.filter(f => f.fulfillment_type === activeType && f.status !== 'DELIVERED' && f.status !== 'PICKED_UP').length
                : fulfillments.filter(f => f.fulfillment_type === activeType && f.status === status.id).length;

              return (
                <button
                  key={status.id}
                  onClick={() => setActiveStatus(status.id as any)}
                  className={`flex items-center gap-2 px-4 py-2 text-sm font-bold rounded-xl transition-all whitespace-nowrap border-2 ${
                    isActive 
                      ? 'bg-text-main text-bg-main border-text-main shadow-md' 
                      : 'bg-bg-panel text-text-muted border-border-color hover:border-text-muted'
                  }`}
                >
                  {status.label}
                  <span className={`px-2 py-0.5 rounded-full text-xs ${isActive ? 'bg-bg-main text-text-main' : 'bg-input-bg text-text-muted'}`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

        </div>

        {/* Lista de Pedidos */}
        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3 bg-input-bg/30">
          {isLoading && filteredFulfillments.length === 0 ? (
            <div className="flex justify-center p-8 text-text-muted"><RefreshCw className="w-8 h-8 animate-spin" /></div>
          ) : filteredFulfillments.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-text-muted opacity-60 p-6 text-center">
              <PackageSearch className="w-16 h-16 mb-4" />
              <p className="text-lg font-bold">No hay {activeType === 'DISPATCH' ? 'despachos' : 'retiros'} en este estado.</p>
            </div>
          ) : (
            <FulfillmentList 
              items={filteredFulfillments} 
              selectedId={selectedId}
              onSelect={setSelectedId}
            />
          )}
        </div>

      </div>

      {/* Panel Derecho: Detalle del Pedido */}
      <div className={`flex-1 flex-col bg-bg-main relative ${!selectedId ? 'hidden md:flex' : 'flex w-full md:w-2/3 lg:w-2/3'}`}>
        {!selectedId ? (
          <div className="flex-1 flex flex-col items-center justify-center text-text-muted opacity-40 p-8 text-center">
            <PackageSearch className="w-32 h-32 mb-6" />
            <h2 className="text-3xl font-black mb-2">Ningún pedido seleccionado</h2>
            <p className="text-lg">Selecciona un {activeType === 'DISPATCH' ? 'despacho' : 'retiro'} de la lista para gestionar su preparación.</p>
          </div>
        ) : (
          <FulfillmentDetail 
            fulfillment={selectedFulfillment!}
            onBack={() => setSelectedId(null)}
            onUpdated={() => fetchFulfillments()}
          />
        )}
      </div>

    </div>
  );
}
