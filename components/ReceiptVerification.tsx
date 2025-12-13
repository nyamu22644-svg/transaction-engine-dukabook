import React, { useEffect, useState } from 'react';
import { CheckCircle2, XCircle, MapPin, Calendar, User, Box, ShieldCheck, Loader2 } from 'lucide-react';
import { getSaleById } from '../services/supabaseService';
import { SalesRecord } from '../types';

interface ReceiptVerificationProps {
  saleId: string;
}

export const ReceiptVerification: React.FC<ReceiptVerificationProps> = ({ saleId }) => {
  const [sale, setSale] = useState<SalesRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    getSaleById(saleId)
      .then((data) => {
        if (data) setSale(data);
        else setError(true);
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [saleId]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <Loader2 className="w-10 h-10 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-slate-500 font-medium">Verifying Transaction...</p>
        </div>
      </div>
    );
  }

  if (error || !sale) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-red-50 p-6">
        <div className="bg-white p-8 rounded-2xl shadow-xl max-w-sm w-full text-center border-t-4 border-red-500">
          <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-slate-900 mb-2">Invalid Receipt</h2>
          <p className="text-slate-500">
            This transaction record could not be found. It may have been deleted or the link is incorrect.
          </p>
          <a href="/" className="mt-6 inline-block text-blue-600 font-medium hover:underline">
            Go to Home
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 py-8 px-4">
      <div className="max-w-md mx-auto bg-white rounded-2xl shadow-xl overflow-hidden">
        
        {/* Trusted Header */}
        <div className="bg-emerald-600 p-6 text-center text-white relative overflow-hidden">
          <div className="relative z-10">
            <ShieldCheck className="w-12 h-12 mx-auto mb-2 opacity-90" />
            <h1 className="text-2xl font-bold tracking-tight">Verified Genuine</h1>
            <p className="text-emerald-100 text-sm mt-1">DukaBook Digital Verification</p>
          </div>
          <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-emerald-500 to-transparent opacity-50"></div>
        </div>

        <div className="p-6 space-y-6">
          
          <div className="text-center pb-6 border-b border-dashed border-slate-200">
            <p className="text-slate-400 text-xs uppercase tracking-wider mb-1">Total Paid</p>
            <p className="text-3xl font-bold text-slate-900">KES {sale.total_amount.toLocaleString()}</p>
            <div className="inline-flex items-center gap-1 mt-2 px-3 py-1 bg-slate-100 rounded-full text-xs font-medium text-slate-600">
              <span className={`w-2 h-2 rounded-full ${sale.payment_mode === 'MPESA' ? 'bg-green-500' : 'bg-slate-500'}`}></span>
              {sale.payment_mode} {sale.mpesa_ref ? `• ${sale.mpesa_ref}` : ''}
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <Box className="w-5 h-5 text-blue-500 mt-0.5" />
              <div>
                <p className="text-xs text-slate-400 uppercase font-bold">Item Purchased</p>
                <p className="text-slate-900 font-medium">{sale.item_name}</p>
                <p className="text-sm text-slate-500">Qty: {sale.quantity}</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <User className="w-5 h-5 text-blue-500 mt-0.5" />
              <div>
                <p className="text-xs text-slate-400 uppercase font-bold">Served By</p>
                <p className="text-slate-900 font-medium">{sale.collected_by}</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Calendar className="w-5 h-5 text-blue-500 mt-0.5" />
              <div>
                <p className="text-xs text-slate-400 uppercase font-bold">Date & Time</p>
                <p className="text-slate-900 font-medium">
                  {sale.created_at ? new Date(sale.created_at).toLocaleString() : 'N/A'}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <MapPin className="w-5 h-5 text-blue-500 mt-0.5" />
              <div>
                <p className="text-xs text-slate-400 uppercase font-bold">Location Verified</p>
                <a 
                  href={`https://www.google.com/maps/search/?api=1&query=${sale.gps_latitude},${sale.gps_longitude}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 text-sm hover:underline"
                >
                  View on Map (±{Math.round(sale.gps_accuracy)}m)
                </a>
              </div>
            </div>
          </div>

          <div className="pt-6 border-t border-slate-100">
            <p className="text-xs text-center text-slate-400">
              Transaction ID: <span className="font-mono">{sale.id}</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};