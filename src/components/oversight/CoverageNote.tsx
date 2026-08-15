/**
 * One-line coverage note rendered from the live grant set. Used wherever a
 * Trinity surface presents household financial material: Council items name
 * the authority they rest on, Inheritance states when the estate picture is
 * incomplete, What-If carries Coverage Confidence, and Goals state which
 * members their financial data accounts for.
 */
import { ShieldCheck } from 'lucide-react';
import { useOversight } from './useOversight';
import { composeOverviewLine, isCovered } from '../../lib/gabriel/oversight';

type CoverageNoteVariant = 'authority' | 'inheritance' | 'confidence' | 'goals';

export default function CoverageNote({ variant }: { variant: CoverageNoteVariant }) {
    const { overview, picture, loading } = useOversight(variant === 'confidence');
    if (loading || !overview) return null;

    const attestation = overview.attestation;
    let text: string;

    if (!attestation.ok) {
        text = composeOverviewLine(attestation);
    } else if (variant === 'authority') {
        text = composeOverviewLine(attestation);
    } else if (variant === 'inheritance') {
        if (attestation.covered_adults === 0 && attestation.minors_covered_by_proxy === 0) {
            text = 'No household member has granted financial coverage yet, so the estate picture below is limited to this account alone.';
        } else if (attestation.uncovered_adults > 0) {
            const n = attestation.uncovered_adults;
            text = `The estate picture is incomplete: ${n} ${n === 1 ? 'adult has' : 'adults have'} not granted financial coverage, and nothing about ${n === 1 ? 'their' : 'their'} accounts is included or estimated here.`;
        } else {
            text = 'Every adult in the household has granted financial coverage, so the estate picture reflects the full authorized household view.';
        }
    } else if (variant === 'confidence') {
        const confidence = picture?.score ? picture.score.coverage_confidence : null;
        text = confidence === null
            ? composeOverviewLine(attestation)
            : `Household scenarios compute across covered members only. Coverage Confidence is ${confidence} of 100, and every projection below carries that limit rather than presenting false precision.`;
    } else {
        const covered = attestation.people.filter((p) => isCovered(p.state)).map((p) => p.full_name);
        text = covered.length === 0
            ? 'Household goals currently build on this account’s own data only; no member has granted financial coverage yet.'
            : `Financial goal data accounts for: ${covered.join(', ')}. Members without coverage are not included or estimated.`;
    }

    return (
        <div className="flex items-start gap-2 rounded-xl border border-sky-500/15 bg-sky-500/5 px-3 py-2 text-[11px] leading-relaxed text-slate-300">
            <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-sky-400" aria-hidden="true" />
            <span><span className="font-semibold text-sky-300">St. Michael:</span> {text}</span>
        </div>
    );
}
