import { Sparkles, Zap } from 'lucide-react';
import type { EngramReadiness } from '../../lib/joseph/engramReadiness';

interface EngramReadinessChipProps {
    readiness: EngramReadiness;
    /** Compact = micro form for use directly in a tree row. */
    compact?: boolean;
    onClick?: () => void;
    /** Override the click affordance label for screen readers. */
    actionLabel?: string;
}

const TONE_STYLES: Record<EngramReadiness['tone'], string> = {
    neutral: 'border-white/10 bg-white/[0.04] text-slate-400',
    amber: 'border-amber-500/30 bg-amber-500/10 text-amber-200',
    emerald: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200',
    violet: 'border-violet-500/30 bg-violet-500/10 text-violet-200',
};

const TONE_FILL: Record<EngramReadiness['tone'], string> = {
    neutral: 'bg-slate-400/60',
    amber: 'bg-amber-300',
    emerald: 'bg-emerald-300',
    violet: 'bg-violet-300',
};

export default function EngramReadinessChip({
    readiness,
    compact,
    onClick,
    actionLabel,
}: EngramReadinessChipProps) {
    const Icon = readiness.signals.engramLive ? Zap : Sparkles;
    const cls = TONE_STYLES[readiness.tone];
    const interactive = typeof onClick === 'function';

    const title = `Engram readiness: ${readiness.label} (${readiness.score}%). ${readiness.nextStep}`;

    if (compact) {
        // Tree node rows are <button>s, so the chip is a span with
        // role=button to avoid nested-button DOM (invalid HTML, React
        // warns). stopPropagation prevents the outer "select member"
        // click when the chip is the actual target.
        const activate = (event: React.SyntheticEvent) => {
            event.stopPropagation();
            if (interactive) onClick?.();
        };
        return (
            <span
                role={interactive ? 'button' : 'status'}
                tabIndex={interactive ? 0 : -1}
                onClick={activate}
                onKeyDown={(event) => {
                    if (!interactive) return;
                    if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        activate(event);
                    }
                }}
                title={title}
                aria-label={actionLabel || title}
                className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md border text-[9px] uppercase tracking-tighter font-semibold ${cls} ${
                    interactive
                        ? 'hover:brightness-110 cursor-pointer'
                        : 'cursor-default'
                }`}
            >
                <Icon className="w-2.5 h-2.5" />
                <span className="tabular-nums">{readiness.score}%</span>
            </span>
        );
    }

    return (
        <div
            className={`flex items-center gap-3 rounded-xl border px-3 py-2 ${cls}`}
            role="status"
            title={title}
        >
            <Icon className="w-4 h-4 shrink-0" />
            <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-medium">
                        Engram {readiness.label.toLowerCase()}
                    </span>
                    <span className="text-[10px] tabular-nums opacity-80">
                        {readiness.score}%
                    </span>
                </div>
                <div className="mt-1 h-1 rounded-full bg-white/10 overflow-hidden">
                    <div
                        className={`h-full rounded-full transition-[width] duration-300 ${TONE_FILL[readiness.tone]}`}
                        style={{ width: `${readiness.score}%` }}
                    />
                </div>
                <div className="mt-1 text-[10px] opacity-70 leading-tight">
                    {readiness.nextStep}
                </div>
            </div>
            {interactive && (
                <button
                    type="button"
                    onClick={onClick}
                    className="text-[10px] uppercase tracking-wider underline-offset-2 hover:underline shrink-0"
                    aria-label={actionLabel || 'Continue training'}
                >
                    {actionLabel || 'Continue'}
                </button>
            )}
        </div>
    );
}
