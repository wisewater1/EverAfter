/**
 * Household financial oversight: pure shared logic.
 *
 * Everything here is deterministic and side-effect free so the demo engine,
 * the Supabase-backed store, and the test matrix all run the exact same
 * rules. Michael's Attestation is composed from live grant facts at render
 * time; none of these strings are ever cached as copy.
 */

export type AuthorityBasis =
    | 'self'
    | 'guardian_of_minor'
    | 'power_of_attorney'
    | 'trustee'
    | 'court_appointed_guardian'
    | 'executor_or_administrator';

export type OversightScope =
    | 'balances_only'
    | 'balances_and_obligations'
    | 'balances_obligations_and_transactions'
    | 'full_ledger';

export type CoverageState =
    | 'covered_self'
    | 'covered_by_proxy'
    | 'invited'
    | 'declined'
    | 'not_requested'
    | 'expired'
    | 'revoked'
    | 'sealed_post_passing';

export type HouseholdRole = 'adult' | 'minor' | 'dependent_adult';

export interface OversightGrant {
    grant_id: string;
    household_id: string;
    subject_person_id: string;
    granted_by_person_id: string;
    authority_basis: AuthorityBasis;
    authority_document_id: string | null;
    authority_document_label: string | null;
    scope: OversightScope;
    included_account_ids: string[];
    purpose_statement: string;
    granted_at: string;
    effective_from: string;
    expires_at: string;
    review_due_at: string | null;
    revoked_at: string | null;
    revoked_by_person_id: string | null;
    revocation_reason: string | null;
    suspended_at: string | null;
    suspension_reason: string | null;
    closed_by_passing_at: string | null;
    verification_method: string;
}

export interface OversightInvitation {
    invitation_id: string;
    household_id: string;
    subject_person_id: string;
    requested_by_person_id: string;
    requested_scope: OversightScope;
    purpose_statement: string;
    created_at: string;
    reminder_sent_at: string | null;
    responded_at: string | null;
    response: 'accepted' | 'declined' | null;
    reopened_at: string | null;
}

export interface HouseholdMemberFacts {
    person_id: string;
    client_id: string | null;
    full_name: string;
    role: HouseholdRole;
    birth_date: string | null;
    death_date: string | null;
    dependency_weight: number;
    is_primary_earner: boolean;
    is_account_holder_self: boolean;
}

export type AccountKind = 'depository' | 'investment' | 'credit' | 'loan' | 'mortgage' | 'other';

export interface FinancialAccountFacts {
    account_id: string;
    institution_name: string;
    account_label: string;
    account_kind: AccountKind;
    holders: string[];
    currency: string;
    balance: number | null;
    total_obligation: number;
    as_of: string | null;
}

export interface OversightAuditEvent {
    id: number;
    event_type: string;
    subject_person_id: string | null;
    grant_id: string | null;
    detail: Record<string, unknown>;
    created_at: string;
    prev_hash: string;
    event_hash: string;
}

/** Default published weights by role. A primary earner carries extra weight. */
export const DEFAULT_ROLE_WEIGHT: Record<HouseholdRole, number> = {
    adult: 1.0,
    minor: 0.6,
    dependent_adult: 1.3,
};
export const PRIMARY_EARNER_WEIGHT = 1.6;

/**
 * The plain language weighting explanation published on the coverage
 * drill-down, so any family member can understand why the number is what it
 * is. Keep this text in sync with computeHouseholdReadiness and
 * computeCoverageConfidence.
 */
export const WEIGHTING_EXPLANATION =
    'Each covered member contributes to Household Financial Readiness in proportion to their weight, ' +
    'not one share per head. A primary earner carries a weight of 1.6, a dependent elder 1.3, an adult 1.0, ' +
    'and a minor 0.6, because their finances carry different consequences for the household. ' +
    'A member without coverage contributes nothing to readiness and instead lowers Coverage Confidence, ' +
    'so a missing member can never make the score look better. Each member’s own readiness blends two parts: ' +
    'sixty percent is their buffer, meaning authorized liquid balances measured against six months of their ' +
    'authorized monthly obligations, and forty percent is balance, meaning authorized assets measured against ' +
    'authorized assets plus debts. A joint account counts in full only after every holder has granted access; ' +
    'until then only the granting holder’s equal share is included and the account is marked partially covered, ' +
    'which also reduces Coverage Confidence. This score is a readiness indicator, not financial advice.';

