import React, { useEffect } from 'react';
import { CheckCircle, AlertCircle, RefreshCw } from 'lucide-react';

/**
 * IntaSend Callback Page
 * This page handles the redirect from IntaSend after payment
 * Place this in your main routes/pages
 */

interface CallbackPageProps {
  onPaymentComplete?: (status: 'success' | 'failed') => void;
}

export const CallbackPage: React.FC<CallbackPageProps> = ({ onPaymentComplete }) => {
  const [status, setStatus] = React.useState<'processing' | 'success' | 'error'>('processing');
  const [message, setMessage] = React.useState('Processing your payment...');

  useEffect(() => {
    const processPayment = async () => {
      try {
        const urlParams = new URLSearchParams(window.location.search);
        
        // IntaSend sends these parameters
        const status_code = urlParams.get('status');
        const subscription_id = urlParams.get('subscription_id');
        const reference = urlParams.get('reference');
        const state = urlParams.get('state');

        console.log('Callback params:', { status_code, subscription_id, reference, state });

        // Payment success check
        if (status_code === '0' || status_code === 'success' || reference) {
          // Get pending order from localStorage
          const pendingOrder = localStorage.getItem('intasend_pending_order');
          if (pendingOrder) {
            const order = JSON.parse(pendingOrder);
            const completedOrder = {
              ...order,
              subscription_id: subscription_id || reference,
              status: status_code,
              completed_at: new Date().toISOString(),
            };
            localStorage.setItem('intasend_completed_order', JSON.stringify(completedOrder));

            // Update store tier in localStorage
            const stores = JSON.parse(localStorage.getItem('dukabook_stores') || '[]');
            const storeIndex = stores.findIndex((s: any) => s.id === order.store_id);
            if (storeIndex >= 0) {
              stores[storeIndex].tier = 'PREMIUM';
              localStorage.setItem('dukabook_stores', JSON.stringify(stores));
            }

            setStatus('success');
            setMessage('Payment successful! Your plan is now active.');
            onPaymentComplete?.('success');
            
            // Redirect after 2 seconds
            setTimeout(() => {
              window.location.href = '/';
            }, 2000);
          } else {
            throw new Error('No pending order found');
          }
        } else {
          setStatus('error');
          setMessage('Payment failed or was cancelled.');
          onPaymentComplete?.('failed');
          
          setTimeout(() => {
            window.location.href = '/';
          }, 2000);
        }
      } catch (error) {
        console.error('Callback error:', error);
        setStatus('error');
        setMessage('Something went wrong processing your payment.');
        onPaymentComplete?.('failed');
        
        setTimeout(() => {
          window.location.href = '/';
        }, 2000);
      }
    };

    processPayment();
  }, [onPaymentComplete]);

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
            <p className="text-slate-400 text-sm mt-4">Redirecting...</p>
          </>
        )}
        {status === 'error' && (
          <>
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <p className="text-white text-lg font-bold">{message}</p>
            <p className="text-slate-400 text-sm mt-4">Redirecting to home...</p>
          </>
        )}
      </div>
    </div>
  );
};

export default CallbackPage;
