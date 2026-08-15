/**
 * Household Oversight panel inside the St. Gabriel hub.
 *
 * Gabriel states his own limits here, beside his numbers. The panel carries
 * the permanent watcher list for the signed-in member with one-tap revoke,
 * the coverage roster with invitation and consent flows, the household
 * account list with value snapshots, the both-sides alert feed, and the
 * subject-readable audit log with export. The watcher list, revoke control,
 * audit log, and attestation are available at every plan tier.
 */
import { useMemo, useState } from 'react';
import {
    ShieldCheck, ShieldOff, Eye, Loader2, AlertTriangle, Plus, FileDown,
    Landmark, BellRing, ScrollText, CheckCircle2, XCircle, Send,
} from 'lucide-react';
import { useOversight } from './useOversight';
import CoverageSealBadge from './CoverageSealBadge';
import {
    BASIS_LABEL,
    SCOPE_LABEL,
    type AuthorityBasis,
    type OversightScope,
    composeGabrielStatement,
    deriveCoverageState,
    formatLongDate,
    verifyAuditChain,
    type OversightAuditEvent,
} from '../../lib/gabriel/oversight';
import {
    addSnapshot,
    downloadTextFile,
    exportConsentReceipt,
    grantProxyCoverage,
    grantSelfCoverage,
    loadAuditLog,
    requestCoverage,
    respondToInvitation,
    revokeCoverage,
    sendInvitationReminder,
    upsertAccount,
    watchersForPerson,
} from '../../lib/gabriel/oversightStore';
import { isDemoAuthEnabled } from '../../lib/demo-auth';
import { supabase } from '../../lib/supabase';

const SCOPES: OversightScope[] = [
    'balances_only',
    'balances_and_obligations',
    'balances_obligations_and_transactions',
    'full_ledger',
];

const PROXY_BASES: Exclude<AuthorityBasis, 'self'>[] = [
    'guardian_of_minor',
    'power_of_attorney',
    'trustee',
    'court_appointed_guardian',
    'executor_or_administrator',
];

interface VaultInstrument {
    id: string;
    title: string;
}

