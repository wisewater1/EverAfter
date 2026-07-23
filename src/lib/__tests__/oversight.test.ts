/**
 * Household financial oversight: the test matrix cases that resolve in the
 * shared pure logic and the demo engine (the same rules the database RPCs
 * enforce server side; the SQL constraints and triggers cover the rest at
 * the data layer).
 */
import { describe, it, expect, beforeEach } from 'vitest';
import {
    type FinancialAccountFacts,
    type HouseholdMemberFacts,
    type OversightGrant,
    WEIGHTING_EXPLANATION,
    authorizedAccountViews,
    buildAttestationFacts,
    chainHash,
    composeGabrielStatement,
    composeMichaelStatement,
    composeOverviewLine,
    computeHouseholdScore,
    daysUntil,
    deriveCoverageState,
    majorityDateIso,
    scoreFromViews,
    verifyAuditChain,
    type OversightAuditEvent,
} from '../gabriel/oversight';

const NOW = '2026-07-23T12:00:00.000Z';

function member(overrides: Partial<HouseholdMemberFacts> & { person_id: string }): HouseholdMemberFacts {
    return {
        client_id: overrides.person_id,
        full_name: `Member ${overrides.person_id}`,
        role: 'adult',
        birth_date: '1980-01-01',
        death_date: null,
        dependency_weight: 1.0,
        is_primary_earner: false,
        is_account_holder_self: false,
        ...overrides,
    };
}

function grant(overrides: Partial<OversightGrant> & { grant_id: string; subject_person_id: string }): OversightGrant {
    return {
        household_id: 'h1',
        granted_by_person_id: overrides.subject_person_id,
        authority_basis: 'self',
        authority_document_id: null,
        authority_document_label: null,
        scope: 'balances_and_obligations',
        included_account_ids: [],
        purpose_statement: 'test',
        granted_at: '2026-01-01T00:00:00.000Z',
        effective_from: '2026-01-01T00:00:00.000Z',
        expires_at: '2027-01-01T00:00:00.000Z',
        review_due_at: null,
        revoked_at: null,
        revoked_by_person_id: null,
        revocation_reason: null,
        suspended_at: null,
        suspension_reason: null,
        closed_by_passing_at: null,
        verification_method: 'authenticated_session',
        ...overrides,
    };
}

function account(overrides: Partial<FinancialAccountFacts> & { account_id: string; holders: string[] }): FinancialAccountFacts {
    return {
        institution_name: 'Test Bank',
        account_label: `Account ${overrides.account_id}`,
        account_kind: 'depository',
        currency: 'USD',
        balance: 12000,
        total_obligation: 1000,
        as_of: NOW,
        ...overrides,
    };
}

describe('matrix 1: grant appears in the roll-up, revocation removes it everywhere', () => {
    const alice = member({ person_id: 'alice' });
    const accounts = [account({ account_id: 'a1', holders: ['alice'] })];

    it('an active self grant scores the member into the household picture', () => {
        const grants = [grant({ grant_id: 'g1', subject_person_id: 'alice', included_account_ids: ['a1'] })];
        const score = computeHouseholdScore([alice], grants, [], accounts, NOW);
        expect(score.readiness).not.toBeNull();
        expect(score.members[0].state).toBe('covered_self');
        expect(score.coverage_confidence).toBeGreaterThan(0);
    });

    it('a revoked grant disappears from views, score, and attestation in one recompute', () => {
        const revoked = [grant({
            grant_id: 'g1', subject_person_id: 'alice', included_account_ids: ['a1'],
            revoked_at: '2026-07-01T00:00:00.000Z',
        })];
        const views = authorizedAccountViews(accounts, revoked, NOW);
        expect(views).toHaveLength(0);
        const score = computeHouseholdScore([alice], revoked, [], accounts, NOW);
        expect(score.readiness).toBeNull();
        expect(score.coverage_confidence).toBe(0);
        const attestation = buildAttestationFacts([alice], revoked, [], NOW);
        expect(attestation.covered_adults).toBe(0);
        expect(deriveCoverageState(alice, revoked, [], NOW)).toBe('revoked');
    });
});

describe('matrix 2: an uncovered adult never appears in any aggregate', () => {
    it('uncovered members contribute nothing, not even through shared accounts', () => {
        const alice = member({ person_id: 'alice' });
        const bob = member({ person_id: 'bob' });
        const accounts = [
            account({ account_id: 'a1', holders: ['alice'], balance: 10000 }),
            account({ account_id: 'b1', holders: ['bob'], balance: 999999 }),
        ];
        const grants = [grant({ grant_id: 'g1', subject_person_id: 'alice', included_account_ids: ['a1'] })];
        const views = authorizedAccountViews(accounts, grants, NOW);
        expect(views.every((v) => v.holder_person_id === 'alice')).toBe(true);
        expect(views.some((v) => v.account_id === 'b1')).toBe(false);
        const score = computeHouseholdScore([alice, bob], grants, [], accounts, NOW);
        const bobRow = score.members.find((m) => m.person_id === 'bob');
        expect(bobRow?.readiness).toBeNull();
        expect(bobRow?.contribution).toBe(0);
    });
});

