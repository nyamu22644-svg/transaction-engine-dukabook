import React, { useState, useEffect } from 'react';
import { X, Plus, Users, Phone, CreditCard, AlertTriangle, Edit2, Check } from 'lucide-react';
import { Customer, SalesRecord, StoreProfile, PaymentMode } from '../types';
import { fetchCustomers, createCustomer, updateCustomerCreditLimit, fetchDebtors } from '../services/supabaseService';
import { THEME_COLORS, DEFAULT_THEME } from '../constants';

interface CustomerManagerProps {
  store: StoreProfile;
  onClose: () => void;
}

export const CustomerManager: React.FC<CustomerManagerProps> = ({ store, onClose }) => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [debtors, setDebtors] = useState<SalesRecord[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Add Customer Form
  const [showAddCustomer, setShowAddCustomer] = useState(false);
  const [newCustomerName, setNewCustomerName] = useState('');
  const [newCustomerPhone, setNewCustomerPhone] = useState('');
  const [newCreditLimit, setNewCreditLimit] = useState('5000');
  const [addingCustomer, setAddingCustomer] = useState(false);
  
  // Edit Credit Limit
  const [editingCustomerId, setEditingCustomerId] = useState<string | null>(null);
  const [editCreditLimit, setEditCreditLimit] = useState('');

  const theme = THEME_COLORS[store.theme_color || 'blue'] || DEFAULT_THEME;

  useEffect(() => {
    loadData();
  }, [store.id]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [customersData, debtorsData] = await Promise.all([
        fetchCustomers(store.id),
        fetchDebtors(store.id)
      ]);
      setCustomers(customersData);
      setDebtors(debtorsData);
    } catch (err) {
      console.error('Failed to load customer data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustomerName.trim()) return;
    
    setAddingCustomer(true);
    try {
      await createCustomer({
        store_id: store.id,
        name: newCustomerName.trim(),
        phone: newCustomerPhone || undefined,
        credit_limit: parseInt(newCreditLimit) || 5000
      });
      setNewCustomerName('');
      setNewCustomerPhone('');
      setNewCreditLimit('5000');
      setShowAddCustomer(false);
      loadData();
    } catch (err) {
      console.error('Failed to add customer:', err);
      alert('Failed to add customer');
    } finally {
      setAddingCustomer(false);
    }
  };

  const handleUpdateCreditLimit = async (customerId: string) => {
    try {
      await updateCustomerCreditLimit(customerId, parseInt(editCreditLimit) || 0);
      setEditingCustomerId(null);
      setEditCreditLimit('');
      loadData();
    } catch (err) {
      console.error('Failed to update credit limit:', err);
    }
  };

  const getCustomerDebt = (phone?: string) => {
    if (!phone) return 0;
    return debtors
      .filter(d => d.customer_phone === phone)
      .reduce((sum, d) => sum + d.total_amount, 0);
  };

  const getCustomerByPhone = (phone: string) => {
    return customers.find(c => c.phone === phone);
  };

  // Get all unique debtor phones with their totals
  const debtorSummary = debtors.reduce((acc, d) => {
    if (d.customer_phone) {
      if (!acc[d.customer_phone]) {
        acc[d.customer_phone] = {
          phone: d.customer_phone,
          name: d.customer_name || 'Unknown',
          total: 0,
          count: 0
        };
      }
      acc[d.customer_phone].total += d.total_amount;
      acc[d.customer_phone].count += 1;
    }
    return acc;
  }, {} as Record<string, { phone: string; name: string; total: number; count: number }>);

  const debtorList = Object.values(debtorSummary).sort((a, b) => b.total - a.total);
  const totalDebt = debtorList.reduce((sum, d) => sum + d.total, 0);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl">
        {/* Header */}
        <div className={`p-4 border-b ${theme.bg} text-white rounded-t-xl flex items-center justify-between`}>
          <div>
            <h3 className="font-bold text-lg flex items-center gap-2">
              <Users className="w-5 h-5" />
              Customer Credit Manager
            </h3>
            <p className="text-sm opacity-80">Set credit limits & track who owes you</p>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-white/20 rounded">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Summary Cards */}
        <div className="p-4 grid grid-cols-3 gap-3 border-b border-slate-100 bg-slate-50">
          <div className="bg-white p-3 rounded-lg border border-slate-200 text-center">
            <div className="text-2xl font-bold text-slate-800">{customers.length}</div>
            <div className="text-xs text-slate-500">Registered</div>
          </div>
          <div className="bg-white p-3 rounded-lg border border-amber-200 text-center bg-amber-50">
            <div className="text-2xl font-bold text-amber-600">{debtorList.length}</div>
            <div className="text-xs text-amber-500">With Debt</div>
          </div>
          <div className="bg-white p-3 rounded-lg border border-red-200 text-center bg-red-50">
            <div className="text-2xl font-bold text-red-600">KES {totalDebt.toLocaleString()}</div>
            <div className="text-xs text-red-500">Total Owed</div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {loading ? (
            <div className="text-center py-8 text-slate-400">Loading...</div>
          ) : (
            <>
              {/* Add Customer */}
              {!showAddCustomer ? (
                <button
                  onClick={() => setShowAddCustomer(true)}
                  className={`w-full py-2 px-4 border-2 border-dashed ${theme.border} ${theme.text} rounded-lg font-medium flex items-center justify-center gap-2 hover:bg-slate-50`}
                >
                  <Plus className="w-4 h-4" />
                  Add Customer with Credit Limit
                </button>
              ) : (
                <form onSubmit={handleAddCustomer} className="bg-slate-50 p-4 rounded-lg border border-slate-200 space-y-3">
                  <input
                    type="text"
                    placeholder="Customer Name"
                    value={newCustomerName}
                    onChange={(e) => setNewCustomerName(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                    required
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="tel"
                      placeholder="Phone Number"
                      value={newCustomerPhone}
                      onChange={(e) => setNewCustomerPhone(e.target.value)}
                      className="px-3 py-2 border border-slate-200 rounded-lg"
                    />
                    <div className="relative">
                      <span className="absolute left-3 top-2 text-slate-400">KES</span>
                      <input
                        type="number"
                        placeholder="Credit Limit"
                        value={newCreditLimit}
                        onChange={(e) => setNewCreditLimit(e.target.value)}
                        className="w-full pl-12 pr-3 py-2 border border-slate-200 rounded-lg"
                      />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setShowAddCustomer(false)}
                      className="flex-1 py-2 border border-slate-300 rounded-lg text-slate-600"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={addingCustomer}
                      className={`flex-1 py-2 ${theme.bg} text-white rounded-lg font-medium`}
                    >
                      {addingCustomer ? 'Adding...' : 'Add Customer'}
                    </button>
                  </div>
                </form>
              )}

              {/* Debtors Section */}
              <div>
                <h4 className="font-semibold text-slate-700 mb-2 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-500" />
                  Customers With Debt
                </h4>
                {debtorList.length === 0 ? (
                  <div className="text-center py-6 text-slate-400 bg-slate-50 rounded-lg">
                    No customers with pending debt
                  </div>
                ) : (
                  <div className="space-y-2">
                    {debtorList.map((debtor, idx) => {
                      const customer = getCustomerByPhone(debtor.phone);
                      const creditLimit = customer?.credit_limit || 0;
                      const isOverLimit = creditLimit > 0 && debtor.total > creditLimit;
                      
                      return (
                        <div
                          key={debtor.phone}
                          className={`p-3 rounded-lg border ${isOverLimit ? 'border-red-300 bg-red-50' : 'border-slate-200 bg-white'}`}
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="font-semibold text-slate-800">{debtor.name}</div>
                              <div className="text-xs text-slate-500 flex items-center gap-1">
                                <Phone className="w-3 h-3" />
                                {debtor.phone} • {debtor.count} unpaid sale(s)
                              </div>
                            </div>
                            <div className="text-right">
                              <div className={`font-bold text-lg ${isOverLimit ? 'text-red-600' : 'text-amber-600'}`}>
                                KES {debtor.total.toLocaleString()}
                              </div>
                              {creditLimit > 0 && (
                                <div className={`text-xs ${isOverLimit ? 'text-red-500' : 'text-slate-400'}`}>
                                  Limit: KES {creditLimit.toLocaleString()}
                                  {isOverLimit && ' ⚠️ EXCEEDED'}
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="mt-2 flex gap-2">
                            <button
                              onClick={() => {
                                const message = `Hi ${debtor.name}, this is ${store.name}. You have a pending balance of KES ${debtor.total.toLocaleString()}. Please pay at your earliest convenience. Thank you!`;
                                window.open(`https://wa.me/${debtor.phone.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`, '_blank');
                              }}
                              className="flex-1 py-1.5 bg-green-600 text-white rounded-lg text-sm font-medium"
                            >
                              📱 Send Reminder
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Registered Customers */}
              <div>
                <h4 className="font-semibold text-slate-700 mb-2 flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-blue-500" />
                  Registered Customers with Credit Limits
                </h4>
                {customers.length === 0 ? (
                  <div className="text-center py-6 text-slate-400 bg-slate-50 rounded-lg">
                    No registered customers yet
                  </div>
                ) : (
                  <div className="space-y-2">
                    {customers.map(customer => {
                      const debt = getCustomerDebt(customer.phone);
                      const isEditing = editingCustomerId === customer.id;
                      
                      return (
                        <div key={customer.id} className="p-3 bg-white rounded-lg border border-slate-200">
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="font-semibold text-slate-800">{customer.name}</div>
                              {customer.phone && (
                                <div className="text-xs text-slate-500">{customer.phone}</div>
                              )}
                            </div>
                            <div className="text-right flex items-center gap-2">
                              {isEditing ? (
                                <div className="flex items-center gap-1">
                                  <input
                                    type="number"
                                    value={editCreditLimit}
                                    onChange={(e) => setEditCreditLimit(e.target.value)}
                                    className="w-24 px-2 py-1 border border-slate-300 rounded text-sm"
                                    placeholder="Limit"
                                  />
                                  <button
                                    onClick={() => handleUpdateCreditLimit(customer.id)}
                                    className="p-1 bg-green-500 text-white rounded"
                                  >
                                    <Check className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() => setEditingCustomerId(null)}
                                    className="p-1 bg-slate-300 text-slate-600 rounded"
                                  >
                                    <X className="w-4 h-4" />
                                  </button>
                                </div>
                              ) : (
                                <>
                                  <div>
                                    <div className="text-sm text-slate-600">
                                      Limit: KES {(customer.credit_limit || 0).toLocaleString()}
                                    </div>
                                    {debt > 0 && (
                                      <div className="text-xs text-amber-600">Owes: KES {debt.toLocaleString()}</div>
                                    )}
                                  </div>
                                  <button
                                    onClick={() => {
                                      setEditingCustomerId(customer.id);
                                      setEditCreditLimit(String(customer.credit_limit || 0));
                                    }}
                                    className="p-1 text-slate-400 hover:text-slate-600"
                                  >
                                    <Edit2 className="w-4 h-4" />
                                  </button>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
