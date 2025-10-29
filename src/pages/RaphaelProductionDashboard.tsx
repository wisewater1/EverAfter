import React, { useState, useEffect } from 'react';
import { Activity, Heart, TrendingUp, Droplet, Moon, Footprints, AlertTriangle, CheckCircle, Info, Lock, Shield, Clock, Zap } from 'lucide-react';

interface Insight {
  text: string;
  severity: 'info' | 'warning' | 'attention';
  category: string;
}

interface VitalsData {
  heartRate: { avg: number; max: number };
  hrv: { avg: number };
  steps: { total: number };
  sleep: { hours: number };
  glucose?: { avg: number };
}

export default function RaphaelProductionDashboard() {
  const [insights, setInsights] = useState<Insight[]>([]);
  const [suggestion, setSuggestion] = useState('');
  const [vitals, setVitals] = useState<VitalsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasData, setHasData] = useState(false);
  const [lastRun, setLastRun] = useState<Date | null>(null);
  const [raphaelActive, setRaphaelActive] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  async function loadDashboardData() {
    try {
      const response = await fetch('/api/me/raphael/summary');
      const data = await response.json();

      if (data.metrics && data.metrics.length > 0) {
        setHasData(true);
        setVitals(data.vitals);
        setInsights(data.insights || []);
        setSuggestion(data.suggestion || '');
        setLastRun(data.lastRun ? new Date(data.lastRun) : null);
      }
    } catch (error) {
      console.error('Failed to load dashboard:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleManualRun() {
    setLoading(true);
    try {
      const response = await fetch('/api/me/raphael/run', { method: 'POST' });
      const data = await response.json();

      setInsights(data.insights);
      setSuggestion(data.suggestion);
      setLastRun(new Date());
    } catch (error) {
      console.error('Manual run failed:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleLogToVault(insight: Insight) {
    try {
      await fetch('/api/me/raphael/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: insight.text, tags: [insight.category] }),
      });
      alert('Insight logged to your Vault');
    } catch (error) {
      console.error('Failed to log:', error);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
        <div className="text-teal-400 text-lg">Loading Raphael...</div>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-[#0a0a0f] relative overflow-hidden pb-safe">
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-teal-500/5 rounded-full blur-[120px]"></div>
        <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-cyan-500/5 rounded-full blur-[120px]"></div>
      </div>

      <div className="relative max-w-7xl mx-auto px-safe-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8 p-6 rounded-[28px] bg-gradient-to-br from-[#0d0d12]/95 via-[#13131a]/95 to-[#0d0d12]/95 backdrop-blur-3xl shadow-[0_8px_32px_rgba(0,0,0,0.8),inset_0_1px_1px_rgba(255,255,255,0.03)] border border-white/[0.03]">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2 tracking-tight">St. Raphael — The Healer</h1>
              <p className="text-slate-400 text-sm">Autonomous health intelligence with consent & audit</p>
            </div>
            <div className="flex items-center gap-3">
              <span className={`flex items-center gap-2 px-4 py-2 rounded-full ${raphaelActive ? 'bg-emerald-500/10 text-emerald-400' : 'bg-slate-700/30 text-slate-500'}`}>
                <span className={`w-2 h-2 rounded-full ${raphaelActive ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'}`}></span>
                <span className="text-sm font-medium">{raphaelActive ? 'Active' : 'Dormant'}</span>
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-4 rounded-2xl bg-gradient-to-br from-white/[0.03] to-white/[0.01] border border-white/[0.05]">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-teal-400">🟢</span>
                <span className="text-sm text-slate-400">Raphael</span>
              </div>
              <span className="text-white font-semibold">Active</span>
            </div>
            <div className="p-4 rounded-2xl bg-gradient-to-br from-white/[0.03] to-white/[0.01] border border-white/[0.05]">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-slate-600">⚫</span>
                <span className="text-sm text-slate-400">Michael</span>
              </div>
              <span className="text-slate-500 font-semibold">Dormant</span>
            </div>
            <div className="p-4 rounded-2xl bg-gradient-to-br from-white/[0.03] to-white/[0.01] border border-white/[0.05]">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-slate-600">⚫</span>
                <span className="text-sm text-slate-400">Martin</span>
              </div>
              <span className="text-slate-500 font-semibold">Dormant</span>
            </div>
            <div className="p-4 rounded-2xl bg-gradient-to-br from-white/[0.03] to-white/[0.01] border border-white/[0.05]">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-slate-600">⚫</span>
                <span className="text-sm text-slate-400">Agatha</span>
              </div>
              <span className="text-slate-500 font-semibold">Dormant</span>
            </div>
          </div>
        </div>

        {!hasData && (
          <div className="mb-8 p-8 rounded-[28px] bg-gradient-to-br from-amber-500/10 to-orange-500/10 backdrop-blur-xl border border-amber-500/20 text-center">
            <AlertTriangle className="w-12 h-12 text-amber-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">No Health Data Yet</h3>
            <p className="text-slate-300 mb-6">Connect your devices to enable Raphael's insights</p>
            <button className="px-6 py-3 rounded-2xl bg-gradient-to-br from-teal-500/20 to-cyan-500/20 text-teal-300 font-semibold hover:from-teal-500/30 hover:to-cyan-500/30 transition-all">
              Connect Devices
            </button>
          </div>
        )}

        {hasData && vitals && (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
              <VitalCard icon={Heart} label="Heart Rate" value={vitals.heartRate.avg} unit="bpm" detail={`Max: ${vitals.heartRate.max}`} />
              <VitalCard icon={Activity} label="HRV" value={vitals.hrv.avg} unit="ms" />
              <VitalCard icon={Footprints} label="Steps" value={vitals.steps.total} unit="steps" />
              <VitalCard icon={Moon} label="Sleep" value={vitals.sleep.hours} unit="hrs" />
              {vitals.glucose && <VitalCard icon={Droplet} label="Glucose" value={vitals.glucose.avg} unit="mg/dL" />}
            </div>

            {insights.length > 0 && (
              <div className="mb-8">
                <h2 className="text-2xl font-bold text-white mb-4">Recent Insights</h2>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                  {insights.map((insight, idx) => (
                    <InsightCard key={idx} insight={insight} onLog={handleLogToVault} />
                  ))}
                </div>
              </div>
            )}

            {suggestion && (
              <div className="mb-8 p-6 rounded-[28px] bg-gradient-to-br from-teal-500/10 to-cyan-500/10 backdrop-blur-xl border border-teal-500/20">
                <div className="flex items-start gap-4">
                  <Zap className="w-6 h-6 text-teal-400 flex-shrink-0 mt-1" />
                  <div>
                    <h3 className="text-lg font-semibold text-teal-300 mb-2">Suggested Action</h3>
                    <p className="text-slate-300">{suggestion}</p>
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <div className="p-6 rounded-[28px] bg-gradient-to-br from-[#0d0d12]/95 to-[#13131a]/95 backdrop-blur-xl border border-white/[0.03]">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Shield className="w-5 h-5 text-teal-400" />
              Consent & Privacy
            </h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02]">
                <span className="text-slate-300">Training & Insights</span>
                <CheckCircle className="w-5 h-5 text-emerald-400" />
              </div>
              <div className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02]">
                <span className="text-slate-300">Vault Writing</span>
                <CheckCircle className="w-5 h-5 text-emerald-400" />
              </div>
              <div className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02]">
                <span className="text-slate-300">Audit Trail</span>
                <Lock className="w-5 h-5 text-teal-400" />
              </div>
            </div>
          </div>

          <div className="p-6 rounded-[28px] bg-gradient-to-br from-[#0d0d12]/95 to-[#13131a]/95 backdrop-blur-xl border border-white/[0.03]">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Clock className="w-5 h-5 text-teal-400" />
              Scheduling
            </h3>
            <div className="space-y-3">
              <div className="p-3 rounded-xl bg-white/[0.02]">
                <div className="text-sm text-slate-400 mb-1">Daily Run</div>
                <div className="text-white font-medium">09:00 AM (Automated)</div>
              </div>
              <div className="p-3 rounded-xl bg-white/[0.02]">
                <div className="text-sm text-slate-400 mb-1">Last Run</div>
                <div className="text-white font-medium">{lastRun ? lastRun.toLocaleString() : 'Never'}</div>
              </div>
              <button onClick={handleManualRun} disabled={loading} className="w-full px-4 py-3 rounded-xl bg-gradient-to-br from-teal-500/20 to-cyan-500/20 text-teal-300 font-semibold hover:from-teal-500/30 hover:to-cyan-500/30 transition-all disabled:opacity-50">
                Run Now (Manual)
              </button>
            </div>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 backdrop-blur-xl">
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-amber-200">
              <strong>Medical Disclaimer:</strong> St. Raphael is not a medical device and does not provide medical diagnosis. All insights are for informational purposes only. Consult healthcare professionals for medical advice.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function VitalCard({ icon: Icon, label, value, unit, detail }: any) {
  return (
    <div className="p-5 rounded-[24px] bg-gradient-to-br from-[#0d0d12]/95 to-[#13131a]/95 backdrop-blur-xl border border-white/[0.03] shadow-[inset_0_1px_2px_rgba(255,255,255,0.03)]">
      <div className="flex items-center gap-3 mb-3">
        <div className="p-2 rounded-xl bg-teal-500/10">
          <Icon className="w-5 h-5 text-teal-400" />
        </div>
        <span className="text-sm text-slate-400">{label}</span>
      </div>
      <div className="text-2xl font-bold text-white mb-1">{value.toFixed(1)}</div>
      <div className="text-xs text-slate-500">{unit}{detail && ` • ${detail}`}</div>
    </div>
  );
}

function InsightCard({ insight, onLog }: { insight: Insight; onLog: (i: Insight) => void }) {
  const colors = {
    info: { bg: 'from-blue-500/10 to-cyan-500/10', border: 'border-blue-500/20', text: 'text-blue-300', icon: Info },
    warning: { bg: 'from-amber-500/10 to-orange-500/10', border: 'border-amber-500/20', text: 'text-amber-300', icon: AlertTriangle },
    attention: { bg: 'from-red-500/10 to-pink-500/10', border: 'border-red-500/20', text: 'text-red-300', icon: TrendingUp },
  };

  const style = colors[insight.severity];
  const Icon = style.icon;

  return (
    <div className={`p-6 rounded-[24px] bg-gradient-to-br ${style.bg} backdrop-blur-xl border ${style.border}`}>
      <div className="flex items-start gap-3 mb-4">
        <Icon className={`w-5 h-5 ${style.text} flex-shrink-0 mt-0.5`} />
        <p className="text-slate-200 text-sm leading-relaxed">{insight.text}</p>
      </div>
      <div className="flex items-center justify-between">
        <span className="text-xs text-slate-500 uppercase tracking-wide">{insight.category}</span>
        <button onClick={() => onLog(insight)} className={`px-4 py-2 rounded-xl text-sm font-medium ${style.text} hover:bg-white/[0.05] transition-all`}>
          Log to Vault
        </button>
      </div>
    </div>
  );
}
