/**
 * Household financial oversight store.
 *
 * One API for every surface (Family Tree, Trinity, Gabriel hub, Michael hub,
 * Monitor). Real sessions run entirely through the Supabase RPCs, where the
 * authorization gate and the append-only audit live server side. Demo
 * sessions run the identical rules locally through the shared pure logic in
 * oversight.ts, in a separate localStorage namespace, and never touch the
 * network. When the live grant set cannot be read, surfaces fail visible
 * through an unavailable attestation, never silently.
 */
import { supabase } from '../supabase';
import { isDemoAuthEnabled } from '../demo-auth';
import { getFamilyMembers, getCanonicalMemberId, type FamilyMember } from '../joseph/genealogy';
import {
    type Attestation,
    type AuthorizedAccountView,
    type AuthorityBasis,
    type CoverageState,
    type FinancialAccountFacts,
    type HouseholdMemberFacts,
    type HouseholdRole,
    type HouseholdScore,
    type OversightAuditEvent,
    type OversightGrant,
    type OversightInvitation,
    type OversightScope,
    authorizedAccountViews,
    buildAttestationFacts,
    buildConsentReceiptHtml,
    chainHash,
    defaultWeight,
    deriveCoverageState,
    scoreFromViews,
} from './oversight';

export interface AccountMeta {
    account_id: string;
    institution_name: string;
    account_label: string;
    account_kind: FinancialAccountFacts['account_kind'];
    holders: string[];
    currency: string;
    is_active: boolean;
}

export interface OversightAlertRow {
    id: string;
    alert_type: string;
    audience: 'subject' | 'grantee' | 'trusted_contact';
    subject_person_id: string | null;
    message: string;
    created_at: string;
}

export interface OversightOverview {
    ok: boolean;
    errorReason: string | null;
    householdId: string | null;
    householdName: string;
    selfPersonId: string | null;
    members: HouseholdMemberFacts[];
    grants: OversightGrant[];
    invitations: OversightInvitation[];
    accounts: AccountMeta[];
    alerts: OversightAlertRow[];
    attestation: Attestation;
}

export interface OversightPicture {
    ok: boolean;
    errorReason: string | null;
    views: AuthorizedAccountView[];
    score: HouseholdScore | null;
}

export const OVERSIGHT_UPDATED_EVENT = 'everafter:oversight-updated';

function notifyUpdated(): void {
    if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent(OVERSIGHT_UPDATED_EVENT));
    }
}

function nowIso(): string {
    return new Date().toISOString();
}

function isDemoSession(): boolean {
    return isDemoAuthEnabled();
}

/* ------------------------------------------------------------------ */
/* Members from the canonical tree                                     */
/* ------------------------------------------------------------------ */

function roleFor(member: FamilyMember): HouseholdRole {
    if (!member.birthDate) return 'adult';
    const birth = new Date(member.birthDate);
    if (Number.isNaN(birth.getTime())) return 'adult';
    const eighteenth = new Date(birth);
    eighteenth.setFullYear(birth.getFullYear() + 18);
    return eighteenth.getTime() > Date.now() ? 'minor' : 'adult';
}

/** The product's primary-member heuristic: first living generation 0 node. */
export function selfClientId(): string | null {
    const members = getFamilyMembers();
    const living = members.filter((m) => !m.deathDate);
    const primary = living.find((m) => m.generation === 0) || living[0] || members[0];
    return primary ? primary.id : null;
}

function localMemberFacts(): HouseholdMemberFacts[] {
    const self = selfClientId();
    return getFamilyMembers().map((member) => {
        const role = roleFor(member);
        return {
            person_id: member.id,
            client_id: member.id,
            full_name: `${member.firstName} ${member.lastName}`.trim(),
            role,
            birth_date: member.birthDate || null,
            death_date: member.deathDate || null,
            dependency_weight: defaultWeight(role, false),
            is_primary_earner: false,
            is_account_holder_self: member.id === self,
        };
    });
}

/* ------------------------------------------------------------------ */
/* Demo and offline engine                                             */
/* ------------------------------------------------------------------ */

interface LocalAccountRecord extends AccountMeta {
    snapshots: Array<{ as_of: string; balance: number; total_obligation: number }>;
}

