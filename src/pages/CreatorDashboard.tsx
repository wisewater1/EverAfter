import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { buildApiUrl } from '../lib/env';
import { notify } from '../lib/dialogs';
import {
  ArrowLeft,
  Plus,
  Edit,
  Eye,
  DollarSign,
  TrendingUp,
  Star,
  Package,
  CheckCircle,
  Clock,
  XCircle,
  Brain,
  Sparkles,
  X,
  Loader2
} from 'lucide-react';

interface CreatorProfile {
  id: string;
  display_name: string;
  creator_tier: string;
  total_revenue: number;
  total_templates: number;
  total_sales: number;
  average_rating: number;
  stripe_onboarding_complete: boolean;
}

interface Template {
  id: string;
  title: string;
  description?: string;
  category: string;
  price_usd: number;
  total_purchases: number;
  rating: number;
  approval_status: string;
  is_active: boolean;
  revenue_total: number;
  total_runs: number;
  active_users: number;
  created_at: string;
}

interface MineableEngram {
  id: string;
  question_text: string;
  question_category: string;
  training_permitted: boolean;
  created_at: string;
}

export default function CreatorDashboard() {
  const { user, isDemoMode } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<CreatorProfile | null>(null);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [mineableEngrams, setMineableEngrams] = useState<MineableEngram[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'templates' | 'analytics' | 'mining'>('overview');
  // In-page create/edit instead of the previously-unrouted /creator/new and
  // /creator/template/:id navigations (they fell through to the catch-all).
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);

  useEffect(() => {
    if (!user) {
      navigate('/marketplace');
      return;
    }
    loadCreatorData();
  }, [user, isDemoMode]);

  const loadCreatorData = async () => {
    if (!user) return;

    if (isDemoMode) {
      setProfile({
        id: 'demo-creator-profile',
        display_name: user.email?.split('@')[0] || 'Demo Creator',
        creator_tier: 'free',
        total_revenue: 0,
        total_templates: 0,
        total_sales: 0,
        average_rating: 0,
        stripe_onboarding_complete: false,
      });
      setTemplates([]);
      setMineableEngrams([]);
      setLoading(false);
      return;
    }

    try {
      const { data: profileData, error: profileError } = await supabase
        .from('marketplace_creator_profiles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (profileError) throw profileError;

      if (!profileData) {
        const { data: newProfile, error: createError } = await supabase
          .from('marketplace_creator_profiles')
          .insert({
            user_id: user.id,
            display_name: user.email?.split('@')[0] || 'Creator',
            creator_tier: 'free',
          })
          .select()
          .single();

        if (createError) throw createError;
        setProfile(newProfile);
      } else {
        setProfile(profileData);
      }

      const { data: templatesData, error: templatesError } = await supabase
        .from('marketplace_templates')
        .select('*')
        .eq('creator_user_id', user.id)
        .order('created_at', { ascending: false });

      if (templatesError) throw templatesError;
      setTemplates(templatesData || []);

      // Fetch Mineable Engrams
      const mineableRes = await fetch(buildApiUrl('/api/v1/marketplace/assets/mining'), {
        headers: {
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
        }
      });
      if (mineableRes.ok) {
        const mineable = await mineableRes.json();
        setMineableEngrams(Array.isArray(mineable) ? mineable : []);
      }
    } catch (error) {
      console.warn('Creator dashboard degraded to local fallback:', error);
      setProfile((current) => current ?? {
        id: 'degraded-creator-profile',
        display_name: user.email?.split('@')[0] || 'Creator',
        creator_tier: 'free',
        total_revenue: 0,
        total_templates: 0,
        total_sales: 0,
        average_rating: 0,
        stripe_onboarding_complete: false,
      });
      setTemplates([]);
      setMineableEngrams([]);
    } finally {
      setLoading(false);
    }
  };

  const toggleTrainingPermit = async (engramId: string, currentStatus: boolean) => {
    try {
      const res = await fetch(buildApiUrl(`/api/v1/marketplace/assets/mining/${engramId}/permit?permit=${!currentStatus}`), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
        }
      });
      if (res.ok) {
        setMineableEngrams(prev => prev.map(e => e.id === engramId ? { ...e, training_permitted: !currentStatus } : e));
      }
    } catch (error) {
      console.error('Error toggling training permit:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[100dvh] bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-2 border-slate-700 border-t-amber-500 rounded-full animate-spin"></div>
          <p className="text-slate-400 text-sm">Loading Creator Dashboard...</p>
        </div>
      </div>
    );
  }

  const approvedTemplates = templates.filter(t => t.approval_status === 'approved');
  const pendingTemplates = templates.filter(t => t.approval_status === 'pending_review');
  const draftTemplates = templates.filter(t => t.approval_status === 'draft');

  const revenueSharePercentage = profile?.creator_tier === 'premium' ? 90 : profile?.creator_tier === 'verified' ? 85 : 80;

  return (
    <div className="min-h-[100dvh] bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <div className="flex items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/marketplace')}
                className="w-10 h-10 bg-slate-800/50 hover:bg-slate-800 border border-slate-700/50 hover:border-slate-600 rounded-lg flex items-center justify-center transition-all"
              >
                <ArrowLeft className="w-5 h-5 text-slate-400" />
              </button>
              <div>
                <h1 className="text-3xl font-light tracking-tight text-white mb-1">Creator Dashboard</h1>
                <p className="text-slate-400">Manage your AI templates and track revenue</p>
              </div>
            </div>
            <button
              onClick={() => { setEditingTemplate(null); setEditorOpen(true); }}
              className="px-4 py-2 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white rounded-xl transition-all flex items-center gap-2 shadow-lg shadow-amber-500/20"
            >
              <Plus className="w-5 h-5" />
              <span className="hidden sm:inline">Create Template</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="bg-gradient-to-br from-slate-800/40 to-slate-900/40 sm:backdrop-blur-xl rounded-2xl border border-slate-700/50 p-6">
              <div className="flex items-center justify-between mb-3">
                <p className="text-slate-400 text-sm">Total Revenue</p>
                <DollarSign className="w-5 h-5 text-emerald-400" />
              </div>
              <p className="text-3xl font-light text-white mb-1">
                ${profile?.total_revenue?.toFixed(2) || '0.00'}
              </p>
              <p className="text-xs text-slate-500">{revenueSharePercentage}% revenue share</p>
            </div>

            <div className="bg-gradient-to-br from-slate-800/40 to-slate-900/40 sm:backdrop-blur-xl rounded-2xl border border-slate-700/50 p-6">
              <div className="flex items-center justify-between mb-3">
                <p className="text-slate-400 text-sm">Total Sales</p>
                <TrendingUp className="w-5 h-5 text-blue-400" />
              </div>
              <p className="text-3xl font-light text-white mb-1">{profile?.total_sales || 0}</p>
              <p className="text-xs text-slate-500">Across all templates</p>
            </div>

            <div className="bg-gradient-to-br from-slate-800/40 to-slate-900/40 sm:backdrop-blur-xl rounded-2xl border border-slate-700/50 p-6">
              <div className="flex items-center justify-between mb-3">
                <p className="text-slate-400 text-sm">Active Templates</p>
                <Package className="w-5 h-5 text-amber-400" />
              </div>
              <p className="text-3xl font-light text-white mb-1">{approvedTemplates.length}</p>
              <p className="text-xs text-slate-500">{pendingTemplates.length} pending review</p>
            </div>

            <div className="bg-gradient-to-br from-slate-800/40 to-slate-900/40 sm:backdrop-blur-xl rounded-2xl border border-slate-700/50 p-6">
              <div className="flex items-center justify-between mb-3">
                <p className="text-slate-400 text-sm">Avg Rating</p>
                <Star className="w-5 h-5 text-amber-400" />
              </div>
              <p className="text-3xl font-light text-white mb-1">
                {profile?.average_rating?.toFixed(1) || '0.0'}
              </p>
              <p className="text-xs text-slate-500">Based on reviews</p>
            </div>
          </div>

          <div className="flex gap-2 mb-6">
            <button
              onClick={() => setActiveTab('overview')}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${activeTab === 'overview'
                ? 'bg-sky-600 text-white'
                : 'bg-slate-800/50 text-slate-400 hover:bg-slate-800'
                }`}
            >
              Overview
            </button>
            <button
              onClick={() => setActiveTab('templates')}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${activeTab === 'templates'
                ? 'bg-sky-600 text-white'
                : 'bg-slate-800/50 text-slate-400 hover:bg-slate-800'
                }`}
            >
              Templates
            </button>
            <button
              onClick={() => setActiveTab('mining')}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${activeTab === 'mining'
                ? 'bg-amber-600 text-white shadow-lg shadow-amber-500/20'
                : 'bg-slate-800/50 text-slate-400 hover:bg-slate-800'
                }`}
            >
              Memory Mining
            </button>
          </div>
        </div>

        {activeTab === 'templates' && (
          <div className="space-y-4">
            {templates.length === 0 ? (
              <div className="text-center py-16 bg-gradient-to-br from-slate-800/40 to-slate-900/40 sm:backdrop-blur-xl rounded-2xl border border-slate-700/50">
                <Package className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                <h3 className="text-xl font-medium text-white mb-2">No templates yet</h3>
                <p className="text-slate-400 mb-6">Create your first AI template to get started</p>
                <button
                  onClick={() => { setEditingTemplate(null); setEditorOpen(true); }}
                  className="px-6 py-3 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white rounded-xl transition-all inline-flex items-center gap-2 shadow-lg shadow-amber-500/20"
                >
                  <Plus className="w-5 h-5" />
                  Create Template
                </button>
              </div>
            ) : (
              <>
                {approvedTemplates.length > 0 && (
                  <div>
                    <h3 className="text-lg font-medium text-white mb-4 flex items-center gap-2">
                      <CheckCircle className="w-5 h-5 text-emerald-400" />
                      Published Templates
                    </h3>
                    <div className="grid grid-cols-1 gap-4">
                      {approvedTemplates.map((template) => (
                        <TemplateCard key={template.id} template={template} navigate={navigate} onEdit={(t) => { setEditingTemplate(t); setEditorOpen(true); }} />
                      ))}
                    </div>
                  </div>
                )}

                {pendingTemplates.length > 0 && (
                  <div>
                    <h3 className="text-lg font-medium text-white mb-4 flex items-center gap-2">
                      <Clock className="w-5 h-5 text-amber-400" />
                      Pending Review
                    </h3>
                    <div className="grid grid-cols-1 gap-4">
                      {pendingTemplates.map((template) => (
                        <TemplateCard key={template.id} template={template} navigate={navigate} onEdit={(t) => { setEditingTemplate(t); setEditorOpen(true); }} />
                      ))}
                    </div>
                  </div>
                )}

                {draftTemplates.length > 0 && (
                  <div>
                    <h3 className="text-lg font-medium text-white mb-4 flex items-center gap-2">
                      <Edit className="w-5 h-5 text-slate-400" />
                      Drafts
                    </h3>
                    <div className="grid grid-cols-1 gap-4">
                      {draftTemplates.map((template) => (
                        <TemplateCard key={template.id} template={template} navigate={navigate} onEdit={(t) => { setEditingTemplate(t); setEditorOpen(true); }} />
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {activeTab === 'overview' && (
          <div className="bg-gradient-to-br from-slate-800/40 to-slate-900/40 sm:backdrop-blur-xl rounded-2xl border border-slate-700/50 p-8">
            <h3 className="text-xl font-medium text-white mb-4">Getting Started</h3>
            <div className="space-y-4">
              <div className="flex items-start gap-4">
                <div className="w-8 h-8 bg-sky-600 rounded-lg flex items-center justify-center flex-shrink-0">
                  <span className="text-white font-bold">1</span>
                </div>
                <div>
                  <h4 className="text-white font-medium mb-1">Create Your First Template</h4>
                  <p className="text-slate-400 text-sm">
                    Design an AI personality with custom prompts, personality traits, and capabilities
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="w-8 h-8 bg-slate-700 rounded-lg flex items-center justify-center flex-shrink-0">
                  <span className="text-slate-400 font-bold">2</span>
                </div>
                <div>
                  <h4 className="text-white font-medium mb-1">Submit for Review</h4>
                  <p className="text-slate-400 text-sm">
                    Our team will review your template to ensure quality and safety standards
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="w-8 h-8 bg-slate-700 rounded-lg flex items-center justify-center flex-shrink-0">
                  <span className="text-slate-400 font-bold">3</span>
                </div>
                <div>
                  <h4 className="text-white font-medium mb-1">Start Earning</h4>
                  <p className="text-slate-400 text-sm">
                    Once approved, your template will be live in the marketplace. You earn {revenueSharePercentage}% of each sale
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'mining' && (
          <div className="space-y-6">
            <div className="bg-gradient-to-br from-amber-500/10 to-orange-500/10 border border-amber-500/20 rounded-2xl p-6">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 rounded-xl bg-amber-500/20 flex items-center justify-center">
                  <Brain className="w-6 h-6 text-amber-400" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">Akashic Memory Mining</h3>
                  <p className="text-sm text-slate-400">Monetize your digital legacy for AI training</p>
                </div>
              </div>
              <p className="text-slate-300 text-sm leading-relaxed mb-4">
                By permitting your engrams (memory responses) to be used for AI training, you contribute to the
                evolution of the EverAfter ecosystem and earn credits. Your data is anonymized before use.
              </p>
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-500/20 rounded-lg text-amber-400 text-xs font-bold uppercase tracking-wider">
                <Sparkles className="w-3 h-3" />
                Beta Feature: Earn 2x credits
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4">
              {mineableEngrams.length === 0 ? (
                <div className="p-12 text-center bg-slate-900/30 rounded-2xl border border-slate-800">
                  <Clock className="w-12 h-12 text-slate-700 mx-auto mb-4" />
                  <p className="text-slate-400">No mineable engrams found. Start answering daily questions to build your legacy.</p>
                </div>
              ) : (
                mineableEngrams.map((engram) => (
                  <div key={engram.id} className="bg-slate-800/40 backdrop-blur-sm border border-slate-700/50 rounded-xl p-5 flex items-center justify-between group hover:border-amber-500/30 transition-all">
                    <div className="flex-1 mr-6">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="px-2 py-0.5 bg-slate-700 text-slate-300 text-[10px] font-bold uppercase rounded">
                          {engram.question_category}
                        </span>
                        <span className="text-[10px] text-slate-500">
                          {new Date(engram.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-white font-medium line-clamp-1">{engram.question_text}</p>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right mr-2">
                        <p className={`text-xs font-bold ${engram.training_permitted ? 'text-emerald-400' : 'text-slate-500'}`}>
                          {engram.training_permitted ? 'PERMITTED' : 'PAUSED'}
                        </p>
                        <p className="text-[10px] text-slate-500">
                          Estimated Value: 0.05 Cr
                        </p>
                      </div>
                      <button
                        onClick={() => toggleTrainingPermit(engram.id, engram.training_permitted)}
                        className={`w-12 h-6 rounded-full transition-all relative ${engram.training_permitted ? 'bg-emerald-600' : 'bg-slate-700'}`}
                      >
                        <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${engram.training_permitted ? 'left-7' : 'left-1'}`} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {editorOpen && user && (
        <TemplateEditorModal
          template={editingTemplate}
          creatorName={profile?.display_name || user.email?.split('@')[0] || 'Creator'}
          userId={user.id}
          isDemoMode={isDemoMode}
          onClose={() => { setEditorOpen(false); setEditingTemplate(null); }}
          onSaved={() => { setEditorOpen(false); setEditingTemplate(null); loadCreatorData(); }}
        />
      )}
    </div>
  );
}

