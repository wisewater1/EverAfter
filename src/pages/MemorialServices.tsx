import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import {
  Heart,
  MapPin,
  Calendar,
  Users,
  Camera,
  Music,
  Flower2,
  BookOpen,
  Phone,
  Mail,
  Clock,
  DollarSign,
  CheckCircle2,
  Star,
  ArrowLeft,
  FileText,
  Upload,
  Download,
  Share2,
  MessageCircle,
  ChevronRight,
  Building2,
  Church,
  Sparkles,
  Shield,
  Lock,
  Globe
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface ServiceProvider {
  id: string;
  name: string;
  type: 'funeral_home' | 'cemetery' | 'cremation' | 'memorial' | 'florist' | 'caterer';
  description: string;
  location: string;
  rating: number;
  reviews: number;
  price_range: string;
  features: string[];
  phone: string;
  email: string;
  website: string;
}

interface MemorialPlan {
  id: string;
  user_id: string;
  service_type: string;
  provider_id?: string;
  preferences: any;
  budget: number;
  status: 'planning' | 'confirmed' | 'completed';
  created_at: string;
  updated_at: string;
}

export default function MemorialServices() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'explore' | 'planning' | 'documents'>('explore');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [plans, setPlans] = useState<MemorialPlan[]>([]);
  const [loading, setLoading] = useState(true);

  const serviceCategories = [
    { id: 'all', name: 'All Services', icon: Building2 },
    { id: 'funeral_home', name: 'Funeral Homes', icon: Church },
    { id: 'cemetery', name: 'Cemeteries', icon: MapPin },
    { id: 'cremation', name: 'Cremation', icon: Sparkles },
    { id: 'memorial', name: 'Memorial Services', icon: Heart },
    { id: 'florist', name: 'Florists', icon: Flower2 },
  ];

  const featuredProviders: ServiceProvider[] = [
    {
      id: '1',
      name: 'Peaceful Rest Funeral Home',
      type: 'funeral_home',
      description: 'Full-service funeral home with 50+ years of compassionate care',
      location: 'San Francisco, CA',
      rating: 4.9,
      reviews: 247,
      price_range: '$3,000 - $8,000',
      features: ['24/7 Availability', 'Pre-Planning', 'Cremation Services', 'Memorial Programs'],
      phone: '(555) 123-4567',
      email: 'info@peacefulrest.com',
      website: 'peacefulrest.com'
    },
    {
      id: '2',
      name: 'Eternal Gardens Cemetery',
      type: 'cemetery',
      description: 'Serene memorial park with beautiful landscape and personalized monuments',
      location: 'Oakland, CA',
      rating: 4.8,
      reviews: 189,
      price_range: '$2,500 - $12,000',
      features: ['Traditional Burial', 'Green Burial', 'Cremation Gardens', 'Veterans Section'],
      phone: '(555) 234-5678',
      email: 'contact@eternalgardens.com',
      website: 'eternalgardens.com'
    },
    {
      id: '3',
      name: 'Serenity Cremation Services',
      type: 'cremation',
      description: 'Affordable and dignified cremation with personalized memorial options',
      location: 'San Jose, CA',
      rating: 4.9,
      reviews: 312,
      price_range: '$1,500 - $4,000',
      features: ['Direct Cremation', 'Memorial Services', 'Urn Selection', 'Ash Scattering'],
      phone: '(555) 345-6789',
      email: 'info@serenitycremation.com',
      website: 'serenitycremation.com'
    },
    {
      id: '4',
      name: 'Heritage Memorial Chapel',
      type: 'memorial',
      description: 'Beautiful venue for celebration of life ceremonies and memorial services',
      location: 'Berkeley, CA',
      rating: 4.7,
      reviews: 156,
      price_range: '$500 - $3,000',
      features: ['Indoor Chapel', 'Outdoor Garden', 'Audio/Visual', 'Catering Services'],
      phone: '(555) 456-7890',
      email: 'events@heritagememorial.com',
      website: 'heritagememorial.com'
    },
    {
      id: '5',
      name: 'Blooming Memories Florist',
      type: 'florist',
      description: 'Specialized in sympathy arrangements and funeral flowers',
      location: 'Palo Alto, CA',
      rating: 4.9,
      reviews: 428,
      price_range: '$75 - $500',
      features: ['Same-Day Delivery', 'Custom Arrangements', 'Standing Sprays', 'Casket Flowers'],
      phone: '(555) 567-8901',
      email: 'orders@bloomingmemories.com',
      website: 'bloomingmemories.com'
    }
  ];

  useEffect(() => {
    if (user) {
      fetchPlans();
    }
  }, [user]);

  const fetchPlans = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('memorial_plans')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPlans(data || []);
    } catch (error) {
      console.error('Error fetching plans:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredProviders = selectedCategory === 'all'
    ? featuredProviders
    : featuredProviders.filter(p => p.type === selectedCategory);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <button
          onClick={() => navigate('/legacy-vault')}
          className="mb-6 flex items-center gap-2 text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Legacy Vault
        </button>

        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border border-cyan-500/30 flex items-center justify-center">
              <Heart className="w-8 h-8 text-cyan-400" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white mb-1">Memorial Services Network</h1>
              <p className="text-slate-400">Comprehensive memorial and funeral service coordination</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="p-4 rounded-xl bg-gradient-to-br from-white/5 to-white/[0.02] border border-white/10">
              <div className="flex items-center gap-3 mb-2">
                <Shield className="w-5 h-5 text-teal-400" />
                <span className="text-sm text-slate-400">Verified Providers</span>
              </div>
              <p className="text-2xl font-bold text-white">500+</p>
            </div>
            <div className="p-4 rounded-xl bg-gradient-to-br from-white/5 to-white/[0.02] border border-white/10">
              <div className="flex items-center gap-3 mb-2">
                <Users className="w-5 h-5 text-cyan-400" />
                <span className="text-sm text-slate-400">Families Served</span>
              </div>
              <p className="text-2xl font-bold text-white">50,000+</p>
            </div>
            <div className="p-4 rounded-xl bg-gradient-to-br from-white/5 to-white/[0.02] border border-white/10">
              <div className="flex items-center gap-3 mb-2">
                <Star className="w-5 h-5 text-amber-400" />
                <span className="text-sm text-slate-400">Average Rating</span>
              </div>
              <p className="text-2xl font-bold text-white">4.8</p>
            </div>
            <div className="p-4 rounded-xl bg-gradient-to-br from-white/5 to-white/[0.02] border border-white/10">
              <div className="flex items-center gap-3 mb-2">
                <Lock className="w-5 h-5 text-emerald-400" />
                <span className="text-sm text-slate-400">Secure Platform</span>
              </div>
              <p className="text-2xl font-bold text-white">100%</p>
            </div>
          </div>
        </div>

        <div className="mb-6 flex gap-2 border-b border-white/10">
          {[
            { id: 'explore', label: 'Explore Services', icon: Building2 },
            { id: 'planning', label: 'My Plans', icon: FileText },
            { id: 'documents', label: 'Documents', icon: Upload }
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-4 py-3 font-medium transition-all ${
                  activeTab === tab.id
                    ? 'text-teal-400 border-b-2 border-teal-400'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {activeTab === 'explore' && (
          <div className="space-y-6">
            <div className="flex gap-2 overflow-x-auto pb-2">
              {serviceCategories.map((category) => {
                const Icon = category.icon;
                return (
                  <button
                    key={category.id}
                    onClick={() => setSelectedCategory(category.id)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium whitespace-nowrap transition-all ${
                      selectedCategory === category.id
                        ? 'bg-gradient-to-r from-teal-600 to-cyan-600 text-white'
                        : 'bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {category.name}
                  </button>
                );
              })}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {filteredProviders.map((provider) => (
                <div
                  key={provider.id}
                  className="group p-6 rounded-2xl bg-gradient-to-br from-white/5 to-white/[0.02] border border-white/10 hover:border-teal-500/30 transition-all"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-xl font-bold text-white mb-1">{provider.name}</h3>
                      <div className="flex items-center gap-2 text-sm text-slate-400 mb-2">
                        <MapPin className="w-4 h-4" />
                        {provider.location}
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1">
                          {[...Array(5)].map((_, i) => (
                            <Star
                              key={i}
                              className={`w-4 h-4 ${
                                i < Math.floor(provider.rating)
                                  ? 'text-amber-400 fill-amber-400'
                                  : 'text-slate-600'
                              }`}
                            />
                          ))}
                        </div>
                        <span className="text-sm text-slate-400">
                          {provider.rating} ({provider.reviews} reviews)
                        </span>
                      </div>
                    </div>
                    <span className="px-3 py-1 rounded-lg bg-emerald-500/20 text-emerald-400 text-xs font-medium border border-emerald-500/30">
                      Verified
                    </span>
                  </div>

                  <p className="text-slate-300 text-sm mb-4">{provider.description}</p>

                  <div className="grid grid-cols-2 gap-2 mb-4">
                    {provider.features.map((feature, index) => (
                      <div key={index} className="flex items-center gap-2 text-sm">
                        <CheckCircle2 className="w-4 h-4 text-teal-400 flex-shrink-0" />
                        <span className="text-slate-300">{feature}</span>
                      </div>
                    ))}
                  </div>

                  <div className="flex items-center justify-between mb-4 pb-4 border-b border-white/10">
                    <div className="flex items-center gap-2 text-sm">
                      <DollarSign className="w-4 h-4 text-slate-400" />
                      <span className="text-white font-medium">{provider.price_range}</span>
                    </div>
                    <div className="flex items-center gap-3 text-slate-400">
                      <button className="hover:text-teal-400 transition-colors">
                        <Phone className="w-4 h-4" />
                      </button>
                      <button className="hover:text-teal-400 transition-colors">
                        <Mail className="w-4 h-4" />
                      </button>
                      <button className="hover:text-teal-400 transition-colors">
                        <Globe className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <button className="flex-1 px-4 py-2 rounded-xl bg-gradient-to-r from-teal-600 to-cyan-600 text-white font-medium hover:opacity-90 transition-all flex items-center justify-center gap-2">
                      <MessageCircle className="w-4 h-4" />
                      Contact
                    </button>
                    <button className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-medium transition-all flex items-center gap-2">
                      View Details
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'planning' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold text-white mb-1">My Memorial Plans</h2>
                <p className="text-slate-400">Manage and organize your memorial service preferences</p>
              </div>
              <button className="px-6 py-3 rounded-xl bg-gradient-to-r from-teal-600 to-cyan-600 text-white font-medium hover:opacity-90 transition-all flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Create New Plan
              </button>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="w-8 h-8 border-4 border-teal-400 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : plans.length === 0 ? (
              <div className="text-center py-12 p-8 rounded-2xl bg-gradient-to-br from-white/5 to-white/[0.02] border border-white/10">
                <FileText className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-white mb-2">No Plans Yet</h3>
                <p className="text-slate-400 mb-6 max-w-md mx-auto">
                  Start planning your memorial services to ensure your wishes are honored.
                </p>
                <button className="px-6 py-3 rounded-xl bg-gradient-to-r from-teal-600 to-cyan-600 text-white font-medium hover:opacity-90 transition-all">
                  Create Your First Plan
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {plans.map((plan) => (
                  <div
                    key={plan.id}
                    className="p-6 rounded-2xl bg-gradient-to-br from-white/5 to-white/[0.02] border border-white/10 hover:border-teal-500/30 transition-all"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-bold text-white">{plan.service_type}</h3>
                      <span className={`px-3 py-1 rounded-lg text-xs font-medium ${
                        plan.status === 'confirmed'
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          : plan.status === 'planning'
                          ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                          : 'bg-slate-500/20 text-slate-400 border border-slate-500/30'
                      }`}>
                        {plan.status}
                      </span>
                    </div>
                    <p className="text-slate-400 text-sm mb-4">
                      Budget: ${plan.budget.toLocaleString()}
                    </p>
                    <button className="w-full px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-medium transition-all flex items-center justify-center gap-2">
                      View Plan
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'documents' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold text-white mb-1">Important Documents</h2>
                <p className="text-slate-400">Upload and manage memorial-related documents</p>
              </div>
              <button className="px-6 py-3 rounded-xl bg-gradient-to-r from-teal-600 to-cyan-600 text-white font-medium hover:opacity-90 transition-all flex items-center gap-2">
                <Upload className="w-5 h-5" />
                Upload Document
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                { name: 'Pre-Need Contract', icon: FileText, status: 'Uploaded' },
                { name: 'Cemetery Deed', icon: MapPin, status: 'Pending' },
                { name: 'Service Preferences', icon: Heart, status: 'Uploaded' },
                { name: 'Obituary Draft', icon: BookOpen, status: 'Uploaded' },
                { name: 'Music Selections', icon: Music, status: 'Pending' },
                { name: 'Photo Collection', icon: Camera, status: 'Uploaded' }
              ].map((doc, index) => {
                const Icon = doc.icon;
                return (
                  <div
                    key={index}
                    className="p-5 rounded-2xl bg-gradient-to-br from-white/5 to-white/[0.02] border border-white/10 hover:border-teal-500/30 transition-all"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center">
                        <Icon className="w-6 h-6 text-teal-400" />
                      </div>
                      <span className={`px-2 py-1 rounded-lg text-xs font-medium ${
                        doc.status === 'Uploaded'
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                      }`}>
                        {doc.status}
                      </span>
                    </div>
                    <h3 className="text-white font-semibold mb-2">{doc.name}</h3>
                    <div className="flex gap-2">
                      <button className="flex-1 px-3 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white text-sm transition-all flex items-center justify-center gap-2">
                        <Download className="w-4 h-4" />
                        Download
                      </button>
                      <button className="px-3 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-slate-400 hover:text-white text-sm transition-all">
                        <Share2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