export function defaultWeight(role: HouseholdRole, isPrimaryEarner: boolean): number {
    return isPrimaryEarner ? PRIMARY_EARNER_WEIGHT : DEFAULT_ROLE_WEIGHT[role];
}

export function isGrantActive(grant: OversightGrant, nowIso: string): boolean {
    if (grant.revoked_at || grant.suspended_at || grant.closed_by_passing_at) return false;
    return grant.effective_from <= nowIso && nowIso < grant.expires_at;
}

export function latestGrantForSubject(grants: OversightGrant[], personId: string): OversightGrant | null {
    const own = grants
        .filter((g) => g.subject_person_id === personId)
        .sort((a, b) => (a.granted_at < b.granted_at ? 1 : -1));
    return own[0] || null;
}

export function deriveCoverageState(
    member: HouseholdMemberFacts,
    grants: OversightGrant[],
    invitations: OversightInvitation[],
    nowIso: string,
): CoverageState {
    if (member.death_date) return 'sealed_post_passing';
    const active = grants.find((g) => g.subject_person_id === member.person_id && isGrantActive(g, nowIso));
    if (active) return active.authority_basis === 'self' ? 'covered_self' : 'covered_by_proxy';
    const invite = invitations.find((i) => i.subject_person_id === member.person_id);
    if (invite && !invite.responded_at) return 'invited';
    if (invite && invite.response === 'declined' && !invite.reopened_at) return 'declined';
    const latest = latestGrantForSubject(grants, member.person_id);
    if (latest) {
        if (latest.revoked_at) return 'revoked';
        if (latest.expires_at <= nowIso) return 'expired';
        if (latest.suspended_at) return 'revoked';
    }
    return 'not_requested';
}

/** The four visible node states. Expired and revoked resolve to no coverage yet. */
export function nodeCoverageLabel(state: CoverageState): string {
    switch (state) {
        case 'covered_self': return 'Covered directly';
        case 'covered_by_proxy': return 'Covered under a documented proxy';
        case 'invited': return 'Invited and awaiting response';
        case 'sealed_post_passing': return 'Sealed after passing';
        default: return 'No coverage yet';
    }
}

export function isCovered(state: CoverageState): boolean {
    return state === 'covered_self' || state === 'covered_by_proxy';
}

/** One authorized view of one account for one covered member. */
export interface AuthorizedAccountView {
    account_id: string;
    account_label: string;
    institution_name: string;
    account_kind: AccountKind;
    holder_person_id: string;
    grant_id: string;
    scope: OversightScope;
    fully_covered: boolean;
    authorized_balance: number;
    authorized_obligation: number;
    as_of: string | null;
}

/**
 * Rule 10, enforced at computation time. An account contributes only through
 * grants that explicitly include it. A joint account is fully covered only
 * when EVERY holder has an active grant that includes it; otherwise each
 * granting holder contributes only their equal share and the view is marked
 * partially covered. Nothing is ever estimated for an uncovered holder.
 */
export function authorizedAccountViews(
    accounts: FinancialAccountFacts[],
    grants: OversightGrant[],
    nowIso: string,
): AuthorizedAccountView[] {
    const active = grants.filter((g) => isGrantActive(g, nowIso));
    const views: AuthorizedAccountView[] = [];
    for (const account of accounts) {
        if (account.balance === null && account.total_obligation === 0) continue;
        const holderGrants = new Map<string, OversightGrant>();
        for (const holder of account.holders) {
            const grant = active.find(
                (g) => g.subject_person_id === holder && g.included_account_ids.includes(account.account_id),
            );
            if (grant) holderGrants.set(holder, grant);
        }
        if (holderGrants.size === 0) continue;
        const fully = holderGrants.size === account.holders.length;
        // Every holder owns an equal share of a shared account. Granting
        // holders contribute their share; a non-granting holder's share is
        // excluded entirely, never estimated. Summing member views therefore
        // yields the full balance only when every holder has granted.
        const share = 1 / account.holders.length;
        for (const [holder, grant] of holderGrants) {
            views.push({
                account_id: account.account_id,
                account_label: account.account_label,
                institution_name: account.institution_name,
                account_kind: account.account_kind,
                holder_person_id: holder,
                grant_id: grant.grant_id,
                scope: grant.scope,
                fully_covered: fully,
                authorized_balance: (account.balance ?? 0) * share,
                authorized_obligation: grant.scope === 'balances_only' ? 0 : account.total_obligation * share,
                as_of: account.as_of,
            });
        }
    }
    return views;
}