interface LocalOversightState {
    householdId: string;
    householdName: string;
    grants: OversightGrant[];
    invitations: OversightInvitation[];
    accounts: LocalAccountRecord[];
    audit: OversightAuditEvent[];
    alerts: OversightAlertRow[];
    nextAuditId: number;
}

function storageKey(): string {
    return isDemoSession() ? 'everafter_oversight:demo' : 'everafter_oversight:local';
}

function emptyState(): LocalOversightState {
    return {
        householdId: 'household-local',
        householdName: 'Primary household',
        grants: [],
        invitations: [],
        accounts: [],
        audit: [],
        alerts: [],
        nextAuditId: 1,
    };
}

function readLocalState(): LocalOversightState {
    if (typeof window === 'undefined') return emptyState();
    try {
        const raw = window.localStorage.getItem(storageKey());
        if (!raw) return emptyState();
        const parsed = JSON.parse(raw) as LocalOversightState;
        if (!parsed || !Array.isArray(parsed.grants)) return emptyState();
        return { ...emptyState(), ...parsed };
    } catch {
        return emptyState();
    }
}

function writeLocalState(state: LocalOversightState): void {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(storageKey(), JSON.stringify(state));
}

function appendLocalAudit(
    state: LocalOversightState,
    eventType: string,
    subjectPersonId: string | null,
    grantId: string | null,
    detail: Record<string, unknown>,
): void {
    const createdAt = nowIso();
    const prev = state.audit.length > 0 ? state.audit[state.audit.length - 1].event_hash : '';
    state.audit.push({
        id: state.nextAuditId,
        event_type: eventType,
        subject_person_id: subjectPersonId,
        grant_id: grantId,
        detail,
        created_at: createdAt,
        prev_hash: prev,
        event_hash: chainHash(prev, eventType, JSON.stringify(detail), createdAt),
    });
    state.nextAuditId += 1;
}

function pushLocalAlertBothSides(
    state: LocalOversightState,
    alertType: string,
    subjectPersonId: string | null,
    message: string,
    includeTrusted = false,
): void {
    const created = nowIso();
    const mk = (audience: OversightAlertRow['audience']): OversightAlertRow => ({
        id: `alert-${Math.random().toString(36).slice(2, 10)}-${audience}`,
        alert_type: alertType,
        audience,
        subject_person_id: subjectPersonId,
        message,
        created_at: created,
    });
    state.alerts.unshift(mk('subject'), mk('grantee'));
    if (includeTrusted) state.alerts.unshift(mk('trusted_contact'));
    state.alerts = state.alerts.slice(0, 60);
}

/** Rule 6 locally: a grant whose subject or grantor left the tree suspends. */
function reconcileLocalGrants(state: LocalOversightState, members: HouseholdMemberFacts[]): boolean {
    const present = new Set(members.map((m) => m.person_id));
    let changed = false;
    for (const grant of state.grants) {
        const gone = !present.has(grant.subject_person_id) || !present.has(grant.granted_by_person_id);
        if (gone && !grant.suspended_at && !grant.revoked_at && !grant.closed_by_passing_at) {
            grant.suspended_at = nowIso();
            grant.suspension_reason = 'Household membership ended; explicit re-consent required.';
            appendLocalAudit(state, 'grant_suspended', grant.subject_person_id, grant.grant_id, {
                reason: grant.suspension_reason,
            });
            pushLocalAlertBothSides(state, 'relationship_change_suspension', grant.subject_person_id,
                'A household relationship change paused this oversight authorization. It stays paused until consent is given again.');
            changed = true;
        }
        const subject = members.find((m) => m.person_id === grant.subject_person_id);
        if (subject?.death_date && !grant.closed_by_passing_at && !grant.revoked_at) {
            grant.closed_by_passing_at = nowIso();
            appendLocalAudit(state, 'grant_closed_by_passing', grant.subject_person_id, grant.grant_id, {
                note: 'Verified passing closed this authorization. Further access follows the Inheritance and Legacy Vault path under a documented executor or administrator instrument.',
            });
            changed = true;
        }
    }
    return changed;
}

function localAccountFacts(state: LocalOversightState): FinancialAccountFacts[] {
    return state.accounts
        .filter((a) => a.is_active)
        .map((account) => {
            const latest = [...account.snapshots].sort((a, b) => (a.as_of < b.as_of ? 1 : -1))[0] || null;
            return {
                account_id: account.account_id,
                institution_name: account.institution_name,
                account_label: account.account_label,
                account_kind: account.account_kind,
                holders: account.holders,
                currency: account.currency,
                balance: latest ? latest.balance : null,
                total_obligation: latest ? latest.total_obligation : 0,
                as_of: latest ? latest.as_of : null,
            };
        });
}

