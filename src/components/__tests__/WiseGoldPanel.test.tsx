import { render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';

import WiseGoldPanel from '../gabriel/WiseGoldPanel';

const { useAuthMock, financeApiMock, getRuntimeReadinessMock } = vi.hoisted(() => ({
  useAuthMock: vi.fn(),
  financeApiMock: {
    getWiseGoldWallet: vi.fn(),
    getWiseGoldPrice: vi.fn(),
    getWiseGoldCovenants: vi.fn(),
    getWiseGoldLedger: vi.fn(),
    getWiseGoldAttestations: vi.fn(),
    getWiseGoldPolicySummary: vi.fn(),
    syncWiseGoldHeartbeat: vi.fn(),
    submitWiseGoldCovenantAction: vi.fn(),
    submitWiseGoldBridge: vi.fn(),
  },
  getRuntimeReadinessMock: vi.fn(),
}));

vi.mock('../../contexts/AuthContext', () => ({
  useAuth: useAuthMock,
}));

vi.mock('../../lib/gabriel/finance', () => ({
  financeApi: financeApiMock,
}));

vi.mock('../../lib/runtime-readiness', () => ({
  getRuntimeReadiness: getRuntimeReadinessMock,
  getCapability: (_readiness: any, capabilityId: string) => _readiness?.capability_map?.[capabilityId] || null,
}));

vi.mock('../gabriel/CrossChainBridgeModal', () => ({
  default: () => null,
}));

describe('WiseGoldPanel', () => {
  beforeEach(() => {
    vi.resetAllMocks();

    useAuthMock.mockReturnValue({
      user: { id: 'user-1' },
      session: { access_token: 'live-token' },
    });

    financeApiMock.getWiseGoldWallet.mockRejectedValue(new Error('{"detail":"Not authenticated"}'));
    financeApiMock.getWiseGoldPrice.mockResolvedValue({ xau_usd_price: 89.5 });
    financeApiMock.getWiseGoldCovenants.mockResolvedValue([]);
    financeApiMock.getWiseGoldLedger.mockResolvedValue([]);
    financeApiMock.getWiseGoldAttestations.mockResolvedValue([]);
    financeApiMock.getWiseGoldPolicySummary.mockResolvedValue(null);
    getRuntimeReadinessMock.mockResolvedValue({
      capability_map: {
        'gabriel.wisegold': {
          id: 'gabriel.wisegold',
          status: 'healthy',
          blocking: false,
          deps: [],
          checked_at: new Date().toISOString(),
        },
      },
    });
  });

  it('does not render raw auth failure JSON when WiseGold requests are unauthorized', async () => {
    render(<WiseGoldPanel />);

    await waitFor(() => {
      expect(financeApiMock.getWiseGoldWallet).toHaveBeenCalled();
    });

    await waitFor(() => {
      expect(screen.queryByText('{"detail":"Not authenticated"}')).not.toBeInTheDocument();
    });

    expect(screen.getByText(/WiseGold requires an authenticated session/i)).toBeInTheDocument();
  });

  it('blocks WiseGold when runtime readiness reports the capability as unavailable', async () => {
    getRuntimeReadinessMock.mockResolvedValue({
      capability_map: {
        'gabriel.wisegold': {
          id: 'gabriel.wisegold',
          status: 'unavailable',
          blocking: true,
          deps: ['WISEGOLD_ORACLE_API_KEY'],
          reason: 'WISEGOLD_ORACLE_API_KEY is not configured.',
          checked_at: new Date().toISOString(),
        },
      },
    });

    render(<WiseGoldPanel />);

    await waitFor(() => {
      expect(screen.getByText(/WISEGOLD_ORACLE_API_KEY is not configured/i)).toBeInTheDocument();
    });

    expect(financeApiMock.getWiseGoldWallet).not.toHaveBeenCalled();
  });
});
