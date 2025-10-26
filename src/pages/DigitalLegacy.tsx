import React, { useState, useEffect } from 'react';
import { Calendar, Mail, FileText, Clock, Heart, Crown, Plus, Edit, Trash2, Lock, Users, Image as ImageIcon, Video, Send, ArrowLeft } from 'lucide-react';
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

export default function DigitalLegacy() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'time_capsules' | 'memorial' | 'will' | 'messages'>('time_capsules');
  const [items, setItems] = useState<LegacyItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [hasPremiumLegacy, setHasPremiumLegacy] = useState(false);
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
  }, [user, activeTab]);

  const loadLegacyItems = async () => {
    if (!user) return;

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
      setHasPremiumLegacy(
        tierData.subscription_tiers.tier_name === 'legacy_premium' ||
        tierData.subscription_tiers.tier_name === 'ultimate_bundle'
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
          storage_tier: hasPremiumLegacy ? '25_year' : 'standard',
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
    { id: 'time_capsules' as const, label: 'Time Capsules', icon: Clock, color: 'from-sky-600 to-blue-600' },
    { id: 'memorial' as const, label: 'Memorial Pages', icon: Heart, color: 'from-rose-600 to-pink-600' },
    { id: 'will' as const, label: 'Digital Will', icon: FileText, color: 'from-amber-600 to-orange-600' },
    { id: 'messages' as const, label: 'Scheduled Messages', icon: Send, color: 'from-emerald-600 to-teal-600' },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-2 border-slate-700 border-t-purple-500 rounded-full animate-spin"></div>
          <p className="text-slate-400 text-sm">Loading Digital Legacy...</p>
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
            <div className="w-14 h-14 bg-gradient-to-br from-purple-500 via-pink-500 to-rose-500 rounded-xl flex items-center justify-center shadow-lg shadow-purple-500/20">
              <Heart className="w-7 h-7 text-white" />
            </div>
            <div className="flex-1">
              <h1 className="text-3xl font-light tracking-tight text-white mb-1">Digital Legacy</h1>
              <p className="text-slate-400 leading-relaxed">
                Preserve your memories and messages for future generations
              </p>
            </div>
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl transition-all shadow-lg shadow-purple-500/20 font-medium flex items-center gap-2 whitespace-nowrap"
            >
              <Plus className="w-4 h-4" />
              Create New
            </button>
          </div>

          {/* Premium Banner */}
          {!hasPremiumLegacy && (
            <div className="relative bg-gradient-to-r from-purple-500/10 via-pink-500/10 to-rose-500/10 border border-purple-500/20 rounded-xl p-6 mb-6 overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-r from-purple-500/5 to-rose-500/5 animate-pulse"></div>
              <div className="relative flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-start gap-4 flex-1">
                  <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl flex items-center justify-center shadow-lg flex-shrink-0">
                    <Crown className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-medium text-white mb-1">Upgrade to Legacy Premium</h3>
                    <p className="text-sm text-slate-300 mb-3">
                      25-year guaranteed storage, unlimited scheduled messages, and custom memorial pages
                    </p>
                    <div className="text-xs text-slate-400">
                      Standard plan: 10 messages · Basic storage · $19.99/month for premium
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setShowUpgradeModal(true)}
                  className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white rounded-xl transition-all shadow-lg shadow-purple-500/20 font-medium whitespace-nowrap flex items-center gap-2"
                >
                  <Crown className="w-5 h-5" />
                  Upgrade Now
                </button>
              </div>
            </div>
          )}

          {/* Tabs */}
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
        </div>

        {/* Content Grid */}
        {items.length === 0 ? (
          <div className="text-center py-16 bg-gradient-to-br from-slate-800/40 to-slate-900/40 backdrop-blur-xl rounded-2xl border border-slate-700/50">
            <div className="w-16 h-16 bg-slate-800/50 rounded-2xl flex items-center justify-center mx-auto mb-4">
              {tabs.find(t => t.id === activeTab)?.icon &&
                React.createElement(tabs.find(t => t.id === activeTab)!.icon, { className: "w-8 h-8 text-slate-600" })
              }
            </div>
            <h3 className="text-xl font-medium text-white mb-2">No {tabs.find(t => t.id === activeTab)?.label} Yet</h3>
            <p className="text-slate-400 mb-6">Start preserving your legacy for future generations</p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl transition-all shadow-lg shadow-purple-500/20 font-medium inline-flex items-center gap-2"
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
                className="group bg-gradient-to-br from-slate-800/40 to-slate-900/40 backdrop-blur-xl rounded-2xl border border-slate-700/50 hover:border-slate-600/50 p-6 shadow-xl transition-all duration-300"
              >
                {/* Header */}
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
                        <span className="text-xs text-purple-400 font-medium">
                          {item.storage_tier === 'lifetime' ? 'Lifetime' : `${item.storage_tier.replace('_', '-')} storage`}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    {item.delivery_status === 'scheduled' && (
                      <span className="px-2 py-1 bg-amber-500/10 text-amber-400 text-xs rounded-lg border border-amber-500/20">
                        Scheduled
                      </span>
                    )}
                  </div>
                </div>

                {/* Content Preview */}
                <p className="text-sm text-slate-300 mb-4 leading-relaxed line-clamp-3">
                  {item.content.message || 'No message content'}
                </p>

                {/* Metadata */}
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

                {/* Actions */}
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
      </div>

      {/* Create/Edit Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="bg-gradient-to-br from-slate-800/95 to-slate-900/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-slate-700/50 p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center gap-4 mb-6">
              <div className={`w-12 h-12 bg-gradient-to-br ${tabs.find(t => t.id === activeTab)?.color} rounded-xl flex items-center justify-center shadow-lg`}>
                <Plus className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-2xl font-light text-white">Create {tabs.find(t => t.id === activeTab)?.label.slice(0, -1)}</h3>
            </div>

            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-3">Title *</label>
                <input
                  type="text"
                  value={newItem.title}
                  onChange={(e) => setNewItem({ ...newItem, title: e.target.value })}
                  placeholder="Give your legacy item a meaningful title"
                  className="w-full bg-slate-900/50 border border-slate-700 hover:border-slate-600 focus:border-purple-500 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500/20 transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-3">Message *</label>
                <textarea
                  value={newItem.message}
                  onChange={(e) => setNewItem({ ...newItem, message: e.target.value })}
                  placeholder="Write your message for the future..."
                  rows={8}
                  className="w-full bg-slate-900/50 border border-slate-700 hover:border-slate-600 focus:border-purple-500 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500/20 transition-all resize-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-3">Recipients (comma-separated emails)</label>
                <input
                  type="text"
                  value={newItem.recipients}
                  onChange={(e) => setNewItem({ ...newItem, recipients: e.target.value })}
                  placeholder="email1@example.com, email2@example.com"
                  className="w-full bg-slate-900/50 border border-slate-700 hover:border-slate-600 focus:border-purple-500 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500/20 transition-all"
                />
              </div>

              {activeTab === 'messages' && (
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-3">Delivery Date</label>
                  <input
                    type="date"
                    value={newItem.deliveryDate}
                    onChange={(e) => setNewItem({ ...newItem, deliveryDate: e.target.value })}
                    className="w-full bg-slate-900/50 border border-slate-700 hover:border-slate-600 focus:border-purple-500 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-purple-500/20 transition-all"
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
                className="flex-1 px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white rounded-xl transition-all shadow-lg shadow-purple-500/20 font-medium"
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
          <div className="bg-gradient-to-br from-slate-800/95 to-slate-900/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-purple-500/30 p-8 max-w-2xl w-full">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-14 h-14 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl flex items-center justify-center shadow-lg shadow-purple-500/20">
                <Crown className="w-7 h-7 text-white" />
              </div>
              <div>
                <h3 className="text-2xl font-light text-white mb-1">Legacy Premium</h3>
                <p className="text-sm text-purple-400 font-medium">Secure Your Digital Afterlife</p>
              </div>
            </div>

            <div className="space-y-4 mb-6">
              <div className="p-4 bg-purple-500/5 border border-purple-500/20 rounded-xl">
                <h4 className="text-sm font-medium text-white mb-1">25-Year Guaranteed Storage</h4>
                <p className="text-xs text-slate-400">Your legacy items are preserved for a quarter century with enterprise-grade security</p>
              </div>
              <div className="p-4 bg-pink-500/5 border border-pink-500/20 rounded-xl">
                <h4 className="text-sm font-medium text-white mb-1">Unlimited Scheduled Messages</h4>
                <p className="text-xs text-slate-400">Create as many time-capsule messages as you want with flexible delivery dates</p>
              </div>
              <div className="p-4 bg-rose-500/5 border border-rose-500/20 rounded-xl">
                <h4 className="text-sm font-medium text-white mb-1">Custom Memorial Pages</h4>
                <p className="text-xs text-slate-400">Beautiful, customizable memorial pages with photo galleries and tribute walls</p>
              </div>
              <div className="p-4 bg-amber-500/5 border border-amber-500/20 rounded-xl">
                <h4 className="text-sm font-medium text-white mb-1">Digital Will & Vault</h4>
                <p className="text-xs text-slate-400">Secure storage for important documents, passwords, and final wishes with executor access</p>
              </div>
            </div>

            <div className="mb-6 p-6 bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-500/20 rounded-xl text-center">
              <div className="text-sm text-slate-400 mb-1">Legacy Premium</div>
              <div className="text-4xl font-light text-white mb-1">$19.99</div>
              <div className="text-xs text-slate-500">per month · cancel anytime</div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowUpgradeModal(false)}
                className="flex-1 px-6 py-3 bg-slate-700/50 hover:bg-slate-700 border border-slate-600/50 hover:border-slate-600 text-slate-300 hover:text-white rounded-xl transition-all font-medium"
              >
                Maybe Later
              </button>
              <button
                onClick={async () => {
                  try {
                    const { data, error } = await supabase.functions.invoke('stripe-checkout', {
                      body: {
                        type: 'legacy_premium',
                        price_id: 'price_legacy_premium_monthly',
                        success_url: `${window.location.origin}/digital-legacy?upgrade=success`,
                        cancel_url: `${window.location.origin}/digital-legacy?upgrade=cancelled`,
                      },
                    });

                    if (error) throw error;
                    if (data?.url) {
                      window.location.href = data.url;
                    }
                  } catch (err) {
                    console.error('Upgrade error:', err);
                    alert('Failed to start upgrade. Please try again.');
                  }
                }}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white rounded-xl transition-all shadow-lg shadow-purple-500/20 font-medium flex items-center justify-center gap-2"
              >
                <Crown className="w-5 h-5" />
                Upgrade Now
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
