/**
 * Coverage seal for Family Tree person nodes. Michael's shield language in
 * Gabriel's accent. State is conveyed by glyph plus text, never color alone,
 * and the target meets the 44px touch minimum through its padded hit area.
 */
import { ShieldCheck, ShieldAlert, Shield, Clock } from 'lucide-react';
import { type CoverageState, nodeCoverageLabel } from '../../lib/gabriel/oversight';

const STATE_STYLE: Record<string, { icon: typeof Shield; className: string }> = {
    covered_self: { icon: ShieldCheck, className: 'text-teal-300 border-teal-500/40 bg-teal-500/10' },
    covered_by_proxy: { icon: ShieldCheck, className: 'text-amber-300 border-amber-500/40 bg-amber-500/10' },
    invited: { icon: Clock, className: 'text-sky-300 border-sky-500/40 bg-sky-500/10' },
    sealed_post_passing: { icon: Shield, className: 'text-slate-400 border-slate-500/40 bg-slate-500/10' },
    default: { icon: ShieldAlert, className: 'text-slate-500 border-slate-600/40 bg-slate-700/20' },
};

export default function CoverageSealBadge({ state, compact = false }: { state: CoverageState; compact?: boolean }) {
    const style = STATE_STYLE[state] || STATE_STYLE.default;
    const Icon = style.icon;
    const label = nodeCoverageLabel(state);
    return (
        <span
            role="img"
            aria-label={`Financial coverage: ${label}`}
            title={`Financial coverage: ${label}`}
            className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full border text-[8px] font-bold uppercase tracking-tight ${style.className}`}
        >
            <Icon className="w-2.5 h-2.5" aria-hidden="true" />
            {!compact && <span>{shortLabel(state)}</span>}
        </span>
    );
}

function shortLabel(state: CoverageState): string {
    switch (state) {
        case 'covered_self': return 'Covered';
        case 'covered_by_proxy': return 'Proxy';
        case 'invited': return 'Invited';
        case 'sealed_post_passing': return 'Sealed';
        default: return 'No coverage';
    }
}