function localOverview(): OversightOverview {
    const state = readLocalState();
    const members = localMemberFacts();
    if (reconcileLocalGrants(state, members)) writeLocalState(state);
    const attestation = buildAttestationFacts(members, state.grants, state.invitations, nowIso());
    return {
        ok: true,
        errorReason: null,
        householdId: state.householdId,
        householdName: state.householdName,
        selfPersonId: selfClientId(),
        members,
        grants: state.grants,
        invitations: state.invitations,
        accounts: state.accounts.map((record) => ({
            account_id: record.account_id,
            institution_name: record.institution_name,
            account_label: record.account_label,
            account_kind: record.account_kind,
            holders: record.holders,
            currency: record.currency,
            is_active: record.is_active,
        })),
        alerts: state.alerts,
        attestation,
    };
}

function localPicture(): OversightPicture {
    const state = readLocalState();
    const members = localMemberFacts();
    if (reconcileLocalGrants(state, members)) writeLocalState(state);
    const now = nowIso();
    // Demo parity with the server: build views under the same rule 10 logic,
    // then log one financial_read audit event per grant actually used.
    const views = authorizedAccountViews(localAccountFacts(state), state.grants, now);
    const score = scoreFromViews(members, state.grants, state.invitations, views, now);
    const grantsUsed = Array.from(new Set(views.map((v) => v.grant_id)));
    for (const grantId of grantsUsed) {
        const grant = state.grants.find((g) => g.grant_id === grantId);
        appendLocalAudit(state, 'financial_read', grant?.subject_person_id ?? null, grantId, {
            surface: 'household_picture',
        });
    }
    if (grantsUsed.length > 0) writeLocalState(state);
    return { ok: true, errorReason: null, views, score };
}

function generateId(prefix: string): string {
    const rand = Math.random().toString(36).slice(2, 10);
    return `${prefix}-${Date.now().toString(36)}-${rand}`;
}

interface GrantInput {
    subjectPersonId: string;
    scope: OversightScope;
    includedAccountIds: string[];
    purpose: string;
    expiresAt: string | null;
    verificationMethod: string;
}

interface ProxyGrantInput extends GrantInput {
    basis: Exclude<AuthorityBasis, 'self'>;
    grantedByPersonId: string;
    documentId: string;
    documentLabel: string;
}

function defaultExpiry(): string {
    const date = new Date();
    date.setMonth(date.getMonth() + 12);
    return date.toISOString();
}

function clampGuardianExpiry(subject: HouseholdMemberFacts | undefined, expiresAt: string): string {
    if (!subject?.birth_date) return expiresAt;
    const birth = new Date(subject.birth_date);
    if (Number.isNaN(birth.getTime())) return expiresAt;
    const majority = new Date(birth);
    majority.setFullYear(birth.getFullYear() + 18);
    return majority.getTime() < new Date(expiresAt).getTime() ? majority.toISOString() : expiresAt;
}

function localGrantSelf(input: GrantInput): { ok: boolean; error?: string } {
    if (!input.verificationMethod.trim()) {
        return { ok: false, error: 'State how the member’s consent was verified before recording it.' };
    }
    const state = readLocalState();
    const grant: OversightGrant = {
        grant_id: generateId('grant'),
        household_id: state.householdId,
        subject_person_id: input.subjectPersonId,
        granted_by_person_id: input.subjectPersonId,
        authority_basis: 'self',
        authority_document_id: null,
        authority_document_label: null,
        scope: input.scope,
        included_account_ids: input.includedAccountIds,
        purpose_statement: input.purpose,
        granted_at: nowIso(),
        effective_from: nowIso(),
        expires_at: input.expiresAt || defaultExpiry(),
        review_due_at: null,
        revoked_at: null,
        revoked_by_person_id: null,
        revocation_reason: null,
        suspended_at: null,
        suspension_reason: null,
        closed_by_passing_at: null,
        verification_method: input.verificationMethod,
    };
    state.grants.push(grant);
    appendLocalAudit(state, 'grant_created', grant.subject_person_id, grant.grant_id, { basis: 'self' });
    pushLocalAlertBothSides(state, 'new_grant_created', grant.subject_person_id,
        'A new financial oversight authorization was created with the member’s consent.');
    writeLocalState(state);
    notifyUpdated();
    return { ok: true };
}

