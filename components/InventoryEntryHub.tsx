import React, { useState } from 'react';
import { X, ScanLine, Package, Upload, BookOpen, Plus, Check, AlertCircle } from 'lucide-react';
import { InventoryItem } from '../types';
import { addNewInventoryItem, bulkAddInventoryItems } from '../services/supabaseService';
import { BarcodeScanner } from './BarcodeScanner';
import { CatalogBrowser } from './CatalogBrowser';
import { BulkImport } from './BulkImport';

interface InventoryEntryHubProps {
  storeId: string;
  existingInventory: InventoryItem[];
  onItemsAdded?: (items: InventoryItem[]) => void;
  onClose?: () => void;
  userRole?: 'OWNER' | 'STAFF';
}

type EntryMethod = 'SELECT' | 'MANUAL' | 'SCAN' | 'CATALOG' | 'BULK';

export const InventoryEntryHub: React.FC<InventoryEntryHubProps> = ({
  storeId,
  existingInventory,
  onItemsAdded,
  onClose,
  userRole = 'OWNER'
}) => {
  const [method, setMethod] = useState<EntryMethod>('SELECT');
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [addedItemsCount, setAddedItemsCount] = useState(0);

  // Manual Add Form State
  const [manualForm, setManualForm] = useState({
    itemName: '',
    buyingPrice: '',
    sellingPrice: '',
    stock: '',
    barcode: '',
    expiry: '',
    threshold: '10'
  });

  const existingBarcodes = existingInventory.map(i => i.barcode).filter(b => !!b);

  // MANUAL ADD
  const handleManualAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualForm.itemName || !manualForm.buyingPrice || !manualForm.sellingPrice || !manualForm.stock) {
      setErrorMessage('Please fill all required fields');
      return;
    }

    setLoading(true);
    try {
      await addNewInventoryItem({
        store_id: storeId,
        item_name: manualForm.itemName,
        buying_price: parseFloat(manualForm.buyingPrice),
        unit_price: parseFloat(manualForm.sellingPrice),
        current_stock: parseInt(manualForm.stock),
        low_stock_threshold: parseInt(manualForm.threshold),
        barcode: manualForm.barcode || undefined,
        expiry_date: manualForm.expiry || undefined
      });

      setSuccessMessage(`✓ Added: ${manualForm.itemName}`);
      setAddedItemsCount(prev => prev + 1);
      setManualForm({
        itemName: '',
        buyingPrice: '',
        sellingPrice: '',
        stock: '',
        barcode: '',
        expiry: '',
        threshold: '10'
      });

      setTimeout(() => setSuccessMessage(null), 2000);
    } catch (err) {
      setErrorMessage('Failed to add item. Try again.');
    } finally {
      setLoading(false);
    }
  };

  // BARCODE SCAN
  const handleBarcodeScan = async (barcode: string, item?: any) => {
    if (!item) {
      setErrorMessage(`Barcode ${barcode} not found in global catalog`);
      return;
    }

    setLoading(true);
    try {
      // Auto-add with default quantity of 1
      await addNewInventoryItem({
        store_id: storeId,
        item_name: item.item_name,
        buying_price: item.buying_price,
        unit_price: item.unit_price,
        current_stock: 1,
        low_stock_threshold: item.low_stock_threshold || 10,
        barcode: item.barcode
      });

      setSuccessMessage(`✓ Added 1x ${item.item_name}`);
      setAddedItemsCount(prev => prev + 1);
      
      setTimeout(() => {
        setSuccessMessage(null);
        setMethod('SCAN'); // Reset to scan for next item
      }, 1500);
    } catch (err) {
      setErrorMessage('Failed to add item');
    } finally {
      setLoading(false);
    }
  };

  // CATALOG ADD
  const handleCatalogAdd = async (items: Omit<InventoryItem, 'id'>[]) => {
    setLoading(true);
    try {
      await bulkAddInventoryItems(items);
      setSuccessMessage(`✓ Added ${items.length} items from catalog`);
      setAddedItemsCount(prev => prev + items.length);
      setMethod('SELECT');
      
      setTimeout(() => setSuccessMessage(null), 2000);
    } catch (err) {
      setErrorMessage('Failed to add items');
    } finally {
      setLoading(false);
    }
  };

  // BULK IMPORT
  const handleBulkImport = async (items: Omit<InventoryItem, 'id'>[]) => {
    setLoading(true);
    try {
      await bulkAddInventoryItems(items);
      setSuccessMessage(`✓ Imported ${items.length} items`);
      setAddedItemsCount(prev => prev + items.length);
      setMethod('SELECT');
      
      setTimeout(() => setSuccessMessage(null), 2000);
    } catch (err) {
      setErrorMessage('Failed to import items');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto animate-in zoom-in-95">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6 flex items-center justify-between sticky top-0 z-20">
          <div className="flex items-center gap-3">
            <div className="bg-white/20 p-2 rounded-lg">
              <Package className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-2xl font-bold">Add Inventory</h2>
              <p className="text-xs text-blue-100">Choose a method to add items</p>
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
          {/* Messages */}
          {successMessage && (
            <div className="p-3 rounded-lg bg-green-50 text-green-700 border border-green-200 flex items-center gap-2 animate-in slide-in-from-top">
              <Check className="w-5 h-5 flex-shrink-0" />
              <span className="font-semibold text-sm">{successMessage}</span>
            </div>
          )}

          {errorMessage && (
            <div className="p-3 rounded-lg bg-red-50 text-red-700 border border-red-200 flex items-center gap-2 animate-in slide-in-from-top">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <span className="font-semibold text-sm">{errorMessage}</span>
            </div>
          )}

          {/* Method Selection */}
          {method === 'SELECT' ? (
            <div className="grid grid-cols-2 gap-4">
              {/* Manual Add */}
              <button
                onClick={() => setMethod('MANUAL')}
                className="p-6 rounded-xl border-2 border-slate-200 hover:border-blue-500 hover:bg-blue-50 transition text-center space-y-2 group"
              >
                <div className="bg-blue-100 w-12 h-12 rounded-lg flex items-center justify-center mx-auto group-hover:bg-blue-200 transition">
                  <Plus className="w-6 h-6 text-blue-600" />
                </div>
                <h3 className="font-bold text-slate-900">Manual Entry</h3>
                <p className="text-xs text-slate-500">Type item details directly</p>
              </button>

              {/* Barcode Scan */}
              <button
                onClick={() => setMethod('SCAN')}
                className="p-6 rounded-xl border-2 border-slate-200 hover:border-purple-500 hover:bg-purple-50 transition text-center space-y-2 group"
              >
                <div className="bg-purple-100 w-12 h-12 rounded-lg flex items-center justify-center mx-auto group-hover:bg-purple-200 transition">
                  <ScanLine className="w-6 h-6 text-purple-600" />
                </div>
                <h3 className="font-bold text-slate-900">Scan Barcode</h3>
                <p className="text-xs text-slate-500">Quick scan from catalog</p>
              </button>

              {/* Browse Catalog */}
              <button
                onClick={() => setMethod('CATALOG')}
                className="p-6 rounded-xl border-2 border-slate-200 hover:border-green-500 hover:bg-green-50 transition text-center space-y-2 group"
              >
                <div className="bg-green-100 w-12 h-12 rounded-lg flex items-center justify-center mx-auto group-hover:bg-green-200 transition">
                  <BookOpen className="w-6 h-6 text-green-600" />
                </div>
                <h3 className="font-bold text-slate-900">Browse Catalog</h3>
                <p className="text-xs text-slate-500">Select from global products</p>
              </button>

              {/* Bulk Import (Owner Only) */}
              {userRole === 'OWNER' && (
                <button
                  onClick={() => setMethod('BULK')}
                  className="p-6 rounded-xl border-2 border-slate-200 hover:border-orange-500 hover:bg-orange-50 transition text-center space-y-2 group"
                >
                  <div className="bg-orange-100 w-12 h-12 rounded-lg flex items-center justify-center mx-auto group-hover:bg-orange-200 transition">
                    <Upload className="w-6 h-6 text-orange-600" />
                  </div>
                  <h3 className="font-bold text-slate-900">Bulk Import</h3>
                  <p className="text-xs text-slate-500">Import CSV/Excel file</p>
                </button>
              )}
            </div>
          ) : (
            <>
              {/* MANUAL ENTRY FORM */}
              {method === 'MANUAL' && (
                <form onSubmit={handleManualAdd} className="space-y-4">
                  <button
                    type="button"
                    onClick={() => setMethod('SELECT')}
                    className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1 mb-4"
                  >
                    ← Back to Methods
                  </button>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2">
                      <label className="block text-xs font-bold text-slate-600 mb-1">Item Name *</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g., Milk Powder 500g"
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        value={manualForm.itemName}
                        onChange={(e) => setManualForm({...manualForm, itemName: e.target.value})}
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-600 mb-1">Buying Price (Cost) *</label>
                      <input
                        type="number"
                        required
                        placeholder="0.00"
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        value={manualForm.buyingPrice}
                        onChange={(e) => setManualForm({...manualForm, buyingPrice: e.target.value})}
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-600 mb-1">Selling Price *</label>
                      <input
                        type="number"
                        required
                        placeholder="0.00"
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        value={manualForm.sellingPrice}
                        onChange={(e) => setManualForm({...manualForm, sellingPrice: e.target.value})}
                      />
                    </div>

                    <div className="col-span-2">
                      <label className="block text-xs font-bold text-slate-600 mb-1">Stock Quantity *</label>
                      <input
                        type="number"
                        required
                        placeholder="0"
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        value={manualForm.stock}
                        onChange={(e) => setManualForm({...manualForm, stock: e.target.value})}
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-600 mb-1">Barcode (Optional)</label>
                      <input
                        type="text"
                        placeholder="e.g., 123456789"
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        value={manualForm.barcode}
                        onChange={(e) => setManualForm({...manualForm, barcode: e.target.value})}
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-600 mb-1">Low Stock Alert</label>
                      <input
                        type="number"
                        placeholder="10"
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        value={manualForm.threshold}
                        onChange={(e) => setManualForm({...manualForm, threshold: e.target.value})}
                      />
                    </div>

                    <div className="col-span-2">
                      <label className="block text-xs font-bold text-slate-600 mb-1">Expiry Date (Optional)</label>
                      <input
                        type="date"
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        value={manualForm.expiry}
                        onChange={(e) => setManualForm({...manualForm, expiry: e.target.value})}
                      />
                    </div>
                  </div>

                  <div className="flex gap-3 pt-4">
                    <button
                      type="button"
                      onClick={() => setMethod('SELECT')}
                      className="flex-1 px-4 py-3 bg-slate-100 text-slate-600 rounded-lg font-bold hover:bg-slate-200 transition"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={loading}
                      className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 disabled:opacity-50 transition"
                    >
                      {loading ? 'Adding...' : 'Add Item'}
                    </button>
                  </div>
                </form>
              )}

              {/* BARCODE SCAN */}
              {method === 'SCAN' && (
                <div className="space-y-4">
                  <button
                    onClick={() => setMethod('SELECT')}
                    className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1 mb-4"
                  >
                    ← Back to Methods
                  </button>
                  <BarcodeScanner
                    onDetected={handleBarcodeScan}
                    onClose={() => setMethod('SELECT')}
                  />
                </div>
              )}

              {/* CATALOG BROWSE */}
              {method === 'CATALOG' && (
                <div>
                  <button
                    onClick={() => setMethod('SELECT')}
                    className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1 mb-4"
                  >
                    ← Back to Methods
                  </button>
                  <CatalogBrowser
                    storeId={storeId}
                    existingBarcodes={existingBarcodes}
                    onAddItems={handleCatalogAdd}
                    onClose={() => setMethod('SELECT')}
                  />
                </div>
              )}

              {/* BULK IMPORT */}
              {method === 'BULK' && (
                <div>
                  <button
                    onClick={() => setMethod('SELECT')}
                    className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1 mb-4"
                  >
                    ← Back to Methods
                  </button>
                  <BulkImport
                    storeId={storeId}
                    onImport={handleBulkImport}
                    onClose={() => setMethod('SELECT')}
                  />
                </div>
              )}
            </>
          )}

          {/* Summary */}
          {addedItemsCount > 0 && method === 'SELECT' && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-sm font-bold text-blue-700">✓ Today's Progress: {addedItemsCount} item{addedItemsCount !== 1 ? 's' : ''} added</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