export interface MemberReadiness {
    person_id: string;
    readiness: number | null;
    liquid: number;
    debts: number;
    monthly_obligation: number;
    accounts: AuthorizedAccountView[];
}

/**
 * Per-member readiness from authorized values only. Sixty percent buffer
 * (liquid against six months of monthly obligations), forty percent balance
 * (assets against assets plus debts). Returns null readiness when the member
 * has no authorized account values at all, so absence is never scored.
 */
export function computeMemberReadiness(personId: string, views: AuthorizedAccountView[]): MemberReadiness {
    const mine = views.filter((v) => v.holder_person_id === personId);
    if (mine.length === 0) {
        return { person_id: personId, readiness: null, liquid: 0, debts: 0, monthly_obligation: 0, accounts: [] };
    }
    let liquid = 0;
    let debts = 0;
    let monthly = 0;
    for (const view of mine) {
        const bal = view.authorized_balance;
        if (view.account_kind === 'depository' || view.account_kind === 'investment') {
            if (bal > 0) liquid += bal; else debts += Math.abs(bal);
        } else if (view.account_kind === 'credit' || view.account_kind === 'loan' || view.account_kind === 'mortgage') {
            debts += Math.abs(bal);
        } else if (bal > 0) {
            liquid += bal;
        } else {
            debts += Math.abs(bal);
        }
        monthly += view.authorized_obligation;
    }
    const bufferMonths = monthly > 0 ? liquid / monthly : (liquid > 0 ? 6 : 0);
    const bufferScore = Math.min(1, bufferMonths / 6) * 100;
    const balanceScore = (liquid + debts) > 0 ? (liquid / (liquid + debts)) * 100 : 0;
    const readiness = Math.round(0.6 * bufferScore + 0.4 * balanceScore);
    return { person_id: personId, readiness, liquid, debts, monthly_obligation: monthly, accounts: mine };
}

export interface HouseholdScore {
    readiness: number | null;
    coverage_confidence: number;
    covered_weight: number;
    total_weight: number;
    partially_covered_accounts: number;
    members: Array<{
        person_id: string;
        full_name: string;
        state: CoverageState;
        weight: number;
        readiness: number | null;
        contribution: number;
    }>;
}

/**
 * Household Financial Readiness is the weighted mean over covered members
 * with authorized values. Uncovered members never enter the readiness
 * denominator, so a coverage gap can never raise the score; it lowers
 * Coverage Confidence instead. The two numbers are never blended.
 */
export function computeHouseholdScore(
    members: HouseholdMemberFacts[],
    grants: OversightGrant[],
    invitations: OversightInvitation[],
    accounts: FinancialAccountFacts[],
    nowIso: string,
): HouseholdScore {
    return scoreFromViews(members, grants, invitations, authorizedAccountViews(accounts, grants, nowIso), nowIso);
}

/**
 * Same score computed from already-authorized account views. The real-mode
 * store feeds this with rows the database gate returned, so the client never
 * needs, and never receives, unauthorized values to do its arithmetic.
 */
export function scoreFromViews(
    members: HouseholdMemberFacts[],
    grants: OversightGrant[],
    invitations: OversightInvitation[],
    views: AuthorizedAccountView[],
    nowIso: string,
): HouseholdScore {
    const living = members.filter((m) => !m.death_date);
    const partialAccounts = new Set(views.filter((v) => !v.fully_covered).map((v) => v.account_id));

    let coveredWeight = 0;
    let totalWeight = 0;
    let weightedSum = 0;
    let readinessWeight = 0;

    const rows: HouseholdScore['members'] = living.map((member) => {
        const state = deriveCoverageState(member, grants, invitations, nowIso);
        const weight = member.dependency_weight;
        totalWeight += weight;
        const covered = isCovered(state);
        if (covered) coveredWeight += weight;
        const detail = covered ? computeMemberReadiness(member.person_id, views) : null;
        const readiness = detail && detail.readiness !== null ? detail.readiness : null;
        if (covered && readiness !== null) {
            weightedSum += readiness * weight;
            readinessWeight += weight;
        }
        return {
            person_id: member.person_id,
            full_name: member.full_name,
            state,
            weight,
            readiness,
            contribution: 0,
        };
    });

    const readiness = readinessWeight > 0 ? Math.round(weightedSum / readinessWeight) : null;
    for (const row of rows) {
        row.contribution = row.readiness !== null && readinessWeight > 0
            ? Math.round((row.weight / readinessWeight) * 100)
            : 0;
    }

    const rawConfidence = totalWeight > 0 ? (coveredWeight / totalWeight) * 100 : 0;
    const confidence = Math.max(0, Math.min(100, Math.round(rawConfidence - partialAccounts.size * 8)));

    return {
        readiness,
        coverage_confidence: confidence,
        covered_weight: coveredWeight,
        total_weight: totalWeight,
        partially_covered_accounts: partialAccounts.size,
        members: rows,
    };
}

