import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import GovernanceView from '../causal-twin/GovernanceView';

const {
  getRuntimeReadinessMock,
  getAuthHeadersMock,
} = vi.hoisted(() => ({
  getRuntimeReadinessMock: vi.fn(),
  getAuthHeadersMock: vi.fn(),
}));

vi.mock('../../lib/runtime-readiness', () => ({
  getRuntimeReadiness: getRuntimeReadinessMock,
  getCapability: (_readiness: any, capabilityId: string) => _readiness?.capability_map?.[capabilityId] || null,
}));

vi.mock('../../lib/api-client', () => ({
  apiClient: {
    getAuthHeaders: getAuthHeadersMock,
  },
}));

describe('GovernanceView', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    getAuthHeadersMock.mockResolvedValue({});
  });

  it('shows a blocked state instead of the empty governance state when readiness is red', async () => {
    getRuntimeReadinessMock.mockResolvedValue({
      capability_map: {
        'raphael.governance': {
          id: 'raphael.governance',
          status: 'unavailable',
          blocking: true,
          deps: ['bootstrap.governance'],
          reason: 'Governance tables are unavailable.',
          checked_at: new Date().toISOString(),
        },
      },
    });

    render(<GovernanceView />);

    await waitFor(() => {
      expect(screen.getByText(/Governance blocked/i)).toBeInTheDocument();
    });

    expect(screen.queryByText(/No Pending Proposals/i)).not.toBeInTheDocument();
  });
});
