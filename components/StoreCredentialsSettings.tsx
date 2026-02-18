import React, { useEffect, useState } from 'react';
import { X, Key, Lock, Copy, Trash2, Plus, Eye, EyeOff, CheckCircle, AlertCircle } from 'lucide-react';
import {
  createAccessCode,
  getAccessCodes,
  deactivateAccessCode,
  getStoreCredentialsInfo,
  updateStorePin,
  updateStorePassword,
} from '../services/credentialService';

interface StoreCredentialsSettingsProps {
  storeId: string;
  storeName: string;
  onClose: () => void;
}

interface AccessCode {
  code: string;
  created_at?: string;
}

export const StoreCredentialsSettings: React.FC<StoreCredentialsSettingsProps> = ({
  storeId,
  storeName,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<'codes' | 'security'>('codes');
  const [accessCodes, setAccessCodes] = useState<AccessCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [creatingCode, setCreatingCode] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [deletingCode, setDeletingCode] = useState<string | null>(null);

  // PIN state
  const [showPinForm, setShowPinForm] = useState(false);
  const [newPin, setNewPin] = useState('');
  const [pinError, setPinError] = useState('');
  const [savingPin, setSavingPin] = useState(false);
  const [pinSuccess, setPinSuccess] = useState(false);

  // Password state
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState(false);

  useEffect(() => {
    loadAccessCodes();
  }, [storeId]);

  const loadAccessCodes = async () => {
    setLoading(true);
    const codes = await getAccessCodes(storeId);
    setAccessCodes(codes || []);
    setLoading(false);
  };

  const handleCreateCode = async () => {
    setCreatingCode(true);
    const newCode = await createAccessCode(storeId);
    if (newCode) {
      await loadAccessCodes();
      copyToClipboard((newCode as any).code || newCode);
    } else {
      alert('Failed to create access code. Please try again.');
    }
    setCreatingCode(false);
  };

  const handleDeleteCode = async (codeId: string) => {
    if (!confirm('Deactivate this access code? Staff using this code will no longer be able to access the store.')) return;
    
    setDeletingCode(codeId);
    const success = await deactivateAccessCode(codeId);
    if (success) {
      await loadAccessCodes();
    } else {
      alert('Failed to deactivate code');
    }
    setDeletingCode(null);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(text);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const handleSavePin = async (e: React.FormEvent) => {
    e.preventDefault();
    setPinError('');
    setSavingPin(true);

    if (!/^\d{4,6}$/.test(newPin)) {
      setPinError('PIN must be 4-6 digits');
      setSavingPin(false);
      return;
    }

    const success = await updateStorePin(storeId, newPin);
    if (success) {
      setPinSuccess(true);
      setNewPin('');
      setShowPinForm(false);
      setTimeout(() => setPinSuccess(false), 3000);
    } else {
      setPinError('Failed to update PIN');
    }
    setSavingPin(false);
  };

  const handleSavePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError('');
    setSavingPassword(true);

    if (newPassword.length < 8) {
      setPasswordError('Password must be at least 8 characters');
      setSavingPassword(false);
      return;
    }

    if (!/[A-Z]/.test(newPassword) || !/[a-z]/.test(newPassword) || !/[0-9]/.test(newPassword)) {
      setPasswordError('Must contain uppercase, lowercase, and numbers');
      setSavingPassword(false);
      return;
    }

    const success = await updateStorePassword(storeId, newPassword);
    if (success) {
      setPasswordSuccess(true);
      setNewPassword('');
      setShowPasswordForm(false);
      setTimeout(() => setPasswordSuccess(false), 3000);
    } else {
      setPasswordError('Failed to update password');
    }
    setSavingPassword(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto animate-in zoom-in-95">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">Security Settings</h2>
            <p className="text-blue-100 text-sm">{storeName}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-blue-500 rounded-full transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-200">
          <button
            onClick={() => setActiveTab('codes')}
            className={`flex-1 py-4 px-6 font-semibold transition-colors ${
              activeTab === 'codes'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Key className="w-4 h-4 inline mr-2" />
            Access Codes
          </button>
          <button
            onClick={() => setActiveTab('security')}
            className={`flex-1 py-4 px-6 font-semibold transition-colors ${
              activeTab === 'security'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Lock className="w-4 h-4 inline mr-2" />
            Login Credentials
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* ACCESS CODES TAB */}
          {activeTab === 'codes' && (
            <div className="space-y-6">
              <p className="text-slate-600 text-sm">
                Your primary staff code is automatically generated. Create additional codes for different staff members or temporary use.
              </p>

              <button
                onClick={handleCreateCode}
                disabled={creatingCode || loading}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold py-3 rounded-lg flex items-center justify-center gap-2 transition-colors"
              >
                <Plus className="w-5 h-5" />
                {creatingCode ? 'Generating...' : 'Create Additional Access Code'}
              </button>

              {loading ? (
                <div className="text-center py-8 text-slate-500">Loading access codes...</div>
              ) : accessCodes.length === 0 ? (
                <div className="bg-slate-50 rounded-lg p-8 text-center">
                  <Key className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                  <p className="text-slate-600 mb-4">No access codes found.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {accessCodes.map((code) => (
                    <div
                      key={code.id}
                      className={`border-2 p-4 rounded-lg flex items-center justify-between gap-4 ${
                        code.is_primary
                          ? 'border-amber-200 bg-amber-50'
                          : code.is_active ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'
                      }`}
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <code className="font-mono text-lg font-bold text-slate-900 bg-slate-100 px-3 py-1 rounded">
                            {code.code}
                          </code>
                          {code.is_primary && (
                            <span className="px-2 py-1 bg-amber-500 text-white text-xs font-bold rounded">PRIMARY</span>
                          )}
                          {!code.is_active && (
                            <span className="px-2 py-1 bg-red-500 text-white text-xs font-bold rounded">INACTIVE</span>
                          )}
                          <button
                            onClick={() => copyToClipboard(code.code)}
                            className="p-2 text-slate-600 hover:text-blue-600 transition-colors"
                            title="Copy code"
                          >
                            <Copy className="w-4 h-4" />
                          </button>
                          {copiedCode === code.code && (
                            <span className="text-xs text-green-600 font-medium">Copied!</span>
                          )}
                        </div>
                        <p className="text-xs text-slate-600">
                          {code.label || 'Access Code'}
                          {code.created_at && (
                            <> • {new Date(code.created_at).toLocaleDateString()}</>
                          )}
                        </p>
                      </div>
                      {!code.is_primary && (
                        <button
                          onClick={() => handleDeleteCode(code.id)}
                          disabled={deletingCode === code.id}
                          className="p-2 text-slate-600 hover:text-red-600 disabled:opacity-50 transition-colors"
                          title="Deactivate code"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                      {code.is_primary && (
                        <div className="text-xs text-slate-600 px-3 py-2 bg-slate-100 rounded">
                          Cannot delete primary code
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* LOGIN CREDENTIALS TAB */}
          {activeTab === 'security' && (
            <div className="space-y-6">
              <p className="text-slate-600 text-sm">
                Manage your login PIN and password. Changes take effect immediately.
              </p>

              {/* PIN SECTION */}
              <div className="bg-slate-50 rounded-lg p-6 border border-slate-200">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="font-semibold text-slate-900">Owner PIN</h3>
                    <p className="text-sm text-slate-600">4-6 digit code for quick access</p>
                  </div>
                  <button
                    onClick={() => setShowPinForm(!showPinForm)}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
                  >
                    {showPinForm ? 'Cancel' : 'Change PIN'}
                  </button>
                </div>

                {showPinForm && (
                  <form onSubmit={handleSavePin} className="space-y-4 mt-4">
                    <input
                      type="password"
                      inputMode="numeric"
                      maxLength={6}
                      placeholder="Enter 4-6 digit PIN"
                      value={newPin}
                      onChange={(e) => {
                        setNewPin(e.target.value.replace(/\D/g, ''));
                        setPinError('');
                      }}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg text-center text-2xl tracking-widest focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    {pinError && (
                      <p className="text-red-600 text-sm flex items-center gap-2">
                        <AlertCircle className="w-4 h-4" />
                        {pinError}
                      </p>
                    )}
                    <button
                      type="submit"
                      disabled={savingPin || newPin.length < 4}
                      className="w-full bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-semibold py-2 rounded-lg transition-colors"
                    >
                      {savingPin ? 'Saving...' : 'Save PIN'}
                    </button>
                  </form>
                )}

                {pinSuccess && (
                  <div className="mt-4 p-3 bg-green-100 text-green-800 rounded-lg flex items-center gap-2">
                    <CheckCircle className="w-5 h-5" />
                    PIN updated successfully!
                  </div>
                )}
              </div>

              {/* PASSWORD SECTION */}
              <div className="bg-slate-50 rounded-lg p-6 border border-slate-200">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="font-semibold text-slate-900">Password</h3>
                    <p className="text-sm text-slate-600">For account login (8+ chars, mix of upper/lower/numbers)</p>
                  </div>
                  <button
                    onClick={() => setShowPasswordForm(!showPasswordForm)}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
                  >
                    {showPasswordForm ? 'Cancel' : 'Change Password'}
                  </button>
                </div>

                {showPasswordForm && (
                  <form onSubmit={handleSavePassword} className="space-y-4 mt-4">
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Enter new password"
                        value={newPassword}
                        onChange={(e) => {
                          setNewPassword(e.target.value);
                          setPasswordError('');
                        }}
                        className="w-full px-4 py-2 pr-12 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-4 top-2.5 text-slate-600 hover:text-slate-900"
                      >
                        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>

                    {/* Password strength indicator */}
                    <div className="space-y-2">
                      <div className="flex gap-2">
                        <div
                          className={`flex-1 h-2 rounded ${
                            newPassword.length >= 8 ? 'bg-green-500' : 'bg-slate-300'
                          }`}
                        />
                        <div
                          className={`flex-1 h-2 rounded ${
                            /[A-Z]/.test(newPassword) && /[a-z]/.test(newPassword)
                              ? 'bg-green-500'
                              : 'bg-slate-300'
                          }`}
                        />
                        <div
                          className={`flex-1 h-2 rounded ${
                            /[0-9]/.test(newPassword) ? 'bg-green-500' : 'bg-slate-300'
                          }`}
                        />
                      </div>
                      <p className="text-xs text-slate-600">
                        ✓ 8+ characters ✓ Uppercase & lowercase ✓ Numbers
                      </p>
                    </div>

                    {passwordError && (
                      <p className="text-red-600 text-sm flex items-center gap-2">
                        <AlertCircle className="w-4 h-4" />
                        {passwordError}
                      </p>
                    )}
                    <button
                      type="submit"
                      disabled={savingPassword || newPassword.length < 8}
                      className="w-full bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-semibold py-2 rounded-lg transition-colors"
                    >
                      {savingPassword ? 'Saving...' : 'Save Password'}
                    </button>
                  </form>
                )}

                {passwordSuccess && (
                  <div className="mt-4 p-3 bg-green-100 text-green-800 rounded-lg flex items-center gap-2">
                    <CheckCircle className="w-5 h-5" />
                    Password updated successfully!
                  </div>
                )}
              </div>

              {/* SECURITY TIPS */}
              <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                <h4 className="font-semibold text-blue-900 mb-2">🔒 Security Tips</h4>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• Never share your PIN or password with anyone</li>
                  <li>• Use access codes to grant temporary staff access instead</li>
                  <li>• Change your password regularly</li>
                  <li>• Deactivate codes from employees who have left</li>
                </ul>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
