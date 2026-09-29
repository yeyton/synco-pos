import React, { useState, useEffect } from 'react';
import { Search, FileText, CheckCircle, Trash2, Calendar, ChevronDown, Check } from 'lucide-react';

interface DispatchSectionProps {
  onSetView: (view: any) => void;
}

export const DispatchSection: React.FC<DispatchSectionProps> = ({ onSetView }) => {
  const [pendingOrders, setPendingOrders] = useState<any[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    dispatch_type: '',
    dispatch_date: new Date().toISOString().split('T')[0],
    recipient_name: '',
    address: '',
    commune: '',
    city: '',
    region: '',
    document_number: '1',
    departure_date: new Date().toISOString().split('T')[0],
    departure_time: '',
    arrival_date: new Date().toISOString().split('T')[0],
    carrier_rut: '',
    driver_rut: '',
    driver_name: '',
    transport_plate: ''
  });

  const [showValidationModal, setShowValidationModal] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchPendingDispatches();
  }, []);

  const fetchPendingDispatches = async () => {
    setIsLoading(true);
    try {
      const storeId = '76123456-7890-4123-8123-123456789012';
      const res = await fetch(`/api/v1/dispatch/pending?store_id=${storeId}`);
      const data = await res.json();
      if (data.success) {
        setPendingOrders(data.pending);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectOrder = (order: any) => {
    setSelectedOrder(order);
    setFormData(prev => ({
      ...prev,
      recipient_name: order.customer_name || 'Cliente sin nombre',
    }));
  };

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleDispatch = async () => {
    const errors: string[] = [];
    if (!formData.dispatch_type) errors.push('Debe seleccionar el tipo de despacho');
    if (!formData.address) errors.push('La Dirección de Despacho no ha sido ingresada');
    if (!formData.commune) errors.push('La Comuna de Despacho no ha sido ingresada');
    if (!formData.city) errors.push('La Ciudad de Despacho no ha sido ingresada');
    
    if (errors.length > 0) {
      errors.push('No se han ingresado todos los datos requeridos');
      setValidationErrors(errors);
      setShowValidationModal(true);
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/v1/dispatch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          order_id: selectedOrder.id,
          total_amount: selectedOrder.total_amount,
          ...formData
        })
      });

      if (res.ok) {
        // Exito, volver a la lista
        setSelectedOrder(null);
        fetchPendingDispatches();
      } else {
        console.error('Error dispatching');
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredOrders = pendingOrders.filter(o => 
    (o.order_number || '').toLowerCase().includes(search.toLowerCase()) ||
    (o.customer_name || '').toLowerCase().includes(search.toLowerCase()) ||
    (o.folio?.toString() || '').includes(search)
  );

  return (
    <div className="flex flex-col xl:flex-row w-full h-[calc(100vh-64px)] bg-bg-main overflow-hidden text-sm">
      
      {/* LEFT PANEL */}
      <div className="w-full xl:w-1/2 h-1/2 xl:h-full flex flex-col border-b xl:border-b-0 xl:border-r border-border-color bg-white relative">
        <div className="p-4 border-b border-border-color flex justify-between items-center text-color-brand text-xs font-semibold">
          <span>despacho: casa matriz / josue t. <ChevronDown className="inline w-4 h-4" /></span>
        </div>

        {selectedOrder ? (
          <div className="flex-1 flex flex-col">
            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
              {selectedOrder.items?.map((item: any, idx: number) => (
                <div key={idx} className="flex items-center gap-4 py-4 border-b border-border-color border-dashed">
                  <div className="flex flex-col items-center gap-1 w-16">
                    <span className="text-xl text-[#0ea5e9] cursor-pointer">+</span>
                    <span className="text-lg font-semibold">{item.quantity}</span>
                    <span className="text-xl text-[#0ea5e9] cursor-pointer">-</span>
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-text-main">{item.product_name}</h3>
                    <div className="text-text-muted mt-1">$ {parseFloat(item.unit_gross_price).toLocaleString('es-CL', {minimumFractionDigits:2})}</div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <span className="text-text-muted">0 % desc.</span>
                    <span className="font-bold text-text-main">$ {(item.quantity * item.unit_gross_price).toLocaleString('es-CL')}</span>
                  </div>
                  <button className="text-text-muted hover:text-red-500 ml-4">
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              ))}
            </div>

            {/* Left Panel Footer */}
            <div className="border-t border-border-color p-4 bg-bg-main flex flex-col gap-4">
              <div className="flex justify-between items-end">
                <div className="text-xs text-text-muted">
                  Nr. Líneas: {selectedOrder.items?.length || 0} / Tot. Ítems: {selectedOrder.items?.reduce((acc:any, i:any) => acc + i.quantity, 0) || 0}
                </div>
                <div className="flex flex-col gap-1 items-end">
                  <div className="flex justify-between w-48 text-xs font-semibold">
                    <span>Neto</span>
                    <span>$ {(selectedOrder.total_amount / 1.19).toLocaleString('es-CL', {maximumFractionDigits:0})}</span>
                  </div>
                  <div className="flex justify-between w-48 text-xs font-semibold">
                    <span>Impuesto</span>
                    <span>$ {(selectedOrder.total_amount - (selectedOrder.total_amount / 1.19)).toLocaleString('es-CL', {maximumFractionDigits:0})}</span>
                  </div>
                  <div className="flex items-center gap-4 mt-2">
                    <span className="font-bold text-gray-500">Total</span>
                    <div className="border border-gray-400 rounded px-4 py-2 w-32 text-right font-bold text-lg">
                      $ {parseFloat(selectedOrder.total_amount).toLocaleString('es-CL')}
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-between items-center pt-2">
                <button 
                  onClick={() => setSelectedOrder(null)}
                  className="px-6 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold rounded"
                >
                  cancelar ×
                </button>
                
                <div className="flex items-center gap-4">
                  <select className="border border-gray-300 rounded px-3 py-2 bg-white w-64 text-xs">
                    <option>guía de despacho manual (no valid...</option>
                  </select>
                  <button 
                    onClick={handleDispatch}
                    disabled={isSubmitting}
                    className="px-6 py-2 bg-[#2cb2e6] hover:bg-[#1a9fd1] text-white font-bold rounded flex items-center gap-2"
                  >
                    DESPACHAR ✓
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center text-text-muted">
            Selecciona un documento de la lista para despachar
          </div>
        )}
      </div>

      {/* RIGHT PANEL */}
      <div className="w-full xl:w-1/2 h-1/2 xl:h-full flex flex-col bg-white overflow-y-auto custom-scrollbar">
        {!selectedOrder ? (
          <div className="p-8">
            <div className="flex items-center gap-2 mb-8 text-[#0ea5e9]">
              <FileText className="w-6 h-6" />
              <h2 className="text-xl font-light text-text-main">Documentos Disponibles</h2>
            </div>
            
            <div className="relative mb-6">
              <input 
                type="text" 
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar"
                className="w-full bg-transparent border-b border-border-color border-dashed pb-2 text-text-main focus:outline-none focus:border-[#0ea5e9] placeholder-text-muted"
              />
              <Search className="absolute right-2 top-0 w-5 h-5 text-[#0ea5e9]" />
            </div>

            <div className="flex flex-col gap-4">
              {isLoading ? (
                <div className="text-center text-text-muted">Cargando documentos...</div>
              ) : filteredOrders.length === 0 ? (
                <div className="text-center text-text-muted">No hay documentos pendientes de despacho.</div>
              ) : (
                filteredOrders.map(order => (
                  <div key={order.id} className="flex justify-between items-center py-4 border-b border-border-color hover:bg-gray-50 cursor-pointer" onClick={() => handleSelectOrder(order)}>
                    <div className="flex flex-col">
                      <span className="text-gray-600 text-xs">
                        {order.dte_type === '39' ? 'BOLETA' : 'FACTURA'} {order.folio ? `Nº ${order.folio}` : `(Orden ${order.order_number})`}
                      </span>
                      <span className="text-gray-400 text-xs mt-1 italic">
                        $ {parseFloat(order.total_amount).toLocaleString('es-CL')} / {new Date(order.created_at).toLocaleDateString('es-CL')} / {order.customer_name || 'Sin nombre'}
                      </span>
                    </div>
                    <CheckCircle className="w-6 h-6 text-[#0ea5e9]" />
                  </div>
                ))
              )}
            </div>
          </div>
        ) : (
          <div className="p-8">
            <div className="flex items-center gap-2 mb-8 text-[#0ea5e9]">
              <FileText className="w-6 h-6" />
              <h2 className="text-xl font-light text-text-main">Despacho</h2>
            </div>

            <div className="flex flex-col gap-6 w-full max-w-md mx-auto">
              
              <div className="flex justify-between items-center border-b border-gray-200 border-dashed pb-2">
                <label className="text-gray-600 w-1/3">Fecha Despacho</label>
                <div className="relative w-2/3">
                  <input type="date" value={formData.dispatch_date} onChange={e => handleChange('dispatch_date', e.target.value)} className="w-full focus:outline-none text-right pr-6" />
                  <Calendar className="w-4 h-4 text-gray-400 absolute right-0 top-1 pointer-events-none" />
                </div>
              </div>

              <div className="flex justify-between items-center border-b border-gray-200 border-dashed pb-2">
                <label className="text-gray-600 w-1/3">Tipo de Despacho</label>
                <select value={formData.dispatch_type} onChange={e => handleChange('dispatch_type', e.target.value)} className="w-2/3 border border-gray-300 rounded px-2 py-1 focus:outline-none">
                  <option value="">tipo de despacho</option>
                  <option value="Operación constituye venta">Operación constituye venta</option>
                  <option value="Ventas por efectuar">Ventas por efectuar</option>
                  <option value="Consignaciones">Consignaciones</option>
                  <option value="Entrega gratuita">Entrega gratuita</option>
                </select>
              </div>

              <div className="flex justify-between items-center border-b border-gray-200 border-dashed pb-2">
                <label className="text-gray-600 w-1/3">Destinatario Despacho</label>
                <input type="text" value={formData.recipient_name} onChange={e => handleChange('recipient_name', e.target.value)} className="w-2/3 focus:outline-none" />
              </div>

              {/* Obligatorio: Border solido azul */}
              <div className="flex justify-between items-center pb-2 relative">
                <label className="text-gray-600 w-1/3">Dirección Despacho</label>
                <input type="text" value={formData.address} onChange={e => handleChange('address', e.target.value)} className="w-2/3 border border-[#0ea5e9] rounded px-2 py-1 focus:outline-none" />
              </div>

              {/* Obligatorio vacio: Border dashed azul */}
              <div className="flex justify-between items-center pb-2 relative">
                <label className="text-gray-600 w-1/3">Comuna Despacho</label>
                <input type="text" value={formData.commune} onChange={e => handleChange('commune', e.target.value)} className={`w-2/3 focus:outline-none ${!formData.commune ? 'border-b-2 border-dashed border-[#0ea5e9]' : 'border-b border-dashed border-gray-200'}`} />
              </div>

              <div className="flex justify-between items-center pb-2 relative">
                <label className="text-gray-600 w-1/3">Ciudad Despacho</label>
                <input type="text" value={formData.city} onChange={e => handleChange('city', e.target.value)} className={`w-2/3 focus:outline-none ${!formData.city ? 'border-b-2 border-dashed border-[#0ea5e9]' : 'border-b border-dashed border-gray-200'}`} />
              </div>

              <div className="flex justify-between items-center border-b border-gray-200 border-dashed pb-2">
                <label className="text-gray-600 w-1/3">Región Despacho</label>
                <input type="text" value={formData.region} onChange={e => handleChange('region', e.target.value)} className="w-2/3 focus:outline-none" />
              </div>

              <div className="flex justify-between items-center border-b border-gray-200 border-dashed pb-2">
                <label className="text-gray-600 w-1/3">Núm. Documento</label>
                <input type="text" value={formData.document_number} onChange={e => handleChange('document_number', e.target.value)} className="w-2/3 focus:outline-none text-right" />
              </div>

              <div className="flex justify-between items-center border-b border-gray-200 border-dashed pb-2">
                <label className="text-gray-600 w-1/3">Fecha de Salida</label>
                <div className="relative w-2/3">
                  <input type="date" value={formData.departure_date} onChange={e => handleChange('departure_date', e.target.value)} className="w-full focus:outline-none text-right pr-6" />
                  <Calendar className="w-4 h-4 text-gray-400 absolute right-0 top-1 pointer-events-none" />
                </div>
              </div>

              <div className="flex justify-between items-center pb-2 relative">
                <label className="text-gray-600 w-1/3">Hora de Salida</label>
                <input type="time" value={formData.departure_time} onChange={e => handleChange('departure_time', e.target.value)} className={`w-2/3 focus:outline-none ${!formData.departure_time ? 'border-b-2 border-dashed border-[#0ea5e9]' : 'border-b border-dashed border-gray-200'}`} />
              </div>

              <div className="flex justify-between items-center border-b border-gray-200 border-dashed pb-2">
                <label className="text-gray-600 w-1/3">Fecha de Llegada</label>
                <div className="relative w-2/3">
                  <input type="date" value={formData.arrival_date} onChange={e => handleChange('arrival_date', e.target.value)} className="w-full focus:outline-none text-right pr-6" />
                  <Calendar className="w-4 h-4 text-gray-400 absolute right-0 top-1 pointer-events-none" />
                </div>
              </div>

              <div className="flex justify-between items-center pb-2 relative">
                <label className="text-gray-600 w-1/3">RUT Transportista</label>
                <input type="text" value={formData.carrier_rut} onChange={e => handleChange('carrier_rut', e.target.value)} className={`w-2/3 focus:outline-none ${!formData.carrier_rut ? 'border-b-2 border-dashed border-[#0ea5e9]' : 'border-b border-dashed border-gray-200'}`} />
              </div>

              <div className="flex justify-between items-center border-b border-gray-200 border-dashed pb-2">
                <label className="text-gray-600 w-1/3">RUT Chofer</label>
                <input type="text" value={formData.driver_rut} onChange={e => handleChange('driver_rut', e.target.value)} className="w-2/3 focus:outline-none" />
              </div>
              
              <div className="flex justify-between items-center border-b border-gray-200 border-dashed pb-2">
                <label className="text-gray-600 w-1/3">Nombre Chofer</label>
                <input type="text" value={formData.driver_name} onChange={e => handleChange('driver_name', e.target.value)} className="w-2/3 focus:outline-none" />
              </div>

              <div className="flex justify-between items-center pb-6">
                <label className="text-gray-600 w-1/3">Patente Transporte</label>
                <input type="text" value={formData.transport_plate} onChange={e => handleChange('transport_plate', e.target.value)} className="w-2/3 focus:outline-none" />
              </div>

              <div className="flex justify-between items-center pt-4 mb-4">
                <span className="text-gray-600">Total Despacho</span>
                <span className="text-gray-600 font-semibold">$ {parseFloat(selectedOrder.total_amount).toLocaleString('es-CL')}</span>
              </div>

              <div className="flex justify-end">
                <button 
                  onClick={handleDispatch}
                  className="px-6 py-3 bg-[#2cb2e6] hover:bg-[#1a9fd1] text-white font-bold rounded flex items-center gap-2"
                >
                  CONFIRMAR DESPACHO ✓
                </button>
              </div>

            </div>
          </div>
        )}
      </div>

      {/* Validation Modal */}
      {showValidationModal && (
        <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center animate-in fade-in">
          <div className="bg-white rounded-lg shadow-xl w-[500px] overflow-hidden flex flex-col">
            <div className="bg-gray-600 text-white font-bold text-center py-3">
              Lo siguiente no permite confirmar el Despacho:
            </div>
            <div className="p-6 text-gray-700 bg-white">
              {validationErrors.map((err, idx) => (
                <div key={idx} className="mb-1">{err}</div>
              ))}
            </div>
            <div className="flex justify-center p-4">
              <button 
                onClick={() => setShowValidationModal(false)}
                className="bg-[#2cb2e6] hover:bg-[#1a9fd1] text-white px-8 py-2 rounded font-bold flex items-center gap-2"
              >
                SOLUCIONAR <Check className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
