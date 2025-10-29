import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import {
  ArrowLeft,
  MessageSquare,
  Settings,
  Play,
  Pause,
  Trash2,
  TrendingUp,
  Clock,
  CheckCircle,
  Package
} from 'lucide-react';

interface PurchasedTemplate {
  id: string;
  template_id: string;
  purchased_at: string;
  template: {
    id: string;
    title: string;
    description: string;
    category: string;
    avatar_url: string | null;
    creator_name: string;
  };
  instance: {
    id: string;
    instance_name: string;
    is_active: boolean;
    last_run_at: string | null;
    total_runs: number;
    total_autonomous_tasks: number;
  } | null;
}

export default function MyAIs() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [purchases, setPurchases] = useState<PurchasedTemplate[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      navigate('/marketplace');
      return;
    }
    loadPurchases();
  }, [user]);

  const loadPurchases = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('marketplace_purchases')
        .select(`
          id,
          template_id,
          purchased_at,
          template:marketplace_templates!marketplace_purchases_template_id_fkey(
            id,
            title,
            description,
            category,
            avatar_url,
            creator_name
          )
        `)
        .eq('user_id', user.id)
        .order('purchased_at', { ascending: false });

      if (error) throw error;

      const purchasesWithInstances = await Promise.all(
        (data || []).map(async (purchase: any) => {
          const { data: instance } = await supabase
            .from('marketplace_purchased_instances')
            .select('*')
            .eq('purchase_id', purchase.id)
            .eq('user_id', user.id)
            .maybeSingle();

          return {
            ...purchase,
            template: Array.isArray(purchase.template) ? purchase.template[0] : purchase.template,
            instance: instance || null,
          };
        })
      );

      setPurchases(purchasesWithInstances as PurchasedTemplate[]);
    } catch (error) {
      console.error('Error loading purchases:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleActivate = async (purchase: PurchasedTemplate) => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('marketplace_purchased_instances')
        .insert({
          purchase_id: purchase.id,
          user_id: user.id,
          template_id: purchase.template_id,
          instance_name: purchase.template.title,
          is_active: true,
        })
        .select()
        .single();

      if (error) throw error;

      await loadPurchases();
    } catch (error) {
      console.error('Error activating template:', error);
      alert('Failed to activate template. Please try again.');
    }
  };

  const handleToggleActive = async (instance: NonNullable<PurchasedTemplate['instance']>) => {
    try {
      const { error } = await supabase
        .from('marketplace_purchased_instances')
        .update({ is_active: !instance.is_active })
        .eq('id', instance.id);

      if (error) throw error;

      await loadPurchases();
    } catch (error) {
      console.error('Error toggling instance:', error);
      alert('Failed to update status. Please try again.');
    }
  };

  const handleStartChat = (purchase: PurchasedTemplate) => {
    navigate(`/my-ais/chat/${purchase.template_id}`, {
      state: { templateId: purchase.template_id, instanceId: purchase.instance?.id }
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-2 border-slate-700 border-t-sky-500 rounded-full animate-spin"></div>
          <p className="text-slate-400 text-sm">Loading Your AIs...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <div className="flex items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/dashboard')}
                className="w-10 h-10 bg-slate-800/50 hover:bg-slate-800 border border-slate-700/50 hover:border-slate-600 rounded-lg flex items-center justify-center transition-all"
              >
                <ArrowLeft className="w-5 h-5 text-slate-400" />
              </button>
              <div>
                <h1 className="text-3xl font-light tracking-tight text-white mb-1">My AIs</h1>
                <p className="text-slate-400">Manage your purchased AI templates</p>
              </div>
            </div>
            <button
              onClick={() => navigate('/marketplace')}
              className="px-4 py-2 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white rounded-xl transition-all flex items-center gap-2 shadow-lg shadow-amber-500/20"
            >
              <Package className="w-5 h-5" />
              <span className="hidden sm:inline">Browse Marketplace</span>
            </button>
          </div>

          {purchases.length === 0 ? (
            <div className="text-center py-16 bg-gradient-to-br from-slate-800/40 to-slate-900/40 backdrop-blur-xl rounded-2xl border border-slate-700/50">
              <Package className="w-16 h-16 text-slate-600 mx-auto mb-4" />
              <h3 className="text-xl font-medium text-white mb-2">No AI templates yet</h3>
              <p className="text-slate-400 mb-6">
                Browse the marketplace to find AI personalities that match your needs
              </p>
              <button
                onClick={() => navigate('/marketplace')}
                className="px-6 py-3 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white rounded-xl transition-all inline-flex items-center gap-2 shadow-lg shadow-amber-500/20"
              >
                <Package className="w-5 h-5" />
                Browse Marketplace
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {purchases.map((purchase) => (
                <AICard
                  key={purchase.id}
                  purchase={purchase}
                  onActivate={() => handleActivate(purchase)}
                  onToggleActive={() => purchase.instance && handleToggleActive(purchase.instance)}
                  onStartChat={() => handleStartChat(purchase)}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

interface AICardProps {
  purchase: PurchasedTemplate;
  onActivate: () => void;
  onToggleActive: () => void;
  onStartChat: () => void;
}

function AICard({ purchase, onActivate, onToggleActive, onStartChat }: AICardProps) {
  const { template, instance } = purchase;
  const isActive = instance?.is_active || false;

  return (
    <div className="bg-gradient-to-br from-slate-800/40 to-slate-900/40 backdrop-blur-xl rounded-2xl border border-slate-700/50 hover:border-slate-600/50 p-6 transition-all">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl flex items-center justify-center shadow-lg">
            {template.avatar_url ? (
              <img
                src={template.avatar_url}
                alt={template.title}
                className="w-full h-full object-cover rounded-xl"
              />
            ) : (
              <Package className="w-6 h-6 text-white" />
            )}
          </div>
          <div>
            <h3 className="text-lg font-medium text-white mb-0.5">{template.title}</h3>
            <p className="text-xs text-slate-400">{template.creator_name}</p>
          </div>
        </div>
        {instance && (
          <span
            className={`px-2 py-1 text-xs rounded-lg flex items-center gap-1 ${
              isActive
                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                : 'bg-slate-700/50 text-slate-400'
            }`}
          >
            {isActive ? <CheckCircle className="w-3 h-3" /> : <Pause className="w-3 h-3" />}
            {isActive ? 'Active' : 'Paused'}
          </span>
        )}
      </div>

      <p className="text-sm text-slate-300 mb-4 line-clamp-2">{template.description}</p>

      {instance && (
        <div className="grid grid-cols-3 gap-2 mb-4 pb-4 border-b border-slate-700/50">
          <div>
            <p className="text-xs text-slate-500 mb-0.5">Runs</p>
            <p className="text-lg font-medium text-white">{instance.total_runs}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500 mb-0.5">Tasks</p>
            <p className="text-lg font-medium text-white">{instance.total_autonomous_tasks}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500 mb-0.5">Last Run</p>
            <p className="text-sm text-slate-400">
              {instance.last_run_at
                ? new Date(instance.last_run_at).toLocaleDateString()
                : 'Never'}
            </p>
          </div>
        </div>
      )}

      <div className="flex items-center gap-2">
        {!instance ? (
          <button
            onClick={onActivate}
            className="flex-1 px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-lg transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20"
          >
            <Play className="w-4 h-4" />
            Activate
          </button>
        ) : (
          <>
            <button
              onClick={onStartChat}
              className="flex-1 px-4 py-2 bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-700 hover:to-blue-700 text-white rounded-lg transition-all flex items-center justify-center gap-2 shadow-lg shadow-sky-500/20"
            >
              <MessageSquare className="w-4 h-4" />
              Chat
            </button>
            <button
              onClick={onToggleActive}
              className="px-4 py-2 bg-slate-700/50 hover:bg-slate-700 border border-slate-600/50 hover:border-slate-600 text-white rounded-lg transition-all"
              title={isActive ? 'Pause' : 'Resume'}
            >
              {isActive ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            </button>
            <button
              onClick={() => {}}
              className="px-4 py-2 bg-slate-700/50 hover:bg-slate-700 border border-slate-600/50 hover:border-slate-600 text-white rounded-lg transition-all"
              title="Settings"
            >
              <Settings className="w-4 h-4" />
            </button>
          </>
        )}
      </div>
    </div>
  );
}
