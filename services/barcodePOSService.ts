import { supabase } from './supabaseClient';
import { InventoryItem } from '../types';

/**
 * Barcode POS Service
 * Fast barcode lookup and cart operations for supermarket-style POS
 */

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
 * Find product by barcode for a specific store
 * Uses indexed query for instant lookup (< 10ms)
 */
export const findProductByBarcode = async (
  barcode: string,
  storeId: string
): Promise<InventoryItem | null> => {
  try {
    // Normalize barcode: trim whitespace, standardize formatting
    const normalizedBarcode = barcode.trim();

    const { data, error } = await supabase
      .from('inventory_items')
      .select('*')
      .eq('store_id', storeId)
      .eq('barcode', normalizedBarcode)
      .single();

    if (error && error.code === 'PGRST116') {
      // No rows found
      console.log(`⚠️ Barcode ${barcode} not found for store ${storeId}`);
      return null;
    }

    if (error) throw error;

    const product = data as InventoryItem;
    
    // Check if product has stock
    if (!product) return null;
    
    return product;
  } catch (error) {
    console.error('Error finding product by barcode:', error);
    return null;
  }
};

/**
 * Add item to POS cart (local state operation)
 * Returns updated cart state
 */
export const addItemToCart = (
  cartState: POSCartState,
  product: InventoryItem,
  quantityToAdd: number = 1
): POSCartState => {
  // Check stock availability
  const availableStock = product.quantity_on_hand || product.current_stock || 0;
  
  if (availableStock <= 0) {
    console.warn(`❌ Product "${product.item_name}" is out of stock`);
    return cartState;
  }

  if (quantityToAdd > availableStock) {
    console.warn(`❌ Only ${availableStock} units available, requested ${quantityToAdd}`);
    return cartState;
  }

  // Check if item already in cart
  const existingItemIndex = cartState.items.findIndex(i => i.id === product.id);
  
  let updatedItems: CartItem[];
  
  if (existingItemIndex >= 0) {
    // Item exists - increase quantity
    const existingItem = cartState.items[existingItemIndex];
    const newQuantity = existingItem.quantity + quantityToAdd;
    
    // Verify new quantity doesn't exceed stock
    if (newQuantity > availableStock) {
      console.warn(`❌ Cannot add more - total would exceed stock (${availableStock} available)`);
      return cartState;
    }
    
    updatedItems = [...cartState.items];
    updatedItems[existingItemIndex] = {
      ...existingItem,
      quantity: newQuantity,
      total_amount: (product.unit_price || 0) * newQuantity,
    };
  } else {
    // New item - add to cart
    const cartItem: CartItem = {
      id: product.id,
      item_name: product.item_name,
      unit_price: product.unit_price || 0,
      quantity: quantityToAdd,
      total_amount: (product.unit_price || 0) * quantityToAdd,
      current_stock: availableStock,
      barcode: product.barcode || '',
    };
    
    updatedItems = [...cartState.items, cartItem];
  }

  // Recalculate totals
  const total_amount = updatedItems.reduce((sum, item) => sum + item.total_amount, 0);
  const item_count = updatedItems.reduce((sum, item) => sum + item.quantity, 0);

  return {
    items: updatedItems,
    total_amount,
    item_count,
  };
};

/**
 * Remove item from cart
 */
export const removeFromCart = (
  cartState: POSCartState,
  itemId: string
): POSCartState => {
  const updatedItems = cartState.items.filter(item => item.id !== itemId);
  
  const total_amount = updatedItems.reduce((sum, item) => sum + item.total_amount, 0);
  const item_count = updatedItems.reduce((sum, item) => sum + item.quantity, 0);

  return {
    items: updatedItems,
    total_amount,
    item_count,
  };
};

/**
 * Update item quantity in cart
 */
export const updateCartItemQuantity = (
  cartState: POSCartState,
  itemId: string,
  newQuantity: number
): POSCartState => {
  const itemIndex = cartState.items.findIndex(i => i.id === itemId);
  
  if (itemIndex < 0) {
    console.warn(`Item ${itemId} not found in cart`);
    return cartState;
  }

  if (newQuantity <= 0) {
    return removeFromCart(cartState, itemId);
  }

  const item = cartState.items[itemIndex];
  
  // Check stock
  if (newQuantity > item.current_stock) {
    console.warn(`❌ Only ${item.current_stock} units available`);
    return cartState;
  }

  const updatedItems = [...cartState.items];
  updatedItems[itemIndex] = {
    ...item,
    quantity: newQuantity,
    total_amount: item.unit_price * newQuantity,
  };

  const total_amount = updatedItems.reduce((sum, i) => sum + i.total_amount, 0);
  const item_count = updatedItems.reduce((sum, i) => sum + i.quantity, 0);

  return {
    items: updatedItems,
    total_amount,
    item_count,
  };
};

/**
 * Clear cart
 */
export const clearCart = (): POSCartState => ({
  items: [],
  total_amount: 0,
  item_count: 0,
});

/**
 * Create empty cart state
 */
export const createEmptyCart = (): POSCartState => ({
  items: [],
  total_amount: 0,
  item_count: 0,
});

/**
 * Record a POS sale transaction
 * - Creates sales_transactions record
 * - Updates inventory stock
 * - For Madeni: Creates debtor record
 * - For M-Pesa: Captures customer phone for STK push
 * - Returns transaction ID and receipt data
 */