function localGrantProxy(input: ProxyGrantInput): { ok: boolean; error?: string } {
    if (!input.documentId.trim() || !input.documentLabel.trim()) {
        return {
            ok: false,
            error: 'Proxy authority requires a documented instrument in the Legacy Vault: guardianship, power of attorney, trusteeship, court appointment, or letters testamentary.',
        };
    }
    const state = readLocalState();
    const members = localMemberFacts();
    const subject = members.find((m) => m.person_id === input.subjectPersonId);
    const expires = clampGuardianExpiry(
        input.basis === 'guardian_of_minor' ? subject : undefined,
        input.expiresAt || defaultExpiry(),
    );
    const grant: OversightGrant = {
        grant_id: generateId('grant'),
        household_id: state.householdId,
        subject_person_id: input.subjectPersonId,
        granted_by_person_id: input.grantedByPersonId,
        authority_basis: input.basis,
        authority_document_id: input.documentId,
        authority_document_label: input.documentLabel,
        scope: input.scope,
        included_account_ids: input.includedAccountIds,
        purpose_statement: input.purpose,
        granted_at: nowIso(),
        effective_from: nowIso(),
        expires_at: expires,
        review_due_at: new Date(new Date(expires).getTime() - 30 * 86400000).toISOString(),
        revoked_at: null,
        revoked_by_person_id: null,
        revocation_reason: null,
        suspended_at: null,
        suspension_reason: null,
        closed_by_passing_at: null,
        verification_method: 'documented_instrument_on_file',
    };
    state.grants.push(grant);
    appendLocalAudit(state, 'grant_created', grant.subject_person_id, grant.grant_id, {
        basis: input.basis,
        document_id: input.documentId,
    });
    pushLocalAlertBothSides(state, 'new_grant_created', grant.subject_person_id,
        'A proxy financial oversight authorization was recorded with its instrument on file.');
    writeLocalState(state);
    notifyUpdated();
    return { ok: true };
}

function localRevoke(grantId: string, reason: string): { ok: boolean; error?: string } {
    const state = readLocalState();
    const grant = state.grants.find((g) => g.grant_id === grantId);
    if (!grant) return { ok: false, error: 'Authorization not found.' };
    if (grant.revoked_at) return { ok: true };
    grant.revoked_at = nowIso();
    grant.revoked_by_person_id = grant.subject_person_id;
    grant.revocation_reason = reason.trim() || null;
    appendLocalAudit(state, 'grant_revoked', grant.subject_person_id, grant.grant_id, {
        reason: grant.revocation_reason,
    });
    pushLocalAlertBothSides(state, 'coverage_revoked', grant.subject_person_id,
        'A financial oversight authorization was revoked. Gabriel no longer sees this member’s accounts anywhere in the product.');
    writeLocalState(state);
    notifyUpdated();
    return { ok: true };
}

function localRequestCoverage(
    subjectPersonId: string,
    requestedByPersonId: string,
    scope: OversightScope,
    purpose: string,
): { ok: boolean; error?: string } {
    const state = readLocalState();
    const existing = state.invitations.find((i) => i.subject_person_id === subjectPersonId);
    if (existing) {
        if (existing.response === 'declined' && !existing.reopened_at) {
            return {
                ok: false,
                error: 'This member declined coverage. The product will not ask again unless they re-open the conversation.',
            };
        }
        return { ok: true };
    }
    state.invitations.push({
        invitation_id: generateId('invite'),
        household_id: state.householdId,
        subject_person_id: subjectPersonId,
        requested_by_person_id: requestedByPersonId,
        requested_scope: scope,
        purpose_statement: purpose,
        created_at: nowIso(),
        reminder_sent_at: null,
        responded_at: null,
        response: null,
        reopened_at: null,
    });
    appendLocalAudit(state, 'invitation_sent', subjectPersonId, null, { scope });
    writeLocalState(state);
    notifyUpdated();
    return { ok: true };
}

