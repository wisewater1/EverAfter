import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import {
  X,
  Droplet,
  Heart,
  Moon,
  TrendingUp,
  LayoutDashboard,
  CheckCircle,
  Loader,
  AlertCircle,
} from 'lucide-react';

interface Template {
  id: string;
  name: string;
  category: string;
  description: string;
  icon: string;
  color_scheme: string;
  required_sources: string[];
  featured: boolean;
}

interface TemplateCardProps {
  template: Template;
  onSelect: () => void;
}

function TemplateCard({ template, onSelect }: TemplateCardProps) {
  const iconMap: Record<string, any> = {
    droplet: Droplet,
    heart: Heart,
    moon: Moon,
    'trending-up': TrendingUp,
    'layout-dashboard': LayoutDashboard,
  };

  const colorMap: Record<string, string> = {
    'blue-cyan': 'from-blue-600 to-cyan-600',
    'red-pink': 'from-red-600 to-pink-600',
    'indigo-blue': 'from-blue-600 to-blue-400',
    'green-emerald': 'from-green-600 to-emerald-600',
    'slate-gray': 'from-slate-600 to-gray-600',
  };

  const Icon = iconMap[template.icon] || LayoutDashboard;
  const gradient = colorMap[template.color_scheme] || 'from-violet-600 to-fuchsia-600';

  return (
    <div
      onClick={onSelect}
      className="bg-slate-800/50 rounded-xl p-5 border border-slate-700/50 hover:border-slate-600/50 transition-all cursor-pointer group"
    >
      <div className="flex items-start justify-between mb-4">
        <div className={`w-12 h-12 bg-gradient-to-br ${gradient} rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform`}>
          <Icon className="w-6 h-6 text-white" />
        </div>
        {template.featured && (
          <span className="px-2 py-1 bg-yellow-500/20 text-yellow-300 text-xs font-medium rounded">
            Featured
          </span>
        )}
      </div>

      <h4 className="text-lg font-semibold text-white mb-2">{template.name}</h4>
      <p className="text-sm text-slate-400 mb-4 line-clamp-2">{template.description}</p>

      {template.required_sources.length > 0 && (
        <div>
          <p className="text-xs text-slate-500 mb-2">Recommended sources:</p>
          <div className="flex flex-wrap gap-1">
            {template.required_sources.slice(0, 3).map((source) => (
              <span
                key={source}
                className="text-xs px-2 py-1 bg-slate-700/50 text-slate-400 rounded"
              >
                {source}
              </span>
            ))}
            {template.required_sources.length > 3 && (
              <span className="text-xs px-2 py-1 bg-slate-700/50 text-slate-400 rounded">
                +{template.required_sources.length - 3} more
              </span>
            )}
          </div>
        </div>
      )}

      <div className="mt-4 pt-4 border-t border-slate-700/50">
        <button className={`w-full px-4 py-2 bg-gradient-to-r ${gradient} hover:opacity-90 text-white rounded-lg transition-all text-sm font-medium flex items-center justify-center gap-2`}>
          <CheckCircle className="w-4 h-4" />
          Use This Template
        </button>
      </div>
    </div>
  );
}

interface DashboardTemplateSelectorProps {
  onSelectTemplate: (templateId: string) => void;
  onClose: () => void;
}

export default function DashboardTemplateSelector({
  onSelectTemplate,
  onClose,
}: DashboardTemplateSelectorProps) {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  useEffect(() => {
    loadTemplates();
  }, []);

  async function loadTemplates() {
    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('dashboard_templates')
        .select('*')
        .order('featured', { ascending: false })
        .order('name');

      if (fetchError) throw fetchError;
      setTemplates(data || []);
    } catch (err: any) {
      console.error('Error loading templates:', err);
      setError('Failed to load templates');
    } finally {
      setLoading(false);
    }
  }

  const categories = ['all', ...new Set(templates.map(t => t.category))];
  const filteredTemplates = selectedCategory === 'all'
    ? templates
    : templates.filter(t => t.category === selectedCategory);

  return (
    <div
      className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-slate-900 rounded-2xl border border-slate-700 max-w-6xl w-full max-h-[90vh] overflow-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-slate-900 border-b border-slate-700 p-6 z-10">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-2xl font-bold text-white">Dashboard Templates</h2>
              <p className="text-slate-400 text-sm mt-1">
                Choose a pre-built template to get started quickly
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-slate-400" />
            </button>
          </div>

          <div className="flex gap-2 overflow-x-auto pb-2">
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`px-4 py-2 rounded-lg font-medium transition-all whitespace-nowrap ${
                  selectedCategory === category
                    ? 'bg-violet-600 text-white'
                    : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                }`}
              >
                {category.charAt(0).toUpperCase() + category.slice(1)}
              </button>
            ))}
          </div>
        </div>

        <div className="p-6">
          {loading ? (
            <div className="text-center py-12">
              <Loader className="w-8 h-8 animate-spin mx-auto mb-3 text-violet-400" />
              <p className="text-slate-400">Loading templates...</p>
            </div>
          ) : error ? (
            <div className="p-6 bg-red-900/20 border border-red-500/30 rounded-xl flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-red-400 font-medium">Error</p>
                <p className="text-red-300 text-sm mt-1">{error}</p>
              </div>
            </div>
          ) : filteredTemplates.length === 0 ? (
            <div className="text-center py-12">
              <LayoutDashboard className="w-16 h-16 mx-auto mb-4 text-slate-600" />
              <p className="text-slate-400">No templates found in this category</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredTemplates.map((template) => (
                <TemplateCard
                  key={template.id}
                  template={template}
                  onSelect={() => onSelectTemplate(template.id)}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
