import React, { useState, useRef, useEffect } from 'react';
import {
  ShoppingCart,
  Trash2,
  Plus,
  Minus,
  X,
  Scan,
  AlertCircle,
  CheckCircle2,
  Loader2,
  DollarSign,
  Package,
} from 'lucide-react';
import { findProductByBarcode, addItemToCart, createEmptyCart, removeFromCart, updateCartItemQuantity } from '../services/barcodePOSService';
import { StoreProfile } from '../types';

interface BarcodePOSProps {
  store: StoreProfile;
  onClose: () => void;
  onCheckout?: (cart: any) => void;
}

interface POSCartItem {
  id: string;
  item_name: string;
  unit_price: number;
  quantity: number;
  total_amount: number;
  current_stock: number;
  barcode: string;
}

interface POSCartState {
  items: POSCartItem[];
  total_amount: number;
  item_count: number;
}

/**
 * Supermarket-Style Barcode POS Component
 * 
 * Features:
 * - Always-focused scan input field
 * - Auto-add items on barcode scan (Enter key)
 * - Real-time cart updates
 * - Stock availability checking
 * - Quick quantity adjustments
 * - Receipt-ready totals
 */
export const BarcodePOS: React.FC<BarcodePOSProps> = ({ store, onClose, onCheckout }) => {
  // State
  const [cart, setCart] = useState<POSCartState>(createEmptyCart());
  const [scanInput, setScanInput] = useState('');
  const [scanning, setScanning] = useState(false);
  const [lastScannedBarcode, setLastScannedBarcode] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [selectedItem, setSelectedItem] = useState<POSCartItem | null>(null);

  // Refs
  const scanInputRef = useRef<HTMLInputElement>(null);

  // Keep scan input focused (crucial for barcode scanner)
  useEffect(() => {
    scanInputRef.current?.focus();
  }, []);

  // Auto-focus scan input after any action
  const focusScanInput = () => {
    setTimeout(() => {
      scanInputRef.current?.focus();
    }, 50);
  };

  /**
   * Handle barcode scan
   * Triggered by Enter key from barcode scanner
   * Automatically adds product to cart
   */
  const handleBarcodeScan = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Only process on Enter key
    if (e.key !== 'Enter') return;

    e.preventDefault();
    const barcode = (e.target as HTMLInputElement).value.trim();

    if (!barcode) {
      setError('Empty barcode');
      focusScanInput();
      return;
    }

    setScanning(true);
    setError('');
    setSuccess('');
    setLastScannedBarcode(barcode);

    try {
      // 1. Find product by barcode
      console.log(`🔍 Scanning barcode: ${barcode}`);
      const product = await findProductByBarcode(barcode, store.id);

      if (!product) {
        setError(`❌ Barcode not found: ${barcode}`);
        setScanInput('');
        focusScanInput();
        setScanning(false);
        return;
      }

      // 2. Check stock
      const availableStock = product.quantity_on_hand || product.current_stock || 0;
      if (availableStock <= 0) {
        setError(`❌ "${product.item_name}" is out of stock`);
        setScanInput('');
        focusScanInput();
        setScanning(false);
        return;
      }

      // 3. Add to cart
      const updatedCart = addItemToCart(cart, product, 1);
      setCart(updatedCart);

      // 4. Show success
      setSuccess(`✓ Added "${product.item_name}" (KES ${product.unit_price.toLocaleString()})`);

      // 5. Clear input and re-focus
      setScanInput('');
      focusScanInput();

      // Clear success message after 2 seconds
      setTimeout(() => setSuccess(''), 2000);
    } catch (err) {
      console.error('Error processing barcode:', err);
      setError('Failed to process barcode');
    } finally {
      setScanning(false);
    }
  };

  /**
   * Update quantity in cart
   */
  const handleQuantityChange = (itemId: string, delta: number) => {
    const item = cart.items.find(i => i.id === itemId);
    if (!item) return;

    const newQuantity = item.quantity + delta;
    const updatedCart = updateCartItemQuantity(cart, itemId, newQuantity);
    setCart(updatedCart);
    focusScanInput();
  };

  /**
   * Remove item from cart
   */
  const handleRemoveItem = (itemId: string) => {
    const updatedCart = removeFromCart(cart, itemId);
    setCart(updatedCart);
    setSelectedItem(null);
    focusScanInput();
  };

  /**
   * Proceed to checkout
   */
  const handleCheckout = () => {
    if (cart.items.length === 0) {
      setError('Cart is empty');
      return;
    }

    if (onCheckout) {
      onCheckout(cart);
    } else {
      // Default: show checkout summary
      alert(`Total: KES ${cart.total_amount.toLocaleString()}\nItems: ${cart.item_count}`);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900 rounded-2xl shadow-2xl w-full max-w-6xl border border-slate-800 max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-slate-800 flex items-center justify-between bg-gradient-to-r from-slate-900 to-slate-800">
          <div className="flex items-center gap-3">
            <Scan className="w-8 h-8 text-blue-500" />
            <div>
              <h2 className="text-2xl font-bold text-white">Barcode POS</h2>
              <p className="text-slate-400 text-sm">{store.store_name}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-800 rounded-lg transition text-slate-400 hover:text-white"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="flex-1 overflow-hidden flex flex-col lg:flex-row">
          {/* Main Content Area */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Scan Input - Always Visible and Focused */}
            <div className="p-6 bg-slate-800/50 border-b border-slate-700">
              <label className="block text-sm font-bold text-slate-300 mb-2 flex items-center gap-2">
                <Scan className="w-5 h-5 text-blue-500" />
                Scan Barcode
              </label>
              <div className="relative">
                <input
                  ref={scanInputRef}
                  type="text"
                  value={scanInput}
                  onChange={(e) => setScanInput(e.target.value)}
                  onKeyDown={handleBarcodeScan}
                  placeholder="Place cursor here and scan barcode... (or press Enter)"
                  disabled={scanning}
                  autoComplete="off"
                  className="w-full px-4 py-3 bg-slate-700 border-2 border-slate-600 text-white placeholder-slate-400 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 font-mono text-lg disabled:opacity-50 disabled:cursor-not-allowed"
                />
                {scanning && (
                  <div className="absolute right-3 top-3">
                    <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
                  </div>
                )}
              </div>

              {/* Status Messages */}
              {error && (
                <div className="mt-3 flex items-start gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                  <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                  <p className="text-red-300 text-sm">{error}</p>
                </div>
              )}

              {success && (
                <div className="mt-3 flex items-start gap-2 p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
                  <CheckCircle2 className="w-5 h-5 text-green-400 shrink-0 mt-0.5" />
                  <p className="text-green-300 text-sm">{success}</p>
                </div>
              )}

              {lastScannedBarcode && (
                <p className="mt-2 text-xs text-slate-400">
                  Last scanned: <span className="font-mono text-slate-300">{lastScannedBarcode}</span>
                </p>
              )}
            </div>

            {/* Cart Items */}
            <div className="flex-1 overflow-y-auto p-6">
              {cart.items.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-slate-400">
                  <ShoppingCart className="w-16 h-16 opacity-20 mb-4" />
                  <p className="text-center">Cart is empty</p>
                  <p className="text-xs text-slate-500 mt-2">Scan a barcode to add items</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {cart.items.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => setSelectedItem(selectedItem?.id === item.id ? null : item)}
                      className={`p-4 rounded-lg border-2 cursor-pointer transition ${
                        selectedItem?.id === item.id
                          ? 'bg-blue-500/10 border-blue-500'
                          : 'bg-slate-800 border-slate-700 hover:border-slate-600'
                      }`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <h4 className="font-semibold text-white">{item.item_name}</h4>
                          <p className="text-xs text-slate-400 font-mono">Barcode: {item.barcode}</p>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRemoveItem(item.id);
                          }}
                          className="p-2 hover:bg-red-500/20 rounded transition text-red-400 hover:text-red-300"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="grid grid-cols-2 gap-4 mb-3">
                        <div>
                          <p className="text-xs text-slate-400">Unit Price</p>
                          <p className="text-green-400 font-bold">KES {item.unit_price.toLocaleString()}</p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-400">Subtotal</p>
                          <p className="text-blue-400 font-bold">KES {item.total_amount.toLocaleString()}</p>
                        </div>
                      </div>

                      {/* Quantity Controls */}
                      <div className="flex items-center justify-between bg-slate-700/50 rounded p-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleQuantityChange(item.id, -1);
                          }}
                          className="p-1 hover:bg-slate-600 rounded transition text-slate-300 hover:text-white"
                        >
                          <Minus className="w-4 h-4" />
                        </button>
                        <div className="text-center flex-1">
                          <p className="font-bold text-white">{item.quantity}</p>
                          <p className="text-xs text-slate-400">
                            Stock: {item.current_stock}
                          </p>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (item.quantity < item.current_stock) {
                              handleQuantityChange(item.id, 1);
                            }
                          }}
                          disabled={item.quantity >= item.current_stock}
                          className="p-1 hover:bg-slate-600 rounded transition text-slate-300 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Sidebar - Cart Summary & Checkout */}
          <div className="w-full lg:w-80 border-t lg:border-t-0 lg:border-l border-slate-800 bg-slate-800/50 p-6 flex flex-col">
            {/* Summary */}
            <div className="mb-6 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Items</span>
                <span className="text-2xl font-bold text-white">{cart.item_count}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Unique Products</span>
                <span className="text-xl font-bold text-white">{cart.items.length}</span>
              </div>
              <div className="h-px bg-slate-700" />
              <div className="flex items-center justify-between bg-gradient-to-r from-blue-500/10 to-green-500/10 p-3 rounded-lg border border-blue-500/20">
                <span className="text-slate-300 font-semibold">Total Amount</span>
                <span className="text-3xl font-bold text-green-400">
                  KES {cart.total_amount.toLocaleString()}
                </span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-3 mt-auto">
              <button
                onClick={handleCheckout}
                disabled={cart.items.length === 0}
                className="w-full py-3 bg-green-600 hover:bg-green-700 disabled:bg-slate-700 disabled:text-slate-500 text-white font-bold rounded-lg transition flex items-center justify-center gap-2"
              >
                <DollarSign className="w-5 h-5" />
                Proceed to Checkout
              </button>

              <button
                onClick={() => {
                  setCart(createEmptyCart());
                  setError('');
                  setSuccess('');
                  focusScanInput();
                }}
                disabled={cart.items.length === 0}
                className="w-full py-2 bg-slate-700 hover:bg-slate-600 disabled:bg-slate-800 disabled:text-slate-600 text-slate-300 font-medium rounded-lg transition"
              >
                Clear Cart
              </button>

              <button
                onClick={onClose}
                className="w-full py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 font-medium rounded-lg transition"
              >
                Close POS
              </button>
            </div>

            {/* Tips */}
            <div className="mt-6 p-3 bg-slate-700/50 rounded-lg text-xs text-slate-400 space-y-2">
              <p className="font-semibold text-slate-300 flex items-center gap-2">
                <Scan className="w-4 h-4" /> Tips
              </p>
              <ul className="list-disc list-inside space-y-1">
                <li>Scan input is always focused</li>
                <li>Press Enter or scan barcode</li>
                <li>Click items to adjust quantity</li>
                <li>Auto-detects stock limits</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BarcodePOS;
