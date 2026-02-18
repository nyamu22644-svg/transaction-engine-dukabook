import React, { useState } from 'react';
import { BarcodeScanner } from './BarcodeScanner';
import { X, ScanLine, Package, CheckCircle2, AlertCircle } from 'lucide-react';
import { InventoryItem } from '../types';
import { addNewInventoryItem } from '../services/supabaseService';
import { MASTER_CATALOG } from '../data/itemTemplates';

interface StaffBarcodeEntryProps {
  storeId: string;
  onItemAdded?: (item: InventoryItem) => void;
  onClose?: () => void;
}

export const StaffBarcodeEntry: React.FC<StaffBarcodeEntryProps> = ({ 
  storeId, 
  onItemAdded,
  onClose 
}) => {
  const [showScanner, setShowScanner] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any | null>(null);
  const [quantity, setQuantity] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [successItems, setSuccessItems] = useState<string[]>([]);

  const handleBarcodeScan = (barcode: string, item?: any) => {
    setMessage(null);
    
    if (item) {
      // Found in catalog
      setSelectedItem(item);
      setQuantity('');
      setShowScanner(false);
      setMessage({
        type: 'success',
        text: `✓ Found: ${item.item_name}`
      });
    } else {
      // Not found in global catalog
      setMessage({
        type: 'error',
        text: `⚠ Barcode ${barcode} not found in catalog. Ask manager to add manually.`
      });
      setShowScanner(false);
    }
  };

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItem || !quantity) return;

    setLoading(true);
    try {
      await addNewInventoryItem({
        store_id: storeId,
        item_name: selectedItem.item_name,
        unit_price: selectedItem.unit_price,
        buying_price: selectedItem.buying_price,
        current_stock: parseInt(quantity),
        low_stock_threshold: selectedItem.low_stock_threshold || 10,
        barcode: selectedItem.barcode
      });

      setSuccessItems([...successItems, selectedItem.item_name]);
      setMessage({
        type: 'success',
        text: `✓ Added ${quantity}x ${selectedItem.item_name}`
      });

      if (onItemAdded) {
        onItemAdded({
          id: `temp_${Math.random()}`,
          store_id: storeId,
          item_name: selectedItem.item_name,
          unit_price: selectedItem.unit_price,
          buying_price: selectedItem.buying_price,
          current_stock: parseInt(quantity),
          low_stock_threshold: selectedItem.low_stock_threshold || 10,
          barcode: selectedItem.barcode
        } as InventoryItem);
      }

      // Reset for next item
      setSelectedItem(null);
      setQuantity('');
      
      // Auto-start next scan
      setTimeout(() => setShowScanner(true), 1500);
    } catch (err) {
      setMessage({
        type: 'error',
        text: 'Failed to add item. Try again.'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-screen overflow-y-auto animate-in zoom-in-95">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-blue-600 text-white p-6 flex items-center justify-between sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <div className="bg-white/20 p-2 rounded-lg">
              <ScanLine className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold">Add Items</h2>
              <p className="text-xs text-purple-100">Scan barcode to add to inventory</p>
            </div>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="text-white/80 hover:text-white transition p-1"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        <div className="p-6 space-y-4">
          {/* Message Display */}
          {message && (
            <div className={`p-3 rounded-lg flex items-start gap-2 text-sm animate-in slide-in-from-top ${
              message.type === 'success' 
                ? 'bg-green-50 text-green-700 border border-green-200' 
                : 'bg-red-50 text-red-700 border border-red-200'
            }`}>
              {message.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              )}
              <span>{message.text}</span>
            </div>
          )}

          {/* Scanner Button */}
          {!selectedItem ? (
            <button
              onClick={() => setShowScanner(true)}
              className="w-full flex items-center justify-center gap-3 px-4 py-4 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg font-bold hover:opacity-90 transition text-lg"
            >
              <ScanLine className="w-5 h-5" />
              Scan Barcode
            </button>
          ) : (
            /* Selected Item Form */
            <form onSubmit={handleAddItem} className="space-y-4">
              {/* Item Preview */}
              <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                <div className="flex items-start gap-3 mb-3">
                  <div className="bg-purple-100 p-2 rounded-lg">
                    <Package className="w-5 h-5 text-purple-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-slate-900 text-sm truncate">{selectedItem.item_name}</h3>
                    {selectedItem.barcode && (
                      <p className="text-xs text-slate-500 mt-1">Barcode: {selectedItem.barcode}</p>
                    )}
                  </div>
                </div>

                {/* Prices from Catalog */}
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between items-center p-2 bg-white rounded border border-slate-100">
                    <span className="text-slate-600">Buying (Cost):</span>
                    <span className="font-bold text-slate-900">KES {selectedItem.buying_price.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center p-2 bg-white rounded border border-slate-100">
                    <span className="text-slate-600">Selling Price:</span>
                    <span className="font-bold text-slate-900">KES {selectedItem.unit_price.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center p-2 bg-white rounded border border-slate-100">
                    <span className="text-slate-600">Profit per Unit:</span>
                    <span className="font-bold text-green-600">
                      KES {(selectedItem.unit_price - selectedItem.buying_price).toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>

              {/* Quantity Input */}
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-2">
                  How many to add?
                </label>
                <input
                  type="number"
                  min="1"
                  required
                  autoFocus
                  placeholder="Enter quantity"
                  className="w-full px-4 py-3 border-2 border-slate-200 rounded-lg font-bold text-lg focus:border-purple-500 focus:outline-none"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                />
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setSelectedItem(null)}
                  className="px-4 py-3 bg-slate-100 text-slate-600 rounded-lg font-bold hover:bg-slate-200 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading || !quantity}
                  className="px-4 py-3 bg-green-600 text-white rounded-lg font-bold hover:bg-green-700 disabled:opacity-50 transition flex items-center justify-center gap-2"
                >
                  {loading ? 'Adding...' : `Add ${quantity || 0} Items`}
                </button>
              </div>
            </form>
          )}

          {/* Success Summary */}
          {successItems.length > 0 && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3">
              <p className="text-xs font-bold text-green-700 mb-2">✓ Items Added Today:</p>
              <div className="space-y-1">
                {successItems.map((item, i) => (
                  <p key={i} className="text-xs text-green-600">• {item}</p>
                ))}
              </div>
            </div>
          )}

          {/* Instructions */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-xs font-bold text-blue-700 mb-1">How to use:</p>
            <ol className="text-xs text-blue-600 space-y-0.5">
              <li>1. Click "Scan Barcode"</li>
              <li>2. Point phone at barcode</li>
              <li>3. System finds item from catalog</li>
              <li>4. Enter quantity → Save</li>
            </ol>
          </div>
        </div>
      </div>

      {/* Barcode Scanner Modal */}
      {showScanner && (
        <BarcodeScanner
          onDetected={handleBarcodeScan}
          onClose={() => setShowScanner(false)}
        />
      )}
    </div>
  );
};