describe('matrix 3: joint account with one covered and one uncovered holder', () => {
    it('includes only the granting holder equal share and marks it partially covered', () => {
        const alice = member({ person_id: 'alice' });
        const bob = member({ person_id: 'bob' });
        const joint = account({ account_id: 'j1', holders: ['alice', 'bob'], balance: 10000, total_obligation: 400 });
        const grants = [grant({ grant_id: 'g1', subject_person_id: 'alice', included_account_ids: ['j1'] })];
        const views = authorizedAccountViews([joint], grants, NOW);
        expect(views).toHaveLength(1);
        expect(views[0].fully_covered).toBe(false);
        expect(views[0].authorized_balance).toBe(5000);
        expect(views[0].authorized_obligation).toBe(200);
        const score = computeHouseholdScore([alice, bob], grants, [], [joint], NOW);
        expect(score.partially_covered_accounts).toBe(1);
    });

    it('counts in full once every holder has granted', () => {
        const joint = account({ account_id: 'j1', holders: ['alice', 'bob'], balance: 10000 });
        const grants = [
            grant({ grant_id: 'g1', subject_person_id: 'alice', included_account_ids: ['j1'] }),
            grant({ grant_id: 'g2', subject_person_id: 'bob', included_account_ids: ['j1'] }),
        ];
        const views = authorizedAccountViews([joint], grants, NOW);
        expect(views).toHaveLength(2);
        expect(views.every((v) => v.fully_covered)).toBe(true);
        expect(views.reduce((sum, v) => sum + v.authorized_balance, 0)).toBe(10000);
    });
});

describe('matrix 4: minors age into their own consent', () => {
    it('computes the majority date and the 30 and 7 day notice windows', () => {
        const majority = majorityDateIso('2008-08-23');
        expect(majority).not.toBeNull();
        expect(majority!.startsWith('2026-08-23')).toBe(true);
        expect(daysUntil(majority!, NOW)).toBe(30);
        const seven = majorityDateIso('2008-07-31');
        expect(daysUntil(seven!, NOW)).toBe(7);
    });

    it('a guardian grant that reached its clamped expiry fails closed', () => {
        const teen = member({ person_id: 'teen', role: 'minor', birth_date: '2008-01-01' });
        const guardianGrant = grant({
            grant_id: 'g1', subject_person_id: 'teen', authority_basis: 'guardian_of_minor',
            authority_document_id: 'doc1', authority_document_label: 'Guardianship order',
            expires_at: '2026-01-01T00:00:00.000Z',
        });
        expect(deriveCoverageState(teen, [guardianGrant], [], NOW)).toBe('expired');
        const views = authorizedAccountViews(
            [account({ account_id: 'a1', holders: ['teen'] })],
            [{ ...guardianGrant, included_account_ids: ['a1'] }],
            NOW,
        );
        expect(views).toHaveLength(0);
    });
});

describe('matrix 8: a coverage gap lowers confidence and never raises readiness', () => {
    const accounts = [
        account({ account_id: 'a1', holders: ['alice'], balance: 12000, total_obligation: 1000 }),
    ];
    const grants = [grant({ grant_id: 'g1', subject_person_id: 'alice', included_account_ids: ['a1'] })];

    it('adding an uncovered member drops confidence and leaves readiness identical', () => {
        const alice = member({ person_id: 'alice' });
        const before = computeHouseholdScore([alice], grants, [], accounts, NOW);
        const withGap = computeHouseholdScore([alice, member({ person_id: 'carol' })], grants, [], accounts, NOW);
        expect(withGap.coverage_confidence).toBeLessThan(before.coverage_confidence);
        expect(withGap.readiness).toBe(before.readiness);
    });
});

describe('matrix 10: an expired grant fails closed and the attestation reflects it', () => {
    it('expired coverage yields no views and an honest attestation', () => {
        const alice = member({ person_id: 'alice' });
        const expired = [grant({
            grant_id: 'g1', subject_person_id: 'alice', included_account_ids: ['a1'],
            expires_at: '2026-07-01T00:00:00.000Z',
        })];
        const views = authorizedAccountViews([account({ account_id: 'a1', holders: ['alice'] })], expired, NOW);
        expect(views).toHaveLength(0);
        const attestation = buildAttestationFacts([alice], expired, [], NOW);
        expect(attestation.covered_adults).toBe(0);
        expect(composeOverviewLine(attestation)).toContain('not authorized to see anyone');
    });
});

