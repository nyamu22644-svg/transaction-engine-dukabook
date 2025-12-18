import React, { useState, useRef, useEffect } from 'react';
import { X, Trash2, Plus, Minus, Wifi, Camera, Settings, Phone, User } from 'lucide-react';
import { findProductByBarcode, addItemToCart, createEmptyCart, removeFromCart, updateCartItemQuantity } from '../services/barcodePOSService';
import { DualModeScannerInput } from './DualModeScannerInput';
import { StoreProfile, PaymentMode } from '../types';

interface POSOverlayProps {
  store: StoreProfile;
  onClose: () => void;
  onCheckout?: (cart: any) => Promise<void>;
}

interface CartItem {
  id: string;
  item_name: string;
  unit_price: number;
  quantity: number;
  total_amount: number;
  current_stock: number;
  barcode: string;
}

interface POSCartState {
  items: CartItem[];
  total_amount: number;
  item_count: number;
}

/**
 * Full-Screen POS Overlay Modal
 * 2-Column Layout:
 * - Left: Scanner input + numeric keypad
 * - Right: Live cart with items and totals
 */
export const POSOverlay: React.FC<POSOverlayProps> = ({ store, onClose, onCheckout }) => {
  // State
  const [cart, setCart] = useState<POSCartState>(createEmptyCart());
  const [selectedItem, setSelectedItem] = useState<CartItem | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [processing, setProcessing] = useState(false);
  const [amountTendered, setAmountTendered] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'CARD' | 'MPESA' | 'MADENI'>('CASH');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [mpesaPhone, setMpesaPhone] = useState('');

  // Derived values
  const changeDue = amountTendered - cart.total_amount;
  const isPaymentSufficient = amountTendered >= cart.total_amount;
  const canCheckout = 
    (paymentMethod === 'CASH' && isPaymentSufficient) ||
    (paymentMethod === 'CARD') ||
    (paymentMethod === 'MPESA' && mpesaPhone.length >= 9) ||
    (paymentMethod === 'MADENI' && customerPhone.length >= 9 && customerName.trim());
    
  const commonDenominations = [
    { label: 'Exact', amount: cart.total_amount },
    { label: '100', amount: 100 },
    { label: '200', amount: 200 },
    { label: '500', amount: 500 },
    { label: '1000', amount: 1000 },
  ];

  // Refs
  const containerRef = useRef<HTMLDivElement>(null);

  // Handle Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  /**
   * Handle barcode scan from DualModeScannerInput
   */
  const handleBarcodeScan = async (barcode: string) => {
    setError('');
    setSuccess('');

    try {
      const product = await findProductByBarcode(barcode, store.id);

      if (!product) {
        setError(`❌ Barcode not found: ${barcode}`);
        return;
      }

      const availableStock = product.quantity_on_hand || product.current_stock || 0;
      if (availableStock <= 0) {
        setError(`❌ "${product.item_name}" is out of stock`);
        return;
      }

      const updatedCart = addItemToCart(cart, product, 1);
      setCart(updatedCart);
      setSuccess(`✓ Added: ${product.item_name}`);

      setTimeout(() => setSuccess(''), 2000);
    } catch (err) {
      console.error('Scan error:', err);
      setError('Error processing barcode');
    }
  };

  /**
   * Update item quantity
   */
  const handleQuantityChange = (itemId: string, delta: number) => {
    const item = cart.items.find(i => i.id === itemId);
    if (!item) return;

    const newQuantity = item.quantity + delta;
    const updatedCart = updateCartItemQuantity(cart, itemId, newQuantity);
    setCart(updatedCart);
  };

  /**
   * Remove item from cart
   */
  const handleRemoveItem = (itemId: string) => {
    const updatedCart = removeFromCart(cart, itemId);
    setCart(updatedCart);
    setSelectedItem(null);
  };

  /**
   * Checkout
   */
  const handleCheckout = async () => {
    if (cart.items.length === 0) {
      setError('Cart is empty');
      return;
    }

    if (paymentMethod === 'CASH' && !isPaymentSufficient) {
      setError('Insufficient payment');
      return;
    }

    if (!canCheckout) {
      setError('Please fill in required payment details');
      return;
    }

    setProcessing(true);
    try {
      if (onCheckout) {
        await onCheckout({
          cart,
          payment: {
            method: paymentMethod,
            amountTendered: paymentMethod === 'CASH' ? amountTendered : cart.total_amount,
            changeDue: paymentMethod === 'CASH' ? changeDue : 0,
            customerPhone: (paymentMethod === 'MADENI' || paymentMethod === 'MPESA') ? (paymentMethod === 'MADENI' ? customerPhone : mpesaPhone) : undefined,
            customerName: paymentMethod === 'MADENI' ? customerName : undefined,
          },
        });
      }
      // Reset for next customer
      setCart(createEmptyCart());
      setAmountTendered(0);
      setSelectedItem(null);
      setCustomerPhone('');
      setCustomerName('');
      setMpesaPhone('');
      setSuccess('✓ Sale recorded!');
      setTimeout(() => setSuccess(''), 2000);
    } catch (err) {
      console.error('Checkout error:', err);
      setError('Sale recording failed');
      setTimeout(() => setError(''), 3000);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-50 bg-slate-900 flex flex-col overflow-hidden"
    >
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-800 px-6 py-4 flex items-center justify-between border-b border-blue-900">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold">📱</span>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">POS Checkout</h1>
            <p className="text-blue-100 text-sm">{store.store_name}</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-2 hover:bg-blue-700 rounded-lg transition text-white"
        >
          <X className="w-6 h-6" />
        </button>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden gap-4 p-4">
        {/* LEFT COLUMN: Scanner Input */}
        <div className="flex-1 flex flex-col bg-slate-800 rounded-xl p-6 space-y-4 overflow-hidden">
          <div className="space-y-4 flex-1 overflow-y-auto">
            {/* Scanner Component */}
            <DualModeScannerInput
              onScan={handleBarcodeScan}
              placeholder="Place scanner here or tap camera..."
            />

            {/* Status Messages */}
            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-300 text-sm flex items-start gap-2">
                <span>❌</span>
                <span>{error}</span>
              </div>
            )}

            {success && (
              <div className="p-3 bg-green-500/10 border border-green-500/30 rounded-lg text-green-300 text-sm flex items-start gap-2">
                <span>✓</span>
                <span>{success}</span>
              </div>
            )}

            {/* Numeric Keypad (Optional - for touch input) */}
            <div className="mt-auto pt-4 border-t border-slate-700">
              <p className="text-xs text-slate-400 mb-3 font-semibold">Quick Input</p>
              <div className="grid grid-cols-3 gap-2">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                  <button
                    key={num}
                    className="bg-slate-700 hover:bg-slate-600 text-white py-2 rounded-lg font-semibold transition active:scale-95"
                    onClick={() => console.log(`Keypad: ${num}`)}
                  >
                    {num}
                  </button>
                ))}
                <button
                  className="col-span-3 bg-slate-700 hover:bg-slate-600 text-white py-2 rounded-lg font-semibold transition active:scale-95"
                  onClick={() => console.log('Keypad: 0')}
                >
                  0
                </button>
              </div>
            </div>
          </div>

          {/* Close Button */}
          <button
            onClick={onClose}
            className="w-full py-3 bg-slate-700 hover:bg-slate-600 text-white font-semibold rounded-lg transition"
          >
            Exit POS (Esc)
          </button>
        </div>

        {/* RIGHT COLUMN: Live Cart */}
        <div className="w-96 flex flex-col bg-slate-800 rounded-xl p-6 overflow-hidden h-full">
          {/* Cart Header - Fixed */}
          <div className="space-y-2 flex-shrink-0">
            <h2 className="text-xl font-bold text-white">Live Cart</h2>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="bg-slate-700 rounded-lg p-2">
                <p className="text-slate-400">Items</p>
                <p className="text-2xl font-bold text-white">{cart.item_count}</p>
              </div>
              <div className="bg-slate-700 rounded-lg p-2">
                <p className="text-slate-400">Products</p>
                <p className="text-2xl font-bold text-white">{cart.items.length}</p>
              </div>
            </div>
          </div>

          {/* Scrollable Content Area */}
          <div className="flex-1 overflow-y-auto space-y-3">
            {/* Cart Items */}
            <div className="space-y-2">
              {cart.items.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-slate-400">
                  <span className="text-4xl mb-2">🛒</span>
                  <p className="text-sm">Cart empty</p>
                  <p className="text-xs mt-1">Scan items to add</p>
                </div>
            ) : (
              cart.items.map((item) => (
                <div
                  key={item.id}
                  onClick={() => setSelectedItem(selectedItem?.id === item.id ? null : item)}
                  className={`p-3 rounded-lg border-2 cursor-pointer transition ${
                    selectedItem?.id === item.id
                      ? 'bg-blue-500/20 border-blue-500'
                      : 'bg-slate-700 border-slate-600 hover:border-slate-500'
                  }`}
                >
                  {/* Item Header */}
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <p className="font-semibold text-white text-sm">{item.item_name}</p>
                      <p className="text-xs text-slate-400 font-mono">{item.barcode}</p>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemoveItem(item.id);
                      }}
                      className="p-1 hover:bg-red-500/20 rounded transition text-red-400 hover:text-red-300"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Prices */}
                  <div className="grid grid-cols-2 gap-2 mb-2 text-xs">
                    <div>
                      <p className="text-slate-400">Unit</p>
                      <p className="text-green-400 font-semibold">
                        {item.unit_price.toLocaleString()} KES
                      </p>
                    </div>
                    <div>
                      <p className="text-slate-400">Subtotal</p>
                      <p className="text-blue-400 font-semibold">
                        {item.total_amount.toLocaleString()} KES
                      </p>
                    </div>
                  </div>

                  {/* Quantity Controls */}
                  {selectedItem?.id === item.id && (
                    <div className="flex items-center gap-2 bg-slate-600 rounded-lg p-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleQuantityChange(item.id, -1);
                        }}
                        className="p-1 hover:bg-slate-500 rounded transition text-slate-300"
                      >
                        <Minus className="w-4 h-4" />
                      </button>
                      <div className="flex-1 text-center">
                        <p className="font-bold text-white">{item.quantity}</p>
                        <p className="text-xs text-slate-400">max: {item.current_stock}</p>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (item.quantity < item.current_stock) {
                            handleQuantityChange(item.id, 1);
                          }
                        }}
                        disabled={item.quantity >= item.current_stock}
                        className="p-1 hover:bg-slate-500 rounded transition text-slate-300 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              ))
            )}
            </div>

            {/* Divider */}
            <div className="border-t border-slate-600" />

            {/* Total & Payment Calculator */}
            <div className="space-y-3">
              {/* Total Amount */}
              <div className="bg-gradient-to-r from-green-600/20 to-blue-600/20 rounded-lg p-4 border border-green-500/30">
                <p className="text-slate-300 text-sm mb-1">Total Amount</p>
                <p className="text-4xl font-bold text-green-400">
                  {cart.total_amount.toLocaleString()} <span className="text-lg">KES</span>
                </p>
              </div>

              {/* Payment Method Toggle */}
              <div className="grid grid-cols-2 gap-2">
                <label className="flex items-center gap-2 cursor-pointer p-2 rounded border border-slate-600 hover:border-slate-500 transition" onClick={() => setPaymentMethod('CASH')}>
                  <input type="radio" name="payment" value="CASH" checked={paymentMethod === 'CASH'} onChange={() => setPaymentMethod('CASH')} className="w-4 h-4" />
                  <span className="text-slate-300 text-xs font-semibold">💵 Cash</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer p-2 rounded border border-slate-600 hover:border-slate-500 transition" onClick={() => setPaymentMethod('CARD')}>
                  <input type="radio" name="payment" value="CARD" checked={paymentMethod === 'CARD'} onChange={() => setPaymentMethod('CARD')} className="w-4 h-4" />
                  <span className="text-slate-300 text-xs font-semibold">💳 Card</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer p-2 rounded border border-slate-600 hover:border-slate-500 transition" onClick={() => setPaymentMethod('MPESA')}>
                  <input type="radio" name="payment" value="MPESA" checked={paymentMethod === 'MPESA'} onChange={() => setPaymentMethod('MPESA')} className="w-4 h-4" />
                  <span className="text-slate-300 text-xs font-semibold">📱 M-Pesa</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer p-2 rounded border border-slate-600 hover:border-slate-500 transition" onClick={() => setPaymentMethod('MADENI')}>
                  <input type="radio" name="payment" value="MADENI" checked={paymentMethod === 'MADENI'} onChange={() => setPaymentMethod('MADENI')} className="w-4 h-4" />
                  <span className="text-slate-300 text-xs font-semibold">📒 Madeni</span>
                </label>
              </div>

            {/* Payment Input Section */}
            {paymentMethod === 'CASH' && (
              <>
                {/* Amount Input */}
                <div>
                  <label className="text-sm text-slate-400 block mb-2">Amount Received (KES)</label>
                  <input
                    type="number"
                    value={amountTendered || ''}
                    onChange={(e) => setAmountTendered(Math.max(0, parseFloat(e.target.value) || 0))}
                    placeholder="Enter amount"
                    className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 text-lg font-semibold"
                  />
                </div>

                {/* Change/Owe Display */}
                <div className={`p-3 rounded-lg border-2 text-center transition ${
                  isPaymentSufficient
                    ? 'bg-green-600/20 border-green-500/50'
                    : 'bg-red-600/20 border-red-500/50'
                }`}>
                  {isPaymentSufficient ? (
                    <>
                      <p className="text-slate-400 text-xs uppercase">Change Due</p>
                      <p className="text-3xl font-bold text-green-400">
                        {changeDue.toLocaleString()} KES
                      </p>
                    </>
                  ) : (
                    <>
                      <p className="text-slate-400 text-xs uppercase">Still Owe</p>
                      <p className="text-3xl font-bold text-red-400">
                        {Math.abs(changeDue).toLocaleString()} KES
                      </p>
                    </>
                  )}
                </div>

                {/* Quick Cash Buttons */}
                <div className="grid grid-cols-5 gap-2">
                  {commonDenominations.map((denom) => (
                    <button
                      key={denom.label}
                      onClick={() => setAmountTendered(amountTendered + denom.amount)}
                      className="py-2 px-1 bg-slate-700 hover:bg-slate-600 text-slate-300 hover:text-white text-xs font-bold rounded transition active:scale-95 border border-slate-600"
                    >
                      {denom.label}
                    </button>
                  ))}
                </div>
              </>
            )}

            {/* Card Payment Info */}
            {paymentMethod === 'CARD' && (
              <div className="p-3 bg-blue-600/20 border border-blue-500/30 rounded-lg">
                <p className="text-slate-300 text-sm">💳 Card payment will be processed automatically on checkout.</p>
              </div>
            )}

            {/* M-Pesa Payment */}
            {paymentMethod === 'MPESA' && (
              <div className="space-y-3">
                <div>
                  <label className="text-sm text-slate-400 block mb-2">Customer Phone (M-Pesa)</label>
                  <input
                    type="tel"
                    value={mpesaPhone}
                    onChange={(e) => setMpesaPhone(e.target.value.replace(/\D/g, '').slice(0, 12))}
                    placeholder="0712345678 or 254712345678"
                    className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-orange-500 text-lg font-semibold"
                  />
                  <p className="text-xs text-slate-400 mt-1">STK Push will be sent to this number</p>
                </div>
                <div className="p-3 bg-orange-600/20 border border-orange-500/30 rounded-lg">
                  <p className="text-slate-300 text-sm">📱 Customer will receive M-Pesa prompt on their phone to complete payment.</p>
                </div>
              </div>
            )}

            {/* Madeni (Credit) Payment */}
            {paymentMethod === 'MADENI' && (
              <div className="space-y-3">
                <div>
                  <label className="text-sm text-slate-400 block mb-2 flex items-center gap-2">
                    <User className="w-4 h-4" /> Customer Name
                  </label>
                  <input
                    type="text"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="e.g., John Doe"
                    className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
                  />
                </div>
                <div>
                  <label className="text-sm text-slate-400 block mb-2 flex items-center gap-2">
                    <Phone className="w-4 h-4" /> Customer Phone
                  </label>
                  <input
                    type="tel"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value.replace(/\D/g, '').slice(0, 12))}
                    placeholder="0712345678"
                    className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
                  />
                </div>
                <div className="p-3 bg-purple-600/20 border border-purple-500/30 rounded-lg">
                  <p className="text-slate-300 text-sm">📒 Sale will be recorded as credit. Customer name and phone will be tracked for follow-up.</p>
                  <p className="text-yellow-300 text-xs mt-2">Total Due: <span className="font-bold text-lg">{cart.total_amount.toLocaleString()} KES</span></p>
                </div>
              </div>
            )}

            {/* Checkout Button */}
              <button
                onClick={handleCheckout}
                disabled={
                  cart.items.length === 0 ||
                  processing ||
                  (paymentMethod === 'CASH' && !isPaymentSufficient)
                }
                className="w-full py-3 bg-green-600 hover:bg-green-700 disabled:bg-slate-600 disabled:text-slate-500 text-white font-bold rounded-lg transition flex items-center justify-center gap-2 active:scale-95"
              >
                {processing ? (
                  <>
                    <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                    Recording...
                  </>
                ) : (
                  <>
                    ✅ Complete Sale
                  </>
                )}
              </button>

              {/* Clear Cart Button */}
              <button
                onClick={() => {
                  setCart(createEmptyCart());
                  setSelectedItem(null);
                  setAmountTendered(0);
                }}
                disabled={cart.items.length === 0}
                className="w-full py-2 bg-slate-700 hover:bg-slate-600 disabled:bg-slate-800 disabled:text-slate-600 text-slate-300 font-semibold rounded-lg transition"
              >
                Clear Cart
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default POSOverlay;
