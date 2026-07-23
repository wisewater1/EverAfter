/**
 * Financial coverage drill-down. Surfaced inside the Monitor view and
 * reached by selecting the Financial readiness bar on the Trinity Overview
 * (route /monitor#financial-coverage). Shows every household member's
 * coverage state, scope, authority basis, expiry, published weight, and
 * contribution, with a revoke control for the viewer's own coverage, the
 * plain language weighting explanation, and partially covered accounts.
 */
import { useState } from 'react';
import { Wallet, Loader2, Info, ShieldOff, AlertTriangle } from 'lucide-react';
import { useOversight } from './useOversight';
import CoverageSealBadge from './CoverageSealBadge';
import {
    BASIS_LABEL,
    SCOPE_LABEL,
    WEIGHTING_EXPLANATION,
    composeOverviewLine,
    formatLongDate,
    isCovered,
} from '../../lib/gabriel/oversight';
import { revokeCoverage } from '../../lib/gabriel/oversightStore';

export default function FinancialCoverageSection() {
    const { overview, picture, loading } = useOversight(true);
    const [revoking, setRevoking] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [showWeights, setShowWeights] = useState(false);

    if (loading && !overview) {
        return (
            <div id="financial-coverage" className="flex items-center gap-2 rounded-2xl border border-white/5 bg-slate-900/50 p-4 text-xs text-slate-500">
                <Loader2 className="h-4 w-4 animate-spin" /> Reading the live authorization record...
            </div>
        );
    }
    if (!overview) return null;

    const score = picture?.score ?? null;
    const partialViews = (picture?.views || []).filter((view) => !view.fully_covered);
    const partialAccounts = Array.from(new Map(partialViews.map((v) => [v.account_id, v])).values());

    async function onRevoke(grantId: string) {
        setRevoking(grantId);
        setError(null);
        const result = await revokeCoverage(grantId, '');
        setRevoking(null);
        if (!result.ok) setError(result.error || 'The revocation could not be recorded.');
    }

    return (
        <div id="financial-coverage" className="rounded-2xl border border-emerald-500/15 bg-gradient-to-br from-[#0d1512] to-[#0b0f0d] p-5">
            <div className="mb-3 flex flex-wrap items-center gap-2">
                <Wallet className="h-4 w-4 text-emerald-400" aria-hidden="true" />
                <h3 className="text-sm font-semibold text-white">Financial Coverage</h3>
                {score && (
                    <div className="ml-auto flex items-center gap-3 text-xs">
                        <span className="text-slate-300">
                            Readiness{' '}
                            <strong className="text-white">{score.readiness === null ? 'Unscored' : `${score.readiness}/100`}</strong>
                        </span>
                        <span className="text-slate-300">
                            Coverage Confidence <strong className="text-white">{score.coverage_confidence}/100</strong>
                        </span>
                    </div>
                )}
            </div>

            <p className="mb-4 text-[11px] leading-relaxed text-slate-400">
                {composeOverviewLine(overview.attestation)}
            </p>

            {!overview.ok && (
                <div className="mb-4 flex items-start gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-200">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                    <span>{overview.errorReason}</span>
                </div>
            )}

            <div className="overflow-x-auto">
                <table className="w-full min-w-[560px] text-left text-xs">
                    <thead>
                        <tr className="border-b border-white/10 text-[10px] uppercase tracking-wider text-slate-500">
                            <th className="py-2 pr-3">Member</th>
                            <th className="py-2 pr-3">Coverage</th>
                            <th className="py-2 pr-3">Scope</th>
                            <th className="py-2 pr-3">Authority</th>
                            <th className="py-2 pr-3">Through</th>
                            <th className="py-2 pr-3">Weight</th>
                            <th className="py-2 pr-3">Contribution</th>
                            <th className="py-2"></th>
                        </tr>
                    </thead>
                    <tbody>
                        {overview.members.filter((m) => !m.death_date).map((member) => {
                            const person = overview.attestation.ok
                                ? overview.attestation.people.find((p) => p.person_id === member.person_id)
                                : null;
                            const row = score?.members.find((r) => r.person_id === member.person_id);
                            const activeGrant = overview.grants.find(
                                (g) => g.subject_person_id === member.person_id && !g.revoked_at && !g.suspended_at
                                    && !g.closed_by_passing_at && new Date(g.expires_at).getTime() > Date.now(),
                            );
                            const canRevokeOwn = Boolean(activeGrant) && member.is_account_holder_self;
                            return (
                                <tr key={member.person_id} className="border-b border-white/5">
                                    <td className="py-2.5 pr-3 font-medium text-white">{member.full_name}</td>
                                    <td className="py-2.5 pr-3">{person ? <CoverageSealBadge state={person.state} /> : null}</td>
                                    <td className="py-2.5 pr-3 text-slate-400">{person?.scope ? SCOPE_LABEL[person.scope] : 'None'}</td>
                                    <td className="py-2.5 pr-3 text-slate-400">{person?.basis ? BASIS_LABEL[person.basis] : 'None'}</td>
                                    <td className="py-2.5 pr-3 text-slate-400">{person?.expires_at ? formatLongDate(person.expires_at) : 'Not set'}</td>
                                    <td className="py-2.5 pr-3 text-slate-300">{member.dependency_weight.toFixed(1)}</td>
                                    <td className="py-2.5 pr-3 text-slate-300">
                                        {row && person && isCovered(person.state) && row.readiness !== null ? `${row.contribution}%` : 'None'}
                                    </td>
                                    <td className="py-2.5">
                                        {canRevokeOwn && activeGrant && (
                                            <button
                                                onClick={() => { void onRevoke(activeGrant.grant_id); }}
                                                disabled={revoking === activeGrant.grant_id}
                                                className="flex min-h-[44px] items-center gap-1 rounded-lg border border-rose-500/30 bg-rose-500/10 px-2.5 py-1.5 text-[10px] font-semibold text-rose-300 transition-colors hover:bg-rose-500/20 disabled:opacity-50"
                                            >
                                                {revoking === activeGrant.grant_id
                                                    ? <Loader2 className="h-3 w-3 animate-spin" />
                                                    : <ShieldOff className="h-3 w-3" aria-hidden="true" />}
                                                Revoke my coverage
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            );
                        })}
                        {overview.members.filter((m) => !m.death_date).length === 0 && (
                            <tr><td colSpan={8} className="py-4 text-center text-slate-500">No household members on the tree yet.</td></tr>
                        )}
                    </tbody>
                </table>
            </div>

            {error && <p className="mt-2 text-[11px] text-rose-300">{error}</p>}

            {partialAccounts.length > 0 && (
                <div className="mt-4 rounded-xl border border-amber-500/20 bg-amber-500/5 p-3">
                    <p className="mb-1 text-[11px] font-semibold text-amber-300">Partially covered accounts</p>
                    <ul className="space-y-1 text-[11px] text-slate-300">
                        {partialAccounts.map((view) => (
                            <li key={view.account_id}>
                                {view.institution_name}, {view.account_label}: a shared account where not every holder has
                                granted access yet. Only the granting holder's equal share is included, and the rest is
                                neither shown nor estimated.
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            <div className="mt-4 border-t border-white/5 pt-3">
                <button
                    onClick={() => setShowWeights((v) => !v)}
                    className="flex min-h-[44px] items-center gap-1.5 text-[11px] font-medium text-slate-400 transition-colors hover:text-slate-200"
                    aria-expanded={showWeights}
                >
                    <Info className="h-3.5 w-3.5" aria-hidden="true" />
                    How this number is weighted
                </button>
                {showWeights && (
                    <p className="mt-2 text-[11px] leading-relaxed text-slate-400">{WEIGHTING_EXPLANATION}</p>
                )}
            </div>
        </div>
    );
}