function localRemind(invitationId: string): { ok: boolean; error?: string } {
    const state = readLocalState();
    const invitation = state.invitations.find((i) => i.invitation_id === invitationId);
    if (!invitation) return { ok: false, error: 'Invitation not found.' };
    if (invitation.responded_at) return { ok: false, error: 'This invitation has already been answered.' };
    if (invitation.reminder_sent_at) {
        return { ok: false, error: 'Only one reminder is ever sent for a coverage invitation.' };
    }
    invitation.reminder_sent_at = nowIso();
    appendLocalAudit(state, 'invitation_reminder', invitation.subject_person_id, null, {});
    writeLocalState(state);
    notifyUpdated();
    return { ok: true };
}

function localRespond(
    invitationId: string,
    accept: boolean,
    scope: OversightScope,
    accountIds: string[],
    verification: string,
): { ok: boolean; error?: string } {
    const state = readLocalState();
    const invitation = state.invitations.find((i) => i.invitation_id === invitationId);
    if (!invitation) return { ok: false, error: 'Invitation not found.' };
    if (invitation.responded_at && !invitation.reopened_at) {
        return { ok: false, error: 'This invitation has already been answered.' };
    }
    invitation.responded_at = nowIso();
    invitation.response = accept ? 'accepted' : 'declined';
    invitation.reopened_at = null;
    if (!accept) {
        appendLocalAudit(state, 'invitation_declined', invitation.subject_person_id, null, {});
        writeLocalState(state);
        notifyUpdated();
        return { ok: true };
    }
    writeLocalState(state);
    return localGrantSelf({
        subjectPersonId: invitation.subject_person_id,
        scope,
        includedAccountIds: accountIds,
        purpose: invitation.purpose_statement,
        expiresAt: null,
        verificationMethod: verification || 'authenticated_session',
    });
}

function localReopenInvitation(invitationId: string): { ok: boolean; error?: string } {
    const state = readLocalState();
    const invitation = state.invitations.find((i) => i.invitation_id === invitationId);
    if (!invitation) return { ok: false, error: 'Invitation not found.' };
    invitation.reopened_at = nowIso();
    appendLocalAudit(state, 'invitation_reopened', invitation.subject_person_id, null, {});
    writeLocalState(state);
    notifyUpdated();
    return { ok: true };
}

function localAccountUpsert(meta: Omit<AccountMeta, 'account_id' | 'is_active'> & { account_id?: string }): string {
    const state = readLocalState();
    if (meta.account_id) {
        const existing = state.accounts.find((a) => a.account_id === meta.account_id);
        if (existing) {
            existing.institution_name = meta.institution_name;
            existing.account_label = meta.account_label;
            existing.account_kind = meta.account_kind;
            existing.holders = meta.holders;
            existing.currency = meta.currency;
            writeLocalState(state);
            notifyUpdated();
            return existing.account_id;
        }
    }
    const id = generateId('acct');
    state.accounts.push({
        account_id: id,
        institution_name: meta.institution_name,
        account_label: meta.account_label,
        account_kind: meta.account_kind,
        holders: meta.holders,
        currency: meta.currency,
        is_active: true,
        snapshots: [],
    });
    writeLocalState(state);
    notifyUpdated();
    return id;
}

function localSnapshotAdd(accountId: string, balance: number, obligation: number): { ok: boolean; error?: string } {
    const state = readLocalState();
    const account = state.accounts.find((a) => a.account_id === accountId);
    if (!account) return { ok: false, error: 'Account not found.' };
    account.snapshots.push({ as_of: nowIso(), balance, total_obligation: obligation });
    writeLocalState(state);
    notifyUpdated();
    return { ok: true };
}

function localAudit(): OversightAuditEvent[] {
    return [...readLocalState().audit].reverse();
}

function localReceiptExport(): void {
    const state = readLocalState();
    appendLocalAudit(state, 'attestation_export', null, null, { kind: 'consent_receipt' });
    writeLocalState(state);
}

/* ------------------------------------------------------------------ */
/* Real (Supabase RPC) engine                                          */
/* ------------------------------------------------------------------ */

interface RawOverview {
    household: { id: string; name: string; owner_user_id: string; trusted_contact_person_id: string | null } | null;
    members: Array<Record<string, unknown>>;
    grants: Array<Record<string, unknown>>;
    invitations: Array<Record<string, unknown>>;
    accounts: Array<Record<string, unknown>>;
    alerts: Array<Record<string, unknown>>;
}

let cachedHouseholdId: string | null = null;

