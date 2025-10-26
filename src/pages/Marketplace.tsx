import React, { useState, useEffect } from 'react';
import { ShoppingCart, Star, Check, Brain, Sparkles, TrendingUp, Filter, Search, X, Loader } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';

interface MarketplaceTemplate {
  id: string;
  name: string;
  title: string;
  description: string;
  category: string;
  creator_name: string;
  creator_badge: string;
  price_usd: number;
  personality_traits: {
    expertise?: string[];
    style?: string;
    tone?: string;
  };
  sample_conversations: Array<{
    question: string;
    response: string;
  }>;
  avatar_url?: string;
  rating: number;
  total_purchases: number;
  is_featured: boolean;
}

interface Purchase {
  template_id: string;
}

export default function Marketplace() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [templates, setTemplates] = useState<MarketplaceTemplate[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState<MarketplaceTemplate | null>(null);
  const [purchasing, setPurchasing] = useState(false);

  const categories = ['all', 'Finance', 'Wellness', 'Personal Development', 'Career', 'Creativity', 'Relationships'];

  useEffect(() => {
    loadTemplates();
    if (user) {
      loadPurchases();
    }
  }, [user]);

  const loadTemplates = async () => {
    try {
      const { data, error } = await supabase
        .from('marketplace_templates')
        .select('*')
        .eq('is_active', true)
        .order('is_featured', { ascending: false })
        .order('rating', { ascending: false });

      if (error) throw error;
      setTemplates(data || []);
    } catch (error) {
      console.error('Error loading templates:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadPurchases = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('marketplace_purchases')
        .select('template_id')
        .eq('user_id', user.id);

      if (error) throw error;
      setPurchases(data || []);
    } catch (error) {
      console.error('Error loading purchases:', error);
    }
  };

  const handlePurchase = async (template: MarketplaceTemplate) => {
    if (!user) {
      navigate('/login');
      return;
    }

    setPurchasing(true);
    try {
      const { data: stripeData, error: stripeError } = await supabase.functions.invoke('stripe-checkout', {
        body: {
          type: 'marketplace_template',
          template_id: template.id,
          price_usd: template.price_usd,
          success_url: `${window.location.origin}/marketplace?purchase=success&template=${template.id}`,
          cancel_url: `${window.location.origin}/marketplace?purchase=cancelled`,
        },
      });

      if (stripeError) throw stripeError;

      if (stripeData?.url) {
        window.location.href = stripeData.url;
      }
    } catch (error) {
      console.error('Error initiating purchase:', error);
      alert('Failed to start purchase. Please try again.');
    } finally {
      setPurchasing(false);
    }
  };

  const handleAddToEngrams = async (template: MarketplaceTemplate) => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('archetypal_ais')
        .insert({
          user_id: user.id,
          name: template.title,
          description: template.description,
          training_status: 'training',
          ai_readiness_score: 50,
          avatar_url: template.avatar_url,
        })
        .select()
        .single();

      if (error) throw error;

      await supabase
        .from('marketplace_purchases')
        .update({ cloned_engram_id: data.id })
        .eq('user_id', user.id)
        .eq('template_id', template.id);

      alert(`${template.title} has been added to your Engrams! Start training by answering questions.`);
      navigate('/dashboard');
    } catch (error) {
      console.error('Error adding template to engrams:', error);
      alert('Failed to add to engrams. Please try again.');
    }
  };

  const isPurchased = (templateId: string) => {
    return purchases.some(p => p.template_id === templateId);
  };

  const filteredTemplates = templates.filter(template => {
    const matchesCategory = selectedCategory === 'all' || template.category === selectedCategory;
    const matchesSearch = searchQuery === '' ||
      template.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      template.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      template.category.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const featuredTemplates = filteredTemplates.filter(t => t.is_featured);
  const regularTemplates = filteredTemplates.filter(t => !t.is_featured);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-2 border-slate-700 border-t-sky-500 rounded-full animate-spin"></div>
          <p className="text-slate-400 text-sm">Loading Marketplace...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-14 h-14 bg-gradient-to-br from-amber-500 via-orange-500 to-rose-500 rounded-xl flex items-center justify-center shadow-lg shadow-amber-500/20">
              <ShoppingCart className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-light tracking-tight text-white mb-1">AI Marketplace</h1>
              <p className="text-slate-400 leading-relaxed">
                Discover expert-created AI personalities ready to guide your journey
              </p>
            </div>
          </div>

          {/* Search and Filter Bar */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search templates..."
                className="w-full bg-slate-800/50 border border-slate-700/50 hover:border-slate-600 focus:border-sky-500 rounded-xl pl-12 pr-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20 transition-all"
              />
            </div>
            <div className="flex gap-2 overflow-x-auto scrollbar-hide">
              {categories.map((category) => (
                <button
                  key={category}
                  onClick={() => setSelectedCategory(category)}
                  className={`px-4 py-2.5 rounded-xl font-medium transition-all whitespace-nowrap flex items-center gap-2 ${
                    selectedCategory === category
                      ? 'bg-sky-600 text-white shadow-lg shadow-sky-500/20'
                      : 'bg-slate-800/50 border border-slate-700/50 text-slate-300 hover:bg-slate-800 hover:border-slate-600'
                  }`}
                >
                  {category === 'all' && <Filter className="w-4 h-4" />}
                  {category.charAt(0).toUpperCase() + category.slice(1)}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Featured Section */}
        {featuredTemplates.length > 0 && (
          <div className="mb-12">
            <div className="flex items-center gap-3 mb-6">
              <Sparkles className="w-5 h-5 text-amber-400" />
              <h2 className="text-xl font-medium text-white">Featured Templates</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {featuredTemplates.map((template) => (
                <TemplateCard
                  key={template.id}
                  template={template}
                  isPurchased={isPurchased(template.id)}
                  onPurchase={handlePurchase}
                  onAddToEngrams={handleAddToEngrams}
                  onViewDetails={setSelectedTemplate}
                  purchasing={purchasing}
                />
              ))}
            </div>
          </div>
        )}

        {/* All Templates */}
        {regularTemplates.length > 0 && (
          <div>
            <div className="flex items-center gap-3 mb-6">
              <TrendingUp className="w-5 h-5 text-sky-400" />
              <h2 className="text-xl font-medium text-white">All Templates</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {regularTemplates.map((template) => (
                <TemplateCard
                  key={template.id}
                  template={template}
                  isPurchased={isPurchased(template.id)}
                  onPurchase={handlePurchase}
                  onAddToEngrams={handleAddToEngrams}
                  onViewDetails={setSelectedTemplate}
                  purchasing={purchasing}
                />
              ))}
            </div>
          </div>
        )}

        {filteredTemplates.length === 0 && (
          <div className="text-center py-16">
            <div className="w-16 h-16 bg-slate-800/50 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Search className="w-8 h-8 text-slate-600" />
            </div>
            <h3 className="text-xl font-medium text-white mb-2">No templates found</h3>
            <p className="text-slate-400">Try adjusting your search or filter criteria</p>
          </div>
        )}
      </div>

      {/* Template Details Modal */}
      {selectedTemplate && (
        <TemplateDetailsModal
          template={selectedTemplate}
          isPurchased={isPurchased(selectedTemplate.id)}
          onClose={() => setSelectedTemplate(null)}
          onPurchase={handlePurchase}
          onAddToEngrams={handleAddToEngrams}
          purchasing={purchasing}
        />
      )}
    </div>
  );
}

interface TemplateCardProps {
  template: MarketplaceTemplate;
  isPurchased: boolean;
  onPurchase: (template: MarketplaceTemplate) => void;
  onAddToEngrams: (template: MarketplaceTemplate) => void;
  onViewDetails: (template: MarketplaceTemplate) => void;
  purchasing: boolean;
}

function TemplateCard({ template, isPurchased, onPurchase, onAddToEngrams, onViewDetails, purchasing }: TemplateCardProps) {
  return (
    <div className="group bg-gradient-to-br from-slate-800/40 to-slate-900/40 backdrop-blur-xl rounded-2xl border border-slate-700/50 hover:border-slate-600/50 p-6 shadow-xl transition-all duration-300">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl flex items-center justify-center shadow-lg">
            {template.avatar_url ? (
              <img src={template.avatar_url} alt={template.title} className="w-full h-full object-cover rounded-xl" />
            ) : (
              <Brain className="w-6 h-6 text-white" />
            )}
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-medium text-white mb-0.5">{template.title}</h3>
            <p className="text-xs text-slate-400">{template.creator_name}</p>
          </div>
        </div>
        {template.is_featured && (
          <div className="px-2 py-1 bg-amber-500/10 rounded-lg border border-amber-500/20">
            <Sparkles className="w-4 h-4 text-amber-400" />
          </div>
        )}
      </div>

      {/* Category Badge */}
      <div className="flex items-center gap-2 mb-3">
        <span className="px-2.5 py-1 bg-slate-700/50 border border-slate-600/50 text-slate-300 text-xs rounded-lg">
          {template.category}
        </span>
        {template.creator_badge && (
          <span className="px-2.5 py-1 bg-emerald-500/10 text-emerald-400 text-xs rounded-lg border border-emerald-500/20 flex items-center gap-1">
            <Check className="w-3 h-3" />
            {template.creator_badge}
          </span>
        )}
      </div>

      {/* Description */}
      <p className="text-sm text-slate-300 mb-4 leading-relaxed line-clamp-3">{template.description}</p>

      {/* Rating and Purchases */}
      <div className="flex items-center gap-4 mb-4 pb-4 border-b border-slate-700/50">
        <div className="flex items-center gap-1">
          <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
          <span className="text-sm font-medium text-white">{template.rating.toFixed(1)}</span>
        </div>
        <div className="text-xs text-slate-500">
          {template.total_purchases} purchases
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between">
        <div className="text-2xl font-light text-white">
          ${template.price_usd.toFixed(2)}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => onViewDetails(template)}
            className="px-3 py-2 bg-slate-700/50 hover:bg-slate-700 border border-slate-600/50 hover:border-slate-600 text-slate-300 hover:text-white rounded-lg transition-all text-sm font-medium"
          >
            Details
          </button>
          {isPurchased ? (
            <button
              onClick={() => onAddToEngrams(template)}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-all text-sm font-medium shadow-lg shadow-emerald-500/20 flex items-center gap-2"
            >
              <Check className="w-4 h-4" />
              Add to Engrams
            </button>
          ) : (
            <button
              onClick={() => onPurchase(template)}
              disabled={purchasing}
              className="px-4 py-2 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-all text-sm font-medium shadow-lg shadow-amber-500/20 flex items-center gap-2"
            >
              {purchasing ? (
                <>
                  <Loader className="w-4 h-4 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <ShoppingCart className="w-4 h-4" />
                  Purchase
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

interface TemplateDetailsModalProps {
  template: MarketplaceTemplate;
  isPurchased: boolean;
  onClose: () => void;
  onPurchase: (template: MarketplaceTemplate) => void;
  onAddToEngrams: (template: MarketplaceTemplate) => void;
  purchasing: boolean;
}

function TemplateDetailsModal({ template, isPurchased, onClose, onPurchase, onAddToEngrams, purchasing }: TemplateDetailsModalProps) {
  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center z-50 p-4">
      <div className="bg-gradient-to-br from-slate-800/95 to-slate-900/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-slate-700/50 max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-slate-900/95 backdrop-blur-xl border-b border-slate-700/50 p-6 flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl flex items-center justify-center shadow-lg">
              {template.avatar_url ? (
                <img src={template.avatar_url} alt={template.title} className="w-full h-full object-cover rounded-xl" />
              ) : (
                <Brain className="w-8 h-8 text-white" />
              )}
            </div>
            <div>
              <h2 className="text-2xl font-light text-white mb-1">{template.title}</h2>
              <p className="text-sm text-slate-400">{template.creator_name}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-800 rounded-lg transition-all"
          >
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Description */}
          <div>
            <h3 className="text-lg font-medium text-white mb-3">About This AI</h3>
            <p className="text-slate-300 leading-relaxed">{template.description}</p>
          </div>

          {/* Expertise */}
          {template.personality_traits.expertise && (
            <div>
              <h3 className="text-lg font-medium text-white mb-3">Areas of Expertise</h3>
              <div className="flex flex-wrap gap-2">
                {template.personality_traits.expertise.map((item, index) => (
                  <span
                    key={index}
                    className="px-3 py-1.5 bg-slate-700/50 border border-slate-600/50 text-slate-300 text-sm rounded-lg"
                  >
                    {item}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Sample Conversation */}
          {template.sample_conversations.length > 0 && (
            <div>
              <h3 className="text-lg font-medium text-white mb-3">Sample Conversation</h3>
              <div className="space-y-3">
                {template.sample_conversations.map((conv, index) => (
                  <div key={index} className="space-y-2">
                    <div className="bg-slate-700/30 rounded-xl p-4 border border-slate-600/30">
                      <p className="text-sm text-slate-400 mb-1">You:</p>
                      <p className="text-white">{conv.question}</p>
                    </div>
                    <div className="bg-amber-500/10 rounded-xl p-4 border border-amber-500/20">
                      <p className="text-sm text-amber-400 mb-1">{template.title}:</p>
                      <p className="text-slate-200">{conv.response}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Traits */}
          <div className="grid grid-cols-2 gap-4">
            {template.personality_traits.style && (
              <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
                <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">Style</p>
                <p className="text-white capitalize">{template.personality_traits.style}</p>
              </div>
            )}
            {template.personality_traits.tone && (
              <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
                <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">Tone</p>
                <p className="text-white capitalize">{template.personality_traits.tone}</p>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-slate-900/95 backdrop-blur-xl border-t border-slate-700/50 p-6 flex items-center justify-between">
          <div className="text-3xl font-light text-white">
            ${template.price_usd.toFixed(2)}
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-6 py-3 bg-slate-700/50 hover:bg-slate-700 border border-slate-600/50 hover:border-slate-600 text-slate-300 hover:text-white rounded-xl transition-all font-medium"
            >
              Close
            </button>
            {isPurchased ? (
              <button
                onClick={() => onAddToEngrams(template)}
                className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl transition-all font-medium shadow-lg shadow-emerald-500/20 flex items-center gap-2"
              >
                <Check className="w-5 h-5" />
                Add to My Engrams
              </button>
            ) : (
              <button
                onClick={() => onPurchase(template)}
                disabled={purchasing}
                className="px-6 py-3 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl transition-all font-medium shadow-lg shadow-amber-500/20 flex items-center gap-2"
              >
                {purchasing ? (
                  <>
                    <Loader className="w-5 h-5 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <ShoppingCart className="w-5 h-5" />
                    Purchase Now
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
