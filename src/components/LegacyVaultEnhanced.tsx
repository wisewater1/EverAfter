import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import {
  Calendar, FileText, Clock, Heart, Crown, Plus, Edit, Trash2, Lock,
  Users, Send, Shield, CheckCircle2, Download,
  AlertTriangle, Info, X, File,
  ChevronRight, Search, Filter, Zap, UserPlus, Mail, Phone, Copy
} from 'lucide-react';
import FileUploadZone from './FileUploadZone';
import { generateVaultKey, exportKey, importKey, encryptVaultData, decryptVaultData } from '../lib/vault-encryption';

interface VaultItem {
  id: string;
  user_id: string;
  type: 'CAPSULE' | 'MEMORIAL' | 'WILL' | 'MESSAGE';
  title: string;
  slug?: string;
  status: 'DRAFT' | 'SCHEDULED' | 'LOCKED' | 'PUBLISHED' | 'PAUSED' | 'SENT' | 'ARCHIVED';
  payload: unknown;
  is_encrypted: boolean;
  encryption_key_id?: string;
  unlock_at?: string;
  unlock_rule?: 'DATE' | 'DEATH_CERT' | 'CUSTODIAN_APPROVAL' | 'HEARTBEAT_TIMEOUT';
  heartbeat_timeout_days?: number;
  created_at: string;
  updated_at: string;
}

interface Beneficiary {
  id: string;
  email: string;
  name?: string;
  phone?: string;
  relationship?: string;
  created_at?: string;
}

interface Receipt {
  id: string;
  vault_item_id?: string;
  receipt_type: string;
  snapshot_id: string;
  sha256: string;
  created_at: string;
  download_count: number;
  file_url?: string;
}

type ItemStatusFilter = 'ALL' | VaultItem['status'];

interface LegacyConceptPreset {
  type: VaultItem['type'];
  title: string;
  payload: Record<string, unknown>;
  unlock_rule: NonNullable<VaultItem['unlock_rule']>;
  heartbeat_timeout_days?: number;
  is_encrypted?: boolean;
}

