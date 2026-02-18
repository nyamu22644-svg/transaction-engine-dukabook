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
  Camera,
} from 'lucide-react';
import { findProductByBarcode, addItemToCart, createEmptyCart, removeFromCart, updateCartItemQuantity } from '../services/barcodePOSService';
import { BarcodeScanner } from './BarcodeScanner';
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
  const [showCameraScanner, setShowCameraScanner] = useState(true);
  const [showPaymentPanel, setShowPaymentPanel] = useState(false);

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
      const availableStock = product.current_stock || 0;
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
    // Show built-in payment panel (MPESA, CASH, MADENI)
    setShowPaymentPanel(true);
    if (onCheckout) onCheckout(cart);
  };

  const doPayment = (method: string) => {
    // Placeholder: integrate real payment flow here
    setShowPaymentPanel(false);
    setSuccess(`Payment method: ${method} selected`);
    // In real flow, you'd call backend and finalize sale. For now, clear cart.
    setTimeout(() => setSuccess(''), 2000);
    setCart(createEmptyCart());
    focusScanInput();
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 p-2 sm:p-4 overflow-auto">
        <div className="flex justify-center items-start py-4 sm:py-0 sm:items-center min-h-full">
          <div className="bg-slate-900 rounded-2xl shadow-2xl w-full sm:max-w-6xl border border-slate-800 flex flex-col max-h-[calc(100vh-2rem)] sm:max-h-[90vh]">
        {/* Header */}
        <div className="p-3 sm:p-6 border-b border-slate-800 flex items-center justify-between bg-gradient-to-r from-slate-900 to-slate-800 shrink-0">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <Scan className="w-6 h-6 sm:w-8 sm:h-8 text-blue-500 shrink-0" />
            <div className="min-w-0">
              <h2 className="text-lg sm:text-2xl font-bold text-white truncate">Barcode POS</h2>
              <p className="text-slate-400 text-xs sm:text-sm truncate">{store.name}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-800 rounded-lg transition text-slate-400 hover:text-white shrink-0"
          >
            <X className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto flex flex-col lg:flex-row min-w-0">
          {/* Main Content Area */}
          <div className="flex-1 flex flex-col overflow-y-auto">
            {/* Scan Input - Always Visible and Focused */}
            <div className="p-3 sm:p-6 bg-slate-800/50 border-b border-slate-700 shrink-0">
              <label className="block text-xs sm:text-sm font-bold text-slate-300 mb-2 flex items-center gap-2">
                <Scan className="w-4 h-4 sm:w-5 sm:h-5 text-blue-500 shrink-0" />
                <span>Scan Barcode</span>
              </label>
              <div className="relative flex gap-2">
                <input
                  ref={scanInputRef}
                  type="text"
                  value={scanInput}
                  onChange={(e) => setScanInput(e.target.value)}
                  onKeyDown={handleBarcodeScan}
                  placeholder="Scan barcode... (Enter)"
                  disabled={scanning}
                  autoComplete="off"
                  className="flex-1 px-3 py-2 sm:px-4 sm:py-3 bg-slate-700 border-2 border-slate-600 text-white placeholder-slate-400 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 font-mono text-base sm:text-lg disabled:opacity-50 disabled:cursor-not-allowed"
                />
                {scanning && (
                  <div className="absolute right-16 top-2 sm:top-3">
                    <Loader2 className="w-5 h-5 sm:w-6 sm:h-6 text-blue-500 animate-spin" />
                  </div>
                )}
                {/* Camera Scanner Button */}
                <button
                  onClick={() => setShowCameraScanner(true)}
                  title="Open camera scanner"
                  className="px-3 sm:px-4 py-2 sm:py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition flex items-center gap-2 text-sm sm:text-base shrink-0"
                >
                  <Camera className="w-4 h-4 sm:w-5 sm:h-5" />
                  <span className="hidden sm:inline">Scan</span>
                </button>
              </div>

              {/* Status Messages */}
              {error && (
                <div className="mt-2 sm:mt-3 flex items-start gap-2 p-2 sm:p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-xs sm:text-sm">
                  <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 text-red-400 shrink-0 mt-0.5" />
                  <p className="text-red-300">{error}</p>
                </div>
              )}

              {success && (
                <div className="mt-2 sm:mt-3 flex items-start gap-2 p-2 sm:p-3 bg-green-500/10 border border-green-500/30 rounded-lg text-xs sm:text-sm">
                  <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 text-green-400 shrink-0 mt-0.5" />
                  <p className="text-green-300">{success}</p>
                </div>
              )}

              {/* Inline Camera Scanner (embedded in POS) */}
              {showCameraScanner && (
                <div className="mt-3 w-full">
                  <BarcodeScanner
                    inline
                    autoStart={false}
                    onDetected={(barcode) => {
                      console.log('Camera detected barcode:', barcode);
                      // Focus back to input so keyboard bridge works reliably
                      focusScanInput();
                    }}
                    onClose={() => setShowCameraScanner(false)}
                  />
                </div>
              )}

              {lastScannedBarcode && (
                <p className="mt-1 sm:mt-2 text-xs text-slate-400">
                  Last scanned: <span className="font-mono text-slate-300">{lastScannedBarcode}</span>
                </p>
              )}
            </div>

            {/* Cart Items */}
            <div className="flex-1 overflow-y-auto p-3 sm:p-6">
              {cart.items.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-slate-400">
                  <ShoppingCart className="w-12 h-12 sm:w-16 sm:h-16 opacity-20 mb-4" />
                  <p className="text-center text-sm sm:text-base">Cart is empty</p>
                  <p className="text-xs text-slate-500 mt-2">Scan a barcode to add items</p>
                </div>
              ) : (
                <div className="space-y-2 sm:space-y-3">
                  {cart.items.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => setSelectedItem(selectedItem?.id === item.id ? null : item)}
                      className={`p-3 sm:p-4 rounded-lg border-2 cursor-pointer transition text-sm sm:text-base ${
                        selectedItem?.id === item.id
                          ? 'bg-blue-500/10 border-blue-500'
                          : 'bg-slate-800 border-slate-700 hover:border-slate-600'
                      }`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-white truncate">{item.item_name}</h4>
                          <p className="text-xs text-slate-400 font-mono truncate">Barcode: {item.barcode}</p>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRemoveItem(item.id);
                          }}
                          className="p-1.5 sm:p-2 hover:bg-red-500/20 rounded transition text-red-400 hover:text-red-300 shrink-0"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="grid grid-cols-2 gap-2 sm:gap-4 mb-3">
                        <div>
                          <p className="text-xs text-slate-400">Unit Price</p>
                          <p className="text-green-400 font-bold text-sm sm:text-base">KES {item.unit_price.toLocaleString()}</p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-400">Subtotal</p>
                          <p className="text-blue-400 font-bold text-sm sm:text-base">KES {item.total_amount.toLocaleString()}</p>
                        </div>
                      </div>

                      {/* Quantity Controls */}
                      <div className="flex items-center justify-between bg-slate-700/50 rounded p-2 text-sm">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleQuantityChange(item.id, -1);
                          }}
                          className="p-1 hover:bg-slate-600 rounded transition text-slate-300 hover:text-white"
                        >
                          <Minus className="w-3 h-3 sm:w-4 sm:h-4" />
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
                          <Plus className="w-3 h-3 sm:w-4 sm:h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Sidebar - Cart Summary & Checkout */}
          <div className="w-full lg:w-80 border-t lg:border-t-0 lg:border-l border-slate-800 bg-slate-800/50 p-3 sm:p-6 flex flex-col shrink-0">
            {/* Summary */}
            <div className="mb-4 sm:mb-6 space-y-2 sm:space-y-3 text-sm sm:text-base">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Items</span>
                <span className="text-xl sm:text-2xl font-bold text-white">{cart.item_count}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Unique Products</span>
                <span className="text-lg sm:text-xl font-bold text-white">{cart.items.length}</span>
              </div>
              <div className="h-px bg-slate-700" />
              <div className="flex items-center justify-between bg-gradient-to-r from-blue-500/10 to-green-500/10 p-2 sm:p-3 rounded-lg border border-blue-500/20 text-sm sm:text-base">
                <span className="text-slate-300 font-semibold">Total Amount</span>
                <span className="text-2xl sm:text-3xl font-bold text-green-400">
                  KES {cart.total_amount.toLocaleString()}
                </span>
              </div>
            </div>

            {/* Action Buttons */}
            {/* payment panel moved to modal for reliable visibility */}
            <div className="space-y-2 sm:space-y-3 mt-auto">
              <button
                onClick={handleCheckout}
                disabled={cart.items.length === 0}
                className="w-full py-2 sm:py-3 bg-green-600 hover:bg-green-700 disabled:bg-slate-700 disabled:text-slate-500 text-white font-bold rounded-lg transition flex items-center justify-center gap-2 text-sm sm:text-base"
              >
                <DollarSign className="w-4 h-4 sm:w-5 sm:h-5" />
                Checkout
              </button>

              <button
                onClick={() => {
                  setCart(createEmptyCart());
                  setError('');
                  setSuccess('');
                  focusScanInput();
                }}
                disabled={cart.items.length === 0}
                className="w-full py-2 bg-slate-700 hover:bg-slate-600 disabled:bg-slate-800 disabled:text-slate-600 text-slate-300 font-medium rounded-lg transition text-sm sm:text-base"
              >
                Clear Cart
              </button>

              <button
                onClick={onClose}
                className="w-full py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 font-medium rounded-lg transition text-sm sm:text-base"
              >
                Close POS
              </button>
            </div>

            {/* Tips */}
            <div className="mt-4 sm:mt-6 p-2 sm:p-3 bg-slate-700/50 rounded-lg text-xs text-slate-400 space-y-2">
              <p className="font-semibold text-slate-300 flex items-center gap-2">
                <Scan className="w-3 h-3 sm:w-4 sm:h-4" /> Tips
              </p>
              <ul className="list-disc list-inside space-y-1 text-xs">
                <li>Scan input focused</li>
                <li>Press Enter to add</li>
                <li>Tap items to adjust qty</li>
                <li>Stock limits checked</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Payment Modal - centered and always visible when active */}
      {showPaymentPanel && (
        <div className="fixed inset-0 z-[70] bg-black/60 flex items-center justify-center p-4">
          <div className="bg-slate-900 rounded-lg p-6 w-full max-w-md border border-slate-800 shadow-2xl">
            <h3 className="text-lg font-bold text-white mb-4">Select Payment Method</h3>
            <div className="text-center mb-4 text-sm text-slate-300">
              Total: <span className="font-bold text-green-400">KES {cart.total_amount.toLocaleString()}</span>
            </div>
            <div className="grid grid-cols-3 gap-3 mb-4">
              <button onClick={() => doPayment('MPESA')} className="py-3 px-2 bg-amber-500 hover:bg-amber-600 rounded-lg font-semibold text-white transition">💳 MPESA</button>
              <button onClick={() => doPayment('CASH')} className="py-3 px-2 bg-green-500 hover:bg-green-600 rounded-lg font-semibold text-white transition">💵 CASH</button>
              <button onClick={() => doPayment('MADENI')} className="py-3 px-2 bg-blue-600 hover:bg-blue-700 rounded-lg font-semibold text-white transition">🪙 MADENI</button>
            </div>
            <button onClick={() => setShowPaymentPanel(false)} className="w-full px-3 py-2 bg-slate-700 hover:bg-slate-600 rounded text-slate-200">Cancel</button>
          </div>
        </div>
      )}
        </div>
      </div>
    </>
  );
};

export default BarcodePOS;
