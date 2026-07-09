import { beforeEach, describe, expect, it, vi } from 'vitest';

// genealogy.ts's addFamilyMember() calls ensureLoaded(), which fires (but
// does not await) hydrateGenealogyInBackground() -> loadGenealogyFromBackend().
// That function synchronously snapshots local state before its first await,
// then later overwrites _members with a merge built from that snapshot. If a
// second addFamilyMember() call (e.g. onboarding adding a relative) lands
// while the snapshot's network fetch is still in flight, the eventual
// overwrite must not silently drop it. This is exactly the "family members
// added during onboarding never show up in St. Joseph" report.
const {
  fetchGenealogyFromSupabaseMock,
  getGenealogyUserIdMock,
} = vi.hoisted(() => ({
  fetchGenealogyFromSupabaseMock: vi.fn(),
  getGenealogyUserIdMock: vi.fn(),
}));

vi.mock('../demo-auth', () => ({
  isDemoAuthEnabled: () => false,
}));

vi.mock('../joseph/genealogySync', () => ({
  fetchGenealogyFromSupabase: fetchGenealogyFromSupabaseMock,
  getGenealogyUserId: getGenealogyUserIdMock,
  backfillGenealogy: vi.fn().mockResolvedValue(undefined),
  pushEvent: vi.fn().mockResolvedValue(undefined),
  pushMember: vi.fn().mockResolvedValue(undefined),
  pushRelationship: vi.fn().mockResolvedValue(undefined),
  subscribeToGenealogyRealtime: vi.fn(),
}));

async function flushMicrotasks(times = 5) {
  for (let i = 0; i < times; i++) {
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
}

describe('genealogy hydration race condition', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('keeps a family member added while hydration is still in flight', async () => {
    let resolveUserId!: (id: string) => void;
    getGenealogyUserIdMock.mockReturnValue(
      new Promise<string>((resolve) => {
        resolveUserId = resolve;
      }),
    );
    fetchGenealogyFromSupabaseMock.mockResolvedValue({
      members: [],
      relationships: [],
      events: [],
      dbIds: new Map(),
    });

    const { addFamilyMember, getFamilyMembers } = await import('../joseph/genealogy');

    // First call: triggers ensureLoaded() -> hydration, which synchronously
    // snapshots local state (empty) then pauses at `await getGenealogyUserId()`.
    const primary = addFamilyMember({
      firstName: 'Primary',
      lastName: 'Person',
      gender: 'other',
      generation: 0,
    });

    // Second call: lands while hydration is still paused above - this is
    // onboarding adding a relative during the exact race window.
    const relative = addFamilyMember({
      firstName: 'Relative',
      lastName: 'Person',
      gender: 'other',
      generation: -1,
    });

    // Both are visible locally before hydration resolves.
    expect(getFamilyMembers().map((m) => m.id)).toEqual(
      expect.arrayContaining([primary.id, relative.id]),
    );

    // Now let hydration finish its round trip and overwrite _members.
    resolveUserId('user-123');
    await flushMicrotasks();

    const membersAfterHydration = getFamilyMembers();
    expect(membersAfterHydration.some((m) => m.id === primary.id)).toBe(true);
    expect(membersAfterHydration.some((m) => m.id === relative.id)).toBe(true);
  });

  it('still lets the canonical Supabase fetch win for members it already knows about', async () => {
    getGenealogyUserIdMock.mockResolvedValue('user-123');
    fetchGenealogyFromSupabaseMock.mockResolvedValue({
      members: [
        {
          id: 'm_canonical_1',
          firstName: 'Canonical',
          lastName: 'Person',
          gender: 'other',
          generation: 0,
        },
      ],
      relationships: [],
      events: [],
      dbIds: new Map([['m_canonical_1', 'db-uuid-1']]),
    });

    const { addFamilyMember, getFamilyMembers } = await import('../joseph/genealogy');

    const local = addFamilyMember({
      firstName: 'Local',
      lastName: 'Person',
      gender: 'other',
      generation: 0,
    });

    await flushMicrotasks();

    const members = getFamilyMembers();
    expect(members.some((m) => m.id === 'm_canonical_1')).toBe(true);
    expect(members.some((m) => m.id === local.id)).toBe(true);
  });
});
