import { render, screen, waitFor } from '@testing-library/react';
import { describe, beforeEach, expect, it, vi } from 'vitest';

import SaintChat from '../SaintChat';

const { apiClientMock, useAuthMock, getRuntimeReadinessMock } = vi.hoisted(() => ({
  apiClientMock: {
    bootstrapSaint: vi.fn(),
    getSaintKnowledge: vi.fn(),
    getChatHistory: vi.fn(),
    chatWithSaint: vi.fn(),
  },
  useAuthMock: vi.fn(),
  getRuntimeReadinessMock: vi.fn(),
}));

vi.mock('../../lib/api-client', () => ({
  apiClient: apiClientMock,
}));

vi.mock('../../contexts/AuthContext', () => ({
  useAuth: useAuthMock,
}));

vi.mock('../../lib/runtime-readiness', () => ({
  getRuntimeReadiness: getRuntimeReadinessMock,
  getCapability: (_readiness: any, capabilityId: string) => _readiness?.capability_map?.[capabilityId] || null,
}));

describe('SaintChat', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    useAuthMock.mockReturnValue({
      loading: false,
      session: { access_token: 'live-token' },
      isDemoMode: false,
    });
    getRuntimeReadinessMock.mockResolvedValue({
      capability_map: {
        'saint.storage': {
          id: 'saint.storage',
          status: 'healthy',
          blocking: false,
          deps: [],
          checked_at: new Date().toISOString(),
        },
      },
    });
    apiClientMock.bootstrapSaint.mockResolvedValue({
      engram_id: 'saint-engram-id',
      saint_id: 'gabriel',
      name: 'St. Gabriel',
      degraded: true,
      mode: 'degraded',
      persistence_available: false,
    });
    apiClientMock.getSaintKnowledge.mockResolvedValue([]);
    apiClientMock.getChatHistory.mockResolvedValue([]);
    window.HTMLElement.prototype.scrollIntoView = vi.fn();
  });

  it('keeps built-in saints visible in degraded mode without the init failure banner', async () => {
    render(
      <SaintChat
        saintId="gabriel"
        saintName="St. Gabriel"
        saintTitle="The Financial Steward"
        saintIcon={() => <svg data-testid="saint-icon" />}
        initialMessage="Treasury Analyst mode is active."
      />,
    );

    await waitFor(() => {
      expect(screen.getAllByText(/running in degraded mode/i).length).toBeGreaterThan(0);
    });

    await waitFor(() => {
      expect(screen.getByPlaceholderText(/Ask St. Gabriel for guidance/i)).not.toBeDisabled();
    });

    expect(screen.queryByText('Failed to initialize Saint AI. Please try again.')).not.toBeInTheDocument();
    expect(screen.getByText(/Treasury Analyst mode is active/i)).toBeInTheDocument();
  });
});
