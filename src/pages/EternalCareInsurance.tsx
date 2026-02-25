import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import {
  Heart, Plus, Edit, Trash2, DollarSign, Calendar, Users, FileText,
  Download, Upload, Shield, TrendingUp, AlertCircle, CheckCircle2,
  Clock, ArrowLeft, Search, Filter, MoreVertical, X, File
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
}

export default function EternalCareInsurance() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [beneficiaries, setBeneficiaries] = useState<Beneficiary[]>([]);
  const [claims, setClaims] = useState<Claim[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPolicy, setSelectedPolicy] = useState<Policy | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'beneficiaries' | 'claims' | 'payments' | 'dividends'>('overview');
  const [showAddPolicy, setShowAddPolicy] = useState(false);
  const [dividendData, setDividendData] = useState<{ total_accumulated: number, recent_history: any[] }>({
    total_accumulated: 0,
    recent_history: []
  });

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

  const loadData = async () => {
    if (!user) return;

    try {
      setLoading(true);

      const [policiesRes, beneficiariesRes, claimsRes, paymentsRes] = await Promise.all([
        supabase.from('insurance_policies').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
        supabase.from('insurance_beneficiaries').select('*'),
        supabase.from('insurance_claims').select('*'),
        supabase.from('insurance_payments').select('*').order('payment_date', { ascending: false })
      ]);

      // Fetch Dividends from Custom API
      const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8001';
      const dividendRes = await fetch(`${API_BASE_URL}/api/v1/integrity/dividends`, {
        headers: {
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
        }
      });
      if (dividendRes.ok) {
        setDividendData(await dividendRes.json());
      }

      if (policiesRes.error) throw policiesRes.error;
      if (beneficiariesRes.error) throw beneficiariesRes.error;
      if (claimsRes.error) throw claimsRes.error;
      if (paymentsRes.error) throw paymentsRes.error;

      setPolicies(policiesRes.data || []);
      setBeneficiaries(beneficiariesRes.data || []);
      setClaims(claimsRes.data || []);
      setPayments(paymentsRes.data || []);

      if (policiesRes.data && policiesRes.data.length > 0 && !selectedPolicy) {
        setSelectedPolicy(policiesRes.data[0]);
      }
    } catch (error) {
      console.error('Error loading insurance data:', error);
    } finally {
      setLoading(false);
    }
  };

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

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-2 border-slate-700 border-t-rose-500 rounded-full animate-spin"></div>
          <p className="text-slate-400 text-sm">Loading insurance data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
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
                onClick={() => setShowAddPolicy(true)}
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
                  onClick={() => setShowAddPolicy(true)}
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
                      <button className="p-2 rounded-lg bg-slate-700/50 hover:bg-slate-700 text-slate-300 transition-all">
                        <Edit className="w-4 h-4" />
                      </button>
                      <button className="p-2 rounded-lg bg-slate-700/50 hover:bg-slate-700 text-rose-400 transition-all">
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
                        <h3 className="text-lg font-semibold text-white">Beneficiaries</h3>
                        <button className="px-4 py-2 rounded-lg bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600 text-white text-sm transition-all flex items-center gap-2">
                          <Plus className="w-4 h-4" />
                          Add Beneficiary
                        </button>
                      </div>
                      {selectedPolicyBeneficiaries.length === 0 ? (
                        <div className="p-8 text-center text-slate-400">
                          <Users className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                          <p>No beneficiaries added yet</p>
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
                                </div>
                                <button className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-all">
                                  <MoreVertical className="w-4 h-4" />
                                </button>
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
                        <button className="px-4 py-2 rounded-lg bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600 text-white text-sm transition-all flex items-center gap-2">
                          <Plus className="w-4 h-4" />
                          File Claim
                        </button>
                      </div>
                      {selectedPolicyClaims.length === 0 ? (
                        <div className="p-8 text-center text-slate-400">
                          <FileText className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                          <p>No claims filed yet</p>
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
                        <button className="px-4 py-2 rounded-lg bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600 text-white text-sm transition-all flex items-center gap-2">
                          <Plus className="w-4 h-4" />
                          Record Payment
                        </button>
                      </div>
                      {selectedPolicyPayments.length === 0 ? (
                        <div className="p-8 text-center text-slate-400">
                          <DollarSign className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                          <p>No payments recorded yet</p>
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
                <p className="text-sm text-slate-500">Select a policy from the list or add a new one</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
