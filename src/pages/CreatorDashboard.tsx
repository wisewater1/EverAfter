import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import {
  ArrowLeft,
  Plus,
  Edit,
  Eye,
  DollarSign,
  TrendingUp,
  Users,
  Star,
  Package,
  CheckCircle,
  Clock,
  XCircle
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

export default function CreatorDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<CreatorProfile | null>(null);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'templates' | 'analytics'>('overview');

  useEffect(() => {
    if (!user) {
      navigate('/marketplace');
      return;
    }
    loadCreatorData();
  }, [user]);

  const loadCreatorData = async () => {
    if (!user) return;

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
    } catch (error) {
      console.error('Error loading creator data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center">
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
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
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
              onClick={() => navigate('/creator/new')}
              className="px-4 py-2 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white rounded-xl transition-all flex items-center gap-2 shadow-lg shadow-amber-500/20"
            >
              <Plus className="w-5 h-5" />
              <span className="hidden sm:inline">Create Template</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="bg-gradient-to-br from-slate-800/40 to-slate-900/40 backdrop-blur-xl rounded-2xl border border-slate-700/50 p-6">
              <div className="flex items-center justify-between mb-3">
                <p className="text-slate-400 text-sm">Total Revenue</p>
                <DollarSign className="w-5 h-5 text-emerald-400" />
              </div>
              <p className="text-3xl font-light text-white mb-1">
                ${profile?.total_revenue?.toFixed(2) || '0.00'}
              </p>
              <p className="text-xs text-slate-500">{revenueSharePercentage}% revenue share</p>
            </div>

            <div className="bg-gradient-to-br from-slate-800/40 to-slate-900/40 backdrop-blur-xl rounded-2xl border border-slate-700/50 p-6">
              <div className="flex items-center justify-between mb-3">
                <p className="text-slate-400 text-sm">Total Sales</p>
                <TrendingUp className="w-5 h-5 text-blue-400" />
              </div>
              <p className="text-3xl font-light text-white mb-1">{profile?.total_sales || 0}</p>
              <p className="text-xs text-slate-500">Across all templates</p>
            </div>

            <div className="bg-gradient-to-br from-slate-800/40 to-slate-900/40 backdrop-blur-xl rounded-2xl border border-slate-700/50 p-6">
              <div className="flex items-center justify-between mb-3">
                <p className="text-slate-400 text-sm">Active Templates</p>
                <Package className="w-5 h-5 text-amber-400" />
              </div>
              <p className="text-3xl font-light text-white mb-1">{approvedTemplates.length}</p>
              <p className="text-xs text-slate-500">{pendingTemplates.length} pending review</p>
            </div>

            <div className="bg-gradient-to-br from-slate-800/40 to-slate-900/40 backdrop-blur-xl rounded-2xl border border-slate-700/50 p-6">
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
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                activeTab === 'overview'
                  ? 'bg-sky-600 text-white'
                  : 'bg-slate-800/50 text-slate-400 hover:bg-slate-800'
              }`}
            >
              Overview
            </button>
            <button
              onClick={() => setActiveTab('templates')}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                activeTab === 'templates'
                  ? 'bg-sky-600 text-white'
                  : 'bg-slate-800/50 text-slate-400 hover:bg-slate-800'
              }`}
            >
              Templates
            </button>
            <button
              onClick={() => setActiveTab('analytics')}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                activeTab === 'analytics'
                  ? 'bg-sky-600 text-white'
                  : 'bg-slate-800/50 text-slate-400 hover:bg-slate-800'
              }`}
            >
              Analytics
            </button>
          </div>
        </div>

        {activeTab === 'templates' && (
          <div className="space-y-4">
            {templates.length === 0 ? (
              <div className="text-center py-16 bg-gradient-to-br from-slate-800/40 to-slate-900/40 backdrop-blur-xl rounded-2xl border border-slate-700/50">
                <Package className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                <h3 className="text-xl font-medium text-white mb-2">No templates yet</h3>
                <p className="text-slate-400 mb-6">Create your first AI template to get started</p>
                <button
                  onClick={() => navigate('/creator/new')}
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
                        <TemplateCard key={template.id} template={template} navigate={navigate} />
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
                        <TemplateCard key={template.id} template={template} navigate={navigate} />
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
                        <TemplateCard key={template.id} template={template} navigate={navigate} />
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {activeTab === 'overview' && (
          <div className="bg-gradient-to-br from-slate-800/40 to-slate-900/40 backdrop-blur-xl rounded-2xl border border-slate-700/50 p-8">
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
      </div>
    </div>
  );
}

interface TemplateCardProps {
  template: Template;
  navigate: (path: string) => void;
}

function TemplateCard({ template, navigate }: TemplateCardProps) {
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
    <div className="bg-gradient-to-br from-slate-800/40 to-slate-900/40 backdrop-blur-xl rounded-2xl border border-slate-700/50 p-6 hover:border-slate-600/50 transition-all">
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

      <div className="grid grid-cols-4 gap-4 mb-4">
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
          onClick={() => navigate(`/creator/template/${template.id}`)}
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