export const recordPOSSale = async (
  storeId: string,
  cart: POSCartState,
  payment: {
    method: 'CASH' | 'CARD' | 'MPESA' | 'MADENI';
    amountTendered: number;
    changeDue: number;
    customerPhone?: string;
    customerName?: string;
  },
  employeeId?: string
): Promise<{
  transactionId: string;
  receiptData: {
    transactionId: string;
    storeName: string;
    timestamp: string;
    items: CartItem[];
    subtotal: number;
    total: number;
    paymentMethod: string;
    amountTendered: number;
    changeDue: number;
  };
}> => {
  try {
    if (cart.items.length === 0) {
      throw new Error('Cannot record sale with empty cart');
    }

    // Map payment method for database
    const paymentMethodMap: Record<string, string> = {
      'CASH': 'CASH',
      'CARD': 'CARD',
      'MPESA': 'MPESA',
      'MADENI': 'MADENI',
    };

    // 1. Create transaction record
    const { data: transaction, error: txError } = await supabase
      .from('sales_transactions')
      .insert({
        store_id: storeId,
        employee_id: employeeId || null,
        total_amount: cart.total_amount,
        payment_method: paymentMethodMap[payment.method],
        amount_tendered: payment.amountTendered,
        change_due: payment.changeDue,
        customer_phone: payment.customerPhone || null,
        transaction_status: 'COMPLETED',
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (txError) throw txError;

    const transactionId = transaction.id;

    // 2. Create line items and update inventory
    const lineItems = cart.items.map((item) => ({
      transaction_id: transactionId,
      inventory_item_id: item.id,
      quantity_sold: item.quantity,
      unit_price: item.unit_price,
      line_total: item.total_amount,
    }));

    const { error: lineError } = await supabase
      .from('transaction_line_items')
      .insert(lineItems);

    if (lineError) throw lineError;

    // 3. Update inventory stock for each item
    for (const item of cart.items) {
      const { error: updateError } = await supabase
        .from('inventory_items')
        .update({
          current_stock: Math.max(0, item.current_stock - item.quantity),
        })
        .eq('id', item.id);

      if (updateError) {
        console.error(`Failed to update stock for item ${item.id}:`, updateError);
      }
    }

    // 4. For MADENI: Create or update debtor record + log audit trail
    if (payment.method === 'MADENI' && payment.customerPhone && payment.customerName) {
      try {
        const { data: existingDebtor } = await supabase
          .from('debtors')
          .select('id, total_debt')
          .eq('store_id', storeId)
          .eq('customer_phone', payment.customerPhone)
          .single();

        if (existingDebtor) {
          // Update existing debtor
          const newDebt = (existingDebtor.total_debt || 0) + cart.total_amount;
          await supabase
            .from('debtors')
            .update({
              total_debt: newDebt,
              last_sale_date: new Date().toISOString(),
            })
            .eq('id', existingDebtor.id);

          // Log to audit
          await supabase
            .from('audit_logs')
            .insert({
              store_id: storeId,
              action_type: 'DEBT_UPDATED',
              resource_type: 'DEBTOR',
              resource_id: transactionId,
              affected_customer_id: existingDebtor.id,
              affected_customer_name: payment.customerName,
              affected_customer_phone: payment.customerPhone,
              actor_name: 'POS System',
              actor_role: 'SYSTEM',
              old_value: { total_debt: existingDebtor.total_debt },
              new_value: { total_debt: newDebt },
              change_description: `POS sale of KES ${cart.total_amount} added to existing debt. New balance: KES ${newDebt}`,
              metadata: { transaction_id: transactionId, payment_method: 'MADENI' }
            });
        } else {
          // Create new debtor
          const { data: newDebtor } = await supabase
            .from('debtors')
            .insert({
              store_id: storeId,
              customer_name: payment.customerName,
              customer_phone: payment.customerPhone,
              total_debt: cart.total_amount,
              last_sale_date: new Date().toISOString(),
            })
            .select()
            .single();

          // Log to audit
          if (newDebtor) {
            await supabase
              .from('audit_logs')
              .insert({
                store_id: storeId,
                action_type: 'DEBTOR_CREATED',
                resource_type: 'DEBTOR',
                resource_id: transactionId,
                affected_customer_id: newDebtor.id,
                affected_customer_name: payment.customerName,
                affected_customer_phone: payment.customerPhone,
                actor_name: 'POS System',
                actor_role: 'SYSTEM',
                new_value: { 
                  total_debt: cart.total_amount, 
                  customer_name: payment.customerName,
                  customer_phone: payment.customerPhone 
                },
                change_description: `New debtor created: ${payment.customerName}. Initial debt: KES ${cart.total_amount}`,
                metadata: { transaction_id: transactionId, payment_method: 'MADENI' }
              });
          }
        }
      } catch (debtorError) {
        console.error('Error creating/updating debtor record:', debtorError);
        // Don't throw - transaction was already recorded
      }
    }

    // 5. Get store name for receipt
    const { data: store } = await supabase
      .from('stores')
      .select('store_name')
      .eq('id', storeId)
      .single();

    // Map method display name
    const paymentDisplayMap: Record<string, string> = {
      'CASH': 'CASH',
      'CARD': 'CARD',
      'MPESA': 'M-PESA',
      'MADENI': 'MADENI (Credit)',
    };

    // Prepare receipt data
    const receiptData = {
      transactionId,
      storeName: store?.store_name || 'DukaBook Store',
      timestamp: new Date().toLocaleString('en-KE', {
        timeZone: 'Africa/Nairobi',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      }),
      items: cart.items,
      subtotal: cart.total_amount,
      total: cart.total_amount,
      paymentMethod: paymentDisplayMap[payment.method],
      amountTendered: payment.amountTendered,
      changeDue: payment.changeDue,
    };

    return {
      transactionId,
      receiptData,
    };
  } catch (error) {
    console.error('Error recording POS sale:', error);
    throw error;
  }
};
