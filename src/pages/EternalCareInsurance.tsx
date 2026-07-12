import { useState, useEffect, useCallback } from 'react';
import type { FormEvent, ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useNotification } from '../contexts/NotificationContext';
import { supabase } from '../lib/supabase';
import { buildApiUrl } from '../lib/env';
import {
  Heart, Plus, Edit, Trash2, DollarSign, Users, FileText,
  Shield, Clock, ArrowLeft, X, AlertTriangle, Loader2
} from 'lucide-react';

interface Policy {
  id: string;
  policy_number: string;
  policy_type: string;
  provider_name: string;
  coverage_amount: number;
  premium_amount: number;
  premium_frequency: string;
  start_date: string;
  end_date: string | null;
  status: string;
  policy_document_url: string | null;
  notes: string | null;
  created_at: string;
}

interface Beneficiary {
  id: string;
  policy_id: string;
  name: string;
  relationship: string;
  percentage: number;
  contact_email: string | null;
  contact_phone: string | null;
  date_of_birth: string | null;
}

interface Claim {
  id: string;
  policy_id: string;
  claim_number: string;
  claim_type: string;
  claim_amount: number;
  filed_date: string;
  status: string;
  resolution_date: string | null;
  notes: string | null;
}

interface Payment {
  id: string;
  policy_id: string;
  payment_date: string;
  amount: number;
  payment_method: string;
  confirmation_number: string | null;
  notes: string | null;
}

interface DividendEntry {
  score: number;
  findings_count: number;
  dividend_accumulated: number;
  created_at: string;
}

interface ConfirmState {
  title: string;
  message: string;
  confirmLabel: string;
  action: () => Promise<void>;
}

const POLICY_TYPES = ['LIFE', 'TERM', 'WHOLE', 'UNIVERSAL', 'OTHER'];
const PREMIUM_FREQUENCIES = ['MONTHLY', 'QUARTERLY', 'ANNUAL'];
const POLICY_STATUSES = ['ACTIVE', 'PENDING', 'LAPSED', 'CANCELLED'];
const CLAIM_STATUSES = ['PENDING', 'APPROVED', 'DENIED', 'PAID'];
const PAYMENT_METHODS = ['Bank Transfer', 'Credit Card', 'Debit Card', 'Check', 'Cash', 'Auto-Pay', 'Other'];

const inputClass =
  'w-full bg-slate-900/50 border border-slate-700 hover:border-slate-600 focus:border-rose-500 rounded-xl px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-rose-500/20 transition-all';

function todayISO(): string {
  const now = new Date();
  return new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}

