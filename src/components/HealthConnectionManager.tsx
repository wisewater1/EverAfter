import { Activity, Cloud, Link2, ShieldCheck } from 'lucide-react';

import { useConnections } from '../contexts/ConnectionsContext';
import ComprehensiveHealthConnectors from './ComprehensiveHealthConnectors';

export default function HealthConnectionManager() {
  const { getActiveConnectionsCount, openConnectionsPanel } = useConnections();
  const activeConnectionsCount = getActiveConnectionsCount();

  return (
    <div className="space-y-6">
      <section className="rounded-3xl bg-gradient-to-br from-[#1a1a24] to-[#13131a] p-6 shadow-[8px_8px_16px_#08080c,-8px_-8px_16px_#1c1c28] border border-white/5">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-500/20 to-cyan-500/20 border border-teal-500/20">
                <Cloud className="h-6 w-6 text-teal-300" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-white">Live Health Connections</h2>
                <p className="text-sm text-slate-400">
                  Connect Terra, phone health, wearables, and clinical sources through the production connector flow.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-3 text-sm">
              <span className="inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-emerald-300">
                <ShieldCheck className="h-4 w-4" />
                FastAPI + Supabase-backed
              </span>
              <span className="inline-flex items-center gap-2 rounded-full border border-cyan-500/20 bg-cyan-500/10 px-3 py-1 text-cyan-200">
                <Activity className="h-4 w-4" />
                {activeConnectionsCount} active connection{activeConnectionsCount === 1 ? '' : 's'}
              </span>
            </div>
          </div>

          <button
            onClick={() => openConnectionsPanel('health')}
            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-teal-500/25 bg-teal-500/10 px-5 py-3 text-sm font-medium text-teal-100 transition hover:border-teal-400/40 hover:bg-teal-500/15"
          >
            <Link2 className="h-4 w-4" />
            Open Connections Panel
          </button>
        </div>
      </section>

      <ComprehensiveHealthConnectors />
    </div>
  );
}
