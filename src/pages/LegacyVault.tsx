import React, { useState, useEffect } from 'react';
import { Calendar, FileText, Clock, Heart, Crown, Plus, Edit, Trash2, Lock, Users, Send, Shield, CheckCircle2, Building2, Sparkles, ArrowLeft } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';

interface LegacyItem {
  id: string;
  vault_type: 'time_capsule' | 'memorial_page' | 'digital_will' | 'scheduled_message' | 'secure_document';
  title: string;
  content: {
    message?: string;
    recipients?: string[];
    media?: string[];
    [key: string]: unknown;
  };
  recipients: string[];
  scheduled_delivery_date?: string;
  delivery_status: 'scheduled' | 'delivered' | 'cancelled';
  is_public: boolean;
  memorial_url?: string;
  storage_tier: 'standard' | '10_year' | '25_year' | 'lifetime';
  created_at: string;
}

export default function LegacyVault() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState<'continuity' | 'assurance'>('continuity');
  const [activeTab, setActiveTab] = useState<'time_capsules' | 'memorial' | 'will' | 'messages'>('time_capsules');
  const [items, setItems] = useState<LegacyItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [hasPremiumLegacy, setHasPremiumLegacy] = useState(false);
  const [hasEternalLegacy, setHasEternalLegacy] = useState(false);
  const [newItem, setNewItem] = useState({
    type: 'time_capsule' as LegacyItem['vault_type'],
    title: '',
    message: '',
    recipients: '',
    deliveryDate: '',
  });

  useEffect(() => {
    if (user) {
      loadLegacyItems();
      checkPremiumStatus();
    }
  }, [user, activeTab, activeSection]);

  const loadLegacyItems = async () => {
    if (!user || activeSection === 'assurance') return;

    try {
      const typeMap = {
        time_capsules: 'time_capsule',
        memorial: 'memorial_page',
        will: 'digital_will',
        messages: 'scheduled_message',
      };

      const { data, error } = await supabase
        .from('legacy_vault')
        .select('*')
        .eq('user_id', user.id)
        .eq('vault_type', typeMap[activeTab])
        .order('created_at', { ascending: false });

      if (error) throw error;
      setItems(data || []);
    } catch (error) {
      console.error('Error loading legacy items:', error);
    } finally {
      setLoading(false);
    }
  };

  const checkPremiumStatus = async () => {
    if (!user) return;

    const { data } = await supabase
      .from('user_subscriptions')
      .select('tier_id, subscription_tiers(tier_name)')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .maybeSingle();

    if (data) {
      const tierData = data as { subscription_tiers: { tier_name: string } };
      const tierName = tierData.subscription_tiers.tier_name;
      setHasPremiumLegacy(
        tierName === 'legacy_premium' ||
        tierName === 'legacy_eternal' ||
        tierName === 'ultimate_bundle'
      );
      setHasEternalLegacy(
        tierName === 'legacy_eternal' ||
        tierName === 'ultimate_bundle'
      );
    }
  };

  const createLegacyItem = async () => {
    if (!user || !newItem.title || !newItem.message) {
      alert('Please fill in all required fields');
      return;
    }

    try {
      const recipientsList = newItem.recipients
        .split(',')
        .map(r => r.trim())
        .filter(r => r);

      const storageTier = hasEternalLegacy ? 'lifetime' : hasPremiumLegacy ? '25_year' : 'standard';

      const { error } = await supabase
        .from('legacy_vault')
        .insert({
          user_id: user.id,
          vault_type: newItem.type,
          title: newItem.title,
          content: {
            message: newItem.message,
            recipients: recipientsList,
          },
          recipients: recipientsList,
          scheduled_delivery_date: newItem.deliveryDate || null,
          storage_tier: storageTier,
        });

      if (error) throw error;

      setShowCreateModal(false);
      setNewItem({
        type: 'time_capsule',
        title: '',
        message: '',
        recipients: '',
        deliveryDate: '',
      });
      loadLegacyItems();
    } catch (error) {
      console.error('Error creating legacy item:', error);
      alert('Failed to create item. Please try again.');
    }
  };

  const deleteItem = async (id: string) => {
    if (!confirm('Are you sure you want to delete this item?')) return;

    try {
      const { error } = await supabase
        .from('legacy_vault')
        .delete()
        .eq('id', id)
        .eq('user_id', user?.id);

      if (error) throw error;
      loadLegacyItems();
    } catch (error) {
      console.error('Error deleting item:', error);
      alert('Failed to delete item. Please try again.');
    }
  };

  const tabs = [
    { id: 'time_capsules' as const, label: 'Time Capsules', icon: Clock, color: 'from-amber-500 to-yellow-600' },
    { id: 'memorial' as const, label: 'Memorial Pages', icon: Heart, color: 'from-rose-500 to-pink-600' },
    { id: 'will' as const, label: 'Digital Will', icon: FileText, color: 'from-amber-600 to-orange-600' },
    { id: 'messages' as const, label: 'Scheduled Messages', icon: Send, color: 'from-emerald-500 to-teal-600' },
  ];

  const partners = [
    { name: 'Legacy Trust Partners', category: 'Estate Planning', icon: FileText, connected: false },
    { name: 'Eternal Care Insurance', category: 'Legacy Insurance', icon: Shield, connected: false },
    { name: 'Memorial Services Network', category: 'Funeral Services', icon: Heart, connected: false },
  ];

  if (loading && activeSection === 'continuity') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-2 border-slate-700 border-t-amber-500 rounded-full animate-spin"></div>
          <p className="text-slate-400 text-sm">Loading Legacy Vault...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-6">
            <button
              onClick={() => navigate('/dashboard')}
              className="w-10 h-10 bg-slate-800/50 hover:bg-slate-800 border border-slate-700/50 hover:border-slate-600 rounded-lg flex items-center justify-center transition-all"
            >
              <ArrowLeft className="w-5 h-5 text-slate-400" />
            </button>
            <div className="w-14 h-14 bg-gradient-to-br from-amber-500 via-yellow-500 to-orange-500 rounded-xl flex items-center justify-center shadow-lg shadow-amber-500/20">
              <Heart className="w-7 h-7 text-white" />
            </div>
            <div className="flex-1">
              <h1 className="text-3xl font-serif font-light tracking-tight text-white mb-1">Legacy Vault</h1>
              <p className="text-slate-400 leading-relaxed">
                Preserve Forever
              </p>
            </div>
            {activeSection === 'continuity' && (
              <button
                onClick={() => setShowCreateModal(true)}
                className="px-5 py-2.5 bg-gradient-to-r from-amber-600 to-yellow-600 hover:from-amber-700 hover:to-yellow-700 text-white rounded-xl transition-all shadow-lg shadow-amber-500/20 font-medium flex items-center gap-2 whitespace-nowrap"
              >
                <Plus className="w-4 h-4" />
                Create New
              </button>
            )}
          </div>

          {/* Section Navigation */}
          <div className="flex gap-2 mb-6">
            <button
              onClick={() => setActiveSection('continuity')}
              className={`flex-1 px-6 py-3 rounded-xl font-medium transition-all ${
                activeSection === 'continuity'
                  ? 'bg-gradient-to-r from-amber-600 to-yellow-600 text-white shadow-lg shadow-amber-500/20'
                  : 'bg-slate-800/50 border border-slate-700/50 text-slate-300 hover:bg-slate-800 hover:border-slate-600'
              }`}
            >
              Continuity Plans
            </button>
            <button
              onClick={() => setActiveSection('assurance')}
              className={`flex-1 px-6 py-3 rounded-xl font-medium transition-all ${
                activeSection === 'assurance'
                  ? 'bg-gradient-to-r from-amber-600 to-yellow-600 text-white shadow-lg shadow-amber-500/20'
                  : 'bg-slate-800/50 border border-slate-700/50 text-slate-300 hover:bg-slate-800 hover:border-slate-600'
              }`}
            >
              Legacy Assurance
            </button>
          </div>

          {/* Eternal Blessing Badge */}
          {hasEternalLegacy && activeSection === 'continuity' && (
            <div className="bg-gradient-to-r from-amber-500/10 to-yellow-500/10 border border-amber-500/30 rounded-xl p-4 mb-6 flex items-center gap-3">
              <Sparkles className="w-5 h-5 text-amber-400" />
              <div>
                <p className="text-sm font-medium text-white">Legacy Eternal Active</p>
                <p className="text-xs text-slate-400">Perpetual hosting • Blockchain verified • Heir delivery guaranteed</p>
              </div>
            </div>
          )}

          {/* Continuity Plans Tabs */}
          {activeSection === 'continuity' && (
            <div className="flex gap-2 overflow-x-auto scrollbar-hide">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`px-4 py-2.5 rounded-xl font-medium transition-all whitespace-nowrap flex items-center gap-2 ${
                      activeTab === tab.id
                        ? `bg-gradient-to-r ${tab.color} text-white shadow-lg`
                        : 'bg-slate-800/50 border border-slate-700/50 text-slate-300 hover:bg-slate-800 hover:border-slate-600'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {tab.label}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Continuity Plans Content */}
        {activeSection === 'continuity' && (
          <>
            {items.length === 0 ? (
              <div className="text-center py-16 bg-gradient-to-br from-slate-800/40 to-slate-900/40 backdrop-blur-xl rounded-2xl border border-slate-700/50">
                <div className="w-16 h-16 bg-slate-800/50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  {tabs.find(t => t.id === activeTab)?.icon &&
                    React.createElement(tabs.find(t => t.id === activeTab)!.icon, { className: "w-8 h-8 text-slate-600" })
                  }
                </div>
                <h3 className="text-xl font-medium text-white mb-2">No {tabs.find(t => t.id === activeTab)?.label} Yet</h3>
                <p className="text-slate-400 mb-6">Preserve your legacy for future generations</p>
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="px-6 py-3 bg-gradient-to-r from-amber-600 to-yellow-600 hover:from-amber-700 hover:to-yellow-700 text-white rounded-xl transition-all shadow-lg shadow-amber-500/20 font-medium inline-flex items-center gap-2"
                >
                  <Plus className="w-5 h-5" />
                  Create Your First {tabs.find(t => t.id === activeTab)?.label.slice(0, -1)}
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {items.map((item) => (
                  <div
                    key={item.id}
                    className="group bg-gradient-to-br from-slate-800/40 to-slate-900/40 backdrop-blur-xl rounded-2xl border border-slate-700/50 hover:border-amber-500/30 p-6 shadow-xl transition-all duration-300"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3 flex-1">
                        <div className={`w-10 h-10 bg-gradient-to-br ${tabs.find(t => t.id === activeTab)?.color} rounded-lg flex items-center justify-center shadow-lg`}>
                          {tabs.find(t => t.id === activeTab)?.icon &&
                            React.createElement(tabs.find(t => t.id === activeTab)!.icon, { className: "w-5 h-5 text-white" })
                          }
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-lg font-medium text-white truncate">{item.title}</h3>
                          {item.storage_tier !== 'standard' && (
                            <span className="text-xs text-amber-400 font-medium">
                              {item.storage_tier === 'lifetime' ? 'Eternal' : `${item.storage_tier.replace('_', '-')}`}
                            </span>
                          )}
                        </div>
                      </div>
                      {item.delivery_status === 'scheduled' && (
                        <span className="px-2 py-1 bg-amber-500/10 text-amber-400 text-xs rounded-lg border border-amber-500/20">
                          Scheduled
                        </span>
                      )}
                    </div>

                    <p className="text-sm text-slate-300 mb-4 leading-relaxed line-clamp-3">
                      {item.content.message || 'No message content'}
                    </p>

                    <div className="space-y-2 mb-4 pb-4 border-b border-slate-700/50">
                      {item.scheduled_delivery_date && (
                        <div className="flex items-center gap-2 text-xs text-slate-400">
                          <Calendar className="w-3.5 h-3.5" />
                          <span>Delivers: {new Date(item.scheduled_delivery_date).toLocaleDateString()}</span>
                        </div>
                      )}
                      {item.recipients.length > 0 && (
                        <div className="flex items-center gap-2 text-xs text-slate-400">
                          <Users className="w-3.5 h-3.5" />
                          <span>{item.recipients.length} recipient{item.recipients.length !== 1 ? 's' : ''}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-2 text-xs text-slate-400">
                        <Lock className="w-3.5 h-3.5" />
                        <span>{item.is_public ? 'Public' : 'Private'}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          setNewItem({
                            type: item.vault_type,
                            title: item.title,
                            message: item.content.message || '',
                            recipients: item.recipients.join(', '),
                            deliveryDate: item.scheduled_delivery_date || '',
                          });
                          setShowCreateModal(true);
                        }}
                        className="flex-1 px-3 py-2 bg-slate-700/50 hover:bg-slate-700 border border-slate-600/50 hover:border-slate-600 text-slate-300 hover:text-white rounded-lg transition-all text-sm font-medium flex items-center justify-center gap-2"
                      >
                        <Edit className="w-3.5 h-3.5" />
                        Edit
                      </button>
                      <button
                        onClick={() => deleteItem(item.id)}
                        className="px-3 py-2 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 hover:border-rose-500/30 text-rose-400 hover:text-rose-300 rounded-lg transition-all text-sm font-medium"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* Legacy Assurance Content */}
        {activeSection === 'assurance' && (
          <div className="space-y-6">
            <div className="bg-gradient-to-br from-slate-800/40 to-slate-900/40 backdrop-blur-xl rounded-2xl border border-slate-700/50 p-6">
              <div className="flex items-center gap-3 mb-6">
                <Building2 className="w-6 h-6 text-amber-400" />
                <h2 className="text-xl font-serif font-medium text-white">Vault Connect API</h2>
              </div>
              <p className="text-slate-400 mb-6 leading-relaxed">
                Connect your encrypted Engram and digital will with trusted partners for seamless legacy execution and estate management.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {partners.map((partner, index) => {
                  const Icon = partner.icon;
                  return (
                    <div key={index} className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5 hover:border-amber-500/30 transition-all">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-amber-500 to-yellow-600 rounded-lg flex items-center justify-center">
                          <Icon className="w-5 h-5 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-sm font-medium text-white truncate">{partner.name}</h3>
                          <p className="text-xs text-slate-500">{partner.category}</p>
                        </div>
                      </div>
                      <p className="text-xs text-slate-400 mb-3">Secure encrypted data sharing with verified partners</p>
                      <button className="w-full px-4 py-2 bg-slate-700/50 hover:bg-slate-700 border border-slate-600/50 text-slate-300 hover:text-white rounded-lg transition-all text-sm font-medium">
                        {partner.connected ? (
                          <span className="flex items-center justify-center gap-2">
                            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                            Connected
                          </span>
                        ) : (
                          'Connect'
                        )}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="bg-gradient-to-br from-slate-800/40 to-slate-900/40 backdrop-blur-xl rounded-2xl border border-slate-700/50 p-6">
              <div className="flex items-center gap-3 mb-4">
                <Shield className="w-6 h-6 text-amber-400" />
                <h2 className="text-xl font-serif font-medium text-white">Blessing Insurance</h2>
              </div>
              <p className="text-slate-400 mb-6 leading-relaxed">
                A symbolic micro-insurance plan that ensures perpetual hosting of your digital legacy after account inactivity. Your memories, blessed and preserved forever.
              </p>
              <button className="px-6 py-3 bg-gradient-to-r from-amber-600 to-yellow-600 hover:from-amber-700 hover:to-yellow-700 text-white rounded-xl transition-all shadow-lg shadow-amber-500/20 font-medium">
                Learn More
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="bg-gradient-to-br from-slate-800/95 to-slate-900/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-slate-700/50 p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center gap-4 mb-6">
              <div className={`w-12 h-12 bg-gradient-to-br ${tabs.find(t => t.id === activeTab)?.color} rounded-xl flex items-center justify-center shadow-lg`}>
                <Plus className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-2xl font-serif font-light text-white">Create {tabs.find(t => t.id === activeTab)?.label.slice(0, -1)}</h3>
            </div>

            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-3">Title</label>
                <input
                  type="text"
                  value={newItem.title}
                  onChange={(e) => setNewItem({ ...newItem, title: e.target.value })}
                  placeholder="Give your legacy item a meaningful title"
                  className="w-full bg-slate-900/50 border border-slate-700 hover:border-slate-600 focus:border-amber-500 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20 transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-3">Message</label>
                <textarea
                  value={newItem.message}
                  onChange={(e) => setNewItem({ ...newItem, message: e.target.value })}
                  placeholder="Write your message for the future..."
                  rows={8}
                  className="w-full bg-slate-900/50 border border-slate-700 hover:border-slate-600 focus:border-amber-500 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20 transition-all resize-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-3">Recipients (comma-separated emails)</label>
                <input
                  type="text"
                  value={newItem.recipients}
                  onChange={(e) => setNewItem({ ...newItem, recipients: e.target.value })}
                  placeholder="email1@example.com, email2@example.com"
                  className="w-full bg-slate-900/50 border border-slate-700 hover:border-slate-600 focus:border-amber-500 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20 transition-all"
                />
              </div>

              {activeTab === 'messages' && (
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-3">Delivery Date</label>
                  <input
                    type="date"
                    value={newItem.deliveryDate}
                    onChange={(e) => setNewItem({ ...newItem, deliveryDate: e.target.value })}
                    className="w-full bg-slate-900/50 border border-slate-700 hover:border-slate-600 focus:border-amber-500 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 transition-all"
                  />
                </div>
              )}
            </div>

            <div className="flex gap-3 mt-8">
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setNewItem({
                    type: 'time_capsule',
                    title: '',
                    message: '',
                    recipients: '',
                    deliveryDate: '',
                  });
                }}
                className="flex-1 px-6 py-3 bg-slate-700/50 hover:bg-slate-700 border border-slate-600/50 hover:border-slate-600 text-slate-300 hover:text-white rounded-xl transition-all font-medium"
              >
                Cancel
              </button>
              <button
                onClick={createLegacyItem}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-amber-600 to-yellow-600 hover:from-amber-700 hover:to-yellow-700 text-white rounded-xl transition-all shadow-lg shadow-amber-500/20 font-medium"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Upgrade Modal */}
      {showUpgradeModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="bg-gradient-to-br from-slate-800/95 to-slate-900/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-amber-500/30 p-8 max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-14 h-14 bg-gradient-to-br from-amber-500 to-yellow-600 rounded-xl flex items-center justify-center shadow-lg shadow-amber-500/20">
                <Crown className="w-7 h-7 text-white" />
              </div>
              <div>
                <h3 className="text-2xl font-serif font-light text-white mb-1">Legacy Vault Plans</h3>
                <p className="text-sm text-amber-400 font-medium">Preserve Forever</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5">
                <h4 className="text-lg font-medium text-white mb-2">Continuity Basic</h4>
                <div className="text-3xl font-light text-white mb-1">Free</div>
                <div className="text-xs text-slate-500 mb-4">forever</div>
                <ul className="space-y-2 text-xs text-slate-400">
                  <li>1 scheduled message</li>
                  <li>Basic storage</li>
                  <li>Email delivery</li>
                </ul>
              </div>

              <div className="bg-gradient-to-br from-amber-500/10 to-yellow-500/10 border border-amber-500/30 rounded-xl p-5">
                <h4 className="text-lg font-medium text-white mb-2">Legacy Plus</h4>
                <div className="text-3xl font-light text-white mb-1">$9.99</div>
                <div className="text-xs text-slate-500 mb-4">per month</div>
                <ul className="space-y-2 text-xs text-slate-300">
                  <li>10 GB encrypted storage</li>
                  <li>10 scheduled messages</li>
                  <li>Yearly Memorial Compilation</li>
                  <li>Priority delivery</li>
                </ul>
                <button
                  onClick={async () => {
                    try {
                      const { data, error } = await supabase.functions.invoke('stripe-checkout', {
                        body: {
                          type: 'legacy_premium',
                          price_id: 'price_legacy_premium_monthly',
                          success_url: `${window.location.origin}/legacy-vault?upgrade=success`,
                          cancel_url: `${window.location.origin}/legacy-vault?upgrade=cancelled`,
                        },
                      });

                      if (error) throw error;
                      if (data?.url) window.location.href = data.url;
                    } catch (err) {
                      console.error('Upgrade error:', err);
                      alert('Failed to start upgrade. Please try again.');
                    }
                  }}
                  className="w-full mt-4 px-4 py-2 bg-gradient-to-r from-amber-600 to-yellow-600 hover:from-amber-700 hover:to-yellow-700 text-white rounded-lg transition-all text-sm font-medium"
                >
                  Upgrade
                </button>
              </div>

              <div className="bg-gradient-to-br from-amber-500/10 to-orange-500/10 border border-amber-500/30 rounded-xl p-5">
                <div className="flex items-center gap-2 mb-2">
                  <h4 className="text-lg font-medium text-white">Legacy Eternal</h4>
                  <Sparkles className="w-4 h-4 text-amber-400" />
                </div>
                <div className="text-3xl font-light text-white mb-1">$49</div>
                <div className="text-xs text-slate-500 mb-4">per year</div>
                <ul className="space-y-2 text-xs text-slate-300">
                  <li>Perpetual hosting</li>
                  <li>Verified heir delivery</li>
                  <li>Blockchain timestamp</li>
                  <li>Blessing Insurance</li>
                </ul>
                <button
                  onClick={async () => {
                    try {
                      const { data, error } = await supabase.functions.invoke('stripe-checkout', {
                        body: {
                          type: 'legacy_eternal',
                          price_id: 'price_legacy_eternal_yearly',
                          success_url: `${window.location.origin}/legacy-vault?upgrade=success`,
                          cancel_url: `${window.location.origin}/legacy-vault?upgrade=cancelled`,
                        },
                      });

                      if (error) throw error;
                      if (data?.url) window.location.href = data.url;
                    } catch (err) {
                      console.error('Upgrade error:', err);
                      alert('Failed to start upgrade. Please try again.');
                    }
                  }}
                  className="w-full mt-4 px-4 py-2 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white rounded-lg transition-all text-sm font-medium"
                >
                  Upgrade
                </button>
              </div>
            </div>

            <button
              onClick={() => setShowUpgradeModal(false)}
              className="w-full px-6 py-3 bg-slate-700/50 hover:bg-slate-700 border border-slate-600/50 hover:border-slate-600 text-slate-300 hover:text-white rounded-xl transition-all font-medium"
            >
              Maybe Later
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
