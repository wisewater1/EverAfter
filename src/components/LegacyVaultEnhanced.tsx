import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import {
  Calendar, FileText, Clock, Heart, Crown, Plus, Edit, Trash2, Lock,
  Users, Send, Shield, CheckCircle2, Download, Eye, Copy, Play, Pause,
  AlertTriangle, Info, X, ExternalLink, Mail, Image, Video, File,
  ChevronRight, Search, Filter, Zap, Globe, Link as LinkIcon
} from 'lucide-react';

interface VaultItem {
  id: string;
  type: 'CAPSULE' | 'MEMORIAL' | 'WILL' | 'MESSAGE';
  title: string;
  slug?: string;
  status: 'DRAFT' | 'SCHEDULED' | 'LOCKED' | 'PUBLISHED' | 'PAUSED' | 'SENT' | 'ARCHIVED';
  payload: any;
  is_encrypted: boolean;
  unlock_at?: string;
  unlock_rule?: 'DATE' | 'DEATH_CERT' | 'CUSTODIAN_APPROVAL' | 'HEARTBEAT_TIMEOUT';
  created_at: string;
  updated_at: string;
}

interface Beneficiary {
  id: string;
  email: string;
  name?: string;
  relationship?: string;
}

interface Receipt {
  id: string;
  receipt_type: string;
  snapshot_id: string;
  sha256: string;
  created_at: string;
  download_count: number;
}

export default function LegacyVaultEnhanced() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState<'continuity' | 'assurance'>('continuity');
  const [activeTab, setActiveTab] = useState<'CAPSULE' | 'MEMORIAL' | 'WILL' | 'MESSAGE'>('CAPSULE');
  const [items, setItems] = useState<VaultItem[]>([]);
  const [beneficiaries, setBeneficiaries] = useState<Beneficiary[]>([]);
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<VaultItem | null>(null);

  useEffect(() => {
    if (user) {
      if (activeSection === 'continuity') {
        loadVaultItems();
      } else {
        loadAssuranceData();
      }
    }
  }, [user, activeTab, activeSection]);

  const loadVaultItems = async () => {
    try {
      const { data, error } = await supabase
        .from('vault_items')
        .select('*')
        .eq('type', activeTab)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setItems(data || []);
    } catch (error) {
      console.error('Error loading vault items:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadAssuranceData = async () => {
    try {
      const [beneficiariesRes, receiptsRes] = await Promise.all([
        supabase.from('beneficiaries').select('*').order('created_at', { ascending: false }),
        supabase.from('vault_receipts').select('*').order('created_at', { ascending: false }).limit(20)
      ]);

      if (beneficiariesRes.data) setBeneficiaries(beneficiariesRes.data);
      if (receiptsRes.data) setReceipts(receiptsRes.data);
    } catch (error) {
      console.error('Error loading assurance data:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredItems = items.filter(item =>
    item.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Legacy Vault</h1>
            <p className="text-slate-400">Secure your digital legacy and continuity plans</p>
          </div>
          {activeSection === 'continuity' && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-6 py-3 rounded-xl bg-gradient-to-r from-teal-600 to-cyan-600 text-white font-medium hover:opacity-90 transition-all flex items-center gap-2"
            >
              <Plus className="w-5 h-5" />
              Create New
            </button>
          )}
        </div>

        <div className="flex items-center gap-4 mb-6 border-b border-white/10">
          <button
            onClick={() => setActiveSection('continuity')}
            className={`px-6 py-3 font-medium transition-all relative ${
              activeSection === 'continuity'
                ? 'text-teal-400'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Continuity Plans
            {activeSection === 'continuity' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-teal-400 to-cyan-400" />
            )}
          </button>
          <button
            onClick={() => setActiveSection('assurance')}
            className={`px-6 py-3 font-medium transition-all relative ${
              activeSection === 'assurance'
                ? 'text-teal-400'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Legacy Assurance
            {activeSection === 'assurance' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-teal-400 to-cyan-400" />
            )}
          </button>
        </div>

        {activeSection === 'continuity' ? (
          <ContinuityPlansSection
            activeTab={activeTab}
            onTabChange={setActiveTab}
            items={filteredItems}
            loading={loading}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            onItemSelect={setSelectedItem}
            onRefresh={loadVaultItems}
          />
        ) : (
          <LegacyAssuranceSection
            beneficiaries={beneficiaries}
            receipts={receipts}
            loading={loading}
            navigate={navigate}
          />
        )}

        {showCreateModal && (
          <CreateItemModal
            onClose={() => setShowCreateModal(false)}
            onSuccess={() => {
              setShowCreateModal(false);
              loadVaultItems();
            }}
          />
        )}

        {selectedItem && (
          <ItemDetailModal
            item={selectedItem}
            onClose={() => setSelectedItem(null)}
            onRefresh={loadVaultItems}
          />
        )}
      </div>
    </div>
  );
}

function ContinuityPlansSection({
  activeTab,
  onTabChange,
  items,
  loading,
  searchQuery,
  onSearchChange,
  onItemSelect,
  onRefresh
}: {
  activeTab: string;
  onTabChange: (tab: any) => void;
  items: VaultItem[];
  loading: boolean;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onItemSelect: (item: VaultItem) => void;
  onRefresh: () => void;
}) {
  const tabs = [
    { id: 'CAPSULE', label: 'Time Capsules', icon: Clock, color: 'from-blue-500/20 to-cyan-500/20' },
    { id: 'MEMORIAL', label: 'Memorial Pages', icon: Heart, color: 'from-rose-500/20 to-pink-500/20' },
    { id: 'WILL', label: 'Digital Will', icon: FileText, color: 'from-amber-500/20 to-orange-500/20' },
    { id: 'MESSAGE', label: 'Scheduled Messages', icon: Send, color: 'from-purple-500/20 to-indigo-500/20' },
  ];

  const activeTabData = tabs.find(t => t.id === activeTab);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 overflow-x-auto pb-2">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`px-4 py-3 rounded-xl font-medium transition-all whitespace-nowrap flex items-center gap-2 ${
                activeTab === tab.id
                  ? 'bg-gradient-to-br ' + tab.color + ' text-white border border-white/20'
                  : 'bg-white/5 text-slate-400 hover:text-white hover:bg-white/10'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      <div className="flex items-center gap-3">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search..."
            className="w-full pl-10 pr-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-teal-500/50"
          />
        </div>
        <button className="px-4 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-white transition-all">
          <Filter className="w-5 h-5" />
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="w-8 h-8 border-4 border-teal-400 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : items.length === 0 ? (
        <EmptyState type={activeTab} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {items.map((item) => (
            <ItemCard key={item.id} item={item} onSelect={onItemSelect} />
          ))}
        </div>
      )}
    </div>
  );
}

