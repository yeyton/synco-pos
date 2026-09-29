import React, { useState, useEffect } from 'react';
import type { Fulfillment, FulfillmentItem } from '../../../types/fulfillment';
import { useAuth } from '../../../context/AuthContext';

import { FulfillmentDetailView } from '../views/FulfillmentDetailView';
import { FulfillmentPreparationView } from '../views/FulfillmentPreparationView';
import { FulfillmentRouteView } from '../views/FulfillmentRouteView';
import { FulfillmentDeliveryView } from '../views/FulfillmentDeliveryView';

interface Props {
  fulfillment: Fulfillment;
  onBack: () => void;
  onUpdated: () => void;
}

export const FulfillmentDetail: React.FC<Props> = ({ fulfillment, onBack, onUpdated }) => {
  const { token } = useAuth();
  const [items, setItems] = useState<FulfillmentItem[]>(fulfillment.items || []);
  const [isLoading, setIsLoading] = useState(false);
  
  const [fulData, setFulData] = useState<Fulfillment>(fulfillment);
  
  // Local state to track "Arrived" for IN_TRANSIT
  const [isArrived, setIsArrived] = useState(false);
  // Local state to track pickup delivery mode
  const [isDeliveringPickup, setIsDeliveringPickup] = useState(false);

  // Reset local states when fulfillment changes
  useEffect(() => {
    setIsArrived(false);
    setIsDeliveringPickup(false);
    setFulData(fulfillment);
    fetchDetail();
  }, [fulfillment.id]);

  const fetchDetail = async () => {
    try {
      const res = await fetch(`/api/v1/fulfillment/${fulfillment.id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success && data.fulfillment) {
        setFulData(data.fulfillment);
        if (data.fulfillment.items) {
          setItems(data.fulfillment.items);
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  const action = async (url: string, method: string = 'POST', body?: any) => {
    setIsLoading(true);
    try {
      const headers: any = { 'Authorization': `Bearer ${token}` };
      if (body !== undefined) {
        headers['Content-Type'] = 'application/json';
      }

      const res = await fetch(`/api/v1/fulfillment/${fulfillment.id}${url}`, {
        method,
        headers,
        body: body !== undefined ? JSON.stringify(body) : undefined
      });
      if (res.ok) {
        onUpdated();
      } else {
        alert('Error en la acción');
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAction = (actionName: string, payload?: any) => {
    switch (actionName) {
      case 'start-preparing':
        action('/start-preparing');
        break;
      case 'confirm-prepared':
        action('/confirm-prepared');
        break;
      case 'dispatch':
        action('/dispatch');
        break;
      case 'arrived':
        setIsArrived(true);
        break;
      case 'deliver-mode':
        setIsDeliveringPickup(true);
        break;
      case 'deliver':
        action('/deliver', 'POST', payload);
        break;
      case 'issue':
        action('/issues', 'POST', payload);
        break;
    }
  };

  // Controller Logic
  if (fulData.status === 'PREPARING') {
    return (
      <FulfillmentPreparationView 
        fulfillment={fulData} 
        items={items} 
        onBack={onBack} 
        onAction={handleAction}
        onItemUpdated={fetchDetail}
        isLoading={isLoading} 
      />
    );
  }

  if (fulData.status === 'IN_TRANSIT') {
    if (isArrived) {
      return (
        <FulfillmentDeliveryView 
          fulfillment={fulData} 
          items={items}
          onItemUpdated={fetchDetail}
          onBack={() => setIsArrived(false)} 
          onAction={handleAction} 
          isLoading={isLoading} 
        />
      );
    }
    return (
      <FulfillmentRouteView 
        fulfillment={fulData} 
        onBack={onBack} 
        onAction={handleAction} 
        isLoading={isLoading} 
      />
    );
  }

  if (fulData.status === 'PREPARED' && fulData.fulfillment_type === 'PICKUP' && isDeliveringPickup) {
    return (
      <FulfillmentDeliveryView 
        fulfillment={fulData} 
        items={items}
        onItemUpdated={fetchDetail}
        onBack={() => setIsDeliveringPickup(false)} 
        onAction={handleAction} 
        isLoading={isLoading} 
      />
    );
  }

  return (
    <FulfillmentDetailView 
      fulfillment={fulData} 
      items={items}
      onBack={onBack} 
      onAction={handleAction} 
      isLoading={isLoading} 
    />
  );
};
