import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { vi } from 'vitest';

import ProtectedRoute from '../ProtectedRoute';

const {
  useAuthMock,
  getRuntimeReadinessMock,
  getRouteGateMock,
  getOnboardingStatusMock,
} = vi.hoisted(() => ({
  useAuthMock: vi.fn(),
  getRuntimeReadinessMock: vi.fn(),
  getRouteGateMock: vi.fn(),
  getOnboardingStatusMock: vi.fn(),
}));

vi.mock('../../contexts/AuthContext', () => ({
  useAuth: useAuthMock,
}));

vi.mock('../../lib/runtime-readiness', () => ({
  getRuntimeReadiness: getRuntimeReadinessMock,
  getRouteGate: getRouteGateMock,
}));

vi.mock('../../lib/onboardingApi', () => ({
  getOnboardingStatus: getOnboardingStatusMock,
}));

describe('ProtectedRoute', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    useAuthMock.mockReturnValue({
      user: { id: 'user-1' },
      loading: false,
      isDemoMode: false,
    });
    getRuntimeReadinessMock.mockResolvedValue({ route_map: {}, routes: [] });
    getRouteGateMock.mockReturnValue(null);
    getOnboardingStatusMock.mockResolvedValue({
      profile: { has_completed_onboarding: true, onboarding_skipped: false },
      onboarding_status: { onboarding_complete: true, completed_steps: ['welcome'] },
    });
  });

  it('renders a blocked state when runtime route readiness is unavailable', async () => {
    getRouteGateMock.mockReturnValue({
      path: '/finance-dashboard',
      status: 'unavailable',
      blocking: true,
      deps: ['gabriel.finance'],
      reason: 'Finance runtime is unavailable.',
      checked_at: new Date().toISOString(),
      prod_exposed: true,
    });

    render(
      <MemoryRouter initialEntries={['/finance-dashboard']}>
        <Routes>
          <Route
            path="/finance-dashboard"
            element={
              <ProtectedRoute>
                <div>Finance Dashboard</div>
              </ProtectedRoute>
            }
          />
        </Routes>
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText(/This route is unavailable/i)).toBeInTheDocument();
    });

    expect(screen.getByText(/Finance runtime is unavailable/i)).toBeInTheDocument();
    expect(screen.queryByText('Finance Dashboard')).not.toBeInTheDocument();
  });
});