export default function LegacyVaultEnhanced() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState<'continuity' | 'assurance' | 'shared'>('continuity');
  const [activeTab, setActiveTab] = useState<'CAPSULE' | 'MEMORIAL' | 'WILL' | 'MESSAGE'>('CAPSULE');
  const [items, setItems] = useState<VaultItem[]>([]);
  const [beneficiaries, setBeneficiaries] = useState<Beneficiary[]>([]);
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<ItemStatusFilter>('ALL');
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedItemForEdit, setSelectedItemForEdit] = useState<VaultItem | null>(null);
  const [selectedItem, setSelectedItem] = useState<VaultItem | null>(null);
  const [createPreset, setCreatePreset] = useState<LegacyConceptPreset | null>(null);



  const supabaseMissing = !supabase;

  useEffect(() => {
    console.log('Active Section changed to:', activeSection);
    if (user) {
      if (activeSection === 'continuity') {
        loadVaultItems();
      } else if (activeSection === 'assurance') {
        loadAssuranceData();
      } else if (activeSection === 'shared') {
        loadSharedItems();
      }
    }
  }, [user, activeTab, activeSection]);

  const loadVaultItems = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('vault_items')
        .select('*')
        .eq('type', activeTab)
        .eq('user_id', user?.id) // Explicitly only own items
        .order('created_at', { ascending: false });

      if (error) throw error;
      setItems(data || []);
    } catch (error) {
      console.error('Error loading vault items:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadSharedItems = async () => {
    if (!user) return;
    setLoading(true);
    try {
      // Query items where current user is a beneficiary via email match
      const { data, error } = await supabase
        .from('vault_items')
        .select(`
          *,
          beneficiary_links!inner (
            role,
            beneficiaries!inner (
              email
            )
          )
        `)
        .neq('user_id', user.id)
        .eq('beneficiary_links.beneficiaries.email', user.email)
        .order('updated_at', { ascending: false });

      if (error) throw error;
      setItems(data || []);
    } catch (error) {
      console.error('Error loading shared items:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadAssuranceData = async () => {
    try {
      const [beneficiariesRes, receiptsRes] = await Promise.all([
        supabase.from('beneficiaries').select('*').eq('user_id', user?.id).order('created_at', { ascending: false }),
        supabase.from('vault_receipts').select('*').eq('user_id', user?.id).order('created_at', { ascending: false }).limit(20)
      ]);

      if (beneficiariesRes.data) setBeneficiaries(beneficiariesRes.data);
      if (receiptsRes.data) setReceipts(receiptsRes.data);
    } catch (error) {
      console.error('Error loading assurance data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateBeneficiary = async (payload: { name?: string; email: string; phone?: string; relationship?: string }) => {
    if (!user) return;
    const { error } = await supabase
      .from('beneficiaries')
      .insert({
        user_id: user.id,
        name: payload.name || null,
        email: payload.email,
        phone: payload.phone || null,
        relationship: payload.relationship || null,
      });

    if (error) throw error;
    await loadAssuranceData();
  };

  const handleDeleteBeneficiary = async (beneficiaryId: string) => {
    const { error } = await supabase
      .from('beneficiaries')
      .delete()
      .eq('id', beneficiaryId)
      .eq('user_id', user?.id);

    if (error) throw error;
    await loadAssuranceData();
  };

  const handleDeleteItem = async (id: string) => {
    if (!confirm('Are you sure you want to remove this item? This action cannot be undone.')) return;
    try {
      const { error } = await supabase.from('vault_items').delete().eq('id', id);
      if (error) throw error;
      setSelectedItem(null);
      loadVaultItems();
    } catch (err) {
      console.error('Error removing item:', err);
      alert('Failed to remove item');
    }
  };

  const handleIntegrityCheck = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('vault-integrity-check');
      if (error) throw error;
      alert('Integrity check completed successfully: ' + (data?.message || 'All items verified'));
      loadAssuranceData();
    } catch (err) {
      console.error('Integrity check failed:', err);
      alert('Failed to run integrity check');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('vault-export');
      if (error) throw error;
      if (data?.downloadUrl) {
        window.open(data.downloadUrl, '_blank');
      } else {
        alert('Vault export initiated. You will be notified when the download is ready.');
      }
    } catch (err) {
      console.error('Export failed:', err);
      alert('Failed to initiate vault export');
    } finally {
      setLoading(false);
    }
  };

  const filteredItems = items.filter(item => {
    const matchesSearch =
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      JSON.stringify(item.payload || {}).toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'ALL' || item.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const continuityStats = {
    total: items.length,
    scheduled: items.filter(item => item.status === 'SCHEDULED').length,
    secured: items.filter(item => item.is_encrypted).length,
    withBeneficiaries: items.filter(item => {
      const payloadRecipients = Array.isArray(item.payload?.recipients) ? item.payload.recipients.length : 0;
      return payloadRecipients > 0;
    }).length,
  };

  if (supabaseMissing) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <div className="bg-red-500/10 border border-red-500/20 p-6 rounded-2xl text-center">
          <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-white mb-2">Configuration Error</h2>
          <p className="text-slate-400">Supabase connection not initialized. Please check your environment variables.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 isolation-isolate">
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Legacy Vault</h1>
            <p className="text-slate-400">Secure your digital legacy and continuity plans</p>
          </div>
          {activeSection === 'continuity' && (
            <button
              onClickCapture={(e) => {
                e.stopPropagation();
                console.log('Create New Clicked (Capture)');
                setIsCreateModalOpen(true);
              }}
              className="relative z-[100] pointer-events-auto px-6 py-3 rounded-xl bg-gradient-to-r from-teal-600 to-cyan-600 text-white font-medium hover:opacity-90 transition-all flex items-center gap-2 cursor-pointer"
            >
              <Plus className="w-5 h-5" />
              Create New
            </button>
          )}
        </div>

        <div className="flex items-center gap-4 mb-6 border-b border-white/10">
          <button
            onClickCapture={(e) => {
              e.stopPropagation();
              console.log('Section Tab Clicked (Capture): continuity');
              setActiveSection('continuity');
            }}
            className={`px-6 py-3 font-medium transition-all relative cursor-pointer pointer-events-auto ${activeSection === 'continuity'
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
            onClickCapture={(e) => {
              e.stopPropagation();
              console.log('Section Tab Clicked (Capture): assurance');
              setActiveSection('assurance');
            }}
            className={`px-6 py-3 font-medium transition-all relative cursor-pointer pointer-events-auto ${activeSection === 'assurance'
              ? 'text-teal-400'
              : 'text-slate-400 hover:text-white'
              }`}
          >
            Legacy Assurance
            {activeSection === 'assurance' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-teal-400 to-cyan-400" />
            )}
          </button>
          <button
            onClickCapture={(e) => {
              e.stopPropagation();
              console.log('Section Tab Clicked (Capture): shared');
              setActiveSection('shared');
            }}
            className={`px-6 py-3 font-medium transition-all relative cursor-pointer pointer-events-auto ${activeSection === 'shared'
              ? 'text-teal-400'
              : 'text-slate-400 hover:text-white'
              }`}
          >
            Shared with Me
            {activeSection === 'shared' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-teal-400 to-cyan-400" />
            )}
          </button>
        </div>

        {activeSection === 'continuity' ? (
          <ContinuityPlansSection
            activeTab={activeTab}
            onTabChange={setActiveTab}
            items={filteredItems}
            allItems={items}
            loading={loading}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            statusFilter={statusFilter}
            onStatusFilterChange={setStatusFilter}
            showFilterMenu={showFilterMenu}
            onToggleFilterMenu={() => setShowFilterMenu(prev => !prev)}
            continuityStats={continuityStats}
            onItemSelect={setSelectedItem}
            onCreate={() => setIsCreateModalOpen(true)}
            onCreateWithPreset={(preset) => {
              setSelectedItemForEdit(null);
              setCreatePreset(preset);
              setIsCreateModalOpen(true);
            }}
          />
        ) : activeSection === 'assurance' ? (
          <LegacyAssuranceSection
            beneficiaries={beneficiaries}
            receipts={receipts}
            loading={loading}
            navigate={navigate}
            onIntegrityCheck={handleIntegrityCheck}
            onExport={handleExport}
            onCreateBeneficiary={handleCreateBeneficiary}
            onDeleteBeneficiary={handleDeleteBeneficiary}
          />
        ) : (
          <SharedSection
            items={filteredItems}
            onSelect={setSelectedItem}
          />
        )}

        {isCreateModalOpen && (
          <CreateItemModal
            onClose={() => {
              setIsCreateModalOpen(false);
              setSelectedItemForEdit(null);
              setCreatePreset(null);
            }}
            onSave={() => {
              setIsCreateModalOpen(false);
              setSelectedItemForEdit(null);
              setCreatePreset(null);
              loadVaultItems();
            }}
            item={selectedItemForEdit}
            defaultType={activeTab}
            preset={createPreset}
          />
        )}

        {selectedItem && (
          <ItemDetailModal
            item={selectedItem}
            onClose={() => setSelectedItem(null)}
            onRemove={(id) => {
              handleDeleteItem(id);
              setSelectedItem(null);
            }}
            onEdit={(item) => {
              setSelectedItem(null);
              setSelectedItemForEdit(item);
              setIsCreateModalOpen(true);
            }}
          />
        )}
      </div>
    </div>
  );
}

function SharedSection({ items, onSelect }: { items: VaultItem[]; onSelect: (item: VaultItem) => void }) {
  if (items.length === 0) {
    return (
      <div className="text-center py-20 bg-white/5 rounded-3xl border border-white/10">
        <Users className="w-16 h-16 text-slate-700 mx-auto mb-4" />
        <h3 className="text-xl font-bold text-white mb-2">Nothing shared with you yet</h3>
        <p className="text-slate-400 max-w-md mx-auto">
          When someone adds you as a beneficiary to their legacy vault, their items will appear here once unlocked.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-fadeIn">
      {items.map((item) => (
        <div
          key={item.id}
          onClick={() => onSelect(item)}
          className="group relative p-6 rounded-3xl bg-gradient-to-br from-white/5 to-white/[0.02] border border-white/10 hover:border-teal-500/30 transition-all cursor-pointer overflow-hidden"
        >
          <div className="absolute top-0 right-0 p-4">
            <span className={`px-2 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider ${item.status === 'LOCKED' ? 'bg-emerald-500/20 text-emerald-400' :
              item.status === 'PUBLISHED' ? 'bg-blue-500/20 text-blue-400' :
                item.status === 'SENT' ? 'bg-teal-500/20 text-teal-400' :
                  'bg-slate-500/20 text-slate-400'
              }`}>
              {item.status}
            </span>
          </div>

          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center">
              {item.type === 'CAPSULE' && <Clock className="w-6 h-6 text-purple-400" />}
              {item.type === 'MEMORIAL' && <Heart className="w-6 h-6 text-pink-400" />}
              {item.type === 'WILL' && <FileText className="w-6 h-6 text-emerald-400" />}
              {item.type === 'MESSAGE' && <Send className="w-6 h-6 text-blue-400" />}
            </div>
            <div>
              <h3 className="text-white font-bold group-hover:text-teal-400 transition-colors">{item.title}</h3>
              <p className="text-xs text-slate-500 capitalize">{item.type.toLowerCase()}</p>
            </div>
          </div>

          <p className="text-sm text-slate-400 leading-relaxed min-h-[42px]">
            {getItemPreview(item)}
          </p>

          <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
            <div className="rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2 text-slate-300">
              Unlock: {formatUnlockRule(item.unlock_rule)}
            </div>
            <div className="rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2 text-slate-300">
              {item.unlock_at ? new Date(item.unlock_at).toLocaleDateString() : 'No unlock date'}
            </div>
          </div>

          <div className="flex items-center justify-between mt-6 pt-4 border-t border-white/5">
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <Calendar className="w-3 h-3" />
              {new Date(item.created_at).toLocaleDateString()}
            </div>
            <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-teal-400 transition-all" />
          </div>
        </div>
      ))}
    </div>
  );
}

function ContinuityPlansSection({
  activeTab,
  onTabChange,
  items,
  allItems,
  loading,
  searchQuery,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  showFilterMenu,
  onToggleFilterMenu,
  continuityStats,
  onItemSelect,
  onCreate,
  onCreateWithPreset
}: {
  activeTab: string;
  onTabChange: (tab: unknown) => void;
  items: VaultItem[];
  allItems: VaultItem[];
  loading: boolean;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  statusFilter: ItemStatusFilter;
  onStatusFilterChange: (filter: ItemStatusFilter) => void;
  showFilterMenu: boolean;
  onToggleFilterMenu: () => void;
  continuityStats: {
    total: number;
    scheduled: number;
    secured: number;
    withBeneficiaries: number;
  };
  onItemSelect: (item: VaultItem) => void;
  onCreate: () => void;
  onCreateWithPreset: (preset: LegacyConceptPreset) => void;
}) {
  const tabs = [
    { id: 'CAPSULE', label: 'Time Capsules', icon: Clock, color: 'from-blue-500/20 to-cyan-500/20' },
    { id: 'MEMORIAL', label: 'Memorial Pages', icon: Heart, color: 'from-rose-500/20 to-pink-500/20' },
    { id: 'WILL', label: 'Digital Will', icon: FileText, color: 'from-amber-500/20 to-orange-500/20' },
    { id: 'MESSAGE', label: 'Scheduled Messages', icon: Send, color: 'from-purple-500/20 to-indigo-500/20' },
  ];

  const activeTabData = tabs.find(t => t.id === activeTab);
  if (!activeTabData) return null;

  const tabItems = allItems.filter(item => item.type === activeTab);
  const tabScheduled = tabItems.filter(item => item.status === 'SCHEDULED').length;
  const tabLocked = tabItems.filter(item => item.status === 'LOCKED').length;
  const tabPublished = tabItems.filter(item => item.status === 'PUBLISHED' || item.status === 'SENT').length;
  const statusOptions: ItemStatusFilter[] = ['ALL', 'DRAFT', 'SCHEDULED', 'LOCKED', 'PUBLISHED', 'PAUSED', 'SENT', 'ARCHIVED'];
  const aiContinuityConcepts = [
    {
      id: 'ai-memory-capsule',
      title: 'AI Memory Capsule',
      subtitle: 'Preserve the last stable state of an Engram before dormancy.',
      icon: Clock,
      accent: 'from-cyan-500/15 to-sky-500/10',
      border: 'border-cyan-500/20',
      details: ['Stores memory summary, tone profile, and family context.', 'Best for graceful archival when an AI companion is retired or "passes away".'],
      preset: {
        type: 'CAPSULE' as const,
        title: 'AI Memory Capsule',
        unlock_rule: 'HEARTBEAT_TIMEOUT' as const,
        heartbeat_timeout_days: 30,
        is_encrypted: true,
        payload: {
          message: 'Archive the final trusted state of this AI companion, including key memories, tone, and relationship context.',
          protocolName: 'Dormancy Archive',
          aiContinuity: true,
          protocolIntent: 'Preserve the last coherent Engram state for future recovery, memorialization, or family review.',
        },
      },
    },
    {
      id: 'engram-succession-brief',
      title: 'Engram Succession Brief',
      subtitle: 'Define who becomes steward of the AI and what survives.',
      icon: FileText,
      accent: 'from-amber-500/15 to-orange-500/10',
      border: 'border-amber-500/20',
      details: ['Assign custodian, executor, and release conditions.', 'Maps well to AI inheritance, shutdown, and successor-access rules.'],
      preset: {
        type: 'WILL' as const,
        title: 'Engram Succession Brief',
        unlock_rule: 'CUSTODIAN_APPROVAL' as const,
        is_encrypted: true,
        payload: {
          wishes: 'Document who controls this AI after the original owner can no longer maintain it, what memories remain active, and whether the model should be archived, memorialized, or transferred.',
          protocolName: 'Custodian Transfer',
          aiContinuity: true,
          protocolIntent: 'Prevent orphaned AI state by making stewardship, access, and shutdown rules explicit.',
        },
      },
    },
    {
      id: 'memorial-presence',
      title: 'Memorial Presence Page',
      subtitle: 'A controlled memorial mode for an AI that is no longer active.',
      icon: Heart,
      accent: 'from-rose-500/15 to-pink-500/10',
      border: 'border-rose-500/20',
      details: ['Shifts the AI from active companion to remembrance artifact.', 'Useful when family should be able to revisit stories without reopening autonomous behavior.'],
      preset: {
        type: 'MEMORIAL' as const,
        title: 'Memorial Presence Page',
        unlock_rule: 'CUSTODIAN_APPROVAL' as const,
        is_encrypted: true,
        payload: {
          biography: 'This memorial page preserves the identity, purpose, and signature qualities of an AI companion after it leaves active service.',
          protocolName: 'Memorial Presence',
          aiContinuity: true,
          protocolIntent: 'Provide a bounded, respectful remembrance surface for a retired or deceased AI.',
        },
      },
    },
    {
      id: 'heartbeat-sunset',
      title: 'Heartbeat Sunset Message',
      subtitle: 'Send post-dormancy messages if an AI has been inactive too long.',
      icon: Send,
      accent: 'from-violet-500/15 to-indigo-500/10',
      border: 'border-violet-500/20',
      details: ['Releases notices to family or custodians after sustained inactivity.', 'Bridges the gap between AI heartbeat monitoring and human continuity planning.'],
      preset: {
        type: 'MESSAGE' as const,
        title: 'Heartbeat Sunset Notice',
        unlock_rule: 'HEARTBEAT_TIMEOUT' as const,
        heartbeat_timeout_days: 21,
        is_encrypted: true,
        payload: {
          subject: 'If this AI has gone quiet',
          recipients: [],
          message: 'This message is released when the AI heartbeat has been inactive beyond the defined threshold. It should guide the next human review or continuity action.',
          protocolName: 'Sunset Notice',
          aiContinuity: true,
          protocolIntent: 'Notify custodians that an AI may need archival, review, or memorial transition.',
        },
      },
    },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatusCard title={`${activeTabData.label}`} value={String(continuityStats.total)} icon={activeTabData.icon} color={activeTabData.color} />
        <StatusCard title="Scheduled Unlocks" value={String(tabScheduled)} icon={Calendar} color="from-blue-500/20 to-cyan-500/20" />
        <StatusCard title="Locked / Preserved" value={String(tabLocked)} icon={Lock} color="from-amber-500/20 to-orange-500/20" />
        <StatusCard title="Beneficiary Ready" value={String(continuityStats.withBeneficiaries)} icon={Users} color="from-emerald-500/20 to-green-500/20" />
      </div>

      <div className="p-5 rounded-2xl bg-gradient-to-br from-white/5 to-white/[0.02] border border-white/10">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-white font-semibold">Continuity Readiness</h3>
            <p className="text-sm text-slate-400 mt-1">
              {activeTabData.label} should have a title, an unlock path, and at least one intended recipient or custodian.
            </p>
          </div>
          <span className="px-3 py-1 rounded-full text-xs font-medium border border-teal-500/20 bg-teal-500/10 text-teal-300">
            {tabPublished} released
          </span>
        </div>
        <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
          <div className="rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3 text-slate-300">
            Search covers title and payload content, so wills and messages are discoverable.
          </div>
          <div className="rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3 text-slate-300">
            Status filter lets you isolate drafts, scheduled releases, archived records, and sent messages.
          </div>
          <div className="rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3 text-slate-300">
            Encrypted records are counted globally: {continuityStats.secured} secured items across the vault.
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-white/5 to-white/[0.02] p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-white font-semibold">AI Continuity Concepts</h3>
            <p className="mt-1 text-sm text-slate-400">
              Use the vault to define what happens when an AI companion becomes dormant, is intentionally retired, or needs a memorial state instead of active runtime.
            </p>
          </div>
          <span className="rounded-full border border-cyan-500/20 bg-cyan-500/10 px-3 py-1 text-xs font-medium text-cyan-300">
            Built on vault primitives
          </span>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-2">
          {aiContinuityConcepts.map((concept) => {
            const Icon = concept.icon;
            return (
              <div
                key={concept.id}
                className={`rounded-2xl border ${concept.border} bg-gradient-to-br ${concept.accent} p-5`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 bg-slate-950/40">
                      <Icon className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <h4 className="text-base font-semibold text-white">{concept.title}</h4>
                      <p className="mt-1 text-sm text-slate-300">{concept.subtitle}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => onCreateWithPreset(concept.preset)}
                    className="rounded-xl border border-white/10 bg-slate-950/45 px-3 py-2 text-sm font-medium text-white transition hover:border-teal-400/30 hover:bg-slate-950/65"
                  >
                    Use Concept
                  </button>
                </div>
                <div className="mt-4 space-y-2 text-sm text-slate-300">
                  {concept.details.map((detail) => (
                    <div key={detail} className="rounded-xl border border-white/10 bg-slate-950/35 px-3 py-2">
                      {detail}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex items-center gap-3 overflow-x-auto pb-2">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => {
                onTabChange(tab.id);
              }}
              className={`px-4 py-3 rounded-xl font-medium transition-all whitespace-nowrap flex items-center gap-2 cursor-pointer pointer-events-auto ${activeTab === tab.id
                ? 'bg-gradient-to-br ' + tab.color + ' text-white border border-white/20'
                : 'bg-white/5 text-slate-400 hover:text-white hover:bg-white/10'
                }`}
            >
              <Icon className="w-4 h-4 pointer-events-none" />
              <span className="pointer-events-none">{tab.label}</span>
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
        <div className="relative">
          <button
            onClick={onToggleFilterMenu}
            className="px-4 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-white transition-all flex items-center gap-2"
          >
            <Filter className="w-5 h-5" />
            <span className="text-sm">{statusFilter === 'ALL' ? 'All statuses' : statusFilter}</span>
          </button>
          {showFilterMenu && (
            <div className="absolute right-0 top-14 z-20 w-48 rounded-2xl border border-white/10 bg-slate-950/95 shadow-2xl backdrop-blur-xl overflow-hidden">
              {statusOptions.map(option => (
                <button
                  key={option}
                  onClick={() => {
                    onStatusFilterChange(option);
                    onToggleFilterMenu();
                  }}
                  className={`w-full px-4 py-3 text-left text-sm transition-all ${statusFilter === option ? 'bg-teal-500/10 text-teal-300' : 'text-slate-300 hover:bg-white/5'}`}
                >
                  {option}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="w-8 h-8 border-4 border-teal-400 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : items.length === 0 ? (
        <EmptyState type={activeTab} onCreate={onCreate} />
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

function EmptyState({ type, onCreate }: { type: string; onCreate: () => void }) {
  const emptyStates = {
    CAPSULE: {
      title: 'No Time Capsules Yet',
      description: 'Preserve your memories for future generations.',
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
      <button
        onClickCapture={(e) => {
          e.stopPropagation();
          onCreate();
        }}
        className="relative z-[100] pointer-events-auto px-6 py-3 rounded-xl bg-gradient-to-r from-teal-600 to-cyan-600 text-white font-medium hover:opacity-90 transition-all cursor-pointer"
      >
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

      <p className="text-sm text-slate-400 leading-relaxed min-h-[42px] mb-4">
        {getItemPreview(item)}
      </p>

      <div className="grid grid-cols-2 gap-2 mb-4 text-xs">
        <div className="rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2 text-slate-300">
          Unlock: {item.unlock_rule ? formatUnlockRule(item.unlock_rule) : 'Not set'}
        </div>
        <div className="rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2 text-slate-300">
          {item.unlock_at ? new Date(item.unlock_at).toLocaleDateString() : 'No date'}
        </div>
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

function getItemPreview(item: VaultItem) {
  const payload = item.payload || {};
  switch (item.type) {
    case 'CAPSULE':
      return payload.message || 'A future-facing memory capsule prepared for a later release.';
    case 'MEMORIAL':
      return payload.biography || 'A memorial record with biography, attachments, and tribute context.';
    case 'WILL':
      return payload.wishes || 'A digital will and directive artifact with attached legal instructions.';
    case 'MESSAGE':
      return payload.message || payload.subject || 'A scheduled personal message prepared for delivery.';
    default:
      return 'Legacy record.';
  }
}

function formatUnlockRule(rule: VaultItem['unlock_rule']) {
  if (!rule) return 'Unspecified';
  return rule.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, match => match.toUpperCase());
}

function LegacyAssuranceSection({
  beneficiaries,
  receipts,
  loading,
  navigate,
  onIntegrityCheck,
  onExport,
  onCreateBeneficiary,
  onDeleteBeneficiary
}: {
  beneficiaries: Beneficiary[];
  receipts: Receipt[];
  loading: boolean;
  navigate: unknown;
  onIntegrityCheck: () => void;
  onExport: () => void;
  onCreateBeneficiary: (payload: { name?: string; email: string; phone?: string; relationship?: string }) => Promise<void>;
  onDeleteBeneficiary: (beneficiaryId: string) => Promise<void>;
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
        />
        <StatusCard
          title="Custodians"
          value={beneficiaries.filter(b => b.relationship === 'custodian').length.toString()}
          icon={Users}
          color="from-blue-500/20 to-cyan-500/20"
        />
        <StatusCard
          title="Total Receipts"
          value={receipts.length.toString()}
          icon={FileText}
          color="from-purple-500/20 to-indigo-500/20"
        />
      </div>

      <BeneficiaryManager
        beneficiaries={beneficiaries}
        onCreateBeneficiary={onCreateBeneficiary}
        onDeleteBeneficiary={onDeleteBeneficiary}
      />

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
                      navigate('/insurance/connect');
                    } else if (partner.id === 'memorial-services') {
                      navigate('/memorial-services');
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
          <div className="flex gap-3">
            <button
              onClick={onExport}
              disabled={loading}
              className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm font-medium hover:bg-white/10 transition-all flex items-center gap-2 disabled:opacity-50"
            >
              <Download className="w-4 h-4" />
              Export Vault
            </button>
            <button
              onClick={onIntegrityCheck}
              disabled={loading}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-teal-600 to-cyan-600 text-white text-sm font-medium hover:opacity-90 transition-all flex items-center gap-2 disabled:opacity-50"
            >
              <Zap className="w-4 h-4" />
              Run Integrity Check
            </button>
          </div>
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
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => navigator.clipboard.writeText(receipt.sha256)}
                    className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-all"
                    title="Copy receipt hash"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => {
                      if (receipt.file_url) {
                        window.open(receipt.file_url, '_blank');
                      }
                    }}
                    disabled={!receipt.file_url}
                    className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                    title={receipt.file_url ? 'Download receipt file' : 'No receipt file available'}
                  >
                    <Download className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function BeneficiaryManager({
  beneficiaries,
  onCreateBeneficiary,
  onDeleteBeneficiary
}: {
  beneficiaries: Beneficiary[];
  onCreateBeneficiary: (payload: { name?: string; email: string; phone?: string; relationship?: string }) => Promise<void>;
  onDeleteBeneficiary: (beneficiaryId: string) => Promise<void>;
}) {
  const [form, setForm] = useState({ name: '', email: '', phone: '', relationship: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreate = async () => {
    if (!form.email.trim()) {
      setError('Beneficiary email is required.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await onCreateBeneficiary({
        name: form.name.trim() || undefined,
        email: form.email.trim(),
        phone: form.phone.trim() || undefined,
        relationship: form.relationship.trim() || undefined,
      });
      setForm({ name: '', email: '', phone: '', relationship: '' });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create beneficiary.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-6 rounded-2xl bg-gradient-to-br from-white/5 to-white/[0.02] border border-white/10">
      <div className="flex items-center justify-between gap-4 mb-6">
        <div>
          <h3 className="text-xl font-bold text-white">Beneficiary Registry</h3>
          <p className="text-slate-400 text-sm">Define who can view, custody, or execute your continuity records.</p>
        </div>
        <span className="px-3 py-1 rounded-full border border-white/10 bg-white/[0.02] text-sm text-slate-300">
          {beneficiaries.length} total
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_1fr] gap-6">
        <div className="space-y-4">
          {beneficiaries.length === 0 ? (
            <div className="rounded-xl border border-dashed border-white/10 bg-white/[0.02] px-4 py-8 text-center text-slate-400">
              No beneficiaries registered yet.
            </div>
          ) : (
            beneficiaries.map(beneficiary => (
              <div key={beneficiary.id} className="rounded-xl border border-white/10 bg-white/[0.02] px-4 py-4 flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <div className="text-white font-medium">{beneficiary.name || beneficiary.email}</div>
                  <div className="text-sm text-slate-400 flex items-center gap-2">
                    <Mail className="w-4 h-4" />
                    {beneficiary.email}
                  </div>
                  {beneficiary.phone && (
                    <div className="text-sm text-slate-400 flex items-center gap-2">
                      <Phone className="w-4 h-4" />
                      {beneficiary.phone}
                    </div>
                  )}
                  <div className="text-xs text-slate-500 uppercase tracking-wide">
                    {beneficiary.relationship || 'Relationship not set'}
                  </div>
                </div>
                <button
                  onClick={() => onDeleteBeneficiary(beneficiary.id)}
                  className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-300 hover:bg-red-500/20"
                >
                  Remove
                </button>
              </div>
            ))
          )}
        </div>

        <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4 space-y-4">
          <div className="flex items-center gap-2 text-white font-medium">
            <UserPlus className="w-4 h-4 text-teal-400" />
            Add Beneficiary
          </div>
          {error && (
            <div className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-300">
              {error}
            </div>
          )}
          <input
            value={form.name}
            onChange={(e) => setForm(prev => ({ ...prev, name: e.target.value }))}
            placeholder="Name"
            className="w-full rounded-xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-teal-500/50"
          />
          <input
            value={form.email}
            onChange={(e) => setForm(prev => ({ ...prev, email: e.target.value }))}
            placeholder="Email *"
            className="w-full rounded-xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-teal-500/50"
          />
          <input
            value={form.phone}
            onChange={(e) => setForm(prev => ({ ...prev, phone: e.target.value }))}
            placeholder="Phone"
            className="w-full rounded-xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-teal-500/50"
          />
          <input
            value={form.relationship}
            onChange={(e) => setForm(prev => ({ ...prev, relationship: e.target.value }))}
            placeholder="Relationship"
            className="w-full rounded-xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-teal-500/50"
          />
          <button
            onClick={handleCreate}
            disabled={saving}
            className="w-full rounded-xl bg-gradient-to-r from-teal-600 to-cyan-600 px-4 py-3 text-white font-medium hover:opacity-90 disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Add Beneficiary'}
          </button>
        </div>
      </div>
    </div>
  );
}

function StatusCard({
  title,
  value,
  icon: Icon,
  color
}: {
  title: string;
  value: string;
  icon: unknown;
  color: string;
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

function CreateItemModal({ onClose, onSave, item, defaultType, preset }: { onClose: () => void; onSave: () => void; item?: VaultItem | null; defaultType: VaultItem['type']; preset?: LegacyConceptPreset | null }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(item || preset ? 2 : 1);
  const [loading, setLoading] = useState(false);
  const [selectedType, setSelectedType] = useState<VaultItem['type']>(item?.type || preset?.type || defaultType);
  const [availableBeneficiaries, setAvailableBeneficiaries] = useState<Beneficiary[]>([]);
  const [selectedBeneficiaries, setSelectedBeneficiaries] = useState<Array<{ id: string; role: 'VIEWER' | 'CUSTODIAN' | 'EXECUTOR' }>>(
    []
  );
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    title: item?.title || preset?.title || '',
    payload: {
      message: '',
      biography: '',
      wishes: '',
      subject: '',
      recipients: [],
      attachments: [],
      ...(preset?.payload || {}),
      ...item?.payload
    } as unknown,
    unlock_at: item?.unlock_at ? new Date(item.unlock_at).toISOString().slice(0, 16) : '',
    unlock_rule: item?.unlock_rule || preset?.unlock_rule || 'DATE' as const,
    heartbeat_timeout_days: item?.heartbeat_timeout_days || preset?.heartbeat_timeout_days || 30,
    is_encrypted: item?.is_encrypted ?? preset?.is_encrypted ?? true,
  });

  useEffect(() => {
    loadBeneficiaries();
    if (item) {
      loadItemBeneficiaries();
    }
  }, []);

  useEffect(() => {
    if (item) {
      return;
    }

    if (!preset) {
      setSelectedType(defaultType);
      setStep(1);
      return;
    }

    setSelectedType(preset.type);
    setStep(2);
    setFormData((current) => ({
      ...current,
      title: preset.title,
      payload: {
        ...current.payload,
        ...preset.payload,
      },
      unlock_rule: preset.unlock_rule,
      heartbeat_timeout_days: preset.heartbeat_timeout_days || current.heartbeat_timeout_days,
      is_encrypted: preset.is_encrypted ?? current.is_encrypted,
    }));
  }, [defaultType, item, preset]);

  const loadItemBeneficiaries = async () => {
    if (!item) return;
    try {
      const { data, error } = await supabase
        .from('beneficiary_links')
        .select('beneficiary_id, role')
        .eq('vault_item_id', item.id);
      if (error) throw error;
      setSelectedBeneficiaries(data.map((d: unknown) => ({ id: d.beneficiary_id, role: d.role })));
    } catch (_err) {
      /* intentional */
    }
  };

  const loadBeneficiaries = async () => {
    try {
      const { data, error } = await supabase
        .from('beneficiaries')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAvailableBeneficiaries(data || []);
    } catch (_err) {
      /* intentional */
    }
  };

  const toggleBeneficiary = (id: string) => {
    if (selectedBeneficiaries.find(b => b.id === id)) {
      setSelectedBeneficiaries(selectedBeneficiaries.filter(b => b.id !== id));
    } else {
      setSelectedBeneficiaries([...selectedBeneficiaries, { id, role: 'VIEWER' }]);
    }
  };

  const updateBeneficiaryRole = (id: string, role: unknown) => {
    setSelectedBeneficiaries(selectedBeneficiaries.map(b => b.id === id ? { ...b, role } : b));
  };

  const types = [
    { id: 'CAPSULE', label: 'Time Capsule', icon: Clock, description: 'Preserve memories for a future date' },
    { id: 'MEMORIAL', label: 'Memorial Page', icon: Heart, description: 'Create a tribute space' },
    { id: 'WILL', label: 'Digital Will', icon: FileText, description: 'Record your final wishes' },
    { id: 'MESSAGE', label: 'Scheduled Message', icon: Send, description: 'Send messages to the future' },
  ];

  const handleSave = async () => {
    if (!user) return;
    setLoading(true);
    setError(null);

    try {
      let finalPayload = formData.payload;
      let encryptionKeyId: string | undefined = item?.encryption_key_id;

      if (formData.is_encrypted) {
        let encryptionKey;
        if (item && item.encryption_key_id) {
          // For existing item, try to import the existing key
          encryptionKey = await importKey(item.encryption_key_id);
        } else {
          // For new item or item without existing key, generate a new one
          const generatedKey = await generateVaultKey();
          if (!generatedKey) {
            throw new Error('Encryption failed: Secure context (HTTPS) required for client-side encryption.');
          }
          encryptionKey = generatedKey;
          encryptionKeyId = await exportKey(encryptionKey); // Store the new key ID
        }

        if (!encryptionKey) {
          throw new Error('Encryption failed: Secure context (HTTPS) required for client-side encryption.');
        }

        const { ciphertext, iv } = await encryptVaultData(JSON.stringify(formData.payload), encryptionKey);
        finalPayload = { ciphertext, iv };
      } else {
        // If not encrypted, clear encryption_key_id
        encryptionKeyId = undefined;
      }

      if (item) {
        // Update existing item
        const { error: updateError } = await supabase
          .from('vault_items')
          .update({
            title: formData.title,
            type: selectedType,
            payload: finalPayload,
            unlock_at: formData.unlock_at || null,
            unlock_rule: formData.unlock_rule,
            heartbeat_timeout_days: formData.heartbeat_timeout_days,
            is_encrypted: formData.is_encrypted,
            encryption_key_id: encryptionKeyId,
            updated_at: new Date().toISOString(),
          })
          .eq('id', item.id);
        if (updateError) throw updateError;

        // Update beneficiary links: delete all existing and insert new ones
        await supabase.from('beneficiary_links').delete().eq('vault_item_id', item.id);
        if (selectedBeneficiaries.length > 0) {
          const { error: linkError } = await supabase
            .from('beneficiary_links')
            .insert(selectedBeneficiaries.map(b => ({
              vault_item_id: item.id,
              beneficiary_id: b.id,
              role: b.role
            })));
          if (linkError) throw linkError;
        }
      } else {
        // Create new item
        const { data: newItem, error: createError } = await supabase
          .from('vault_items')
          .insert({
            user_id: user.id,
            type: selectedType,
            title: formData.title,
            status: selectedType === 'MEMORIAL' ? 'DRAFT' : 'SCHEDULED', // Default status for new items
            payload: finalPayload,
            unlock_at: formData.unlock_at || null,
            unlock_rule: formData.unlock_rule,
            heartbeat_timeout_days: formData.heartbeat_timeout_days,
            is_encrypted: formData.is_encrypted,
            encryption_key_id: encryptionKeyId,
          })
          .select()
          .single();

        if (createError) throw createError;

        if (selectedBeneficiaries.length > 0) {
          const { error: linkError } = await supabase
            .from('beneficiary_links')
            .insert(selectedBeneficiaries.map(b => ({
              vault_item_id: newItem.id,
              beneficiary_id: b.id,
              role: b.role
            })));
          if (linkError) throw linkError;
        }
      }

      onSave();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save item');
    } finally {
      setLoading(false);
    }
  };

  const renderFormFields = () => {
    switch (selectedType) {
      case 'CAPSULE':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-1">Capsule Title</label>
              <input
                type="text"
                value={formData.title || ''}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Future Me / Family 2050"
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-teal-500/50"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-1">Message</label>
              <textarea
                value={formData.payload?.message || ''}
                onChange={(e) => setFormData({ ...formData, payload: { ...formData.payload, message: e.target.value } })}
                placeholder="Your message to the future..."
                rows={4}
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-teal-500/50"
              />
            </div>
            <FileUploadZone
              label="Attach Photo or Document"
              onUploadComplete={(path) => setFormData({
                ...formData,
                payload: { ...formData.payload, attachments: [...(formData.payload?.attachments || []), path] }
              })}
            />
          </div>
        );
      case 'MEMORIAL':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-1">Memorial For</label>
              <input
                type="text"
                value={formData.title || ''}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Name"
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-teal-500/50"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-1">Biography</label>
              <textarea
                value={formData.payload?.biography || ''}
                onChange={(e) => setFormData({ ...formData, payload: { ...formData.payload, biography: e.target.value } })}
                placeholder="Life stories and honors..."
                rows={4}
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-teal-500/50"
              />
            </div>
            <FileUploadZone
              label="Profile Photo"
              category="image"
              onUploadComplete={(path) => setFormData({
                ...formData,
                payload: { ...formData.payload, attachments: [...(formData.payload?.attachments || []), path] }
              })}
            />
          </div>
        );
      case 'WILL':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-1">Will Title</label>
              <input
                type="text"
                value={formData.title || ''}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Primary Digital Will"
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-teal-500/50"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-1">Final Wishes Summary</label>
              <textarea
                value={formData.payload?.wishes || ''}
                onChange={(e) => setFormData({ ...formData, payload: { ...formData.payload, wishes: e.target.value } })}
                placeholder="Brief summary of your final wishes..."
                rows={4}
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-teal-500/50"
              />
            </div>
            <FileUploadZone
              label="Full Will Document (PDF)"
              category="document"
              onUploadComplete={(path) => setFormData({
                ...formData,
                payload: { ...formData.payload, attachments: [...(formData.payload?.attachments || []), path] }
              })}
            />
          </div>
        );
      case 'MESSAGE':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-1">Subject</label>
              <input
                type="text"
                value={formData.payload?.subject || ''}
                onChange={(e) => setFormData({ ...formData, payload: { ...formData.payload, subject: e.target.value } })}
                placeholder="A letter from the past..."
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-teal-500/50"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-1">Recipients (Comma separated)</label>
              <input
                type="text"
                value={(formData.payload?.recipients || []).join(', ')}
                onChange={(e) => setFormData({ ...formData, payload: { ...formData.payload, recipients: e.target.value.split(',').map(s => s.trim()).filter(Boolean) } })}
                placeholder="email@example.com"
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-teal-500/50"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-1">Message Content</label>
              <textarea
                value={formData.payload?.message || ''}
                onChange={(e) => setFormData({ ...formData, payload: { ...formData.payload, message: e.target.value } })}
                placeholder="Write your heart out..."
                rows={4}
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-teal-500/50"
              />
            </div>
          </div>
        );
      default:
        return null;
    }
  };



  const getStepTitle = () => {
    if (step === 1) return 'Create New';
    const typeLabel = types.find(t => t.id === selectedType)?.label || 'Item';
    if (step === 2) return `New ${typeLabel}`;
    return `Assign Beneficiaries - ${typeLabel}`;
  };

  const renderStepContent = () => {
    if (step === 1) {
      return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {types.map((type) => {
            const Icon = type.icon;
            return (
              <button
                key={type.id}
                onClick={() => {
                  setSelectedType(type.id as unknown);
                  setStep(2);
                }}
                className={`p-6 rounded-xl border transition-all text-left ${selectedType === type.id
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
      );
    }

    if (step === 3) {
      return (
        <div className="space-y-4">
          <p className="text-sm text-slate-400">Select who should have access to this item when it unlocks.</p>
          <div className="space-y-2 max-h-60 overflow-y-auto pr-2" id="beneficiary-selection-list">
            {availableBeneficiaries.length === 0 ? (
              <div className="text-center py-8 bg-white/5 rounded-xl border border-dashed border-white/10">
                <Users className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                <p className="text-slate-500 text-sm">No beneficiaries created yet.</p>
                <button
                  onClick={() => navigate('/digital-legacy')}
                  className="mt-2 text-teal-400 text-sm hover:underline"
                >
                  Manage Beneficiaries
                </button>
              </div>
            ) : (
              availableBeneficiaries.map((b) => {
                const isSelected = selectedBeneficiaries.find(sb => sb.id === b.id);
                return (
                  <div
                    key={b.id}
                    className={`p-4 rounded-xl border transition-all flex items-center justify-between ${isSelected ? 'bg-teal-500/10 border-teal-500/50' : 'bg-white/5 border-white/10 hover:border-white/20'
                      }`}
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        id={`beneficiary-${b.id}`}
                        checked={!!isSelected}
                        onChange={() => toggleBeneficiary(b.id)}
                        className="w-4 h-4 rounded border-white/20 bg-white/5 text-teal-500 focus:ring-teal-500/50"
                      />
                      <label htmlFor={`beneficiary-${b.id}`} className="cursor-pointer">
                        <p className="text-white font-medium">{b.name || b.email}</p>
                        <p className="text-xs text-slate-500">{b.relationship || 'Unspecified Relationship'}</p>
                      </label>
                    </div>
                    {isSelected && (
                      <select
                        value={isSelected.role}
                        onChange={(e) => updateBeneficiaryRole(b.id, e.target.value as unknown)}
                        className="bg-slate-800 border border-slate-700 text-xs text-white rounded-lg px-2 py-1 focus:outline-none focus:border-teal-500/50"
                      >
                        <option value="VIEWER">Viewer</option>
                        <option value="CUSTODIAN">Custodian</option>
                        <option value="EXECUTOR">Executor</option>
                      </select>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        {renderFormFields()}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-400 mb-1">Unlock Rule</label>
            <select
              value={formData.unlock_rule}
              onChange={(e) => setFormData({ ...formData, unlock_rule: e.target.value as unknown })}
              className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-teal-500/50"
            >
              <option value="DATE">Specific Date</option>
              <option value="DEATH_CERT">Death Certificate</option>
              <option value="CUSTODIAN_APPROVAL">Custodian Approval</option>
              <option value="HEARTBEAT_TIMEOUT">Heartbeat Timeout</option>
            </select>
          </div>
          {formData.unlock_rule === 'DATE' && (
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-1">Unlock Date</label>
              <input
                type="datetime-local"
                value={formData.unlock_at}
                onChange={(e) => setFormData({ ...formData, unlock_at: e.target.value })}
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-teal-500/50"
              />
            </div>
          )}
        </div>

        <div className="flex items-center gap-3 p-4 rounded-xl bg-teal-500/5 border border-teal-500/20">
          <Shield className="w-5 h-5 text-teal-400" />
          <div className="flex-1">
            <h4 className="text-white text-sm font-medium">Secure Encryption</h4>
            <p className="text-xs text-slate-400">Content will be encrypted before storage.</p>
          </div>
          <button
            onClick={() => setFormData({ ...formData, is_encrypted: !formData.is_encrypted })}
            className={`w-12 h-6 rounded-full transition-all relative ${formData.is_encrypted ? 'bg-teal-500' : 'bg-slate-700'
              }`}
          >
            <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${formData.is_encrypted ? 'left-7' : 'left-1'
              }`} />
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[10000] flex items-center justify-center p-4">
      <div className="bg-gradient-to-br from-slate-900 to-slate-950 rounded-3xl border border-white/10 max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-white">
            {getStepTitle()}
          </h2>
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors"
          >
            <X className="w-5 h-5 text-white" />
          </button>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0" />
            <p className="text-sm text-red-400">{error}</p>
          </div>
        )}

        {renderStepContent()}

        <div className="flex items-center gap-3 mt-8">
          {step > 1 && (
            <button
              onClick={() => setStep(step - 1)}
              className="px-6 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-white font-medium transition-all"
            >
              Back
            </button>
          )}
          <button
            onClick={onClose}
            className="flex-1 px-6 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-white font-medium transition-all"
          >
            Cancel
          </button>
          {step === 2 && (
            <button
              onClick={() => setStep(3)}
              disabled={!formData.title}
              className="flex-1 px-6 py-3 rounded-xl bg-teal-600 text-white font-medium hover:opacity-90 transition-all"
            >
              Next: Beneficiaries
            </button>
          )}
          {step === 3 && (
            <button
              onClick={handleSave}
              disabled={loading}
              className="flex-1 px-6 py-3 rounded-xl bg-gradient-to-r from-teal-600 to-cyan-600 text-white font-medium hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <Shield className="w-4 h-4" />
                  Save to Vault
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function ItemDetailModal({ item, onClose, onRemove, onEdit }: { item: VaultItem; onClose: () => void; onRemove: (id: string) => void; onEdit: (item: VaultItem) => void }) {
  const { user } = useAuth();
  const [beneficiaries, setBeneficiaries] = useState<unknown[]>([]);
  const [loading, setLoading] = useState(false);
  const [decryptedPayload, setDecryptedPayload] = useState<unknown>(null);
  const isOwner = user?.id === item.user_id;

  useEffect(() => {
    loadBeneficiaries();
    if (item.is_encrypted) {
      handleDecrypt();
    }
  }, [item]);

  const handleDecrypt = async () => {
    if (!item.is_encrypted || !item.payload?.ciphertext || !item.payload?.iv || !item.encryption_key_id) return;
    try {
      const key = await importKey(item.encryption_key_id);
      if (!key) throw new Error('Could not import encryption key.');
      const decrypted = await decryptVaultData(item.payload.ciphertext, item.payload.iv, key);
      try {
        setDecryptedPayload(JSON.parse(decrypted));
      } catch (_parseErr) {
        // Fallback: use raw decrypted string if it's not JSON
        setDecryptedPayload({ message: decrypted });
      }
    } catch (_err) {
      /* intentional */
    }
  };

  const loadBeneficiaries = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('beneficiary_links')
        .select(`
          role,
          beneficiaries (
            id,
            name,
            email,
            relationship
          )
        `)
        .eq('vault_item_id', item.id);

      if (error) throw error;
      setBeneficiaries(data || []);
    } catch (_err) {
      /* intentional */
    } finally {
      setLoading(false);
    }
  };

  const renderPayload = () => {
    const payload = decryptedPayload || item.payload;
    if (item.is_encrypted && !decryptedPayload) {
      return (
        <div className="p-8 text-center rounded-xl bg-slate-900/50 border border-slate-700/50">
          <Lock className="w-12 h-12 text-slate-700 mx-auto mb-4" />
          <p className="text-slate-400">Decrypting secure content...</p>
        </div>
      );
    }
    switch (item.type) {
      case 'CAPSULE':
      case 'MESSAGE':
        return (
          <div className="space-y-4">
            {payload?.subject && <h4 className="text-white font-medium">Subject: {payload.subject}</h4>}
            <div className="p-4 rounded-xl bg-white/5 border border-white/10 text-slate-300 whitespace-pre-wrap">
              {payload?.message || (item.is_encrypted ? 'Decrypted content missing message field.' : 'No message content.')}
            </div>
            {payload?.recipients?.length > 0 && (
              <div>
                <p className="text-xs text-slate-500 mb-1">Recipients</p>
                <div className="flex flex-wrap gap-2">
                  {payload.recipients.map((r: string, i: number) => (
                    <span key={i} className="px-2 py-1 rounded-lg bg-teal-500/10 text-teal-400 text-xs border border-teal-500/20">
                      {r}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        );
      case 'MEMORIAL':
        return (
          <div className="space-y-4">
            <h4 className="text-white font-medium">Biography</h4>
            <div className="p-4 rounded-xl bg-white/5 border border-white/10 text-slate-300 whitespace-pre-wrap">
              {payload.biography}
            </div>
          </div>
        );
      case 'WILL':
        return (
          <div className="space-y-4">
            <h4 className="text-white font-medium">Wishes</h4>
            <div className="p-4 rounded-xl bg-white/5 border border-white/10 text-slate-300 whitespace-pre-wrap">
              {payload.wishes}
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[10000] flex items-center justify-center p-4">
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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-medium text-slate-400 mb-3 uppercase tracking-wider">Content</h3>
                {renderPayload()}
              </div>

              {item.payload.attachments?.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-slate-400 mb-3 uppercase tracking-wider">Attachments</h3>
                <div className="space-y-2">
                    {(payload.attachments || []).map((file: string, i: number) => (
                      <div key={i} className="p-3 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <File className="w-4 h-4 text-slate-400" />
                          <span className="text-sm text-slate-300">{file}</span>
                        </div>
                        <button className="text-slate-500 hover:text-white transition-colors">
                          <Download className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-medium text-slate-400 mb-3 uppercase tracking-wider">Beneficiaries</h3>
                {loading ? (
                  <div className="flex items-center justify-center py-4">
                    <div className="w-5 h-5 border-2 border-teal-400 border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : beneficiaries.length === 0 ? (
                  <p className="text-sm text-slate-500 italic">No beneficiaries assigned.</p>
                ) : (
                  <div className="space-y-2">
                    {beneficiaries.map((link, i) => (
                      <div key={i} className="p-3 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between">
                        <div>
                          <p className="text-white text-sm font-medium">{link.beneficiaries.name || link.beneficiaries.email}</p>
                          <p className="text-xs text-slate-500 capitalize">{link.role.toLowerCase()}</p>
                        </div>
                        <Users className="w-4 h-4 text-slate-600" />
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {isOwner && (
                <div className="p-4 rounded-xl bg-zinc-800/50 border border-white/5 space-y-3">
                  <h3 className="text-sm font-medium text-white mb-1">Administrative Actions</h3>
                  <div className="flex flex-col gap-2">
                    <button
                      onClick={() => onEdit(item)}
                      className="w-full px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-white text-sm font-medium transition-all flex items-center gap-2"
                    >
                      <Edit className="w-4 h-4" />
                      Modify Item
                    </button>
                    <button
                      onClick={() => onRemove(item.id)}
                      className="w-full px-4 py-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 text-sm font-medium transition-all flex items-center gap-2"
                    >
                      <Trash2 className="w-4 h-4" />
                      Delete Permanently
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3 pt-4 border-t border-white/10">
            <button
              onClick={onClose}
              className="px-6 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-white font-medium transition-all"
            >
              Close
            </button>
            <button
              onClick={async () => {
                try {
                  const payload = decryptedPayload || item.payload;
                  const exportData = {
                    ...item,
                    payload,
                    exported_at: new Date().toISOString(),
                    version: '1.0'
                  };
                  const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `${item.title.toLowerCase().replace(/\s+/g, '-')}.evault`;
                  document.body.appendChild(a);
                  a.click();
                  document.body.removeChild(a);
                  URL.revokeObjectURL(url);
                } catch (err) {
                  console.error('Export failed:', err);
                }
              }}
              className="flex-1 px-6 py-3 rounded-xl bg-gradient-to-r from-teal-600 to-cyan-600 text-white font-medium hover:opacity-90 transition-all flex items-center justify-center gap-2"
            >
              <Download className="w-4 h-4" />
              Secure Export (.evault)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