function EmptyState({ type }: { type: string }) {
  const emptyStates = {
    CAPSULE: {
      title: 'No Time Capsules Yet',
      description: 'Preserve your legacy for future generations.',
      cta: 'Create Your First Time Capsule',
      icon: Clock,
    },
    MEMORIAL: {
      title: 'No Memorial Pages Yet',
      description: 'Start a memorial space with stories, images, and tributes.',
      cta: 'Create Memorial',
      icon: Heart,
    },
    WILL: {
      title: 'No Digital Will Yet',
      description: 'Record your wishes and attach legal docs. This is guidance, not a substitute for legal advice.',
      cta: 'Start Will',
      icon: FileText,
    },
    MESSAGE: {
      title: 'No Scheduled Messages Yet',
      description: 'Write messages to future moments. Deliver on a date or on event.',
      cta: 'Schedule Message',
      icon: Send,
    },
  };

  const state = emptyStates[type as keyof typeof emptyStates];
  const Icon = state.icon;

  return (
    <div className="flex flex-col items-center justify-center py-16 px-4">
      <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center mb-6">
        <Icon className="w-10 h-10 text-slate-400" />
      </div>
      <h3 className="text-xl font-bold text-white mb-2">{state.title}</h3>
      <p className="text-slate-400 text-center mb-6 max-w-md">{state.description}</p>
      <button className="px-6 py-3 rounded-xl bg-gradient-to-r from-teal-600 to-cyan-600 text-white font-medium hover:opacity-90 transition-all">
        {state.cta}
      </button>
    </div>
  );
}

function ItemCard({ item, onSelect }: { item: VaultItem; onSelect: (item: VaultItem) => void }) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PUBLISHED': return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
      case 'SCHEDULED': return 'bg-blue-500/10 text-blue-400 border-blue-500/30';
      case 'DRAFT': return 'bg-slate-500/10 text-slate-400 border-slate-500/30';
      case 'LOCKED': return 'bg-amber-500/10 text-amber-400 border-amber-500/30';
      case 'SENT': return 'bg-purple-500/10 text-purple-400 border-purple-500/30';
      default: return 'bg-slate-500/10 text-slate-400 border-slate-500/30';
    }
  };

  return (
    <button
      onClick={() => onSelect(item)}
      className="p-6 rounded-2xl bg-gradient-to-br from-white/5 to-white/[0.02] border border-white/10 hover:border-white/20 transition-all text-left group"
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <h3 className="text-white font-semibold mb-1 group-hover:text-teal-400 transition-colors">
            {item.title}
          </h3>
          <p className="text-slate-500 text-sm">
            {new Date(item.created_at).toLocaleDateString()}
          </p>
        </div>
        {item.is_encrypted && (
          <div className="w-8 h-8 rounded-lg bg-teal-500/10 flex items-center justify-center">
            <Lock className="w-4 h-4 text-teal-400" />
          </div>
        )}
      </div>

      <div className="flex items-center gap-2">
        <span className={`px-3 py-1 rounded-lg text-xs font-medium border ${getStatusColor(item.status)}`}>
          {item.status}
        </span>
        <ChevronRight className="w-4 h-4 text-slate-500 ml-auto group-hover:text-white transition-colors" />
      </div>
    </button>
  );
}