const TEMPLATE_CATEGORIES = ['Wellbeing', 'Legacy', 'Family', 'Memorial', 'Health', 'Career'];

function TemplateEditorModal({
  template,
  creatorName,
  userId,
  isDemoMode,
  onClose,
  onSaved,
}: {
  template: Template | null;
  creatorName: string;
  userId: string;
  isDemoMode: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [title, setTitle] = useState(template?.title || '');
  const [description, setDescription] = useState(template?.description || '');
  const [category, setCategory] = useState(template?.category || TEMPLATE_CATEGORIES[0]);
  const [price, setPrice] = useState(String(template?.price_usd ?? 0));
  const [saving, setSaving] = useState<'draft' | 'review' | null>(null);

  const save = async (approvalStatus: 'draft' | 'pending_review') => {
    if (!title.trim() || !description.trim()) {
      notify('Please fill in a title and description.', 'warning');
      return;
    }
    const priceValue = Number(price);
    if (!Number.isFinite(priceValue) || priceValue < 0) {
      notify('Price must be a non-negative number.', 'warning');
      return;
    }
    if (isDemoMode) {
      notify('Template publishing is disabled in the demo. Create a free account to publish.', 'info');
      return;
    }

    setSaving(approvalStatus === 'draft' ? 'draft' : 'review');
    try {
      const payload = {
        title: title.trim(),
        description: description.trim(),
        category,
        price_usd: priceValue,
        approval_status: approvalStatus,
        is_active: false,
      };
      if (template) {
        const { error } = await supabase
          .from('marketplace_templates')
          .update(payload)
          .eq('id', template.id)
          .eq('creator_user_id', userId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('marketplace_templates')
          .insert({
            ...payload,
            name: title.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60) || 'template',
            creator_name: creatorName,
            creator_user_id: userId,
          });
        if (error) throw error;
      }
      notify(
        approvalStatus === 'pending_review'
          ? 'Template submitted for review — it will appear in the marketplace once approved.'
          : 'Draft saved.',
        'success',
      );
      onSaved();
    } catch (error) {
      console.error('Template save failed:', error);
      notify('The template could not be saved. Please try again.', 'error');
    } finally {
      setSaving(null);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4" onClick={() => !saving && onClose()}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={template ? 'Edit template' : 'Create template'}
        className="w-full max-w-lg max-h-[85vh] overflow-auto rounded-2xl border border-slate-700/60 bg-slate-900 p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-5 flex items-center justify-between">
          <h3 className="text-xl font-medium text-white">{template ? 'Edit Template' : 'Create Template'}</h3>
          <button onClick={onClose} disabled={!!saving} className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-800 hover:text-white" aria-label="Close editor">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-300">Title *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-950/60 px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-amber-500/50"
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-300">Description *</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              className="w-full resize-none rounded-lg border border-slate-700 bg-slate-950/60 px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-amber-500/50"
              placeholder="What does this AI template do, and who is it for?"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-300">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-slate-950/60 px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-amber-500/50"
              >
                {TEMPLATE_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-300">Price (USD)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-slate-950/60 px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-amber-500/50"
              />
            </div>
          </div>
          <p className="rounded-lg border border-slate-700/60 bg-slate-800/40 px-3 py-2 text-xs text-slate-400">
            Templates are reviewed before they appear in the marketplace. Drafts stay private to you.
          </p>
        </div>

        <div className="mt-6 flex gap-3">
          <button
            onClick={() => save('draft')}
            disabled={!!saving}
            className="flex-1 rounded-lg border border-slate-600/50 bg-slate-700/50 px-4 py-3 font-medium text-slate-200 transition-all hover:bg-slate-700 disabled:opacity-50"
          >
            {saving === 'draft' ? <Loader2 className="mx-auto h-5 w-5 animate-spin" /> : 'Save Draft'}
          </button>
          <button
            onClick={() => save('pending_review')}
            disabled={!!saving}
            className="flex-1 rounded-lg bg-gradient-to-r from-amber-600 to-orange-600 px-4 py-3 font-medium text-white transition-all hover:from-amber-700 hover:to-orange-700 disabled:opacity-50"
          >
            {saving === 'review' ? <Loader2 className="mx-auto h-5 w-5 animate-spin" /> : 'Submit for Review'}
          </button>
        </div>
      </div>
    </div>
  );
}

interface TemplateCardProps {
  onEdit: (template: Template) => void;
  template: Template;
  navigate: (path: string) => void;
}

function TemplateCard({ template, navigate, onEdit }: TemplateCardProps) {
  const getStatusIcon = () => {
    switch (template.approval_status) {
      case 'approved':
        return <CheckCircle className="w-4 h-4 text-emerald-400" />;
      case 'pending_review':
        return <Clock className="w-4 h-4 text-amber-400" />;
      case 'rejected':
        return <XCircle className="w-4 h-4 text-red-400" />;
      default:
        return <Edit className="w-4 h-4 text-slate-400" />;
    }
  };

  const getStatusText = () => {
    switch (template.approval_status) {
      case 'approved':
        return 'Published';
      case 'pending_review':
        return 'Pending Review';
      case 'rejected':
        return 'Rejected';
      default:
        return 'Draft';
    }
  };

  return (
    <div className="bg-gradient-to-br from-slate-800/40 to-slate-900/40 sm:backdrop-blur-xl rounded-2xl border border-slate-700/50 p-6 hover:border-slate-600/50 transition-all">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <h4 className="text-lg font-medium text-white">{template.title}</h4>
            <span className="px-2 py-1 bg-slate-700/50 text-slate-300 text-xs rounded-lg flex items-center gap-1">
              {getStatusIcon()}
              {getStatusText()}
            </span>
          </div>
          <p className="text-sm text-slate-400">{template.category}</p>
        </div>
        <div className="text-right">
          <p className="text-xl font-light text-white">${template.price_usd.toFixed(2)}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-4">
        <div>
          <p className="text-xs text-slate-500 mb-1">Sales</p>
          <p className="text-lg font-medium text-white">{template.total_purchases}</p>
        </div>
        <div>
          <p className="text-xs text-slate-500 mb-1">Revenue</p>
          <p className="text-lg font-medium text-white">${template.revenue_total.toFixed(0)}</p>
        </div>
        <div>
          <p className="text-xs text-slate-500 mb-1">Runs</p>
          <p className="text-lg font-medium text-white">{template.total_runs}</p>
        </div>
        <div>
          <p className="text-xs text-slate-500 mb-1">Rating</p>
          <p className="text-lg font-medium text-white flex items-center gap-1">
            <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
            {template.rating.toFixed(1)}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={() => onEdit(template)}
          className="flex-1 px-4 py-2 bg-slate-700/50 hover:bg-slate-700 border border-slate-600/50 hover:border-slate-600 text-white rounded-lg transition-all flex items-center justify-center gap-2"
        >
          <Edit className="w-4 h-4" />
          Edit
        </button>
        {template.approval_status === 'approved' && (
          <button
            onClick={() => navigate(`/marketplace?template=${template.id}`)}
            className="flex-1 px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-lg transition-all flex items-center justify-center gap-2"
          >
            <Eye className="w-4 h-4" />
            View in Marketplace
          </button>
        )}
      </div>
    </div>
  );
}
