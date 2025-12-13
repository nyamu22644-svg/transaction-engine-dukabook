import React, { useEffect, useState } from 'react';
import { CheckCircle, AlertCircle, RefreshCw } from 'lucide-react';

export const IntaSendCallback: React.FC<{ onSuccess: () => void; onError: () => void }> = ({ onSuccess, onError }) => {
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing');
  const [message, setMessage] = useState('Processing your payment...');

  useEffect(() => {
    const processPayment = async () => {
      try {
        const urlParams = new URLSearchParams(window.location.search);
        const status_code = urlParams.get('status');
        const subscription_id = urlParams.get('subscription_id');

        // Store the payment confirmation
        if (subscription_id) {
          const pendingOrder = localStorage.getItem('intasend_pending_order');
          if (pendingOrder) {
            const order = JSON.parse(pendingOrder);
            const completedOrder = {
              ...order,
              subscription_id,
              status: status_code,
              completed_at: new Date().toISOString(),
            };
            localStorage.setItem('intasend_completed_order', JSON.stringify(completedOrder));

            // Update store tier
            const stores = JSON.parse(localStorage.getItem('dukabook_stores') || '[]');
            const storeIndex = stores.findIndex((s: any) => s.id === order.store_id);
            if (storeIndex >= 0) {
              // Get the plan from completed order
              stores[storeIndex].tier = 'PREMIUM'; // Or get from order
              localStorage.setItem('dukabook_stores', JSON.stringify(stores));
            }

            setStatus('success');
            setMessage('Payment successful! Your plan is now active.');
            setTimeout(() => onSuccess(), 2000);
            return;
          }
        }

        if (status_code === '0' || status_code === '200') {
          setStatus('success');
          setMessage('Payment successful! Your plan is now active.');
          setTimeout(() => onSuccess(), 2000);
        } else {
          setStatus('error');
          setMessage('Payment failed. Please try again.');
          setTimeout(() => onError(), 2000);
        }
      } catch (error) {
        console.error('Callback error:', error);
        setStatus('error');
        setMessage('Something went wrong. Please contact support.');
        setTimeout(() => onError(), 2000);
      }
    };

    processPayment();
  }, [onSuccess, onError]);

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-slate-900 rounded-2xl p-8 max-w-md text-center">
        {status === 'processing' && (
          <>
            <RefreshCw className="w-12 h-12 text-blue-500 animate-spin mx-auto mb-4" />
            <p className="text-white text-lg">{message}</p>
          </>
        )}
        {status === 'success' && (
          <>
            <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
            <p className="text-white text-lg font-bold">{message}</p>
          </>
        )}
        {status === 'error' && (
          <>
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <p className="text-white text-lg font-bold">{message}</p>
          </>
        )}
      </div>
    </div>
  );
};

export default IntaSendCallback;