function mapOverview(raw: RawOverview): OversightOverview {
    const members: HouseholdMemberFacts[] = (raw.members || []).map((m) => ({
        person_id: String(m.person_id),
        client_id: (m.client_id as string) || null,
        full_name: String(m.full_name || 'Family member'),
        role: (m.role as HouseholdRole) || 'adult',
        birth_date: (m.birth_date as string) || null,
        death_date: (m.death_date as string) || null,
        dependency_weight: Number(m.dependency_weight ?? 1),
        is_primary_earner: Boolean(m.is_primary_earner),
        is_account_holder_self: Boolean(m.is_account_holder_self),
    }));
    const grants = (raw.grants || []) as unknown as OversightGrant[];
    const invitations = (raw.invitations || []) as unknown as OversightInvitation[];
    const self = members.find((m) => m.is_account_holder_self);
    return {
        ok: true,
        errorReason: null,
        householdId: raw.household?.id ?? null,
        householdName: raw.household?.name ?? 'Primary household',
        selfPersonId: self?.person_id ?? null,
        members,
        grants,
        invitations,
        accounts: (raw.accounts || []).map((a) => ({
            account_id: String(a.account_id),
            institution_name: String(a.institution_name),
            account_label: String(a.account_label),
            account_kind: (a.account_kind as AccountMeta['account_kind']) || 'depository',
            holders: (a.holders as string[]) || [],
            currency: String(a.currency || 'USD'),
            is_active: a.is_active !== false,
        })),
        alerts: (raw.alerts || []).map((al) => ({
            id: String(al.id),
            alert_type: String(al.alert_type),
            audience: (al.audience as OversightAlertRow['audience']) || 'grantee',
            subject_person_id: (al.subject_person_id as string) || null,
            message: String(al.message),
            created_at: String(al.created_at),
        })),
        attestation: buildAttestationFacts(members, grants, invitations, nowIso()),
    };
}

function unavailableOverview(reason: string): OversightOverview {
    return {
        ok: false,
        errorReason: reason,
        householdId: null,
        householdName: 'Primary household',
        selfPersonId: null,
        members: [],
        grants: [],
        invitations: [],
        accounts: [],
        alerts: [],
        attestation: { ok: false, reason },
    };
}

async function realOverview(): Promise<OversightOverview> {
    if (!supabase) return unavailableOverview('The authorization service is not configured.');
    try {
        const selfCanonical = (() => {
            const clientId = selfClientId();
            return clientId ? getCanonicalMemberId(clientId) || null : null;
        })();
        const { data, error } = await supabase.rpc('rpc_oversight_bootstrap', { p_self_person: selfCanonical });
        if (error) return unavailableOverview(error.message);
        const overview = mapOverview(data as RawOverview);
        cachedHouseholdId = overview.householdId;
        return overview;
    } catch (err) {
        return unavailableOverview(err instanceof Error ? err.message : 'The authorization service did not respond.');
    }
}

async function realHouseholdId(): Promise<string | null> {
    if (cachedHouseholdId) return cachedHouseholdId;
    const overview = await realOverview();
    return overview.householdId;
}

async function realPicture(overview: OversightOverview): Promise<OversightPicture> {
    if (!supabase || !overview.householdId) {
        return { ok: false, errorReason: overview.errorReason || 'The authorization service is not configured.', views: [], score: null };
    }
    try {
        const { data, error } = await supabase.rpc('rpc_oversight_picture', { p_household: overview.householdId });
        if (error) return { ok: false, errorReason: error.message, views: [], score: null };
        const views = (((data as { views?: unknown[] })?.views) || []) as unknown as AuthorizedAccountView[];
        const score = scoreFromViews(overview.members, overview.grants, overview.invitations, views, nowIso());
        return { ok: true, errorReason: null, views, score };
    } catch (err) {
        return {
            ok: false,
            errorReason: err instanceof Error ? err.message : 'The authorization service did not respond.',
            views: [],
            score: null,
        };
    }
}

async function realCall(fn: string, args: Record<string, unknown>): Promise<{ ok: boolean; error?: string }> {
    if (!supabase) return { ok: false, error: 'The authorization service is not configured.' };
    try {
        const { error } = await supabase.rpc(fn, args);
        if (error) return { ok: false, error: error.message };
        notifyUpdated();
        return { ok: true };
    } catch (err) {
        return { ok: false, error: err instanceof Error ? err.message : 'The authorization service did not respond.' };
    }
}

