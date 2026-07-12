import { notify } from '../lib/dialogs';
import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { createDemoId, readDemoStorage, writeDemoStorage } from '../lib/demo-storage';
import { listUserFiles, uploadFile, getFileUrl, type UserFile } from '../lib/file-storage';
import {
  Heart,
  Star,
  Users,
  ArrowLeft,
  FileText,
  Upload,
  Download,
  Share2,
  ChevronRight,
  Building2,
  Shield,
  Lock,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';


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

const DEMO_MEMORIAL_PLANS_KEY = 'everafter_demo_memorial_plans';

function formatServiceType(serviceType: string): string {
  return serviceType
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}


export default function MemorialServices() {
  const { user, isDemoMode } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'explore' | 'planning' | 'documents'>('explore');
  const [selectedCategory] = useState<string>('all');
  const [plans, setPlans] = useState<MemorialPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPlan, setSelectedPlan] = useState<MemorialPlan | null>(null);
  const [documents, setDocuments] = useState<UserFile[]>([]);
  const [documentsLoading, setDocumentsLoading] = useState(false);
  const [uploadingDocument, setUploadingDocument] = useState(false);
  const [documentActionId, setDocumentActionId] = useState<string | null>(null);
  const [documentNotice, setDocumentNotice] = useState<{ tone: 'success' | 'error'; message: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);



  useEffect(() => {
    if (user) {
      fetchPlans();
    }
  }, [isDemoMode, user]);

  const fetchPlans = async () => {
    if (!user) return;

    setLoading(true);
    try {
      if (isDemoMode) {
        setPlans(readDemoStorage<MemorialPlan[]>(DEMO_MEMORIAL_PLANS_KEY, []));
        return;
      }

      const { data, error } = await supabase
        .from('memorial_plans')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPlans(data || []);
    } catch (error) {
      console.warn('Error fetching plans:', error);
      setPlans([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user && !isDemoMode && activeTab === 'documents') {
      void fetchDocuments();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, isDemoMode, activeTab]);

  const fetchDocuments = async () => {
    setDocumentsLoading(true);
    try {
      const files = await listUserFiles('memorial');
      setDocuments(files);
    } catch (error) {
      console.warn('Error fetching memorial documents:', error);
      setDocumentNotice({
        tone: 'error',
        message: 'We could not load your documents just now. Please try again in a moment.',
      });
    } finally {
      setDocumentsLoading(false);
    }
  };

  const handleUploadClick = () => {
    if (!user) {
      navigate('/login');
      return;
    }
    if (isDemoMode) {
      setDocumentNotice({
        tone: 'error',
        message: 'Demo mode does not store documents. Sign in with a full account to keep them safe here.',
      });
      return;
    }
    fileInputRef.current?.click();
  };

  const handleFileSelected = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    setUploadingDocument(true);
    setDocumentNotice(null);
    try {
      await uploadFile(file, { category: 'memorial', description: 'Memorial planning document' });
      await fetchDocuments();
      setDocumentNotice({
        tone: 'success',
        message: `"${file.name}" has been safely stored with your memorial documents.`,
      });
    } catch (error) {
      console.warn('Error uploading memorial document:', error);
      setDocumentNotice({
        tone: 'error',
        message: 'We could not store that document just now. Please try again in a moment.',
      });
    } finally {
      setUploadingDocument(false);
    }
  };

  const handleDownloadDocument = async (file: UserFile) => {
    setDocumentActionId(file.id);
    try {
      const url = await getFileUrl(file.id);
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch (error) {
      console.warn('Error downloading memorial document:', error);
      setDocumentNotice({
        tone: 'error',
        message: 'We could not open that document just now. Please try again in a moment.',
      });
    } finally {
      setDocumentActionId(null);
    }
  };

  const handleShareDocument = async (file: UserFile) => {
    setDocumentActionId(file.id);
    try {
      const url = await getFileUrl(file.id, 3600);
      await navigator.clipboard.writeText(url);
      setDocumentNotice({
        tone: 'success',
        message: 'A secure sharing link was copied to your clipboard. It stays valid for one hour.',
      });
    } catch (error) {
      console.warn('Error sharing memorial document:', error);
      setDocumentNotice({
        tone: 'error',
        message: 'We could not create a sharing link just now. Please try again in a moment.',
      });
    } finally {
      setDocumentActionId(null);
    }
  };

  const createPlan = async (serviceType: string) => {
    if (!user) {
      navigate('/login');
      return;
    }

    const normalizedType = serviceType === 'all' ? 'memorial' : serviceType;

    try {
      if (isDemoMode) {
        const nextPlans = writeDemoStorage(DEMO_MEMORIAL_PLANS_KEY, [
          {
            id: createDemoId('memorial-plan'),
            user_id: user.id,
            service_type: normalizedType,
            preferences: {
              category: normalizedType,
              mode: 'demo',
            },
            budget: 5000,
            status: 'planning' as const,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
          ...readDemoStorage<MemorialPlan[]>(DEMO_MEMORIAL_PLANS_KEY, []),
        ]);

        setPlans(nextPlans);
        setActiveTab('planning');
        return;
      }

      const { error } = await supabase.from('memorial_plans').insert({
        user_id: user.id,
        service_type: normalizedType,
        preferences: { category: normalizedType },
        budget: 5000,
        status: 'planning',
      });

      if (error) throw error;

      await fetchPlans();
      setActiveTab('planning');
    } catch (error) {
      console.warn('Error creating memorial plan:', error);
      notify('Unable to create a memorial plan right now.', 'error');
    }
  };


  return (
    <div className="min-h-[100dvh] bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
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
                <span className="text-sm text-slate-400">Provider Care</span>
              </div>
              <p className="text-lg font-bold text-white">Thoughtfully curated</p>
            </div>
            <div className="p-4 rounded-xl bg-gradient-to-br from-white/5 to-white/[0.02] border border-white/10">
              <div className="flex items-center gap-3 mb-2">
                <Users className="w-5 h-5 text-cyan-400" />
                <span className="text-sm text-slate-400">Family Support</span>
              </div>
              <p className="text-lg font-bold text-white">At your own pace</p>
            </div>
            <div className="p-4 rounded-xl bg-gradient-to-br from-white/5 to-white/[0.02] border border-white/10">
              <div className="flex items-center gap-3 mb-2">
                <Star className="w-5 h-5 text-amber-400" />
                <span className="text-sm text-slate-400">Service Quality</span>
              </div>
              <p className="text-lg font-bold text-white">Chosen for dignity</p>
            </div>
            <div className="p-4 rounded-xl bg-gradient-to-br from-white/5 to-white/[0.02] border border-white/10">
              <div className="flex items-center gap-3 mb-2">
                <Lock className="w-5 h-5 text-emerald-400" />
                <span className="text-sm text-slate-400">Your Information</span>
              </div>
              <p className="text-lg font-bold text-white">Private by design</p>
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
          <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-white/5 to-white/[0.02] p-10 text-center">
            <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-white/5">
              <Building2 className="h-10 w-10 text-teal-400" />
            </div>
            <h2 className="mb-3 text-2xl font-bold text-white">Provider directory coming with verified partners</h2>
            <p className="mx-auto mb-2 max-w-xl leading-relaxed text-slate-400">
              We only list funeral homes, cemeteries, and memorial vendors we have actually
              partnered with and verified — and those partnerships aren't live yet, so there is
              no directory to browse today.
            </p>
            <p className="mx-auto mb-8 max-w-xl text-sm text-slate-500">
              Everything else here is fully working: build your memorial plans and store the
              documents your family will need.
            </p>
            <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
              <button
                onClick={() => setActiveTab('planning')}
                className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-teal-600 to-cyan-600 px-6 py-3 font-medium text-white transition-all hover:opacity-90"
              >
                <FileText className="h-5 w-5" />
                Plan a Memorial
              </button>
              <button
                onClick={() => setActiveTab('documents')}
                className="flex items-center gap-2 rounded-xl bg-white/10 px-6 py-3 font-medium text-white transition-all hover:bg-white/20"
              >
                <ChevronRight className="h-5 w-5" />
                Store Documents
              </button>
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
              <button
                onClick={() => createPlan(selectedCategory)}
                className="px-6 py-3 rounded-xl bg-gradient-to-r from-teal-600 to-cyan-600 text-white font-medium hover:opacity-90 transition-all flex items-center gap-2"
              >
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
                <button
                  onClick={() => createPlan(selectedCategory)}
                  className="px-6 py-3 rounded-xl bg-gradient-to-r from-teal-600 to-cyan-600 text-white font-medium hover:opacity-90 transition-all"
                >
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
                    <button
                      onClick={() => setSelectedPlan(plan)}
                      className="w-full px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-medium transition-all flex items-center justify-center gap-2"
                    >
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
              <button
                onClick={handleUploadClick}
                disabled={uploadingDocument}
                className="min-h-11 px-6 py-3 rounded-xl bg-gradient-to-r from-teal-600 to-cyan-600 text-white font-medium hover:opacity-90 transition-all flex items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400/60 disabled:opacity-60"
              >
                <Upload className="w-5 h-5" />
                {uploadingDocument ? 'Uploading...' : 'Upload Document'}
              </button>
            </div>

            <input ref={fileInputRef} type="file" onChange={handleFileSelected} className="hidden" />

            {documentNotice && (
              <div className={`rounded-xl px-4 py-3 text-sm border ${
                documentNotice.tone === 'success'
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-200'
                  : 'bg-rose-500/10 border-rose-500/30 text-rose-200'
              }`}>
                {documentNotice.message}
              </div>
            )}

            {documentsLoading ? (
              <div className="flex items-center justify-center py-16 text-slate-400">
                <div className="w-6 h-6 border-2 border-teal-400 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : documents.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
                <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4">
                  <FileText className="w-8 h-8 text-slate-400" />
                </div>
                <h3 className="text-lg font-semibold text-white mb-1">No documents yet</h3>
                <p className="text-slate-400 max-w-md">
                  Keep pre-need contracts, service preferences, and other memorial documents together in one secure place.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {documents.map((file) => (
                  <div
                    key={file.id}
                    className="p-5 rounded-2xl bg-gradient-to-br from-white/5 to-white/[0.02] border border-white/10 hover:border-teal-500/30 transition-all"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center">
                        <FileText className="w-6 h-6 text-teal-400" />
                      </div>
                      <span className="px-2 py-1 rounded-lg text-xs font-medium bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                        Stored
                      </span>
                    </div>
                    <h3 className="text-white font-semibold mb-2 truncate" title={file.file_name}>{file.file_name}</h3>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleDownloadDocument(file)}
                        disabled={documentActionId === file.id}
                        className="flex-1 min-h-11 px-3 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white text-sm transition-all flex items-center justify-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400/60 disabled:opacity-60"
                      >
                        <Download className="w-4 h-4" />
                        Download
                      </button>
                      <button
                        onClick={() => handleShareDocument(file)}
                        disabled={documentActionId === file.id}
                        aria-label={`Copy a secure sharing link for ${file.file_name}`}
                        className="min-h-11 min-w-11 px-3 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-slate-400 hover:text-white text-sm transition-all flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400/60 disabled:opacity-60"
                      >
                        <Share2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {selectedPlan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={() => setSelectedPlan(null)}>
          <div
            role="dialog"
            aria-modal="true"
            aria-label={`Memorial plan: ${formatServiceType(selectedPlan.service_type)}`}
            className="w-full max-w-md rounded-2xl border border-white/10 bg-slate-900 p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-start justify-between">
              <div>
                <h3 className="text-xl font-bold text-white">{formatServiceType(selectedPlan.service_type)}</h3>
                <p className="text-xs text-slate-500">Created {new Date(selectedPlan.created_at).toLocaleDateString()}</p>
              </div>
              <span className={`rounded-lg px-3 py-1 text-xs font-medium ${
                selectedPlan.status === 'confirmed'
                  ? 'border border-emerald-500/30 bg-emerald-500/20 text-emerald-400'
                  : selectedPlan.status === 'planning'
                  ? 'border border-amber-500/30 bg-amber-500/20 text-amber-400'
                  : 'border border-slate-500/30 bg-slate-500/20 text-slate-400'
              }`}>
                {selectedPlan.status}
              </span>
            </div>
            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between rounded-xl bg-white/5 px-4 py-3">
                <span className="text-slate-400">Budget</span>
                <span className="font-medium text-white">${selectedPlan.budget.toLocaleString()}</span>
              </div>
              {selectedPlan.preferences && Object.entries(selectedPlan.preferences as Record<string, unknown>).map(([key, value]) => (
                <div key={key} className="flex items-center justify-between rounded-xl bg-white/5 px-4 py-3">
                  <span className="capitalize text-slate-400">{key.replace(/_/g, ' ')}</span>
                  <span className="font-medium text-white">{String(value)}</span>
                </div>
              ))}
              <p className="text-xs text-slate-500">Last updated {new Date(selectedPlan.updated_at).toLocaleString()}</p>
            </div>
            <button
              onClick={() => setSelectedPlan(null)}
              className="mt-6 w-full rounded-xl bg-white/10 px-4 py-2 font-medium text-white transition-all hover:bg-white/20"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
