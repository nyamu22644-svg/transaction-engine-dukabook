import React, { useState, useMemo } from 'react';
import { X, Search, Plus, Check, Package, Filter } from 'lucide-react';
import { MASTER_CATALOG, HARDWARE_ITEMS, COSMETICS_ITEMS, BROKERAGE_ITEMS, OTHER_ITEMS, ItemTemplate } from '../data/itemTemplates';
import { InventoryItem } from '../types';

interface CatalogBrowserProps {
  storeId: string;
  existingBarcodes: string[];
  onAddItems: (items: Omit<InventoryItem, 'id'>[]) => Promise<void>;
  onClose: () => void;
}

type CategoryFilter = 'ALL' | 'HARDWARE' | 'COSMETICS' | 'BROKERAGE' | 'OTHER';

export const CatalogBrowser: React.FC<CatalogBrowserProps> = ({ storeId, existingBarcodes, onAddItems, onClose }) => {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<CategoryFilter>('ALL');
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [adding, setAdding] = useState(false);
  const [success, setSuccess] = useState(false);

  const catalog = useMemo(() => {
    let items: ItemTemplate[] = [];
    switch (category) {
      case 'HARDWARE':
        items = HARDWARE_ITEMS;
        break;
      case 'COSMETICS':
        items = COSMETICS_ITEMS;
        break;
      case 'BROKERAGE':
        items = BROKERAGE_ITEMS;
        break;
      case 'OTHER':
        items = OTHER_ITEMS;
        break;
      default:
        items = MASTER_CATALOG;
    }

    if (search) {
      const lowerSearch = search.toLowerCase();
      items = items.filter(item => 
        item.item_name.toLowerCase().includes(lowerSearch) ||
        item.barcode.includes(search) ||
        item.category?.toLowerCase().includes(lowerSearch)
      );
    }

    return items;
  }, [category, search]);

  const toggleItem = (barcode: string) => {
    const newSelected = new Set(selectedItems);
    if (newSelected.has(barcode)) {
      newSelected.delete(barcode);
    } else {
      newSelected.add(barcode);
    }
    setSelectedItems(newSelected);
  };

  const selectAll = () => {
    const allBarcodes = catalog.map(item => item.barcode).filter(b => !existingBarcodes.includes(b));
    setSelectedItems(new Set(allBarcodes));
  };

  const clearSelection = () => {
    setSelectedItems(new Set());
  };

  const handleAdd = async () => {
    if (selectedItems.size === 0) return;

    setAdding(true);
    try {
      const itemsToAdd = catalog
        .filter(item => selectedItems.has(item.barcode))
        .map(item => ({
          store_id: storeId,
          item_name: item.item_name,
          barcode: item.barcode,
          unit_price: item.unit_price,
          buying_price: item.buying_price,
          current_stock: item.current_stock,
          low_stock_threshold: item.low_stock_threshold,
          category: item.category
        }));

      await onAddItems(itemsToAdd);
      setSuccess(true);
      setTimeout(() => onClose(), 1500);
    } catch (err) {
      console.error('Failed to add items:', err);
    } finally {
      setAdding(false);
    }
  };

  const categories: { key: CategoryFilter; label: string; color: string }[] = [
    { key: 'ALL', label: 'All Items', color: 'blue' },
    { key: 'HARDWARE', label: 'Hardware', color: 'orange' },
    { key: 'COSMETICS', label: 'Cosmetics', color: 'pink' },
    { key: 'BROKERAGE', label: 'Brokerage', color: 'green' },
    { key: 'OTHER', label: 'Other', color: 'slate' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="bg-slate-900 rounded-2xl shadow-2xl w-full max-w-4xl border border-slate-800 max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Package className="w-6 h-6 text-blue-500" />
            <div>
              <h2 className="text-xl font-bold text-white">Item Catalog</h2>
              <p className="text-sm text-slate-400">Browse and add items to your store</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-white transition">
            <X className="w-6 h-6" />
          </button>
        </div>

        {success ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Check className="w-8 h-8 text-green-500" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Items Added!</h3>
              <p className="text-slate-400">{selectedItems.size} items added to your inventory</p>
            </div>
          </div>
        ) : (
          <>
            {/* Search & Filters */}
            <div className="p-4 border-b border-slate-800 space-y-4">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                <input 
                  type="text"
                  placeholder="Search by name, barcode, or category..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 pl-11 text-white focus:border-blue-500 focus:outline-none transition"
                />
              </div>

              {/* Category Tabs */}
              <div className="flex gap-2 overflow-x-auto pb-1">
                {categories.map(cat => (
                  <button
                    key={cat.key}
                    onClick={() => setCategory(cat.key)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition ${
                      category === cat.key 
                        ? 'bg-blue-600 text-white' 
                        : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>

              {/* Selection Controls */}
              <div className="flex items-center justify-between text-sm">
                <div className="text-slate-400">
                  {catalog.length} items • {selectedItems.size} selected
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={selectAll}
                    className="text-blue-400 hover:text-blue-300"
                  >
                    Select All
                  </button>
                  <span className="text-slate-600">|</span>
                  <button 
                    onClick={clearSelection}
                    className="text-slate-400 hover:text-white"
                  >
                    Clear
                  </button>
                </div>
              </div>
            </div>

            {/* Items Grid */}
            <div className="flex-1 overflow-y-auto p-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {catalog.map(item => {
                  const isSelected = selectedItems.has(item.barcode);
                  const alreadyExists = existingBarcodes.includes(item.barcode);

                  return (
                    <button
                      key={item.barcode}
                      onClick={() => !alreadyExists && toggleItem(item.barcode)}
                      disabled={alreadyExists}
                      className={`p-4 rounded-xl border text-left transition relative ${
                        alreadyExists 
                          ? 'bg-slate-900 border-slate-800 opacity-50 cursor-not-allowed' 
                          : isSelected 
                            ? 'bg-blue-600/20 border-blue-500/50' 
                            : 'bg-slate-800/50 border-slate-700 hover:border-slate-600'
                      }`}
                    >
                      {/* Selection indicator */}
                      <div className={`absolute top-3 right-3 w-5 h-5 rounded-full border-2 flex items-center justify-center transition ${
                        isSelected ? 'bg-blue-600 border-blue-600' : 'border-slate-600'
                      }`}>
                        {isSelected && <Check className="w-3 h-3 text-white" />}
                      </div>

                      {alreadyExists && (
                        <span className="absolute top-3 right-3 text-xs bg-slate-700 text-slate-400 px-2 py-0.5 rounded">
                          Already added
                        </span>
                      )}

                      <h4 className="font-medium text-white pr-8 mb-1">{item.item_name}</h4>
                      <div className="text-xs text-slate-500 font-mono mb-2">{item.barcode}</div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-green-400 font-bold">KES {item.unit_price.toLocaleString()}</span>
                        {item.category && (
                          <span className="text-xs bg-slate-700 text-slate-400 px-2 py-0.5 rounded">
                            {item.category}
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>

              {catalog.length === 0 && (
                <div className="text-center py-12 text-slate-500">
                  <Package className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>No items found matching your search</p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-slate-800">
              <button 
                onClick={handleAdd}
                disabled={adding || selectedItems.size === 0}
                className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 disabled:text-slate-500 text-white font-bold py-3 rounded-xl transition flex items-center justify-center gap-2"
              >
                <Plus className="w-5 h-5" />
                {adding ? 'Adding...' : `Add ${selectedItems.size} Item${selectedItems.size !== 1 ? 's' : ''} to Store`}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
