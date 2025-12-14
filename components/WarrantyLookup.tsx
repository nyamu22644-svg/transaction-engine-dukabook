import React, { useState } from 'react';
import { X, Search, CheckCircle2, AlertTriangle, AlertCircle, Calendar } from 'lucide-react';
import { lookupWarrantyBySerial, WarrantyStatus } from '../services/warrantyService';
import { StoreProfile } from '../types';

interface WarrantyLookupProps {
  store: StoreProfile;
  onClose: () => void;
}

export const WarrantyLookup: React.FC<WarrantyLookupProps> = ({ store, onClose }) => {
  const [serialNumber, setSerialNumber] = useState('');
  const [searching, setSearching] = useState(false);
  const [result, setResult] = useState<WarrantyStatus | null>(null);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!serialNumber.trim()) return;

    setSearching(true);
    const warrantyStatus = await lookupWarrantyBySerial(store.id, serialNumber);
    setResult(warrantyStatus);
    setSearching(false);
  };

  const getStatusColor = () => {
    if (!result?.found) return 'bg-red-500/20 border-red-500/30 text-red-400';
    if (result.isExpired) return 'bg-red-500/20 border-red-500/30 text-red-400';
    if (result.daysLeft! <= 3) return 'bg-amber-500/20 border-amber-500/30 text-amber-400';
    return 'bg-green-500/20 border-green-500/30 text-green-400';
  };

  const getStatusIcon = () => {
    if (!result?.found) return <AlertCircle className="w-6 h-6" />;
    if (result.isExpired) return <AlertTriangle className="w-6 h-6" />;
    if (result.daysLeft! <= 3) return <AlertTriangle className="w-6 h-6" />;
    return <CheckCircle2 className="w-6 h-6" />;
  };

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 rounded-2xl max-w-md w-full p-6 border border-slate-800">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <Search className="w-6 h-6 text-blue-500" />
            Warranty Lookup
          </h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-400"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Search Form */}
        <form onSubmit={handleSearch} className="space-y-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              IMEI / Serial Number
            </label>
            <input
              type="text"
              value={serialNumber}
              onChange={(e) => setSerialNumber(e.target.value.toUpperCase())}
              placeholder="Enter IMEI, Serial, or MAC Address"
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
              autoFocus
            />
          </div>
          <button
            type="submit"
            disabled={searching || !serialNumber.trim()}
            className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 disabled:cursor-not-allowed text-white font-bold py-3 rounded-lg transition flex items-center justify-center gap-2"
          >
            <Search className="w-4 h-4" />
            {searching ? 'Searching...' : 'Check Warranty'}
          </button>
        </form>

        {/* Search Result */}
        {result && (
          <div className={`border rounded-xl p-4 ${getStatusColor()}`}>
            <div className="flex items-start gap-3">
              <div className="mt-1">{getStatusIcon()}</div>
              <div className="flex-1">
                <p className="font-bold text-base mb-3">{result.message}</p>

                {result.found && result.item && (
                  <div className="space-y-2 text-sm">
                    <div className="bg-black/30 rounded p-3 space-y-2">
                      <div className="flex justify-between">
                        <span className="opacity-75">Item:</span>
                        <span className="font-semibold">{result.item.item_name}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="opacity-75">Serial:</span>
                        <span className="font-mono">{result.item.serial_number}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="opacity-75">Sold:</span>
                        <span>{result.saleDate?.toLocaleDateString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="opacity-75">Warranty:</span>
                        <span>{result.item.warranty_days} days</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="opacity-75">Expires:</span>
                        <span>{new Date(result.item.warranty_expiry_date).toLocaleDateString()}</span>
                      </div>

                      {result.item.seal_broken && (
                        <div className="border-t border-current pt-2 mt-2 flex items-center gap-2">
                          <AlertTriangle className="w-4 h-4" />
                          <span className="font-bold">WARRANTY VOID - Seal Broken</span>
                        </div>
                      )}

                      {result.item.customer_name && (
                        <div className="border-t border-current pt-2 mt-2">
                          <p className="text-xs opacity-75">Customer: {result.item.customer_name}</p>
                          {result.item.customer_phone && (
                            <p className="text-xs opacity-75">Phone: {result.item.customer_phone}</p>
                          )}
                        </div>
                      )}

                      {result.item.notes && (
                        <div className="border-t border-current pt-2 mt-2">
                          <p className="text-xs opacity-75">Notes: {result.item.notes}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Initial State */}
        {!result && (
          <div className="bg-slate-800/50 rounded-lg p-4 text-center text-slate-400 text-sm">
            <Search className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>Enter a serial number to check warranty status</p>
          </div>
        )}
      </div>
    </div>
  );
};
