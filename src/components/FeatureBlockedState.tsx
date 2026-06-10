import { AlertTriangle, ShieldAlert } from 'lucide-react';

interface FeatureBlockedStateProps {
  title: string;
  reason: string;
  detail?: string;
}

export default function FeatureBlockedState({ title, reason, detail }: FeatureBlockedStateProps) {
  return (
    <div className="min-h-[50vh] flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-2xl rounded-3xl border border-rose-500/20 bg-slate-950/85 p-8 shadow-[0_30px_80px_rgba(2,6,23,0.45)]">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-rose-500/20 bg-rose-500/10 text-rose-300">
            <ShieldAlert className="h-6 w-6" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 text-rose-300">
              <AlertTriangle className="h-4 w-4" />
              <span className="text-xs font-semibold uppercase tracking-[0.24em]">Unavailable</span>
            </div>
            <h1 className="mt-3 text-2xl font-semibold tracking-tight text-white">{title}</h1>
            <p className="mt-3 text-sm leading-7 text-slate-300">{reason}</p>
            {detail ? <p className="mt-3 text-sm leading-7 text-slate-500">{detail}</p> : null}
          </div>
        </div>
      </div>
    </div>
  );
}