/* ------------------------------------------------------------------ */
/* Public API                                                          */
/* ------------------------------------------------------------------ */

export async function loadOversight(): Promise<OversightOverview> {
    if (isDemoSession()) return localOverview();
    return realOverview();
}

export async function loadPicture(overview?: OversightOverview): Promise<OversightPicture> {
    if (isDemoSession()) return localPicture();
    const base = overview && overview.ok ? overview : await realOverview();
    if (!base.ok) return { ok: false, errorReason: base.errorReason, views: [], score: null };
    return realPicture(base);
}

export async function grantSelfCoverage(input: GrantInput): Promise<{ ok: boolean; error?: string }> {
    if (isDemoSession()) return localGrantSelf(input);
    const household = await realHouseholdId();
    if (!household) return { ok: false, error: 'The household record could not be loaded.' };
    return realCall('rpc_oversight_grant_self', {
        p_household: household,
        p_subject_person: input.subjectPersonId,
        p_scope: input.scope,
        p_account_ids: input.includedAccountIds,
        p_purpose: input.purpose,
        p_expires_at: input.expiresAt,
        p_verification: input.verificationMethod,
    });
}

export async function grantProxyCoverage(input: ProxyGrantInput): Promise<{ ok: boolean; error?: string }> {
    if (isDemoSession()) return localGrantProxy(input);
    const household = await realHouseholdId();
    if (!household) return { ok: false, error: 'The household record could not be loaded.' };
    return realCall('rpc_oversight_grant_proxy', {
        p_household: household,
        p_subject_person: input.subjectPersonId,
        p_granted_by_person: input.grantedByPersonId,
        p_basis: input.basis,
        p_document: input.documentId,
        p_document_label: input.documentLabel,
        p_scope: input.scope,
        p_account_ids: input.includedAccountIds,
        p_purpose: input.purpose,
        p_expires_at: input.expiresAt,
    });
}

export async function revokeCoverage(grantId: string, reason = ''): Promise<{ ok: boolean; error?: string }> {
    if (isDemoSession()) return localRevoke(grantId, reason);
    return realCall('rpc_oversight_revoke', { p_grant: grantId, p_reason: reason });
}

export async function requestCoverage(
    subjectPersonId: string,
    requestedByPersonId: string,
    scope: OversightScope,
    purpose: string,
): Promise<{ ok: boolean; error?: string }> {
    if (isDemoSession()) return localRequestCoverage(subjectPersonId, requestedByPersonId, scope, purpose);
    const household = await realHouseholdId();
    if (!household) return { ok: false, error: 'The household record could not be loaded.' };
    return realCall('rpc_oversight_request_coverage', {
        p_household: household,
        p_subject_person: subjectPersonId,
        p_requested_by: requestedByPersonId,
        p_scope: scope,
        p_purpose: purpose,
    });
}

export async function sendInvitationReminder(invitationId: string): Promise<{ ok: boolean; error?: string }> {
    if (isDemoSession()) return localRemind(invitationId);
    return realCall('rpc_oversight_remind', { p_invitation: invitationId });
}

export async function respondToInvitation(
    invitationId: string,
    accept: boolean,
    scope: OversightScope,
    accountIds: string[],
    verification: string,
): Promise<{ ok: boolean; error?: string }> {
    if (isDemoSession()) return localRespond(invitationId, accept, scope, accountIds, verification);
    return realCall('rpc_oversight_respond', {
        p_invitation: invitationId,
        p_accept: accept,
        p_scope: scope,
        p_account_ids: accountIds,
        p_expires_at: null,
        p_verification: verification,
    });
}

export async function reopenInvitation(invitationId: string): Promise<{ ok: boolean; error?: string }> {
    if (isDemoSession()) return localReopenInvitation(invitationId);
    // Re-opening after a decline is the subject's own act; recorded as a new
    // invitation cycle server-side by updating reopened_at through respond.
    if (!supabase) return { ok: false, error: 'The authorization service is not configured.' };
    try {
        const { error } = await supabase
            .from('oversight_invitations')
            .update({ reopened_at: new Date().toISOString() })
            .eq('invitation_id', invitationId);
        if (error) return { ok: false, error: error.message };
        notifyUpdated();
        return { ok: true };
    } catch (err) {
        return { ok: false, error: err instanceof Error ? err.message : 'The authorization service did not respond.' };
    }
}

