import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import GovernanceView from '../causal-twin/GovernanceView';

const {
  getRuntimeReadinessMock,
  getAuthHeadersMock,
  requestBackendJsonMock,
} = vi.hoisted(() => ({
  getRuntimeReadinessMock: vi.fn(),
  getAuthHeadersMock: vi.fn(),
  requestBackendJsonMock: vi.fn(),
}));

vi.mock('../../lib/runtime-readiness', () => ({
  getRuntimeReadiness: getRuntimeReadinessMock,
  getCapability: (_readiness: unknown, capabilityId: string) => _readiness?.capability_map?.[capabilityId] || null,
}));

vi.mock('../../lib/api-client', () => ({
  apiClient: {
    getAuthHeaders: getAuthHeadersMock,
  },
}));

vi.mock('../../lib/backend-request', () => ({
  requestBackendJson: requestBackendJsonMock,
}));

describe('GovernanceView', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    getAuthHeadersMock.mockResolvedValue({});
    requestBackendJsonMock.mockResolvedValue({ proposals: [] });
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

  it('shows sync-gated governance state when biometric data is not ready', async () => {
    getRuntimeReadinessMock.mockResolvedValue({
      capability_map: {
        'raphael.governance': {
          id: 'raphael.governance',
          status: 'healthy',
          blocking: false,
          deps: [],
          checked_at: new Date().toISOString(),
        },
      },
    });

    render(<GovernanceView biometricsReady={false} biometricNotice="Waiting for biometric sync..." />);

    await waitFor(() => {
      expect(screen.getAllByText(/Waiting for biometric sync/i).length).toBeGreaterThan(0);
    });

    expect(screen.getByRole('button', { name: /Scan for Drift/i })).toBeDisabled();
    expect(screen.queryByText(/No Pending Proposals/i)).not.toBeInTheDocument();
    expect(requestBackendJsonMock).not.toHaveBeenCalled();
  });

  it('shows a failed governance state instead of the empty state when proposal loading fails', async () => {
    getRuntimeReadinessMock.mockResolvedValue({
      capability_map: {
        'raphael.governance': {
          id: 'raphael.governance',
          status: 'healthy',
          blocking: false,
          deps: [],
          checked_at: new Date().toISOString(),
        },
      },
    });
    requestBackendJsonMock.mockRejectedValue(new Error('Failed to load governance proposals.'));

    render(<GovernanceView biometricsReady />);

    await waitFor(() => {
      expect(screen.getByText(/Governance data is unavailable/i)).toBeInTheDocument();
    });

    expect(screen.queryByText(/No Pending Proposals/i)).not.toBeInTheDocument();
  });

  it('surfaces a successful drift scan result even when no new proposals are created', async () => {
    getRuntimeReadinessMock.mockResolvedValue({
      capability_map: {
        'raphael.governance': {
          id: 'raphael.governance',
          status: 'healthy',
          blocking: false,
          deps: [],
          checked_at: new Date().toISOString(),
        },
      },
    });

    requestBackendJsonMock
      .mockResolvedValueOnce({ proposals: [] })
      .mockResolvedValueOnce({ status: 'cycle_complete', message: 'Drift scan completed. No new governance proposals were required.' })
      .mockResolvedValueOnce({ proposals: [] });

    render(<GovernanceView biometricsReady />);

    await waitFor(() => {
      expect(screen.getByText(/No Pending Proposals/i)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /Scan for Drift/i }));

    await waitFor(() => {
      expect(screen.getByText(/Drift scan completed\. No new governance proposals were required\./i)).toBeInTheDocument();
    });
  });
});
