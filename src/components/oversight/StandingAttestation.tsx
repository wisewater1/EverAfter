/**
 * St. Michael's Standing Attestation panel. The full statement plus the
 * per-person authorization list, generated live from the grant set on every
 * render, with the consent receipt export.
 */
import { useState } from 'react';
import { ShieldCheck, FileDown, Loader2, AlertTriangle } from 'lucide-react';
import { useOversight } from './useOversight';
import CoverageSealBadge from './CoverageSealBadge';
import {
    BASIS_LABEL,
    SCOPE_LABEL,
    composeMichaelStatement,
    formatLongDate,
} from '../../lib/gabriel/oversight';
import { exportConsentReceipt, downloadTextFile } from '../../lib/gabriel/oversightStore';

export default function StandingAttestation() {
    const { overview, loading } = useOversight(false);
    const [exporting, setExporting] = useState(false);
    const [exportError, setExportError] = useState<string | null>(null);

    async function onExport() {
        setExporting(true);
        setExportError(null);
        const result = await exportConsentReceipt();
        setExporting(false);
        if (!result.ok || !result.html) {
            setExportError(result.error || 'The receipt could not be produced.');
            return;
        }
        downloadTextFile('everafter-consent-receipt.html', 'text/html', result.html);
    }

    if (loading && !overview) {
        return (
            <div className="flex items-center gap-2 rounded-2xl border border-white/5 bg-slate-900/50 p-4 text-xs text-slate-500">
                <Loader2 className="h-4 w-4 animate-spin" /> Reading the live authorization record...
            </div>
        );
    }
    if (!overview) return null;

    const statement = composeMichaelStatement(overview.attestation);
    const unavailable = !overview.attestation.ok;

    return (
        <div className="rounded-2xl border border-sky-500/15 bg-gradient-to-br from-[#0e1420] to-[#0b0f18] p-5">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-sky-400" aria-hidden="true" />
                    <h3 className="text-sm font-semibold text-white">Standing Attestation</h3>
                    <span className="rounded-full border border-sky-500/30 bg-sky-500/10 px-1.5 py-0.5 text-[9px] uppercase tracking-wider text-sky-300">
                        Generated live
                    </span>
                </div>
                <button
                    onClick={() => { void onExport(); }}
                    disabled={exporting || unavailable}
                    className="flex min-h-[44px] items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-[11px] font-medium text-slate-200 transition-colors hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
                >
                    {exporting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileDown className="h-3.5 w-3.5" />}
                    Consent receipt
                </button>
            </div>

            {unavailable ? (
                <div className="flex items-start gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs leading-relaxed text-amber-200">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                    <span>{statement}</span>
                </div>
            ) : (
                <p className="text-[13px] leading-relaxed text-slate-200">{statement}</p>
            )}

            {exportError && (
                <p className="mt-2 text-[11px] text-rose-300">{exportError}</p>
            )}

            {overview.attestation.ok && overview.attestation.people.length > 0 && (
                <ul className="mt-4 space-y-2 border-t border-white/5 pt-3">
                    {overview.attestation.people.map((person) => (
                        <li key={person.person_id} className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
                            <CoverageSealBadge state={person.state} />
                            <span className="font-medium text-white">{person.full_name}</span>
                            {person.scope && (
                                <span className="text-slate-400">{SCOPE_LABEL[person.scope]}</span>
                            )}
                            {person.basis && (
                                <span className="text-slate-500">{BASIS_LABEL[person.basis]}</span>
                            )}
                            {person.document_label && (
                                <span className="text-slate-500">Instrument: {person.document_label}</span>
                            )}
                            {person.expires_at && (
                                <span className="ml-auto text-slate-500">through {formatLongDate(person.expires_at)}</span>
                            )}
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}