export async function upsertAccount(
    meta: Omit<AccountMeta, 'account_id' | 'is_active'> & { account_id?: string },
): Promise<{ ok: boolean; accountId?: string; error?: string }> {
    if (isDemoSession()) return { ok: true, accountId: localAccountUpsert(meta) };
    const household = await realHouseholdId();
    if (!household) return { ok: false, error: 'The household record could not be loaded.' };
    if (!supabase) return { ok: false, error: 'The authorization service is not configured.' };
    try {
        const { data, error } = await supabase.rpc('rpc_oversight_account_upsert', {
            p_household: household,
            p_account: meta.account_id ?? null,
            p_institution: meta.institution_name,
            p_label: meta.account_label,
            p_kind: meta.account_kind,
            p_holders: meta.holders,
            p_currency: meta.currency,
        });
        if (error) return { ok: false, error: error.message };
        notifyUpdated();
        return { ok: true, accountId: String(data) };
    } catch (err) {
        return { ok: false, error: err instanceof Error ? err.message : 'The authorization service did not respond.' };
    }
}

export async function addSnapshot(
    accountId: string,
    balance: number,
    obligation: number,
): Promise<{ ok: boolean; error?: string }> {
    if (isDemoSession()) return localSnapshotAdd(accountId, balance, obligation);
    return realCall('rpc_oversight_snapshot_add', {
        p_account: accountId,
        p_balance: balance,
        p_obligation: obligation,
    });
}

export async function loadAuditLog(): Promise<OversightAuditEvent[]> {
    if (isDemoSession()) return localAudit();
    if (!supabase) return [];
    const household = await realHouseholdId();
    if (!household) return [];
    try {
        const { data, error } = await supabase.rpc('rpc_oversight_audit', { p_household: household, p_limit: 200 });
        if (error) return [];
        return (data || []) as OversightAuditEvent[];
    } catch {
        return [];
    }
}

/**
 * Consent receipt export. Composes the printable receipt from live facts and
 * records the export in the audit trail (server side in real mode, locally
 * in demo). Returns the HTML document.
 */
export async function exportConsentReceipt(): Promise<{ ok: boolean; html?: string; error?: string }> {
    const overview = await loadOversight();
    if (!overview.ok) return { ok: false, error: overview.errorReason || 'The live grant set could not be read.' };
    if (isDemoSession()) {
        localReceiptExport();
    } else if (supabase && overview.householdId) {
        try {
            await supabase.rpc('rpc_oversight_receipt', { p_household: overview.householdId });
        } catch {
            return { ok: false, error: 'The receipt export could not be recorded, so it was not produced.' };
        }
    }
    const nameFor = (personId: string): string =>
        overview.members.find((m) => m.person_id === personId)?.full_name || 'Family member';
    const html = buildConsentReceiptHtml(
        overview.householdName,
        overview.attestation,
        overview.grants,
        nameFor,
        nowIso(),
    );
    return { ok: true, html };
}

/** Coverage state for one tree node, by the genealogy client id. */
export function coverageForClientMember(
    overview: OversightOverview,
    clientId: string,
): { state: CoverageState; member: HouseholdMemberFacts | null; activeGrant: OversightGrant | null } {
    const member =
        overview.members.find((m) => m.client_id === clientId) ||
        overview.members.find((m) => m.person_id === clientId) ||
        null;
    if (!member) return { state: 'not_requested', member: null, activeGrant: null };
    const state = deriveCoverageState(member, overview.grants, overview.invitations, nowIso());
    const activeGrant =
        overview.grants.find(
            (g) =>
                g.subject_person_id === member.person_id &&
                !g.revoked_at && !g.suspended_at && !g.closed_by_passing_at &&
                g.effective_from <= nowIso() && nowIso() < g.expires_at,
        ) || null;
    return { state, member, activeGrant };
}

/** Watcher list for a person: every grant, active and historical, on them. */
export function watchersForPerson(overview: OversightOverview, personId: string): OversightGrant[] {
    return overview.grants
        .filter((g) => g.subject_person_id === personId)
        .sort((a, b) => (a.granted_at < b.granted_at ? 1 : -1));
}

export function downloadTextFile(filename: string, mime: string, content: string): void {
    if (typeof window === 'undefined') return;
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
}