describe("Michael's Attestation copy rules", () => {
    const members = [
        member({ person_id: 'a', full_name: 'Alice Anderson' }),
        member({ person_id: 'b', full_name: 'Bob Anderson' }),
        member({ person_id: 'c', full_name: 'Carol Anderson' }),
    ];
    const grants = [
        grant({ grant_id: 'g1', subject_person_id: 'a', expires_at: '2027-03-14T00:00:00.000Z' }),
        grant({ grant_id: 'g2', subject_person_id: 'b', expires_at: '2027-06-01T00:00:00.000Z' }),
    ];

    it('always states covered count, uncovered count, and nearest expiry together', () => {
        const attestation = buildAttestationFacts(members, grants, [], NOW);
        const line = composeOverviewLine(attestation);
        expect(line).toContain('2 of the 3 adults');
        expect(line).toContain('One member has not granted access.');
        expect(line).toContain('March 14, 2027');
        const michael = composeMichaelStatement(attestation);
        expect(michael).toContain('Two adults granted access directly.');
        expect(michael).toContain('One adult has not granted access');
        expect(michael).toContain('expires on March 14, 2027');
        expect(michael).toContain('renewal 30 days beforehand');
        const gabriel = composeGabrielStatement(attestation);
        expect(gabriel).toContain('I can see two members');
        expect(gabriel).toContain('I cannot see one.');
        expect(gabriel).toContain('I do not estimate the rest');
    });

    it('says so plainly when there are no grants at all', () => {
        const attestation = buildAttestationFacts(members, [], [], NOW);
        expect(composeOverviewLine(attestation)).toBe(
            'Gabriel is not authorized to see anyone’s finances in this household yet. Financial readiness stays unscored until at least one member grants access.',
        );
    });

    it('fails visible, never silent, when the grant set cannot be read', () => {
        const line = composeOverviewLine({ ok: false, reason: 'network unreachable' });
        expect(line).toContain('I cannot confirm current authorizations right now');
        expect(line).toContain('hidden until I can');
    });

    it('never blends readiness and confidence: they are separate outputs', () => {
        const score = scoreFromViews(members, grants, [], [], NOW);
        expect(score).toHaveProperty('readiness');
        expect(score).toHaveProperty('coverage_confidence');
        expect(score.readiness).toBeNull();
        expect(score.coverage_confidence).toBeGreaterThan(0);
    });
});

describe('published weighting', () => {
    it('the drill-down explanation names the weights and the honesty rules', () => {
        expect(WEIGHTING_EXPLANATION).toContain('1.6');
        expect(WEIGHTING_EXPLANATION).toContain('1.3');
        expect(WEIGHTING_EXPLANATION).toContain('0.6');
        expect(WEIGHTING_EXPLANATION).toContain('never make the score look better');
        expect(WEIGHTING_EXPLANATION).toContain('not financial advice');
    });
});

describe('append-only audit chain', () => {
    function buildChain(): OversightAuditEvent[] {
        const events: OversightAuditEvent[] = [];
        let prev = '';
        for (let i = 1; i <= 4; i++) {
            const createdAt = `2026-07-2${i}T00:00:00.000Z`;
            const detail = { step: i };
            const hash = chainHash(prev, 'grant_created', JSON.stringify(detail), createdAt);
            events.push({
                id: i, event_type: 'grant_created', subject_person_id: 'a', grant_id: `g${i}`,
                detail, created_at: createdAt, prev_hash: prev, event_hash: hash,
            });
            prev = hash;
        }
        return events;
    }

    it('verifies an untouched chain and catches any alteration', () => {
        const events = buildChain();
        expect(verifyAuditChain(events)).toBe(true);
        const tampered = buildChain();
        tampered[1].detail = { step: 999 };
        expect(verifyAuditChain(tampered)).toBe(false);
    });
});

describe('matrix 5 and nudge cap through the demo engine (same rules as the RPCs)', () => {
    beforeEach(() => {
        window.localStorage.clear();
        window.localStorage.setItem('everafter_demo_auth', '1');
    });

    it('refuses a proxy grant with no linked instrument', async () => {
        const { grantProxyCoverage } = await import('../gabriel/oversightStore');
        const result = await grantProxyCoverage({
            subjectPersonId: 'p1',
            grantedByPersonId: 'u1',
            basis: 'power_of_attorney',
            documentId: '',
            documentLabel: '',
            scope: 'balances_only',
            includedAccountIds: [],
            purpose: 'test',
            expiresAt: null,
            verificationMethod: 'documented_instrument_on_file',
        });
        expect(result.ok).toBe(false);
        expect(result.error).toContain('documented instrument');
    });

    it('caps persuasion at one invitation plus one reminder, then stops', async () => {
        const store = await import('../gabriel/oversightStore');
        const invite = await store.requestCoverage('p1', 'u1', 'balances_only', 'test purpose');
        expect(invite.ok).toBe(true);
        const overview = await store.loadOversight();
        const invitation = overview.invitations.find((i) => i.subject_person_id === 'p1');
        expect(invitation).toBeTruthy();
        const remindOnce = await store.sendInvitationReminder(invitation!.invitation_id);
        expect(remindOnce.ok).toBe(true);
        const remindTwice = await store.sendInvitationReminder(invitation!.invitation_id);
        expect(remindTwice.ok).toBe(false);
        expect(remindTwice.error).toContain('one reminder');
        const declined = await store.respondToInvitation(invitation!.invitation_id, false, 'balances_only', [], '');
        expect(declined.ok).toBe(true);
        const reinvite = await store.requestCoverage('p1', 'u1', 'balances_only', 'test purpose');
        expect(reinvite.ok).toBe(false);
        expect(reinvite.error).toContain('will not ask again');
    });
});
