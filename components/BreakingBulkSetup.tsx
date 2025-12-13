import React, { useState } from 'react';
import { AlertCircle, Zap, TrendingDown, Loader2, Save, X } from 'lucide-react';
import { InventoryItem, ConversionInfo } from '../types';
import {
  createBreakoutUnitItem,
  populateBreakoutBatches,
  calculateAuditVariance,
} from '../services/inventoryService';
import { InventoryBatch } from '../types';

interface BreakingBulkSetupProps {
  item: InventoryItem;
  batch?: InventoryBatch;
  onSetupComplete?: (parentItem: InventoryItem, breakoutItem: InventoryItem) => void;
  onCancel?: () => void;
}

/**
 * BREAKING BULK CONVERTER COMPONENT
 * 
 * Allows store managers to configure bulk-to-unit conversion for items like:
 * - 750ml Bottle -> 25x 30ml Tots (Wines & Spirits)
 * - 90kg Sack -> 90x 1kg Bags (Cereals)
 * 
 * Automatically creates derived inventory items and batches for FEFO tracking.
 */
export const BreakingBulkSetup: React.FC<BreakingBulkSetupProps> = ({
  item,
  batch,
  onSetupComplete,
  onCancel,
}) => {
  const [conversionRate, setConversionRate] = useState<number>(1);
  const [bulkUnitName, setBulkUnitName] = useState<string>('');
  const [breakoutUnitName, setBreakoutUnitName] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSetupConversion = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!bulkUnitName.trim() || !breakoutUnitName.trim() || conversionRate <= 0) {
      setError('Please fill in all fields with valid values.');
      return;
    }

    setLoading(true);
    try {
      const conversionInfo: ConversionInfo = {
        bulkUnitName,
        breakoutUnitName,
        conversionRate,
      };

      // Create the derived breakout item
      const breakoutItem = await createBreakoutUnitItem(item, conversionInfo);
      if (!breakoutItem) {
        setError('Failed to create breakout unit item. Please try again.');
        setLoading(false);
        return;
      }

      // If there's a batch, populate breakout batches
      if (batch) {
        await populateBreakoutBatches(batch, item, conversionInfo, breakoutItem);
      }

      setSuccess(true);
      setTimeout(() => {
        if (onSetupComplete) {
          onSetupComplete(item, breakoutItem);
        }
      }, 1500);
    } catch (err) {
      console.error('Setup error:', err);
      setError('An unexpected error occurred. Please check the logs.');
    } finally {
      setLoading(false);
    }
  };

  const presets: Record<string, { bulk: string; breakout: string; rate: number }> = {
    wine: { bulk: 'Bottle (750ml)', breakout: 'Tot (30ml)', rate: 25 },
    spirit: { bulk: 'Bottle (1L)', breakout: 'Shot (40ml)', rate: 25 },
    cereal: { bulk: 'Sack (90kg)', breakout: '1kg Bag', rate: 90 },
    rice: { bulk: 'Sack (90kg)', breakout: '500g Bag', rate: 180 },
    sugar: { bulk: 'Bag (50kg)', breakout: '1kg Pack', rate: 50 },
  };

  const applyPreset = (key: keyof typeof presets) => {
    const preset = presets[key];
    setBulkUnitName(preset.bulk);
    setBreakoutUnitName(preset.breakout);
    setConversionRate(preset.rate);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-gradient-to-r from-amber-500 to-orange-600 text-white p-6 flex justify-between items-center">
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Zap className="w-6 h-6" />
            Breaking Bulk Setup
          </h2>
          <button
            onClick={onCancel}
            className="p-1 hover:bg-white hover:bg-opacity-20 rounded transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Item Info */}
          <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded">
            <p className="font-semibold text-blue-900">Configuring: {item.item_name}</p>
            <p className="text-sm text-blue-700 mt-1">
              Cost: KES {item.buying_price} | Selling Price: KES {item.unit_price}
            </p>
          </div>

          {/* Explanation */}
          <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded">
            <p className="text-sm text-amber-900">
              <strong>How it works:</strong> You buy in bulk (e.g., 1 Bottle) and sell in units (e.g., 25 Tots). 
              When you record a sale of "2 Tots," the system deducts from the breakout units and flags discrepancies 
              if the physical item doesn't match system stock (preventing theft/over-pouring).
            </p>
          </div>

          {/* Presets */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">Quick Presets</label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {Object.entries(presets).map(([key, preset]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => applyPreset(key as keyof typeof presets)}
                  className="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-medium rounded transition"
                >
                  {key.charAt(0).toUpperCase() + key.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSetupConversion} className="space-y-4">
            {/* Bulk Unit */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Bulk Unit Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                placeholder="e.g., Bottle (750ml), Sack (90kg)"
                value={bulkUnitName}
                onChange={(e) => setBulkUnitName(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
              />
              <p className="text-xs text-gray-500 mt-1">The unit you purchase from suppliers.</p>
            </div>

            {/* Breakout Unit */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Breakout Unit Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                placeholder="e.g., Tot (30ml), 1kg Bag"
                value={breakoutUnitName}
                onChange={(e) => setBreakoutUnitName(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
              />
              <p className="text-xs text-gray-500 mt-1">The unit you sell to customers.</p>
            </div>

            {/* Conversion Rate */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Conversion Rate <span className="text-red-500">*</span>
              </label>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">1</span>
                <input
                  type="number"
                  placeholder="25"
                  value={bulkUnitName}
                  min={1}
                  step={1}
                  onChange={(e) => setConversionRate(Number(e.target.value))}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                />
                <span className="text-sm text-gray-600">
                  {bulkUnitName} = {conversionRate} {breakoutUnitName}
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-1">How many breakout units per bulk unit.</p>
            </div>

            {/* Error */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded p-3 flex gap-2 text-sm text-red-700">
                <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {/* Success */}
            {success && (
              <div className="bg-green-50 border border-green-200 rounded p-3 text-sm text-green-700">
                ✅ Conversion configured! Your breakout item is ready.
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={onCancel}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition font-medium"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || success}
                className="flex-1 px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-600 text-white rounded-lg hover:shadow-lg disabled:opacity-50 transition font-medium flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Setting up...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    Setup Conversion
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Info Boxes */}
          <div className="grid md:grid-cols-2 gap-4 text-sm bg-gray-50 p-4 rounded-lg">
            <div>
              <p className="font-semibold text-gray-700 mb-2 flex items-center gap-2">
                <Zap className="w-4 h-4 text-amber-600" />
                Auto Unit Pricing
              </p>
              <p className="text-gray-600">
                System calculates unit price as: Bulk Price ÷ Conversion Rate
              </p>
            </div>
            <div>
              <p className="font-semibold text-gray-700 mb-2 flex items-center gap-2">
                <TrendingDown className="w-4 h-4 text-red-600" />
                Audit Variance
              </p>
              <p className="text-gray-600">
                Physical empty but units remain? Theft/Over-pour detected!
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