export default function OversightPanel() {
    const { overview, picture, loading } = useOversight(true);
    const [busy, setBusy] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [notice, setNotice] = useState<string | null>(null);

    const [grantTarget, setGrantTarget] = useState<string | null>(null);
    const [grantScope, setGrantScope] = useState<OversightScope>('balances_and_obligations');
    const [grantPurpose, setGrantPurpose] = useState('Keep the household financially prepared together.');
    const [grantVerification, setGrantVerification] = useState('');
    const [grantAccounts, setGrantAccounts] = useState<string[]>([]);
    const [proxyMode, setProxyMode] = useState(false);
    const [proxyBasis, setProxyBasis] = useState<Exclude<AuthorityBasis, 'self'>>('power_of_attorney');
    const [proxyInstrumentId, setProxyInstrumentId] = useState('');
    const [proxyInstrumentLabel, setProxyInstrumentLabel] = useState('');
    const [vaultInstruments, setVaultInstruments] = useState<VaultInstrument[] | null>(null);

    const [accountForm, setAccountForm] = useState(false);
    const [acctInstitution, setAcctInstitution] = useState('');
    const [acctLabel, setAcctLabel] = useState('');
    const [acctKind, setAcctKind] = useState<'depository' | 'investment' | 'credit' | 'loan' | 'mortgage' | 'other'>('depository');
    const [acctHolders, setAcctHolders] = useState<string[]>([]);
    const [acctBalance, setAcctBalance] = useState('');
    const [acctObligation, setAcctObligation] = useState('');

    const [auditLog, setAuditLog] = useState<OversightAuditEvent[] | null>(null);
    const [auditChainOk, setAuditChainOk] = useState<boolean | null>(null);

    const selfPersonId = overview?.selfPersonId ?? null;
    const myWatchers = useMemo(
        () => (overview && selfPersonId ? watchersForPerson(overview, selfPersonId) : []),
        [overview, selfPersonId],
    );

    async function run(key: string, action: () => Promise<{ ok: boolean; error?: string }>, successNotice?: string) {
        setBusy(key);
        setError(null);
        setNotice(null);
        const result = await action();
        setBusy(null);
        if (!result.ok) {
            setError(result.error || 'The action could not be completed.');
        } else if (successNotice) {
            setNotice(successNotice);
        }
    }

    async function loadVaultInstruments() {
        if (isDemoAuthEnabled() || !supabase) {
            setVaultInstruments([]);
            return;
        }
        try {
            const { data } = await supabase.from('vault_items').select('id, title').order('created_at', { ascending: false }).limit(50);
            setVaultInstruments(((data || []) as VaultInstrument[]));
        } catch {
            setVaultInstruments([]);
        }
    }

    async function openAudit() {
        const events = await loadAuditLog();
        setAuditLog(events);
        setAuditChainOk(isDemoAuthEnabled() ? verifyAuditChain(events) : null);
    }

    if (loading && !overview) {
        return (
            <div className="flex items-center gap-2 rounded-2xl border border-white/5 bg-slate-900/50 p-4 text-xs text-slate-500">
                <Loader2 className="h-4 w-4 animate-spin" /> Reading the live authorization record...
            </div>
        );
    }
    if (!overview) return null;

    const livingMembers = overview.members.filter((m) => !m.death_date);
    const gabrielStatement = composeGabrielStatement(overview.attestation);

    return (
        <div className="space-y-5">
            {/* Gabriel states his own limits where his numbers live. */}
            <div className="rounded-2xl border border-emerald-500/15 bg-gradient-to-br from-[#0d1512] to-[#0b0f0d] p-5">
                <div className="mb-2 flex items-center gap-2">
                    <Eye className="h-4 w-4 text-emerald-400" aria-hidden="true" />
                    <h3 className="text-sm font-semibold text-white">What I am permitted to see</h3>
                </div>
                <p className="text-[13px] leading-relaxed text-slate-200">{gabrielStatement}</p>
                {picture?.score && (
                    <div className="mt-3 flex flex-wrap gap-4 border-t border-white/5 pt-3 text-xs text-slate-300">
                        <span>Household Financial Readiness{' '}
                            <strong className="text-white">
                                {picture.score.readiness === null ? 'Unscored' : `${picture.score.readiness}/100`}
                            </strong>
                        </span>
                        <span>Coverage Confidence <strong className="text-white">{picture.score.coverage_confidence}/100</strong></span>
                        <span className="text-slate-500">Two numbers, never blended.</span>
                    </div>
                )}
            </div>

            {(error || notice) && (
                <div className={`flex items-start gap-2 rounded-xl border p-3 text-xs ${error ? 'border-rose-500/30 bg-rose-500/10 text-rose-200' : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200'}`}>
                    {error ? <XCircle className="mt-0.5 h-4 w-4 shrink-0" /> : <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />}
                    <span>{error || notice}</span>
                </div>
            )}

            {/* Rule 3: the permanent watcher panel. No role can hide this. */}
            <div className="rounded-2xl border border-sky-500/15 bg-slate-900/40 p-5">
                <div className="mb-2 flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-sky-400" aria-hidden="true" />
                    <h3 className="text-sm font-semibold text-white">Who is authorized to review my finances</h3>
                </div>
                <p className="mb-3 text-[11px] text-slate-500">
                    This panel is permanent. It lists everyone currently authorized to review your finances, and you can
                    end any authorization instantly, without approval, without a waiting period, and without explaining.
                </p>
                {!selfPersonId ? (
                    <p className="text-xs text-slate-400">Your own person node was not found on the Family Tree yet. Add yourself in St. Joseph first.</p>
                ) : myWatchers.length === 0 ? (
                    <p className="text-xs text-slate-400">No one is authorized to review your finances right now.</p>
                ) : (
                    <ul className="space-y-2">
                        {myWatchers.map((grant) => {
                            const active = !grant.revoked_at && !grant.suspended_at && !grant.closed_by_passing_at
                                && new Date(grant.expires_at).getTime() > Date.now();
                            return (
                                <li key={grant.grant_id} className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl border border-white/5 bg-white/[0.02] px-3 py-2 text-xs">
                                    <span className="font-medium text-white">St. Gabriel, household review</span>
                                    <span className="text-slate-400">{SCOPE_LABEL[grant.scope]}</span>
                                    <span className="text-slate-500">{BASIS_LABEL[grant.authority_basis]}</span>
                                    <span className="text-slate-500">
                                        {active ? `through ${formatLongDate(grant.expires_at)}` :
                                            grant.revoked_at ? `revoked ${formatLongDate(grant.revoked_at)}` :
                                            grant.suspended_at ? 'suspended pending re-consent' :
                                            grant.closed_by_passing_at ? 'closed after passing' :
                                            `expired ${formatLongDate(grant.expires_at)}`}
                                    </span>
                                    {active && (
                                        <button
                                            onClick={() => { void run(`revoke-${grant.grant_id}`, () => revokeCoverage(grant.grant_id), 'Your coverage was revoked. Gabriel no longer sees these accounts anywhere.'); }}
                                            disabled={busy === `revoke-${grant.grant_id}`}
                                            className="ml-auto flex min-h-[44px] items-center gap-1 rounded-lg border border-rose-500/30 bg-rose-500/10 px-2.5 py-1.5 text-[10px] font-semibold text-rose-300 transition-colors hover:bg-rose-500/20 disabled:opacity-50"
                                        >
                                            {busy === `revoke-${grant.grant_id}` ? <Loader2 className="h-3 w-3 animate-spin" /> : <ShieldOff className="h-3 w-3" />}
                                            Revoke now
                                        </button>
                                    )}
                                </li>
                            );
                        })}
                    </ul>
                )}
            </div>

            {/* Coverage roster and consent flows */}
            <div className="rounded-2xl border border-white/5 bg-slate-900/40 p-5">
                <h3 className="mb-3 text-sm font-semibold text-white">Household coverage</h3>
                <ul className="space-y-2">
                    {livingMembers.map((member) => {
                        const state = deriveCoverageState(member, overview.grants, overview.invitations, new Date().toISOString());
                        const invitation = overview.invitations.find((i) => i.subject_person_id === member.person_id);
                        return (
                            <li key={member.person_id} className="rounded-xl border border-white/5 bg-white/[0.02] px-3 py-2.5">
                                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
                                    <CoverageSealBadge state={state} />
                                    <span className="font-medium text-white">{member.full_name}</span>
                                    <span className="text-slate-500">{member.role === 'minor' ? 'Minor' : member.role === 'dependent_adult' ? 'Dependent adult' : 'Adult'}</span>
                                    <div className="ml-auto flex flex-wrap items-center gap-2">
                                        {state === 'not_requested' && !member.is_account_holder_self && member.role !== 'minor' && (
                                            <button
                                                onClick={() => {
                                                    void run(`invite-${member.person_id}`, () =>
                                                        requestCoverage(member.person_id, selfPersonId || member.person_id, grantScope, grantPurpose),
                                                        'The invitation was sent. The product will remind once at most, then stop asking.');
                                                }}
                                                disabled={busy === `invite-${member.person_id}`}
                                                className="flex min-h-[44px] items-center gap-1 rounded-lg border border-sky-500/30 bg-sky-500/10 px-2.5 py-1.5 text-[10px] font-semibold text-sky-300 hover:bg-sky-500/20 disabled:opacity-50"
                                            >
                                                <Send className="h-3 w-3" aria-hidden="true" /> Request coverage
                                            </button>
                                        )}
                                        {state === 'invited' && invitation && (
                                            <>
                                                <button
                                                    onClick={() => { setGrantTarget(member.person_id); setProxyMode(false); }}
                                                    className="flex min-h-[44px] items-center rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1.5 text-[10px] font-semibold text-emerald-300 hover:bg-emerald-500/20"
                                                >
                                                    Record their answer
                                                </button>
                                                {!invitation.reminder_sent_at && (
                                                    <button
                                                        onClick={() => { void run(`remind-${invitation.invitation_id}`, () => sendInvitationReminder(invitation.invitation_id), 'The single reminder was sent. The product will not ask again.'); }}
                                                        disabled={busy === `remind-${invitation.invitation_id}`}
                                                        className="flex min-h-[44px] items-center rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-[10px] text-slate-300 hover:bg-white/10 disabled:opacity-50"
                                                    >
                                                        Send the one reminder
                                                    </button>
                                                )}
                                            </>
                                        )}
                                        {(state === 'not_requested' || state === 'expired' || state === 'revoked') && (
                                            <button
                                                onClick={() => { setGrantTarget(member.person_id); setProxyMode(member.role === 'minor'); void loadVaultInstruments(); }}
                                                className="flex min-h-[44px] items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-[10px] text-slate-300 hover:bg-white/10"
                                            >
                                                <Plus className="h-3 w-3" aria-hidden="true" />
                                                {member.is_account_holder_self ? 'Grant my own coverage' : 'Record consent'}
                                            </button>
                                        )}
                                        {state === 'declined' && (
                                            <span className="text-[10px] text-slate-500">Declined. The product will not ask again unless they re-open it.</span>
                                        )}
                                    </div>
                                </div>

                                {grantTarget === member.person_id && (
                                    <div className="mt-3 space-y-2 rounded-xl border border-white/10 bg-[#0c0c12] p-3">
                                        <div className="flex flex-wrap items-center gap-2 text-[11px]">
                                            <label className="text-slate-400" htmlFor={`scope-${member.person_id}`}>Scope</label>
                                            <select
                                                id={`scope-${member.person_id}`}
                                                value={grantScope}
                                                onChange={(e) => setGrantScope(e.target.value as OversightScope)}
                                                className="rounded-lg border border-white/10 bg-slate-900 px-2 py-2 text-[11px] text-white"
                                            >
                                                {SCOPES.map((s) => <option key={s} value={s}>{SCOPE_LABEL[s]}</option>)}
                                            </select>
                                            <label className="ml-2 flex items-center gap-1 text-slate-400">
                                                <input type="checkbox" checked={proxyMode} onChange={(e) => { setProxyMode(e.target.checked); if (e.target.checked) void loadVaultInstruments(); }} />
                                                Documented proxy authority
                                            </label>
                                        </div>
                                        <input
                                            value={grantPurpose}
                                            onChange={(e) => setGrantPurpose(e.target.value)}
                                            placeholder="Purpose shown to the member"
                                            className="w-full rounded-lg border border-white/10 bg-slate-900 px-2 py-2 text-[11px] text-white"
                                        />
                                        <div className="flex flex-wrap gap-2 text-[11px] text-slate-400">
                                            <span>Include accounts:</span>
                                            {overview.accounts.filter((a) => a.holders.includes(member.person_id)).map((account) => (
                                                <label key={account.account_id} className="flex items-center gap-1">
                                                    <input
                                                        type="checkbox"
                                                        checked={grantAccounts.includes(account.account_id)}
                                                        onChange={(e) => setGrantAccounts((prev) =>
                                                            e.target.checked ? [...prev, account.account_id] : prev.filter((id) => id !== account.account_id))}
                                                    />
                                                    {account.account_label}
                                                </label>
                                            ))}
                                            {overview.accounts.filter((a) => a.holders.includes(member.person_id)).length === 0 && (
                                                <span className="text-slate-600">No accounts list this member as a holder yet. Add one below first; coverage without accounts computes nothing.</span>
                                            )}
                                        </div>
                                        {!proxyMode ? (
                                            !member.is_account_holder_self && (
                                                <input
                                                    value={grantVerification}
                                                    onChange={(e) => setGrantVerification(e.target.value)}
                                                    placeholder="How was their consent verified, for example verified_in_person"
                                                    className="w-full rounded-lg border border-white/10 bg-slate-900 px-2 py-2 text-[11px] text-white"
                                                />
                                            )
                                        ) : (
                                            <div className="space-y-2">
                                                <select
                                                    value={proxyBasis}
                                                    onChange={(e) => setProxyBasis(e.target.value as Exclude<AuthorityBasis, 'self'>)}
                                                    className="w-full rounded-lg border border-white/10 bg-slate-900 px-2 py-2 text-[11px] text-white"
                                                >
                                                    {PROXY_BASES.map((b) => <option key={b} value={b}>{BASIS_LABEL[b]}</option>)}
                                                </select>
                                                {isDemoAuthEnabled() ? (
                                                    <input
                                                        value={proxyInstrumentLabel}
                                                        onChange={(e) => { setProxyInstrumentLabel(e.target.value); setProxyInstrumentId(e.target.value ? `demo-instrument-${member.person_id}` : ''); }}
                                                        placeholder="Instrument on file, for example Durable POA dated March 2024"
                                                        className="w-full rounded-lg border border-white/10 bg-slate-900 px-2 py-2 text-[11px] text-white"
                                                    />
                                                ) : (
                                                    <select
                                                        value={proxyInstrumentId}
                                                        onChange={(e) => {
                                                            setProxyInstrumentId(e.target.value);
                                                            const item = (vaultInstruments || []).find((v) => v.id === e.target.value);
                                                            setProxyInstrumentLabel(item?.title || '');
                                                        }}
                                                        className="w-full rounded-lg border border-white/10 bg-slate-900 px-2 py-2 text-[11px] text-white"
                                                    >
                                                        <option value="">Select the instrument from the Legacy Vault</option>
                                                        {(vaultInstruments || []).map((v) => <option key={v.id} value={v.id}>{v.title}</option>)}
                                                    </select>
                                                )}
                                                {!isDemoAuthEnabled() && (vaultInstruments?.length ?? 0) === 0 && (
                                                    <p className="text-[10px] text-amber-300">
                                                        No instruments found. Add the guardianship, power of attorney, trusteeship, court appointment, or letters testamentary to the Legacy Vault first; proxy coverage cannot be created on assertion alone.
                                                    </p>
                                                )}
                                            </div>
                                        )}
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => {
                                                    const invitationForMember = overview.invitations.find((i) => i.subject_person_id === member.person_id && !i.responded_at);
                                                    void run(`grant-${member.person_id}`, async () => {
                                                        if (proxyMode) {
                                                            return grantProxyCoverage({
                                                                subjectPersonId: member.person_id,
                                                                grantedByPersonId: selfPersonId || member.person_id,
                                                                basis: proxyBasis,
                                                                documentId: proxyInstrumentId,
                                                                documentLabel: proxyInstrumentLabel,
                                                                scope: grantScope,
                                                                includedAccountIds: grantAccounts,
                                                                purpose: grantPurpose,
                                                                expiresAt: null,
                                                                verificationMethod: 'documented_instrument_on_file',
                                                            });
                                                        }
                                                        if (invitationForMember) {
                                                            return respondToInvitation(
                                                                invitationForMember.invitation_id, true, grantScope, grantAccounts,
                                                                member.is_account_holder_self ? 'authenticated_session' : grantVerification,
                                                            );
                                                        }
                                                        return grantSelfCoverage({
                                                            subjectPersonId: member.person_id,
                                                            scope: grantScope,
                                                            includedAccountIds: grantAccounts,
                                                            purpose: grantPurpose,
                                                            expiresAt: null,
                                                            verificationMethod: member.is_account_holder_self ? 'authenticated_session' : grantVerification,
                                                        });
                                                    }, 'Coverage was recorded. Michael attests to it immediately.').then(() => setGrantTarget(null));
                                                }}
                                                disabled={busy === `grant-${member.person_id}`}
                                                className="flex min-h-[44px] items-center gap-1 rounded-lg border border-emerald-500/30 bg-emerald-500/15 px-3 py-2 text-[11px] font-semibold text-emerald-300 hover:bg-emerald-500/25 disabled:opacity-50"
                                            >
                                                {busy === `grant-${member.person_id}` ? <Loader2 className="h-3 w-3 animate-spin" /> : <ShieldCheck className="h-3 w-3" />}
                                                Record coverage
                                            </button>
                                            <button
                                                onClick={() => setGrantTarget(null)}
                                                className="flex min-h-[44px] items-center rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-[11px] text-slate-300 hover:bg-white/10"
                                            >
                                                Cancel
                                            </button>
                                            {overview.invitations.find((i) => i.subject_person_id === member.person_id && !i.responded_at) && (
                                                <button
                                                    onClick={() => {
                                                        const invitationForMember = overview.invitations.find((i) => i.subject_person_id === member.person_id && !i.responded_at);
                                                        if (!invitationForMember) return;
                                                        void run(`decline-${member.person_id}`, () =>
                                                            respondToInvitation(invitationForMember.invitation_id, false, grantScope, [], ''),
                                                            'The decline was recorded. The product will not ask this member again.').then(() => setGrantTarget(null));
                                                    }}
                                                    className="ml-auto flex min-h-[44px] items-center rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-[11px] text-slate-400 hover:bg-white/10"
                                                >
                                                    They declined
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </li>
                        );
                    })}
                    {livingMembers.length === 0 && (
                        <li className="text-xs text-slate-500">No household members yet. Build the tree in St. Joseph first.</li>
                    )}
                </ul>
            </div>

            {/* Accounts */}
            <div className="rounded-2xl border border-white/5 bg-slate-900/40 p-5">
                <div className="mb-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Landmark className="h-4 w-4 text-emerald-400" aria-hidden="true" />
                        <h3 className="text-sm font-semibold text-white">Household accounts</h3>
                    </div>
                    <button
                        onClick={() => setAccountForm((v) => !v)}
                        className="flex min-h-[44px] items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-[11px] text-slate-300 hover:bg-white/10"
                    >
                        <Plus className="h-3.5 w-3.5" aria-hidden="true" /> Add account
                    </button>
                </div>
                <p className="mb-3 text-[11px] text-slate-500">
                    Values are recorded as dated snapshots and only ever read through an active authorization that names
                    the account. A shared account counts in full only after every holder has granted access.
                </p>
                {accountForm && (
                    <div className="mb-3 space-y-2 rounded-xl border border-white/10 bg-[#0c0c12] p-3">
                        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                            <input value={acctInstitution} onChange={(e) => setAcctInstitution(e.target.value)} placeholder="Institution"
                                className="rounded-lg border border-white/10 bg-slate-900 px-2 py-2 text-[11px] text-white" />
                            <input value={acctLabel} onChange={(e) => setAcctLabel(e.target.value)} placeholder="Account label, for example Everyday checking"
                                className="rounded-lg border border-white/10 bg-slate-900 px-2 py-2 text-[11px] text-white" />
                        </div>
                        <div className="flex flex-wrap items-center gap-2 text-[11px]">
                            <select value={acctKind} onChange={(e) => setAcctKind(e.target.value as typeof acctKind)}
                                className="rounded-lg border border-white/10 bg-slate-900 px-2 py-2 text-[11px] text-white">
                                <option value="depository">Depository</option>
                                <option value="investment">Investment</option>
                                <option value="credit">Credit</option>
                                <option value="loan">Loan</option>
                                <option value="mortgage">Mortgage</option>
                                <option value="other">Other</option>
                            </select>
                            <input value={acctBalance} onChange={(e) => setAcctBalance(e.target.value)} placeholder="Current balance" inputMode="decimal"
                                className="w-32 rounded-lg border border-white/10 bg-slate-900 px-2 py-2 text-[11px] text-white" />
                            <input value={acctObligation} onChange={(e) => setAcctObligation(e.target.value)} placeholder="Monthly obligation" inputMode="decimal"
                                className="w-36 rounded-lg border border-white/10 bg-slate-900 px-2 py-2 text-[11px] text-white" />
                        </div>
                        <div className="flex flex-wrap gap-2 text-[11px] text-slate-400">
                            <span>Holders:</span>
                            {livingMembers.map((member) => (
                                <label key={member.person_id} className="flex items-center gap-1">
                                    <input
                                        type="checkbox"
                                        checked={acctHolders.includes(member.person_id)}
                                        onChange={(e) => setAcctHolders((prev) =>
                                            e.target.checked ? [...prev, member.person_id] : prev.filter((id) => id !== member.person_id))}
                                    />
                                    {member.full_name}
                                </label>
                            ))}
                        </div>
                        <button
                            onClick={() => {
                                void run('account-add', async () => {
                                    if (!acctInstitution.trim() || !acctLabel.trim() || acctHolders.length === 0) {
                                        return { ok: false, error: 'Institution, label, and at least one holder are required.' };
                                    }
                                    const created = await upsertAccount({
                                        institution_name: acctInstitution.trim(),
                                        account_label: acctLabel.trim(),
                                        account_kind: acctKind,
                                        holders: acctHolders,
                                        currency: 'USD',
                                    });
                                    if (!created.ok || !created.accountId) return { ok: false, error: created.error };
                                    const balance = Number(acctBalance);
                                    const obligation = Number(acctObligation);
                                    if (acctBalance.trim() !== '' && !Number.isNaN(balance)) {
                                        const snap = await addSnapshot(created.accountId, balance, Number.isNaN(obligation) ? 0 : obligation);
                                        if (!snap.ok) return snap;
                                    }
                                    setAcctInstitution(''); setAcctLabel(''); setAcctBalance(''); setAcctObligation(''); setAcctHolders([]);
                                    setAccountForm(false);
                                    return { ok: true };
                                }, 'The account was added. Include it in a member’s authorization for it to count.');
                            }}
                            disabled={busy === 'account-add'}
                            className="flex min-h-[44px] items-center gap-1 rounded-lg border border-emerald-500/30 bg-emerald-500/15 px-3 py-2 text-[11px] font-semibold text-emerald-300 hover:bg-emerald-500/25 disabled:opacity-50"
                        >
                            {busy === 'account-add' ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />}
                            Save account
                        </button>
                    </div>
                )}
                {overview.accounts.length === 0 ? (
                    <p className="text-xs text-slate-500">No accounts recorded yet.</p>
                ) : (
                    <ul className="space-y-1.5 text-xs">
                        {overview.accounts.map((account) => (
                            <li key={account.account_id} className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border border-white/5 bg-white/[0.02] px-3 py-2">
                                <span className="font-medium text-white">{account.institution_name}</span>
                                <span className="text-slate-400">{account.account_label}</span>
                                <span className="text-slate-500">{account.account_kind}</span>
                                <span className="text-slate-500">
                                    {account.holders.length === 1 ? 'Single holder' : `${account.holders.length} holders`}
                                </span>
                            </li>
                        ))}
                    </ul>
                )}
            </div>

            {/* Alerts, delivered to both sides */}
            {overview.alerts.length > 0 && (
                <div className="rounded-2xl border border-white/5 bg-slate-900/40 p-5">
                    <div className="mb-2 flex items-center gap-2">
                        <BellRing className="h-4 w-4 text-amber-400" aria-hidden="true" />
                        <h3 className="text-sm font-semibold text-white">Coverage alerts</h3>
                        <span className="text-[10px] text-slate-500">Every alert goes to the member and the household steward together.</span>
                    </div>
                    <ul className="space-y-1.5 text-[11px]">
                        {overview.alerts.slice(0, 8).map((alert) => (
                            <li key={alert.id} className="rounded-lg border border-white/5 bg-white/[0.02] px-3 py-2 text-slate-300">
                                <span className="mr-2 rounded-full border border-white/10 px-1.5 py-0.5 text-[9px] uppercase tracking-wide text-slate-500">{alert.audience.replace('_', ' ')}</span>
                                {alert.message}
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            {/* Audit log */}
            <div className="rounded-2xl border border-white/5 bg-slate-900/40 p-5">
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                        <ScrollText className="h-4 w-4 text-slate-400" aria-hidden="true" />
                        <h3 className="text-sm font-semibold text-white">Oversight audit trail</h3>
                        <span className="text-[10px] text-slate-500">Append-only and tamper-evident. You can read and export every event about you.</span>
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={() => { void openAudit(); }}
                            className="flex min-h-[44px] items-center rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-[11px] text-slate-300 hover:bg-white/10"
                        >
                            {auditLog ? 'Refresh' : 'View log'}
                        </button>
                        {auditLog && auditLog.length > 0 && (
                            <button
                                onClick={() => downloadTextFile('everafter-oversight-audit.json', 'application/json', JSON.stringify(auditLog, null, 2))}
                                className="flex min-h-[44px] items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-[11px] text-slate-300 hover:bg-white/10"
                            >
                                <FileDown className="h-3.5 w-3.5" aria-hidden="true" /> Export
                            </button>
                        )}
                        <button
                            onClick={() => {
                                void run('receipt', async () => {
                                    const result = await exportConsentReceipt();
                                    if (!result.ok || !result.html) return { ok: false, error: result.error };
                                    downloadTextFile('everafter-consent-receipt.html', 'text/html', result.html);
                                    return { ok: true };
                                });
                            }}
                            disabled={busy === 'receipt'}
                            className="flex min-h-[44px] items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-[11px] text-slate-300 hover:bg-white/10 disabled:opacity-50"
                        >
                            {busy === 'receipt' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileDown className="h-3.5 w-3.5" />}
                            Consent receipt
                        </button>
                    </div>
                </div>
                {auditChainOk !== null && (
                    <p className={`mb-2 text-[10px] ${auditChainOk ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {auditChainOk ? 'Hash chain verified: no entry has been altered.' : 'Hash chain check failed: the log shows signs of alteration.'}
                    </p>
                )}
                {auditLog && (
                    auditLog.length === 0 ? (
                        <p className="text-xs text-slate-500">No oversight events recorded yet.</p>
                    ) : (
                        <ul className="max-h-64 space-y-1 overflow-y-auto text-[11px]">
                            {auditLog.map((event) => (
                                <li key={event.id} className="flex flex-wrap items-center gap-x-2 rounded border-b border-white/5 px-1 py-1.5 text-slate-400">
                                    <span className="font-mono text-[10px] text-slate-600">#{event.id}</span>
                                    <span className="font-medium text-slate-300">{event.event_type.replace(/_/g, ' ')}</span>
                                    <span className="ml-auto text-[10px] text-slate-600">{new Date(event.created_at).toLocaleString()}</span>
                                </li>
                            ))}
                        </ul>
                    )
                )}
            </div>

            <p className="flex items-start gap-2 text-[10px] leading-relaxed text-slate-600">
                <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" aria-hidden="true" />
                The watcher list, the revoke control, the audit log, and Michael's attestation are available to every
                member at every plan tier. No role in this product can review a person's finances without appearing on
                that person's watcher list.
            </p>
        </div>
    );
}