/* ------------------------------------------------------------------ */
/* Michael's Attestation                                               */
/* ------------------------------------------------------------------ */

export interface AttestationFacts {
    ok: true;
    covered_adults: number;
    total_adults: number;
    uncovered_adults: number;
    minors_covered_by_proxy: number;
    nearest_expiry: string | null;
    people: Array<{
        person_id: string;
        full_name: string;
        state: CoverageState;
        scope: OversightScope | null;
        basis: AuthorityBasis | null;
        expires_at: string | null;
        document_label: string | null;
    }>;
}

export interface AttestationUnavailable {
    ok: false;
    reason: string;
}

export type Attestation = AttestationFacts | AttestationUnavailable;

const NUMBER_WORDS = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten'];
function numberWord(n: number): string {
    return n >= 0 && n < NUMBER_WORDS.length ? NUMBER_WORDS[n] : String(n);
}
function capitalize(word: string): string {
    return word.charAt(0).toUpperCase() + word.slice(1);
}

export function formatLongDate(iso: string): string {
    const date = new Date(iso);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

export function buildAttestationFacts(
    members: HouseholdMemberFacts[],
    grants: OversightGrant[],
    invitations: OversightInvitation[],
    nowIso: string,
): AttestationFacts {
    const living = members.filter((m) => !m.death_date);
    const adults = living.filter((m) => m.role !== 'minor');
    let coveredAdults = 0;
    let minorsByProxy = 0;
    let nearest: string | null = null;

    const people = living.map((member) => {
        const state = deriveCoverageState(member, grants, invitations, nowIso);
        const active = grants.find((g) => g.subject_person_id === member.person_id && isGrantActive(g, nowIso)) || null;
        if (isCovered(state)) {
            if (member.role === 'minor') minorsByProxy += 1;
            else coveredAdults += 1;
            if (active && (!nearest || active.expires_at < nearest)) nearest = active.expires_at;
        }
        return {
            person_id: member.person_id,
            full_name: member.full_name,
            state,
            scope: active?.scope ?? null,
            basis: active?.authority_basis ?? null,
            expires_at: active?.expires_at ?? null,
            document_label: active?.authority_document_label ?? null,
        };
    });

    return {
        ok: true,
        covered_adults: coveredAdults,
        total_adults: adults.length,
        uncovered_adults: Math.max(0, adults.length - coveredAdults),
        minors_covered_by_proxy: minorsByProxy,
        nearest_expiry: nearest,
        people,
    };
}

/** The one line under the Financial readiness bar on the Trinity Overview. */
export function composeOverviewLine(attestation: Attestation): string {
    if (!attestation.ok) {
        return 'I cannot confirm current authorizations right now, so Gabriel’s household figures are hidden until I can.';
    }
    if (attestation.covered_adults === 0 && attestation.minors_covered_by_proxy === 0) {
        return 'Gabriel is not authorized to see anyone’s finances in this household yet. Financial readiness stays unscored until at least one member grants access.';
    }
    const uncovered = attestation.uncovered_adults === 0
        ? 'Every adult in the household has granted access.'
        : attestation.uncovered_adults === 1
            ? 'One member has not granted access.'
            : `${capitalize(numberWord(attestation.uncovered_adults))} members have not granted access.`;
    const expiry = attestation.nearest_expiry
        ? ` The current authorizations run through ${formatLongDate(attestation.nearest_expiry)}.`
        : '';
    return `Gabriel is authorized to review finances for ${attestation.covered_adults} of the ${attestation.total_adults} adults in this household. ${uncovered}${expiry}`;
}

/** The full Standing Attestation in St. Michael's voice. */
export function composeMichaelStatement(attestation: Attestation): string {
    if (!attestation.ok) {
        return 'I cannot confirm current authorizations right now, so Gabriel’s household figures are hidden until I can.';
    }
    if (attestation.covered_adults === 0 && attestation.minors_covered_by_proxy === 0) {
        return 'Gabriel is not authorized to see anyone’s finances in this household yet. Financial readiness stays unscored until at least one member grants access. Coverage is granted from the Family Tree, person by person, and only with each member’s verified consent.';
    }
    const parts: string[] = ['I have verified consent for Gabriel to review household finances.'];
    if (attestation.covered_adults > 0) {
        parts.push(`${capitalize(numberWord(attestation.covered_adults))} ${attestation.covered_adults === 1 ? 'adult' : 'adults'} granted access directly.`);
    }
    if (attestation.minors_covered_by_proxy > 0) {
        parts.push(`${capitalize(numberWord(attestation.minors_covered_by_proxy))} ${attestation.minors_covered_by_proxy === 1 ? 'minor is' : 'minors are'} covered under a guardianship on file.`);
    }
    if (attestation.uncovered_adults > 0) {
        parts.push(`${capitalize(numberWord(attestation.uncovered_adults))} ${attestation.uncovered_adults === 1 ? 'adult has' : 'adults have'} not granted access, and Gabriel does not see their accounts, balances, or obligations anywhere in this product.`);
    } else {
        parts.push('Every adult in the household has granted access.');
    }
    if (attestation.nearest_expiry) {
        parts.push(`The earliest authorization expires on ${formatLongDate(attestation.nearest_expiry)}, and I will ask for renewal 30 days beforehand.`);
    }
    return parts.join(' ');
}

/** The same facts stated from Gabriel's side, shown where his numbers are. */
export function composeGabrielStatement(attestation: Attestation): string {
    if (!attestation.ok) {
        return 'I cannot confirm my current authorizations, so my household figures are hidden until St. Michael can verify them.';
    }
    const seen = attestation.covered_adults + attestation.minors_covered_by_proxy;
    if (seen === 0) {
        return 'I am not authorized to see anyone in this household yet. Nothing is computed until a member grants access from the Family Tree.';
    }
    const unseen = attestation.uncovered_adults;
    const first = `I can see ${numberWord(seen)} ${seen === 1 ? 'member' : 'members'} of this household.`;
    const second = unseen === 0
        ? 'I can see every member who has granted access, and no one is outside my view without their choice.'
        : `I cannot see ${numberWord(unseen)}.`;
    return `${first} ${second} Every household figure here is computed only from what I am permitted to read, and I do not estimate the rest.`;
}

/* ------------------------------------------------------------------ */
/* Consent receipt                                                     */
/* ------------------------------------------------------------------ */

export const SCOPE_LABEL: Record<OversightScope, string> = {
    balances_only: 'Balances only',
    balances_and_obligations: 'Balances and obligations',
    balances_obligations_and_transactions: 'Balances, obligations, and transactions',
    full_ledger: 'Full ledger',
};

export const BASIS_LABEL: Record<AuthorityBasis, string> = {
    self: 'Self, direct consent',
    guardian_of_minor: 'Guardian of a minor',
    power_of_attorney: 'Power of attorney',
    trustee: 'Trustee',
    court_appointed_guardian: 'Court appointed guardian',
    executor_or_administrator: 'Executor or administrator',
};

/**
 * One page consent receipt, exportable from the Legacy Vault surface. Plain
 * printable HTML, generated from the live grant set.
 */
export function buildConsentReceiptHtml(
    householdName: string,
    attestation: Attestation,
    grants: OversightGrant[],
    memberName: (personId: string) => string,
    generatedAtIso: string,
): string {
    const rows = grants
        .map((g) => {
            const status = g.revoked_at
                ? `Revoked ${formatLongDate(g.revoked_at)}`
                : g.closed_by_passing_at
                    ? 'Closed after passing'
                    : g.suspended_at
                        ? 'Suspended pending re-consent'
                        : new Date(g.expires_at).getTime() <= new Date(generatedAtIso).getTime()
                            ? `Expired ${formatLongDate(g.expires_at)}`
                            : `Active through ${formatLongDate(g.expires_at)}`;
            return `<tr>
<td>${escapeHtml(memberName(g.subject_person_id))}</td>
<td>${escapeHtml(BASIS_LABEL[g.authority_basis])}${g.authority_document_label ? `<br/><small>${escapeHtml(g.authority_document_label)}</small>` : ''}</td>
<td>${escapeHtml(SCOPE_LABEL[g.scope])}</td>
<td>${formatLongDate(g.granted_at)}</td>
<td>${escapeHtml(status)}</td>
</tr>`;
        })
        .join('\n');

    const statement = composeMichaelStatement(attestation);
    return `<!doctype html>
<html><head><meta charset="utf-8"/><title>Consent receipt, ${escapeHtml(householdName)}</title>
<style>
body{font-family:Georgia,serif;color:#1a1a1a;max-width:720px;margin:32px auto;padding:0 16px;}
h1{font-size:20px;border-bottom:2px solid #b08d2f;padding-bottom:8px;}
p.statement{font-style:italic;line-height:1.5;}
table{width:100%;border-collapse:collapse;font-size:13px;margin-top:16px;}
th,td{border:1px solid #d0c8b0;padding:6px 8px;text-align:left;vertical-align:top;}
th{background:#f5f0e0;}
footer{margin-top:24px;font-size:11px;color:#666;}
</style></head><body>
<h1>Financial Oversight Consent Receipt</h1>
<p><strong>Household:</strong> ${escapeHtml(householdName)}<br/>
<strong>Generated:</strong> ${formatLongDate(generatedAtIso)}</p>
<p class="statement">St. Michael attests: ${escapeHtml(statement)}</p>
<table>
<thead><tr><th>Person</th><th>Authority basis</th><th>Scope</th><th>Granted</th><th>Status</th></tr></thead>
<tbody>${rows || '<tr><td colspan="5">No oversight grants exist in this household.</td></tr>'}</tbody>
</table>
<footer>This receipt was generated from the live permission record at the moment of export. Each subject can revoke
their own coverage instantly from their watcher panel, at every plan tier, and can read and export the full audit
log of every read performed under these grants.</footer>
</body></html>`;
}

function escapeHtml(text: string): string {
    return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/* ------------------------------------------------------------------ */
/* Audit hash chain (mirrors the database trigger)                     */
/* ------------------------------------------------------------------ */

/**
 * Deterministic hash for the append-only audit chain. The demo engine uses
 * this so demo audit logs are tamper-evident in exactly the same way the
 * database chain is. Not cryptographic strength in the demo (no SubtleCrypto
 * dependency in the hot path), but chained: editing any entry breaks every
 * later hash.
 */
export function chainHash(prevHash: string, eventType: string, detail: string, createdAt: string): string {
    const input = `${prevHash}|${eventType}|${detail}|${createdAt}`;
    let h1 = 0x811c9dc5;
    let h2 = 0x01000193;
    for (let i = 0; i < input.length; i++) {
        const c = input.charCodeAt(i);
        h1 = Math.imul(h1 ^ c, 0x01000193) >>> 0;
        h2 = (Math.imul(h2, 31) + c) >>> 0;
    }
    return `${h1.toString(16).padStart(8, '0')}${h2.toString(16).padStart(8, '0')}`;
}

export function verifyAuditChain(events: OversightAuditEvent[]): boolean {
    let prev = '';
    for (const event of [...events].sort((a, b) => a.id - b.id)) {
        if (event.prev_hash !== prev) return false;
        const expected = chainHash(prev, event.event_type, JSON.stringify(event.detail), event.created_at);
        if (event.event_hash !== expected) return false;
        prev = event.event_hash;
    }
    return true;
}

/** Age helper for the majority rule. Returns null when birth date unknown. */
export function majorityDateIso(birthDate: string | null, majorityAge = 18): string | null {
    if (!birthDate) return null;
    const birth = new Date(birthDate);
    if (Number.isNaN(birth.getTime())) return null;
    const majority = new Date(birth);
    majority.setFullYear(birth.getFullYear() + majorityAge);
    return majority.toISOString();
}

/** Days until an ISO timestamp, floored. Negative when already past. */
export function daysUntil(iso: string, nowIso: string): number {
    return Math.floor((new Date(iso).getTime() - new Date(nowIso).getTime()) / 86400000);
}
