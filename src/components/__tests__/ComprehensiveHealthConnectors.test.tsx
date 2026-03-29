import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import ComprehensiveHealthConnectors from '../ComprehensiveHealthConnectors';

const { useAuthMock, invokeMock, fromMock } = vi.hoisted(() => ({
  useAuthMock: vi.fn(),
  invokeMock: vi.fn(),
  fromMock: vi.fn(),
}));

vi.mock('../../contexts/AuthContext', () => ({
  useAuth: useAuthMock,
}));

class QueryMock {
  private readonly result: { data: any; error: any };

  constructor(result: { data: any; error: any }) {
    this.result = result;
  }

  select() {
    return this;
  }

  eq() {
    return this;
  }

  order() {
    return this;
  }

  then(resolve: (value: { data: any; error: any }) => unknown, reject?: (reason?: any) => unknown) {
    return Promise.resolve(this.result).then(resolve, reject);
  }
}

vi.mock('../../lib/supabase', () => ({
  supabase: {
    from: fromMock,
    functions: {
      invoke: invokeMock,
    },
  },
}));

vi.mock('../CustomDashboardBuilder', () => ({
  default: () => null,
}));

describe('ComprehensiveHealthConnectors', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    useAuthMock.mockReturnValue({
      user: { id: 'user-1' },
      isDemoMode: false,
    });

    fromMock.mockImplementation((table: string) => {
      if (table === 'health_providers_registry') {
        return new QueryMock({
          data: [
            {
              id: 'provider-1',
              provider_key: 'fitbit',
              display_name: 'Fitbit',
              description: 'Popular fitness tracker and smartwatch.',
              category: 'wearable',
              vendor_name: 'Fitbit',
              icon_url: null,
              brand_color: '#00B0B9',
              oauth_enabled: true,
              oauth_authorize_url: 'https://www.fitbit.com/oauth2/authorize',
              oauth_client_id_env_key: 'FITBIT_CLIENT_ID',
              supported_metrics: ['steps', 'heart_rate', 'sleep_stages'],
              is_enabled: true,
              is_beta: false,
            },
          ],
          error: null,
        });
      }

      if (table === 'health_connections') {
        return new QueryMock({ data: [], error: null });
      }

      if (table === 'provider_accounts') {
        return new QueryMock({ data: [], error: null });
      }

      throw new Error(`Unexpected table ${table}`);
    });

    invokeMock.mockResolvedValue({
      data: { authorization_url: 'https://www.fitbit.com/oauth2/authorize?client_id=test' },
      error: null,
    });

    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { href: 'http://localhost/' },
    });
  });

  it('uses the canonical health-oauth-initiate function for live connectors', async () => {
    render(<ComprehensiveHealthConnectors />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Connect Fitbit/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /Connect Fitbit/i }));

    await waitFor(() => {
      expect(invokeMock).toHaveBeenCalledWith('health-oauth-initiate', {
        body: { provider_key: 'fitbit' },
      });
    });
  });

  it('keeps roadmap connectors visible but disabled', async () => {
    render(<ComprehensiveHealthConnectors />);

    await waitFor(() => {
      expect(screen.getByText('Validic')).toBeInTheDocument();
    });

    expect(screen.getAllByRole('button', { name: /Planned/i }).at(0)).toBeDisabled();
  });
});