function LegacyAssuranceSection({
  beneficiaries,
  receipts,
  loading,
  navigate
}: {
  beneficiaries: Beneficiary[];
  receipts: Receipt[];
  loading: boolean;
  navigate: any;
}) {
  const trustPartners = [
    {
      id: 'legacy-trust',
      name: 'Legacy Trust Partners',
      description: 'Estate planning and digital legacy management services',
      icon: Crown,
      status: 'Available',
      color: 'from-amber-500/20 to-orange-500/20',
      borderColor: 'border-amber-500/30',
      features: ['Estate Planning', 'Trust Management', 'Legal Consultation', 'Document Custody']
    },
    {
      id: 'eternal-care',
      name: 'Eternal Care Insurance',
      description: 'Specialized life insurance and legacy protection plans',
      icon: Heart,
      status: 'Available',
      color: 'from-rose-500/20 to-pink-500/20',
      borderColor: 'border-rose-500/30',
      features: ['Life Insurance', 'Legacy Protection', 'Beneficiary Management', 'Claims Support']
    },
    {
      id: 'memorial-services',
      name: 'Memorial Services Network',
      description: 'Comprehensive memorial and funeral service coordination',
      icon: Heart,
      status: 'Available',
      color: 'from-cyan-500/20 to-blue-500/20',
      borderColor: 'border-cyan-500/30',
      features: ['Funeral Planning', 'Memorial Services', 'Cemetery Services', 'Online Tributes']
    }
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatusCard
          title="Encryption Status"
          value="Active"
          icon={Shield}
          color="from-emerald-500/20 to-green-500/20"
          status="success"
        />
        <StatusCard
          title="Custodians"
          value={beneficiaries.filter(b => b.relationship === 'custodian').length.toString()}
          icon={Users}
          color="from-blue-500/20 to-cyan-500/20"
          status="info"
        />
        <StatusCard
          title="Total Receipts"
          value={receipts.length.toString()}
          icon={FileText}
          color="from-purple-500/20 to-indigo-500/20"
          status="info"
        />
      </div>

      <div className="p-6 rounded-2xl bg-gradient-to-br from-white/5 to-white/[0.02] border border-white/10">
        <div className="mb-6">
          <h3 className="text-xl font-bold text-white mb-2">Legacy Trust Partners</h3>
          <p className="text-slate-400 text-sm">
            Connect with verified service providers for comprehensive legacy planning and protection
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {trustPartners.map((partner) => {
            const Icon = partner.icon;
            return (
              <div
                key={partner.id}
                className={`p-5 rounded-xl bg-gradient-to-br ${partner.color} border ${partner.borderColor} hover:scale-[1.02] transition-all`}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center">
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  <span className="px-2 py-1 rounded-lg bg-emerald-500/20 text-emerald-400 text-xs font-medium border border-emerald-500/30">
                    {partner.status}
                  </span>
                </div>

                <h4 className="text-white font-semibold mb-2">{partner.name}</h4>
                <p className="text-slate-300 text-sm mb-4">{partner.description}</p>

                <div className="space-y-2 mb-4">
                  {partner.features.map((feature, index) => (
                    <div key={index} className="flex items-center gap-2 text-sm">
                      <CheckCircle2 className="w-4 h-4 text-teal-400 flex-shrink-0" />
                      <span className="text-slate-300">{feature}</span>
                    </div>
                  ))}
                </div>

                <button
                  onClick={() => {
                    if (partner.id === 'eternal-care') {
                      navigate('/insurance');
                    } else {
                      navigate('/portal');
                    }
                  }}
                  className="w-full px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white font-medium transition-all flex items-center justify-center gap-2"
                >
                  Connect
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            );
          })}
        </div>
      </div>

      <div className="p-6 rounded-2xl bg-gradient-to-br from-white/5 to-white/[0.02] border border-white/10">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-white">Receipts & Audit Trail</h3>
          <button className="px-4 py-2 rounded-xl bg-gradient-to-r from-teal-600 to-cyan-600 text-white text-sm font-medium hover:opacity-90 transition-all flex items-center gap-2">
            <Zap className="w-4 h-4" />
            Run Integrity Check
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="w-6 h-6 border-4 border-teal-400 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : receipts.length === 0 ? (
          <p className="text-slate-400 text-center py-8">No receipts yet</p>
        ) : (
          <div className="space-y-2">
            {receipts.map((receipt) => (
              <div
                key={receipt.id}
                className="p-4 rounded-xl bg-white/5 hover:bg-white/10 transition-all flex items-center justify-between"
              >
                <div>
                  <p className="text-white font-medium">{receipt.receipt_type}</p>
                  <p className="text-slate-500 text-sm">
                    {new Date(receipt.created_at).toLocaleString()} • SHA256: {receipt.sha256.slice(0, 8)}...
                  </p>
                </div>
                <button className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-all">
                  <Download className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function StatusCard({
  title,
  value,
  icon: Icon,
  color,
  status
}: {
  title: string;
  value: string;
  icon: any;
  color: string;
  status: 'success' | 'warning' | 'info';
}) {
  return (
    <div className={`p-6 rounded-2xl bg-gradient-to-br ${color} border border-white/10`}>
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
          <Icon className="w-5 h-5 text-white" />
        </div>
        <h3 className="text-white font-semibold">{title}</h3>
      </div>
      <p className="text-3xl font-bold text-white">{value}</p>
    </div>
  );
}

function CreateItemModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [selectedType, setSelectedType] = useState<'CAPSULE' | 'MEMORIAL' | 'WILL' | 'MESSAGE' | null>(null);

  const types = [
    { id: 'CAPSULE', label: 'Time Capsule', icon: Clock, description: 'Preserve memories for a future date' },
    { id: 'MEMORIAL', label: 'Memorial Page', icon: Heart, description: 'Create a tribute space' },
    { id: 'WILL', label: 'Digital Will', icon: FileText, description: 'Record your final wishes' },
    { id: 'MESSAGE', label: 'Scheduled Message', icon: Send, description: 'Send messages to the future' },
  ];

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-gradient-to-br from-slate-900 to-slate-950 rounded-3xl border border-white/10 max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-white">Create New</h2>
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors"
          >
            <X className="w-5 h-5 text-white" />
          </button>
        </div>

        <p className="text-slate-400 mb-6">Choose what you'd like to create:</p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {types.map((type) => {
            const Icon = type.icon;
            return (
              <button
                key={type.id}
                onClick={() => setSelectedType(type.id as any)}
                className={`p-6 rounded-xl border transition-all text-left ${
                  selectedType === type.id
                    ? 'bg-gradient-to-br from-teal-600/20 to-cyan-600/20 border-teal-500'
                    : 'bg-white/5 border-white/10 hover:border-white/20'
                }`}
              >
                <Icon className={`w-8 h-8 mb-3 ${selectedType === type.id ? 'text-teal-400' : 'text-slate-400'}`} />
                <h3 className="text-white font-semibold mb-1">{type.label}</h3>
                <p className="text-slate-400 text-sm">{type.description}</p>
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-3 mt-6">
          <button
            onClick={onClose}
            className="flex-1 px-6 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-white font-medium transition-all"
          >
            Cancel
          </button>
          <button
            onClick={onSuccess}
            disabled={!selectedType}
            className="flex-1 px-6 py-3 rounded-xl bg-gradient-to-r from-teal-600 to-cyan-600 text-white font-medium hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Continue
          </button>
        </div>
      </div>
    </div>
  );
}

function ItemDetailModal({ item, onClose, onRefresh }: { item: VaultItem; onClose: () => void; onRefresh: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-gradient-to-br from-slate-900 to-slate-950 rounded-3xl border border-white/10 max-w-4xl w-full max-h-[90vh] overflow-y-auto p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-white">{item.title}</h2>
            <p className="text-slate-400">Created {new Date(item.created_at).toLocaleDateString()}</p>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors"
          >
            <X className="w-5 h-5 text-white" />
          </button>
        </div>

        <div className="space-y-6">
          <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/30 flex items-start gap-3">
            <Info className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-300">
              <p className="font-medium mb-1">Status: {item.status}</p>
              <p className="text-blue-300/80">
                {item.is_encrypted && 'Encrypted • '}
                {item.unlock_rule && `Unlock Rule: ${item.unlock_rule}`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button className="flex-1 px-6 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-white font-medium transition-all flex items-center justify-center gap-2">
              <Edit className="w-4 h-4" />
              Edit
            </button>
            <button className="flex-1 px-6 py-3 rounded-xl bg-gradient-to-r from-teal-600 to-cyan-600 text-white font-medium hover:opacity-90 transition-all flex items-center justify-center gap-2">
              <Download className="w-4 h-4" />
              Export
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