function errorMessage(err: unknown, fallback: string): string {
  if (err && typeof err === 'object' && 'message' in err) {
    const message = (err as { message?: unknown }).message;
    if (typeof message === 'string' && message.trim().length > 0) return message;
  }
  return fallback;
}

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function parseAmount(value: string): number | null {
  if (!value.trim()) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function withCurrentValue(options: string[], current: string): string[] {
  return current && !options.includes(current) ? [current, ...options] : options;
}

export default function EternalCareInsurance() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { showNotification } = useNotification();
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [beneficiaries, setBeneficiaries] = useState<Beneficiary[]>([]);
  const [claims, setClaims] = useState<Claim[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPolicy, setSelectedPolicy] = useState<Policy | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'beneficiaries' | 'claims' | 'payments' | 'dividends'>('overview');
  const [showAddPolicy, setShowAddPolicy] = useState(false);
  const [editingPolicy, setEditingPolicy] = useState<Policy | null>(null);
  const [showBeneficiaryModal, setShowBeneficiaryModal] = useState(false);
  const [editingBeneficiary, setEditingBeneficiary] = useState<Beneficiary | null>(null);
  const [showClaimModal, setShowClaimModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [confirmState, setConfirmState] = useState<ConfirmState | null>(null);
  const [confirmBusy, setConfirmBusy] = useState(false);
  const [dividendData, setDividendData] = useState<{ total_accumulated: number; recent_history: DividendEntry[] }>({
    total_accumulated: 0,
    recent_history: []
  });

  const loadData = useCallback(async () => {
    if (!user) return;

    try {
      const [policiesRes, beneficiariesRes, claimsRes, paymentsRes] = await Promise.all([
        supabase.from('insurance_policies').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
        supabase.from('insurance_beneficiaries').select('*'),
        supabase.from('insurance_claims').select('*'),
        supabase.from('insurance_payments').select('*').order('payment_date', { ascending: false })
      ]);

      // Fetch Dividends from Custom API. Failures here should never block the
      // core insurance tables from rendering, so it gets its own try/catch.
      try {
        const dividendRes = await fetch(buildApiUrl('/api/v1/integrity/dividends'), {
          headers: {
            'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
          }
        });
        if (dividendRes.ok) {
          // Normalize: the endpoint can return an error/empty/wrong-shaped body;
          // the Dividends tab does recent_history.length/.map unconditionally, so
          // guarantee the shape here to avoid a render crash.
          const raw = await dividendRes.json().catch(() => ({}));
          setDividendData({
            total_accumulated: typeof raw?.total_accumulated === 'number' ? raw.total_accumulated : 0,
            recent_history: Array.isArray(raw?.recent_history) ? raw.recent_history : [],
          });
        }
      } catch (dividendError) {
        console.error('Error loading dividend data:', dividendError);
      }

      if (policiesRes.error) throw policiesRes.error;
      if (beneficiariesRes.error) throw beneficiariesRes.error;
      if (claimsRes.error) throw claimsRes.error;
      if (paymentsRes.error) throw paymentsRes.error;

      const nextPolicies: Policy[] = policiesRes.data || [];
      setPolicies(nextPolicies);
      setBeneficiaries(beneficiariesRes.data || []);
      setClaims(claimsRes.data || []);
      setPayments(paymentsRes.data || []);

      // Keep the selection pointing at fresh data: re-resolve the selected
      // policy after every reload (it may have been edited or deleted).
      setSelectedPolicy(prev => {
        if (prev) {
          const fresh = nextPolicies.find(p => p.id === prev.id);
          if (fresh) return fresh;
        }
        return nextPolicies.length > 0 ? nextPolicies[0] : null;
      });
    } catch (error) {
      console.error('Error loading insurance data:', error);
      showNotification('Failed to load insurance data', 'error');
    } finally {
      setLoading(false);
    }
  }, [user, showNotification]);

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user, loadData]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getStatusColor = (status: string) => {
    switch (status.toUpperCase()) {
      case 'ACTIVE':
        return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30';
      case 'PENDING':
        return 'text-amber-400 bg-amber-500/10 border-amber-500/30';
      case 'LAPSED':
        return 'text-slate-400 bg-slate-500/10 border-slate-500/30';
      case 'CANCELLED':
        return 'text-rose-400 bg-rose-500/10 border-rose-500/30';
      case 'APPROVED':
        return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30';
      case 'DENIED':
        return 'text-rose-400 bg-rose-500/10 border-rose-500/30';
      case 'PAID':
        return 'text-sky-400 bg-sky-500/10 border-sky-500/30';
      default:
        return 'text-slate-400 bg-slate-500/10 border-slate-500/30';
    }
  };

  const totalCoverage = policies.reduce((sum, p) => sum + Number(p.coverage_amount), 0);
  const activePolicies = policies.filter(p => p.status === 'ACTIVE').length;
  const monthlyPremium = policies
    .filter(p => p.status === 'ACTIVE')
    .reduce((sum, p) => {
      const amount = Number(p.premium_amount);
      if (p.premium_frequency === 'MONTHLY') return sum + amount;
      if (p.premium_frequency === 'QUARTERLY') return sum + (amount / 3);
      if (p.premium_frequency === 'ANNUAL') return sum + (amount / 12);
      return sum;
    }, 0);

  const selectedPolicyBeneficiaries = selectedPolicy
    ? beneficiaries.filter(b => b.policy_id === selectedPolicy.id)
    : [];

  const selectedPolicyClaims = selectedPolicy
    ? claims.filter(c => c.policy_id === selectedPolicy.id)
    : [];

  const selectedPolicyPayments = selectedPolicy
    ? payments.filter(p => p.policy_id === selectedPolicy.id)
    : [];

  const totalAllocatedPercentage =
    Math.round(selectedPolicyBeneficiaries.reduce((sum, b) => sum + Number(b.percentage), 0) * 100) / 100;

  const openAddPolicy = () => {
    setEditingPolicy(null);
    setShowAddPolicy(true);
  };

  const openEditPolicy = (policy: Policy) => {
    setShowAddPolicy(false);
    setEditingPolicy(policy);
  };

  const closePolicyModal = () => {
    setShowAddPolicy(false);
    setEditingPolicy(null);
  };

  const openAddBeneficiary = () => {
    setEditingBeneficiary(null);
    setShowBeneficiaryModal(true);
  };

  const openEditBeneficiary = (beneficiary: Beneficiary) => {
    setEditingBeneficiary(beneficiary);
    setShowBeneficiaryModal(true);
  };

  const closeBeneficiaryModal = () => {
    setShowBeneficiaryModal(false);
    setEditingBeneficiary(null);
  };

  const requestDeletePolicy = (policy: Policy) => {
    if (!user) return;
    const userId = user.id;
    setConfirmState({
      title: 'Delete Policy',
      message: `Permanently delete policy #${policy.policy_number} from ${policy.provider_name}? All beneficiaries, claims, and payments recorded for this policy will also be removed.`,
      confirmLabel: 'Delete Policy',
      action: async () => {
        const { error } = await supabase
          .from('insurance_policies')
          .delete()
          .eq('id', policy.id)
          .eq('user_id', userId);
        if (error) throw error;
        showNotification('Policy deleted', 'success');
        await loadData();
      },
    });
  };

  const requestDeleteBeneficiary = (beneficiary: Beneficiary) => {
    setConfirmState({
      title: 'Remove Beneficiary',
      message: `Remove ${beneficiary.name} as a beneficiary from this policy? Their ${beneficiary.percentage}% allocation will become unassigned.`,
      confirmLabel: 'Remove',
      action: async () => {
        const { error } = await supabase
          .from('insurance_beneficiaries')
          .delete()
          .eq('id', beneficiary.id);
        if (error) throw error;
        showNotification('Beneficiary removed', 'success');
        await loadData();
      },
    });
  };

  const handleConfirm = async () => {
    if (!confirmState) return;
    setConfirmBusy(true);
    try {
      await confirmState.action();
      setConfirmState(null);
    } catch (err) {
      console.error('Confirm action failed:', err);
      showNotification(errorMessage(err, 'Action failed. Please try again.'), 'error');
    } finally {
      setConfirmBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[100dvh] bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-2 border-slate-700 border-t-rose-500 rounded-full animate-spin"></div>
          <p className="text-slate-400 text-sm">Loading insurance data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <button
          onClick={() => navigate('/legacy-vault')}
          className="mb-6 px-4 py-2 bg-slate-800/50 hover:bg-slate-800 border border-slate-700/50 hover:border-slate-600 text-slate-300 hover:text-white rounded-xl transition-all flex items-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Legacy Vault
        </button>

        <div className="flex items-center gap-4 mb-8">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-rose-500/20 to-pink-500/20 border border-rose-500/30 flex items-center justify-center">
            <Heart className="w-8 h-8 text-rose-400" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-white mb-1">Eternal Care Insurance</h1>
            <p className="text-slate-400">Manage your life insurance and legacy protection</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="p-6 rounded-xl bg-gradient-to-br from-emerald-500/10 to-teal-500/10 border border-emerald-500/20">
            <div className="flex items-center justify-between mb-2">
              <Shield className="w-5 h-5 text-emerald-400" />
              <span className="text-xs text-emerald-400 font-medium">COVERAGE</span>
            </div>
            <p className="text-2xl font-bold text-white mb-1">{formatCurrency(totalCoverage)}</p>
            <p className="text-sm text-slate-400">Total protection</p>
          </div>

          <div className="p-6 rounded-xl bg-gradient-to-br from-sky-500/10 to-blue-500/10 border border-sky-500/20">
            <div className="flex items-center justify-between mb-2">
              <FileText className="w-5 h-5 text-sky-400" />
              <span className="text-xs text-sky-400 font-medium">POLICIES</span>
            </div>
            <p className="text-2xl font-bold text-white mb-1">{activePolicies}</p>
            <p className="text-sm text-slate-400">Active policies</p>
          </div>

          <div className="p-6 rounded-xl bg-gradient-to-br from-rose-500/10 to-pink-500/10 border border-rose-500/20">
            <div className="flex items-center justify-between mb-2">
              <DollarSign className="w-5 h-5 text-rose-400" />
              <span className="text-xs text-rose-400 font-medium">PREMIUM</span>
            </div>
            <p className="text-2xl font-bold text-white mb-1">{formatCurrency(monthlyPremium)}</p>
            <p className="text-sm text-slate-400">Per month</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white">Your Policies</h2>
              <button
                onClick={openAddPolicy}
                title="Add policy"
                className="p-2 rounded-lg bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600 text-white transition-all"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            {policies.length === 0 ? (
              <div className="p-8 rounded-xl bg-slate-800/30 border border-slate-700/50 text-center">
                <Heart className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                <p className="text-slate-400 mb-4">No policies yet</p>
                <button
                  onClick={openAddPolicy}
                  className="px-4 py-2 rounded-lg bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600 text-white transition-all"
                >
                  Add Your First Policy
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {policies.map(policy => (
                  <button
                    key={policy.id}
                    onClick={() => setSelectedPolicy(policy)}
                    className={`w-full p-4 rounded-xl border transition-all text-left ${selectedPolicy?.id === policy.id
                      ? 'bg-gradient-to-br from-rose-500/20 to-pink-500/20 border-rose-500/30'
                      : 'bg-slate-800/30 border-slate-700/50 hover:border-slate-600'
                      }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="text-white font-medium mb-1">{policy.provider_name}</p>
                        <p className="text-xs text-slate-400">#{policy.policy_number}</p>
                      </div>
                      <span className={`px-2 py-1 rounded-lg text-xs font-medium border ${getStatusColor(policy.status)}`}>
                        {policy.status}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-400">{policy.policy_type}</span>
                      <span className="text-white font-medium">{formatCurrency(policy.coverage_amount)}</span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="lg:col-span-2">
            {selectedPolicy ? (
              <div className="space-y-6">
                <div className="p-6 rounded-xl bg-slate-800/30 border border-slate-700/50">
                  <div className="flex items-start justify-between mb-6">
                    <div>
                      <h2 className="text-2xl font-bold text-white mb-2">{selectedPolicy.provider_name}</h2>
                      <p className="text-slate-400">Policy #{selectedPolicy.policy_number}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => openEditPolicy(selectedPolicy)}
                        title="Edit policy"
                        className="p-2 rounded-lg bg-slate-700/50 hover:bg-slate-700 text-slate-300 transition-all"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => requestDeletePolicy(selectedPolicy)}
                        title="Delete policy"
                        className="p-2 rounded-lg bg-slate-700/50 hover:bg-slate-700 text-rose-400 transition-all"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 border-b border-slate-700/50 mb-6">
                    {(['overview', 'beneficiaries', 'claims', 'payments', 'dividends'] as const).map(tab => (
                      <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`px-4 py-2 text-sm font-medium transition-all border-b-2 ${activeTab === tab
                          ? 'text-rose-400 border-rose-500'
                          : 'text-slate-400 border-transparent hover:text-slate-300'
                          }`}
                      >
                        {tab.charAt(0).toUpperCase() + tab.slice(1)}
                      </button>
                    ))}
                  </div>

                  {activeTab === 'overview' && (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm text-slate-400 mb-1">Policy Type</p>
                          <p className="text-white font-medium">{selectedPolicy.policy_type}</p>
                        </div>
                        <div>
                          <p className="text-sm text-slate-400 mb-1">Status</p>
                          <span className={`inline-block px-3 py-1 rounded-lg text-sm font-medium border ${getStatusColor(selectedPolicy.status)}`}>
                            {selectedPolicy.status}
                          </span>
                        </div>
                        <div>
                          <p className="text-sm text-slate-400 mb-1">Coverage Amount</p>
                          <p className="text-white font-medium">{formatCurrency(selectedPolicy.coverage_amount)}</p>
                        </div>
                        <div>
                          <p className="text-sm text-slate-400 mb-1">Premium</p>
                          <p className="text-white font-medium">
                            {formatCurrency(selectedPolicy.premium_amount)} / {selectedPolicy.premium_frequency.toLowerCase()}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-slate-400 mb-1">Start Date</p>
                          <p className="text-white font-medium">{formatDate(selectedPolicy.start_date)}</p>
                        </div>
                        {selectedPolicy.end_date && (
                          <div>
                            <p className="text-sm text-slate-400 mb-1">End Date</p>
                            <p className="text-white font-medium">{formatDate(selectedPolicy.end_date)}</p>
                          </div>
                        )}
                      </div>
                      {selectedPolicy.notes && (
                        <div>
                          <p className="text-sm text-slate-400 mb-1">Notes</p>
                          <p className="text-slate-300">{selectedPolicy.notes}</p>
                        </div>
                      )}
                    </div>
                  )}

                  {activeTab === 'beneficiaries' && (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <h3 className="text-lg font-semibold text-white">Beneficiaries</h3>
                          {selectedPolicyBeneficiaries.length > 0 && (
                            <p className="text-xs text-slate-500 mt-0.5">{totalAllocatedPercentage}% of payout allocated</p>
                          )}
                        </div>
                        <button
                          onClick={openAddBeneficiary}
                          className="px-4 py-2 rounded-lg bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600 text-white text-sm transition-all flex items-center gap-2"
                        >
                          <Plus className="w-4 h-4" />
                          Add Beneficiary
                        </button>
                      </div>
                      {selectedPolicyBeneficiaries.length === 0 ? (
                        <div className="p-8 text-center text-slate-400">
                          <Users className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                          <p>No beneficiaries added yet</p>
                          <button
                            onClick={openAddBeneficiary}
                            className="mt-4 px-4 py-2 rounded-lg bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600 text-white text-sm transition-all"
                          >
                            Add a Beneficiary
                          </button>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {selectedPolicyBeneficiaries.map(beneficiary => (
                            <div key={beneficiary.id} className="p-4 rounded-lg bg-slate-900/50 border border-slate-700/50">
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <div className="flex items-center gap-3 mb-2">
                                    <p className="text-white font-medium">{beneficiary.name}</p>
                                    <span className="px-2 py-1 rounded bg-rose-500/20 text-rose-400 text-xs font-medium">
                                      {beneficiary.percentage}%
                                    </span>
                                  </div>
                                  <p className="text-sm text-slate-400 mb-1">{beneficiary.relationship}</p>
                                  {beneficiary.contact_email && (
                                    <p className="text-xs text-slate-500">{beneficiary.contact_email}</p>
                                  )}
                                  {beneficiary.contact_phone && (
                                    <p className="text-xs text-slate-500">{beneficiary.contact_phone}</p>
                                  )}
                                </div>
                                <div className="flex items-center gap-2">
                                  <button
                                    onClick={() => openEditBeneficiary(beneficiary)}
                                    title="Edit beneficiary"
                                    className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-all"
                                  >
                                    <Edit className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() => requestDeleteBeneficiary(beneficiary)}
                                    title="Remove beneficiary"
                                    className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-rose-400 hover:text-rose-300 transition-all"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {activeTab === 'claims' && (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold text-white">Claims History</h3>
                        <button
                          onClick={() => setShowClaimModal(true)}
                          className="px-4 py-2 rounded-lg bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600 text-white text-sm transition-all flex items-center gap-2"
                        >
                          <Plus className="w-4 h-4" />
                          File Claim
                        </button>
                      </div>
                      {selectedPolicyClaims.length === 0 ? (
                        <div className="p-8 text-center text-slate-400">
                          <FileText className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                          <p>No claims filed yet</p>
                          <button
                            onClick={() => setShowClaimModal(true)}
                            className="mt-4 px-4 py-2 rounded-lg bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600 text-white text-sm transition-all"
                          >
                            File a Claim
                          </button>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {selectedPolicyClaims.map(claim => (
                            <div key={claim.id} className="p-4 rounded-lg bg-slate-900/50 border border-slate-700/50">
                              <div className="flex items-start justify-between mb-2">
                                <div>
                                  <p className="text-white font-medium mb-1">Claim #{claim.claim_number}</p>
                                  <p className="text-sm text-slate-400">{claim.claim_type}</p>
                                </div>
                                <span className={`px-3 py-1 rounded-lg text-xs font-medium border ${getStatusColor(claim.status)}`}>
                                  {claim.status}
                                </span>
                              </div>
                              <div className="flex items-center justify-between text-sm">
                                <span className="text-slate-400">Filed: {formatDate(claim.filed_date)}</span>
                                <span className="text-white font-medium">{formatCurrency(claim.claim_amount)}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {activeTab === 'payments' && (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold text-white">Payment History</h3>
                        <button
                          onClick={() => setShowPaymentModal(true)}
                          className="px-4 py-2 rounded-lg bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600 text-white text-sm transition-all flex items-center gap-2"
                        >
                          <Plus className="w-4 h-4" />
                          Record Payment
                        </button>
                      </div>
                      {selectedPolicyPayments.length === 0 ? (
                        <div className="p-8 text-center text-slate-400">
                          <DollarSign className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                          <p>No payments recorded yet</p>
                          <button
                            onClick={() => setShowPaymentModal(true)}
                            className="mt-4 px-4 py-2 rounded-lg bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600 text-white text-sm transition-all"
                          >
                            Record a Payment
                          </button>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {selectedPolicyPayments.map(payment => (
                            <div key={payment.id} className="p-4 rounded-lg bg-slate-900/50 border border-slate-700/50">
                              <div className="flex items-center justify-between">
                                <div>
                                  <p className="text-white font-medium mb-1">{formatCurrency(payment.amount)}</p>
                                  <p className="text-sm text-slate-400">{formatDate(payment.payment_date)}</p>
                                  <p className="text-xs text-slate-500">{payment.payment_method}</p>
                                </div>
                                {payment.confirmation_number && (
                                  <div className="text-right">
                                    <p className="text-xs text-slate-500">Confirmation</p>
                                    <p className="text-sm text-slate-400">{payment.confirmation_number}</p>
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {activeTab === 'dividends' && (
                    <div className="space-y-6">
                      <div className="p-6 rounded-2xl bg-gradient-to-br from-emerald-500/10 to-teal-500/10 border border-emerald-500/20">
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                              <DollarSign className="w-6 h-6 text-emerald-400" />
                            </div>
                            <div>
                              <h3 className="text-xl font-bold text-white">Integrity Dividends</h3>
                              <p className="text-sm text-slate-400">Rewards for maintaining system security</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-3xl font-bold text-emerald-400">{formatCurrency(dividendData.total_accumulated)}</p>
                            <p className="text-xs text-slate-500">Total Accumulated Payouts</p>
                          </div>
                        </div>
                        <div className="p-4 bg-slate-900/40 rounded-xl border border-slate-700/30">
                          <p className="text-sm text-slate-300 leading-relaxed">
                            Your Integrity Dividend is calculated daily based on your St. Michael integrity score.
                            Users with no recent vulnerability findings and higher system safety ratings earn larger payouts.
                          </p>
                        </div>
                      </div>

                      <div className="space-y-3">
                        <h3 className="text-lg font-semibold text-white px-1">Recent History</h3>
                        {dividendData.recent_history.length === 0 ? (
                          <div className="p-8 text-center text-slate-500 bg-slate-900/30 rounded-xl border border-slate-800">
                            <Clock className="w-10 h-10 mx-auto mb-3 opacity-20" />
                            <p>No dividend history available yet. Rewards are calculated every 24 hours.</p>
                          </div>
                        ) : (
                          dividendData.recent_history.map((item, idx) => (
                            <div key={idx} className="p-4 rounded-xl bg-slate-900/50 border border-slate-700/50 flex items-center justify-between">
                              <div className="flex items-center gap-4">
                                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${item.score > 80 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'}`}>
                                  {item.score}%
                                </div>
                                <div>
                                  <p className="text-white font-medium">{formatDate(item.created_at)}</p>
                                  <p className="text-xs text-slate-500">{item.findings_count} security findings</p>
                                </div>
                              </div>
                              <div className="text-right">
                                <p className="text-emerald-400 font-bold">+{formatCurrency(item.dividend_accumulated)}</p>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="p-12 rounded-xl bg-slate-800/30 border border-slate-700/50 text-center">
                <Heart className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                <p className="text-slate-400 mb-2">No policy selected</p>
                <p className="text-sm text-slate-500 mb-4">Select a policy from the list or add a new one</p>
                <button
                  onClick={openAddPolicy}
                  className="px-4 py-2 rounded-lg bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600 text-white text-sm transition-all"
                >
                  Add Policy
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {(showAddPolicy || editingPolicy) && user && (
        <PolicyFormModal
          userId={user.id}
          initial={editingPolicy}
          onClose={closePolicyModal}
          onSaved={loadData}
        />
      )}

      {showBeneficiaryModal && selectedPolicy && (
        <BeneficiaryFormModal
          policyId={selectedPolicy.id}
          initial={editingBeneficiary}
          allocatedPercentage={selectedPolicyBeneficiaries
            .filter(b => b.id !== editingBeneficiary?.id)
            .reduce((sum, b) => sum + Number(b.percentage), 0)}
          onClose={closeBeneficiaryModal}
          onSaved={loadData}
        />
      )}

      {showClaimModal && selectedPolicy && (
        <ClaimFormModal
          policies={policies}
          defaultPolicyId={selectedPolicy.id}
          onClose={() => setShowClaimModal(false)}
          onSaved={loadData}
        />
      )}

      {showPaymentModal && selectedPolicy && (
        <PaymentFormModal
          policies={policies}
          defaultPolicyId={selectedPolicy.id}
          onClose={() => setShowPaymentModal(false)}
          onSaved={loadData}
        />
      )}

      {confirmState && (
        <ConfirmDialog
          title={confirmState.title}
          message={confirmState.message}
          confirmLabel={confirmState.confirmLabel}
          busy={confirmBusy}
          onConfirm={handleConfirm}
          onCancel={() => setConfirmState(null)}
        />
      )}
    </div>
  );
}

interface FieldProps {
  label: string;
  error?: string;
  children: ReactNode;
  className?: string;
}

function Field({ label, error, children, className = '' }: FieldProps) {
  return (
    <div className={className}>
      <label className="block">
        <span className="block text-sm font-medium text-slate-300 mb-2">{label}</span>
        {children}
      </label>
      {error && <p className="mt-1 text-xs text-rose-400">{error}</p>}
    </div>
  );
}

interface ModalShellProps {
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: ReactNode;
}

function ModalShell({ title, subtitle, onClose, children }: ModalShellProps) {
  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center z-50 p-4">
      <div className="bg-gradient-to-br from-slate-800/95 to-slate-900/95 sm:backdrop-blur-xl rounded-2xl shadow-2xl border border-slate-700/50 p-6 sm:p-8 max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-start justify-between gap-4 mb-6">
          <div>
            <h3 className="text-xl font-semibold text-white">{title}</h3>
            {subtitle && <p className="text-sm text-slate-400 mt-1">{subtitle}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="p-2 rounded-lg bg-slate-800/50 hover:bg-slate-700 text-slate-400 hover:text-white transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

interface FormActionsProps {
  saving: boolean;
  submitLabel: string;
  onCancel: () => void;
}

function FormActions({ saving, submitLabel, onCancel }: FormActionsProps) {
  return (
    <div className="flex gap-3 pt-2">
      <button
        type="button"
        onClick={onCancel}
        disabled={saving}
        className="flex-1 px-6 py-3 bg-slate-700/50 hover:bg-slate-700 border border-slate-600/50 hover:border-slate-600 text-slate-300 hover:text-white rounded-xl transition-all font-medium disabled:opacity-60 disabled:cursor-not-allowed"
      >
        Cancel
      </button>
      <button
        type="submit"
        disabled={saving}
        className="flex-1 px-6 py-3 bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600 text-white rounded-xl transition-all shadow-lg shadow-rose-500/20 font-medium disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        {saving && <Loader2 className="w-4 h-4 animate-spin" />}
        {saving ? 'Saving...' : submitLabel}
      </button>
    </div>
  );
}

interface ConfirmDialogProps {
  title: string;
  message: string;
  confirmLabel: string;
  busy: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

function ConfirmDialog({ title, message, confirmLabel, busy, onConfirm, onCancel }: ConfirmDialogProps) {
  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center z-50 p-4">
      <div className="bg-gradient-to-br from-slate-800/95 to-slate-900/95 sm:backdrop-blur-xl rounded-2xl shadow-2xl border border-slate-700/50 p-6 max-w-md w-full">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center flex-shrink-0">
            <AlertTriangle className="w-5 h-5 text-rose-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white mb-1">{title}</h3>
            <p className="text-sm text-slate-400 leading-relaxed">{message}</p>
          </div>
        </div>
        <div className="flex gap-3 mt-6">
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="flex-1 px-4 py-2.5 bg-slate-700/50 hover:bg-slate-700 border border-slate-600/50 hover:border-slate-600 text-slate-300 hover:text-white rounded-xl transition-all font-medium disabled:opacity-60 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={busy}
            className="flex-1 px-4 py-2.5 bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600 text-white rounded-xl transition-all font-medium disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {busy && <Loader2 className="w-4 h-4 animate-spin" />}
            {busy ? 'Working...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

interface PolicyFormModalProps {
  userId: string;
  initial: Policy | null;
  onClose: () => void;
  onSaved: () => Promise<void> | void;
}

function PolicyFormModal({ userId, initial, onClose, onSaved }: PolicyFormModalProps) {
  const { showNotification } = useNotification();
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [form, setForm] = useState({
    provider_name: initial?.provider_name ?? '',
    policy_number: initial?.policy_number ?? '',
    policy_type: initial?.policy_type ?? 'TERM',
    coverage_amount: initial ? String(initial.coverage_amount) : '',
    premium_amount: initial ? String(initial.premium_amount) : '',
    premium_frequency: initial?.premium_frequency ?? 'MONTHLY',
    start_date: (initial?.start_date ?? '').slice(0, 10),
    end_date: (initial?.end_date ?? '').slice(0, 10),
    status: initial?.status ?? 'ACTIVE',
    policy_document_url: initial?.policy_document_url ?? '',
    notes: initial?.notes ?? '',
  });

  const setField = (field: keyof typeof form, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const validate = () => {
    const next: Record<string, string> = {};
    if (!form.provider_name.trim()) next.provider_name = 'Provider name is required';
    if (!form.policy_number.trim()) next.policy_number = 'Policy number is required';
    const coverage = parseAmount(form.coverage_amount);
    if (coverage === null) next.coverage_amount = 'Enter a valid amount';
    else if (coverage <= 0) next.coverage_amount = 'Coverage must be greater than zero';
    const premium = parseAmount(form.premium_amount);
    if (premium === null) next.premium_amount = 'Enter a valid amount';
    else if (premium < 0) next.premium_amount = 'Premium cannot be negative';
    if (!form.start_date) next.start_date = 'Start date is required';
    if (form.end_date && form.start_date && form.end_date < form.start_date) {
      next.end_date = 'End date must be after the start date';
    }
    return next;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const next = validate();
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    setSaving(true);
    try {
      const payload = {
        provider_name: form.provider_name.trim(),
        policy_number: form.policy_number.trim(),
        policy_type: form.policy_type,
        coverage_amount: Number(form.coverage_amount),
        premium_amount: Number(form.premium_amount),
        premium_frequency: form.premium_frequency,
        start_date: form.start_date,
        end_date: form.end_date || null,
        status: form.status,
        policy_document_url: form.policy_document_url.trim() || null,
        notes: form.notes.trim() || null,
      };

      if (initial) {
        const { error } = await supabase
          .from('insurance_policies')
          .update(payload)
          .eq('id', initial.id)
          .eq('user_id', userId);
        if (error) throw error;
        showNotification('Policy updated', 'success');
      } else {
        const { error } = await supabase
          .from('insurance_policies')
          .insert({ ...payload, user_id: userId });
        if (error) throw error;
        showNotification('Policy added', 'success');
      }

      await onSaved();
      onClose();
    } catch (err) {
      console.error('Error saving policy:', err);
      showNotification(errorMessage(err, initial ? 'Failed to update policy' : 'Failed to add policy'), 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <ModalShell
      title={initial ? 'Edit Policy' : 'Add Policy'}
      subtitle={initial ? `Policy #${initial.policy_number}` : 'Track a life insurance policy in your legacy vault'}
      onClose={onClose}
    >
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <Field label="Provider name" error={errors.provider_name}>
          <input
            type="text"
            value={form.provider_name}
            onChange={e => setField('provider_name', e.target.value)}
            placeholder="e.g. Northwestern Mutual"
            className={inputClass}
          />
        </Field>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Policy number" error={errors.policy_number}>
            <input
              type="text"
              value={form.policy_number}
              onChange={e => setField('policy_number', e.target.value)}
              placeholder="e.g. LI-2049-0117"
              className={inputClass}
            />
          </Field>
          <Field label="Policy type">
            <select
              value={form.policy_type}
              onChange={e => setField('policy_type', e.target.value)}
              className={inputClass}
            >
              {withCurrentValue(POLICY_TYPES, form.policy_type).map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </Field>
          <Field label="Coverage amount (USD)" error={errors.coverage_amount}>
            <input
              type="number"
              min="0"
              step="0.01"
              value={form.coverage_amount}
              onChange={e => setField('coverage_amount', e.target.value)}
              placeholder="500000"
              className={inputClass}
            />
          </Field>
          <Field label="Premium amount (USD)" error={errors.premium_amount}>
            <input
              type="number"
              min="0"
              step="0.01"
              value={form.premium_amount}
              onChange={e => setField('premium_amount', e.target.value)}
              placeholder="150"
              className={inputClass}
            />
          </Field>
          <Field label="Premium frequency">
            <select
              value={form.premium_frequency}
              onChange={e => setField('premium_frequency', e.target.value)}
              className={inputClass}
            >
              {withCurrentValue(PREMIUM_FREQUENCIES, form.premium_frequency).map(frequency => (
                <option key={frequency} value={frequency}>{frequency}</option>
              ))}
            </select>
          </Field>
          <Field label="Status">
            <select
              value={form.status}
              onChange={e => setField('status', e.target.value)}
              className={inputClass}
            >
              {withCurrentValue(POLICY_STATUSES, form.status).map(status => (
                <option key={status} value={status}>{status}</option>
              ))}
            </select>
          </Field>
          <Field label="Start date" error={errors.start_date}>
            <input
              type="date"
              value={form.start_date}
              onChange={e => setField('start_date', e.target.value)}
              className={inputClass}
            />
          </Field>
          <Field label="End date (optional)" error={errors.end_date}>
            <input
              type="date"
              value={form.end_date}
              onChange={e => setField('end_date', e.target.value)}
              className={inputClass}
            />
          </Field>
        </div>
        <Field label="Policy document URL (optional)">
          <input
            type="url"
            value={form.policy_document_url}
            onChange={e => setField('policy_document_url', e.target.value)}
            placeholder="https://..."
            className={inputClass}
          />
        </Field>
        <Field label="Notes (optional)">
          <textarea
            rows={3}
            value={form.notes}
            onChange={e => setField('notes', e.target.value)}
            placeholder="Anything your family should know about this policy"
            className={`${inputClass} resize-none`}
          />
        </Field>
        <FormActions saving={saving} submitLabel={initial ? 'Save Changes' : 'Add Policy'} onCancel={onClose} />
      </form>
    </ModalShell>
  );
}

interface BeneficiaryFormModalProps {
  policyId: string;
  initial: Beneficiary | null;
  allocatedPercentage: number;
  onClose: () => void;
  onSaved: () => Promise<void> | void;
}

function BeneficiaryFormModal({ policyId, initial, allocatedPercentage, onClose, onSaved }: BeneficiaryFormModalProps) {
  const { showNotification } = useNotification();
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [form, setForm] = useState({
    name: initial?.name ?? '',
    relationship: initial?.relationship ?? '',
    percentage: initial ? String(initial.percentage) : '',
    contact_email: initial?.contact_email ?? '',
    contact_phone: initial?.contact_phone ?? '',
    date_of_birth: (initial?.date_of_birth ?? '').slice(0, 10),
  });

  const remaining = Math.max(0, Math.round((100 - allocatedPercentage) * 100) / 100);

  const setField = (field: keyof typeof form, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const validate = () => {
    const next: Record<string, string> = {};
    if (!form.name.trim()) next.name = 'Name is required';
    if (!form.relationship.trim()) next.relationship = 'Relationship is required';
    const percentage = parseAmount(form.percentage);
    if (percentage === null) next.percentage = 'Enter a valid percentage';
    else if (percentage <= 0) next.percentage = 'Percentage must be greater than zero';
    else if (percentage > 100) next.percentage = 'Percentage cannot exceed 100%';
    else if (percentage + allocatedPercentage > 100) {
      next.percentage = `Total allocation cannot exceed 100% — only ${remaining}% is still unallocated`;
    }
    if (form.contact_email.trim() && !isValidEmail(form.contact_email.trim())) {
      next.contact_email = 'Enter a valid email address';
    }
    return next;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const next = validate();
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        relationship: form.relationship.trim(),
        percentage: Number(form.percentage),
        contact_email: form.contact_email.trim() || null,
        contact_phone: form.contact_phone.trim() || null,
        date_of_birth: form.date_of_birth || null,
      };

      if (initial) {
        const { error } = await supabase
          .from('insurance_beneficiaries')
          .update(payload)
          .eq('id', initial.id);
        if (error) throw error;
        showNotification('Beneficiary updated', 'success');
      } else {
        const { error } = await supabase
          .from('insurance_beneficiaries')
          .insert({ ...payload, policy_id: policyId });
        if (error) throw error;
        showNotification('Beneficiary added', 'success');
      }

      await onSaved();
      onClose();
    } catch (err) {
      console.error('Error saving beneficiary:', err);
      showNotification(errorMessage(err, initial ? 'Failed to update beneficiary' : 'Failed to add beneficiary'), 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <ModalShell
      title={initial ? 'Edit Beneficiary' : 'Add Beneficiary'}
      subtitle={`${remaining}% of the payout is still unallocated`}
      onClose={onClose}
    >
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <Field label="Full name" error={errors.name}>
          <input
            type="text"
            value={form.name}
            onChange={e => setField('name', e.target.value)}
            placeholder="e.g. Maria Alvarez"
            className={inputClass}
          />
        </Field>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Relationship" error={errors.relationship}>
            <input
              type="text"
              value={form.relationship}
              onChange={e => setField('relationship', e.target.value)}
              placeholder="e.g. Spouse, Child, Trust"
              className={inputClass}
            />
          </Field>
          <Field label="Payout percentage" error={errors.percentage}>
            <input
              type="number"
              min="0"
              max="100"
              step="0.01"
              value={form.percentage}
              onChange={e => setField('percentage', e.target.value)}
              placeholder="50"
              className={inputClass}
            />
          </Field>
          <Field label="Contact email (optional)" error={errors.contact_email}>
            <input
              type="email"
              value={form.contact_email}
              onChange={e => setField('contact_email', e.target.value)}
              placeholder="name@example.com"
              className={inputClass}
            />
          </Field>
          <Field label="Contact phone (optional)">
            <input
              type="tel"
              value={form.contact_phone}
              onChange={e => setField('contact_phone', e.target.value)}
              placeholder="+1 (555) 000-0000"
              className={inputClass}
            />
          </Field>
        </div>
        <Field label="Date of birth (optional)">
          <input
            type="date"
            value={form.date_of_birth}
            onChange={e => setField('date_of_birth', e.target.value)}
            className={inputClass}
          />
        </Field>
        <FormActions saving={saving} submitLabel={initial ? 'Save Changes' : 'Add Beneficiary'} onCancel={onClose} />
      </form>
    </ModalShell>
  );
}

interface ClaimFormModalProps {
  policies: Policy[];
  defaultPolicyId: string;
  onClose: () => void;
  onSaved: () => Promise<void> | void;
}

function ClaimFormModal({ policies, defaultPolicyId, onClose, onSaved }: ClaimFormModalProps) {
  const { showNotification } = useNotification();
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [form, setForm] = useState({
    policy_id: defaultPolicyId,
    claim_number: '',
    claim_type: '',
    claim_amount: '',
    filed_date: todayISO(),
    status: 'PENDING',
    resolution_date: '',
    notes: '',
  });

  const setField = (field: keyof typeof form, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const validate = () => {
    const next: Record<string, string> = {};
    if (!form.policy_id) next.policy_id = 'Select a policy';
    if (!form.claim_number.trim()) next.claim_number = 'Claim number is required';
    if (!form.claim_type.trim()) next.claim_type = 'Claim type is required';
    const amount = parseAmount(form.claim_amount);
    if (amount === null) next.claim_amount = 'Enter a valid amount';
    else if (amount <= 0) next.claim_amount = 'Amount must be greater than zero';
    if (!form.filed_date) next.filed_date = 'Filed date is required';
    if (form.status !== 'PENDING' && form.resolution_date && form.filed_date && form.resolution_date < form.filed_date) {
      next.resolution_date = 'Resolution date cannot be before the filed date';
    }
    return next;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const next = validate();
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    setSaving(true);
    try {
      const { error } = await supabase.from('insurance_claims').insert({
        policy_id: form.policy_id,
        claim_number: form.claim_number.trim(),
        claim_type: form.claim_type.trim(),
        claim_amount: Number(form.claim_amount),
        filed_date: form.filed_date,
        status: form.status,
        resolution_date: form.status !== 'PENDING' && form.resolution_date ? form.resolution_date : null,
        notes: form.notes.trim() || null,
      });
      if (error) throw error;

      showNotification('Claim filed', 'success');
      await onSaved();
      onClose();
    } catch (err) {
      console.error('Error filing claim:', err);
      showNotification(errorMessage(err, 'Failed to file claim'), 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <ModalShell title="File Claim" subtitle="Record a claim against one of your policies" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <Field label="Policy" error={errors.policy_id}>
          <select
            value={form.policy_id}
            onChange={e => setField('policy_id', e.target.value)}
            className={inputClass}
          >
            {policies.map(policy => (
              <option key={policy.id} value={policy.id}>
                {policy.provider_name} — #{policy.policy_number}
              </option>
            ))}
          </select>
        </Field>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Claim number" error={errors.claim_number}>
            <input
              type="text"
              value={form.claim_number}
              onChange={e => setField('claim_number', e.target.value)}
              placeholder="e.g. CLM-88431"
              className={inputClass}
            />
          </Field>
          <Field label="Claim type" error={errors.claim_type}>
            <input
              type="text"
              value={form.claim_type}
              onChange={e => setField('claim_type', e.target.value)}
              placeholder="e.g. Death Benefit, Disability"
              className={inputClass}
            />
          </Field>
          <Field label="Claim amount (USD)" error={errors.claim_amount}>
            <input
              type="number"
              min="0"
              step="0.01"
              value={form.claim_amount}
              onChange={e => setField('claim_amount', e.target.value)}
              placeholder="25000"
              className={inputClass}
            />
          </Field>
          <Field label="Filed date" error={errors.filed_date}>
            <input
              type="date"
              value={form.filed_date}
              onChange={e => setField('filed_date', e.target.value)}
              className={inputClass}
            />
          </Field>
          <Field label="Status">
            <select
              value={form.status}
              onChange={e => setField('status', e.target.value)}
              className={inputClass}
            >
              {CLAIM_STATUSES.map(status => (
                <option key={status} value={status}>{status}</option>
              ))}
            </select>
          </Field>
          {form.status !== 'PENDING' && (
            <Field label="Resolution date (optional)" error={errors.resolution_date}>
              <input
                type="date"
                value={form.resolution_date}
                onChange={e => setField('resolution_date', e.target.value)}
                className={inputClass}
              />
            </Field>
          )}
        </div>
        <Field label="Description (optional)">
          <textarea
            rows={3}
            value={form.notes}
            onChange={e => setField('notes', e.target.value)}
            placeholder="What is this claim for?"
            className={`${inputClass} resize-none`}
          />
        </Field>
        <FormActions saving={saving} submitLabel="File Claim" onCancel={onClose} />
      </form>
    </ModalShell>
  );
}

interface PaymentFormModalProps {
  policies: Policy[];
  defaultPolicyId: string;
  onClose: () => void;
  onSaved: () => Promise<void> | void;
}

function PaymentFormModal({ policies, defaultPolicyId, onClose, onSaved }: PaymentFormModalProps) {
  const { showNotification } = useNotification();
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const defaultPolicy = policies.find(p => p.id === defaultPolicyId);
  const [form, setForm] = useState({
    policy_id: defaultPolicyId,
    amount: defaultPolicy && Number(defaultPolicy.premium_amount) > 0 ? String(defaultPolicy.premium_amount) : '',
    payment_date: todayISO(),
    payment_method: 'Bank Transfer',
    confirmation_number: '',
    notes: '',
  });

  const setField = (field: keyof typeof form, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const validate = () => {
    const next: Record<string, string> = {};
    if (!form.policy_id) next.policy_id = 'Select a policy';
    const amount = parseAmount(form.amount);
    if (amount === null) next.amount = 'Enter a valid amount';
    else if (amount <= 0) next.amount = 'Amount must be greater than zero';
    if (!form.payment_date) next.payment_date = 'Payment date is required';
    return next;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const next = validate();
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    setSaving(true);
    try {
      const { error } = await supabase.from('insurance_payments').insert({
        policy_id: form.policy_id,
        amount: Number(form.amount),
        payment_date: form.payment_date,
        payment_method: form.payment_method,
        confirmation_number: form.confirmation_number.trim() || null,
        notes: form.notes.trim() || null,
      });
      if (error) throw error;

      showNotification('Payment recorded', 'success');
      await onSaved();
      onClose();
    } catch (err) {
      console.error('Error recording payment:', err);
      showNotification(errorMessage(err, 'Failed to record payment'), 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <ModalShell title="Record Payment" subtitle="Log a premium payment for one of your policies" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <Field label="Policy" error={errors.policy_id}>
          <select
            value={form.policy_id}
            onChange={e => setField('policy_id', e.target.value)}
            className={inputClass}
          >
            {policies.map(policy => (
              <option key={policy.id} value={policy.id}>
                {policy.provider_name} — #{policy.policy_number}
              </option>
            ))}
          </select>
        </Field>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Amount (USD)" error={errors.amount}>
            <input
              type="number"
              min="0"
              step="0.01"
              value={form.amount}
              onChange={e => setField('amount', e.target.value)}
              placeholder="150"
              className={inputClass}
            />
          </Field>
          <Field label="Payment date" error={errors.payment_date}>
            <input
              type="date"
              value={form.payment_date}
              onChange={e => setField('payment_date', e.target.value)}
              className={inputClass}
            />
          </Field>
          <Field label="Payment method">
            <select
              value={form.payment_method}
              onChange={e => setField('payment_method', e.target.value)}
              className={inputClass}
            >
              {PAYMENT_METHODS.map(method => (
                <option key={method} value={method}>{method}</option>
              ))}
            </select>
          </Field>
          <Field label="Confirmation number (optional)">
            <input
              type="text"
              value={form.confirmation_number}
              onChange={e => setField('confirmation_number', e.target.value)}
              placeholder="e.g. TXN-104492"
              className={inputClass}
            />
          </Field>
        </div>
        <Field label="Notes (optional)">
          <textarea
            rows={2}
            value={form.notes}
            onChange={e => setField('notes', e.target.value)}
            placeholder="Anything worth remembering about this payment"
            className={`${inputClass} resize-none`}
          />
        </Field>
        <FormActions saving={saving} submitLabel="Record Payment" onCancel={onClose} />
      </form>
    </ModalShell>
  );
}
