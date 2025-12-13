import React, { useState, useEffect } from 'react';
import { X, Plus, Truck, Phone, Calendar, DollarSign, Check, AlertTriangle, Trash2 } from 'lucide-react';
import { Supplier, SupplierInvoice, StoreProfile } from '../types';
import { fetchSuppliers, createSupplier, fetchSupplierInvoices, addSupplierInvoice, markSupplierInvoicePaid } from '../services/supabaseService';
import { THEME_COLORS, DEFAULT_THEME } from '../constants';

interface SupplierManagerProps {
  store: StoreProfile;
  onClose: () => void;
}

export const SupplierManager: React.FC<SupplierManagerProps> = ({ store, onClose }) => {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [invoices, setInvoices] = useState<SupplierInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'suppliers' | 'debts'>('debts');
  
  // Add Supplier Form
  const [showAddSupplier, setShowAddSupplier] = useState(false);
  const [newSupplierName, setNewSupplierName] = useState('');
  const [newSupplierPhone, setNewSupplierPhone] = useState('');
  const [addingSupplier, setAddingSupplier] = useState(false);
  
  // Add Invoice Form
  const [showAddInvoice, setShowAddInvoice] = useState(false);
  const [selectedSupplierId, setSelectedSupplierId] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [invoiceAmount, setInvoiceAmount] = useState('');
  const [invoiceDueDate, setInvoiceDueDate] = useState('');
  const [addingInvoice, setAddingInvoice] = useState(false);

  const theme = THEME_COLORS[store.theme_color || 'blue'] || DEFAULT_THEME;

  useEffect(() => {
    loadData();
  }, [store.id]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [suppliersData, invoicesData] = await Promise.all([
        fetchSuppliers(store.id),
        fetchSupplierInvoices(store.id)
      ]);
      setSuppliers(suppliersData);
      setInvoices(invoicesData);
    } catch (err) {
      console.error('Failed to load supplier data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSupplierName.trim()) return;
    
    setAddingSupplier(true);
    try {
      await createSupplier({
        store_id: store.id,
        name: newSupplierName.trim(),
        phone: newSupplierPhone || undefined
      });
      setNewSupplierName('');
      setNewSupplierPhone('');
      setShowAddSupplier(false);
      loadData();
    } catch (err) {
      console.error('Failed to add supplier:', err);
      alert('Failed to add supplier');
    } finally {
      setAddingSupplier(false);
    }
  };

  const handleAddInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSupplierId || !invoiceAmount) return;
    
    setAddingInvoice(true);
    try {
      await addSupplierInvoice({
        store_id: store.id,
        supplier_id: selectedSupplierId,
        invoice_number: invoiceNumber || `INV-${Date.now()}`,
        invoice_date: new Date().toISOString(),
        due_date: invoiceDueDate || undefined,
        subtotal: parseFloat(invoiceAmount),
        tax_amount: 0,
        total_amount: parseFloat(invoiceAmount),
        status: 'PENDING'
      });
      setSelectedSupplierId('');
      setInvoiceNumber('');
      setInvoiceAmount('');
      setInvoiceDueDate('');
      setShowAddInvoice(false);
      loadData();
    } catch (err) {
      console.error('Failed to add invoice:', err);
      alert('Failed to add invoice');
    } finally {
      setAddingInvoice(false);
    }
  };

  const handleMarkPaid = async (invoiceId: string) => {
    if (!window.confirm('Mark this invoice as paid?')) return;
    try {
      await markSupplierInvoicePaid(invoiceId);
      loadData();
    } catch (err) {
      console.error('Failed to mark invoice paid:', err);
    }
  };

  const getSupplierName = (supplierId: string) => {
    return suppliers.find(s => s.id === supplierId)?.name || 'Unknown';
  };

  const getDaysUntilDue = (dueDate?: string) => {
    if (!dueDate) return null;
    const due = new Date(dueDate);
    const today = new Date();
    const diff = Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return diff;
  };

  const pendingInvoices = invoices.filter(i => i.status !== 'PAID');
  const totalOwed = pendingInvoices.reduce((sum, i) => sum + i.total_amount, 0);
  const overdueInvoices = pendingInvoices.filter(i => {
    const days = getDaysUntilDue(i.due_date);
    return days !== null && days < 0;
  });

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl">
        {/* Header */}
        <div className={`p-4 border-b ${theme.bg} text-white rounded-t-xl flex items-center justify-between`}>
          <div>
            <h3 className="font-bold text-lg flex items-center gap-2">
              <Truck className="w-5 h-5" />
              Supplier & Debts Manager
            </h3>
            <p className="text-sm opacity-80">Track what you owe suppliers</p>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-white/20 rounded">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Summary Cards */}
        <div className="p-4 grid grid-cols-3 gap-3 border-b border-slate-100 bg-slate-50">
          <div className="bg-white p-3 rounded-lg border border-slate-200 text-center">
            <div className="text-2xl font-bold text-slate-800">KES {totalOwed.toLocaleString()}</div>
            <div className="text-xs text-slate-500">Total Owed</div>
          </div>
          <div className="bg-white p-3 rounded-lg border border-slate-200 text-center">
            <div className="text-2xl font-bold text-slate-800">{pendingInvoices.length}</div>
            <div className="text-xs text-slate-500">Pending Bills</div>
          </div>
          <div className="bg-white p-3 rounded-lg border border-red-200 text-center bg-red-50">
            <div className="text-2xl font-bold text-red-600">{overdueInvoices.length}</div>
            <div className="text-xs text-red-500">Overdue</div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-200">
          <button
            onClick={() => setActiveTab('debts')}
            className={`flex-1 py-3 text-sm font-medium ${activeTab === 'debts' ? `${theme.text} border-b-2 ${theme.border}` : 'text-slate-500'}`}
          >
            Bills & Debts ({pendingInvoices.length})
          </button>
          <button
            onClick={() => setActiveTab('suppliers')}
            className={`flex-1 py-3 text-sm font-medium ${activeTab === 'suppliers' ? `${theme.text} border-b-2 ${theme.border}` : 'text-slate-500'}`}
          >
            Suppliers ({suppliers.length})
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="text-center py-8 text-slate-400">Loading...</div>
          ) : activeTab === 'debts' ? (
            <div className="space-y-3">
              {/* Add Invoice Button */}
              {!showAddInvoice && (
                <button
                  onClick={() => setShowAddInvoice(true)}
                  className={`w-full py-2 px-4 border-2 border-dashed ${theme.border} ${theme.text} rounded-lg font-medium flex items-center justify-center gap-2 hover:bg-slate-50`}
                >
                  <Plus className="w-4 h-4" />
                  Add Supplier Bill
                </button>
              )}

              {/* Add Invoice Form */}
              {showAddInvoice && (
                <form onSubmit={handleAddInvoice} className="bg-slate-50 p-4 rounded-lg border border-slate-200 space-y-3">
                  <select
                    value={selectedSupplierId}
                    onChange={(e) => setSelectedSupplierId(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                    required
                  >
                    <option value="">Select Supplier</option>
                    {suppliers.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      placeholder="Invoice # (optional)"
                      value={invoiceNumber}
                      onChange={(e) => setInvoiceNumber(e.target.value)}
                      className="px-3 py-2 border border-slate-200 rounded-lg"
                    />
                    <input
                      type="number"
                      placeholder="Amount (KES)"
                      value={invoiceAmount}
                      onChange={(e) => setInvoiceAmount(e.target.value)}
                      className="px-3 py-2 border border-slate-200 rounded-lg"
                      required
                    />
                  </div>
                  <input
                    type="date"
                    placeholder="Due Date"
                    value={invoiceDueDate}
                    onChange={(e) => setInvoiceDueDate(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                  />
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setShowAddInvoice(false)}
                      className="flex-1 py-2 border border-slate-300 rounded-lg text-slate-600"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={addingInvoice}
                      className={`flex-1 py-2 ${theme.bg} text-white rounded-lg font-medium`}
                    >
                      {addingInvoice ? 'Adding...' : 'Add Bill'}
                    </button>
                  </div>
                </form>
              )}

              {/* Invoice List */}
              {pendingInvoices.length === 0 ? (
                <div className="text-center py-8 text-slate-400">
                  <DollarSign className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>No pending bills</p>
                  <p className="text-xs">Add supplier bills to track what you owe</p>
                </div>
              ) : (
                pendingInvoices.map(invoice => {
                  const daysUntilDue = getDaysUntilDue(invoice.due_date);
                  const isOverdue = daysUntilDue !== null && daysUntilDue < 0;
                  const isDueSoon = daysUntilDue !== null && daysUntilDue >= 0 && daysUntilDue <= 3;
                  
                  return (
                    <div
                      key={invoice.id}
                      className={`p-4 rounded-lg border ${isOverdue ? 'border-red-300 bg-red-50' : isDueSoon ? 'border-amber-300 bg-amber-50' : 'border-slate-200 bg-white'}`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-semibold text-slate-800">{getSupplierName(invoice.supplier_id)}</div>
                          <div className="text-xs text-slate-500">
                            {invoice.invoice_number} • {new Date(invoice.invoice_date).toLocaleDateString()}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-lg text-slate-800">KES {invoice.total_amount.toLocaleString()}</div>
                          {invoice.due_date && (
                            <div className={`text-xs flex items-center gap-1 justify-end ${isOverdue ? 'text-red-600' : isDueSoon ? 'text-amber-600' : 'text-slate-500'}`}>
                              {isOverdue && <AlertTriangle className="w-3 h-3" />}
                              <Calendar className="w-3 h-3" />
                              {isOverdue ? `${Math.abs(daysUntilDue!)} days overdue` : `Due in ${daysUntilDue} days`}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="mt-3 flex gap-2">
                        <button
                          onClick={() => handleMarkPaid(invoice.id)}
                          className="flex-1 py-1.5 bg-green-500 text-white rounded-lg text-sm font-medium flex items-center justify-center gap-1"
                        >
                          <Check className="w-3 h-3" />
                          Mark Paid
                        </button>
                        <button
                          onClick={() => {
                            const message = `Hi, this is ${store.name}. Regarding invoice ${invoice.invoice_number} of KES ${invoice.total_amount.toLocaleString()}. I will pay soon.`;
                            window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank');
                          }}
                          className="py-1.5 px-3 bg-green-600 text-white rounded-lg text-sm"
                        >
                          WhatsApp
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {/* Add Supplier Button */}
              {!showAddSupplier && (
                <button
                  onClick={() => setShowAddSupplier(true)}
                  className={`w-full py-2 px-4 border-2 border-dashed ${theme.border} ${theme.text} rounded-lg font-medium flex items-center justify-center gap-2 hover:bg-slate-50`}
                >
                  <Plus className="w-4 h-4" />
                  Add Supplier
                </button>
              )}

              {/* Add Supplier Form */}
              {showAddSupplier && (
                <form onSubmit={handleAddSupplier} className="bg-slate-50 p-4 rounded-lg border border-slate-200 space-y-3">
                  <input
                    type="text"
                    placeholder="Supplier Name"
                    value={newSupplierName}
                    onChange={(e) => setNewSupplierName(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                    required
                  />
                  <input
                    type="tel"
                    placeholder="Phone (optional)"
                    value={newSupplierPhone}
                    onChange={(e) => setNewSupplierPhone(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                  />
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setShowAddSupplier(false)}
                      className="flex-1 py-2 border border-slate-300 rounded-lg text-slate-600"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={addingSupplier}
                      className={`flex-1 py-2 ${theme.bg} text-white rounded-lg font-medium`}
                    >
                      {addingSupplier ? 'Adding...' : 'Add Supplier'}
                    </button>
                  </div>
                </form>
              )}

              {/* Supplier List */}
              {suppliers.length === 0 ? (
                <div className="text-center py-8 text-slate-400">
                  <Truck className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>No suppliers added</p>
                  <p className="text-xs">Add your suppliers to track bills</p>
                </div>
              ) : (
                suppliers.map(supplier => {
                  const supplierDebt = pendingInvoices
                    .filter(i => i.supplier_id === supplier.id)
                    .reduce((sum, i) => sum + i.total_amount, 0);
                  
                  return (
                    <div key={supplier.id} className="p-4 bg-white rounded-lg border border-slate-200 flex items-center justify-between">
                      <div>
                        <div className="font-semibold text-slate-800">{supplier.name}</div>
                        {supplier.phone && (
                          <div className="text-xs text-slate-500 flex items-center gap-1">
                            <Phone className="w-3 h-3" />
                            {supplier.phone}
                          </div>
                        )}
                      </div>
                      <div className="text-right">
                        {supplierDebt > 0 ? (
                          <div className="text-red-600 font-bold">Owe: KES {supplierDebt.toLocaleString()}</div>
                        ) : (
                          <div className="text-green-600 text-sm">✓ No debt</div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
