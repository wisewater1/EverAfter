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
      deps: ['auth.session'],
      reason: 'Session auth is unavailable.',
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

    expect(screen.getByText(/Session auth is unavailable/i)).toBeInTheDocument();
    expect(screen.queryByText('Finance Dashboard')).not.toBeInTheDocument();
  });

  it('renders children when only non-auth runtime dependencies are degraded', async () => {
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
      expect(screen.getByText('Finance Dashboard')).toBeInTheDocument();
    });

    expect(screen.queryByText(/This route is unavailable/i)).not.toBeInTheDocument();
  });

  it('renders children immediately instead of a blocking spinner while readiness is still resolving', async () => {
    // A backend that never answers (cold Render instance) must not prevent
    // the page from rendering. Previously this unmounted the page behind a
    // "Checking runtime dependencies..." spinner for as long as the
    // readiness call took; the fix keeps children mounted throughout.
    let resolveReadiness: (value: unknown) => void = () => {};
    getRuntimeReadinessMock.mockReturnValue(new Promise((resolve) => { resolveReadiness = resolve; }));

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

    // Readiness is still pending; children should already be visible, and the
    // old "Checking runtime dependencies..." spinner must not appear at all.
    expect(await screen.findByText('Finance Dashboard')).toBeInTheDocument();
    expect(screen.queryByText(/Checking runtime dependencies/i)).not.toBeInTheDocument();

    resolveReadiness({ route_map: {}, routes: [] });
    await waitFor(() => {
      expect(screen.getByText('Finance Dashboard')).toBeInTheDocument();
    });
  });

  it('treats a runtime readiness call that never resolves as an open gate, not a permanent block', async () => {
    // getRuntimeReadiness() that hangs forever (the exact shape of an
    // unreachable/cold backend with no timeout of its own) must not be able
    // to block the route forever; ProtectedRoute races it against its own
    // short timeout and fails open.
    getRuntimeReadinessMock.mockReturnValue(new Promise(() => {}));

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

    expect(await screen.findByText('Finance Dashboard')).toBeInTheDocument();
    expect(screen.queryByText(/This route is unavailable/i)).not.toBeInTheDocument();
  });
});
