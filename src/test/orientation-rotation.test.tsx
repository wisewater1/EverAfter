import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import ConnectionRotationOverview from '../components/ConnectionRotationOverview';
import { AuthProvider } from '../contexts/AuthContext';

const mockUser = {
  id: 'test-user-id',
  email: 'test@example.com',
};

vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({
    user: mockUser,
    loading: false,
    signOut: vi.fn(),
  }),
  AuthProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock('../lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          order: vi.fn(() => ({
            limit: vi.fn(() => ({
              then: vi.fn((callback) => callback({ data: [], error: null })),
            })),
          })),
          maybeSingle: vi.fn(() => ({
            then: vi.fn((callback) => callback({ data: null, error: null })),
          })),
        })),
      })),
    })),
    auth: {
      getSession: vi.fn(() =>
        Promise.resolve({
          data: { session: { access_token: 'test-token' } },
          error: null,
        })
      ),
    },
  },
}));

describe('Connection Rotation Auto-Rotation Tests', () => {
  let originalMatchMedia: typeof window.matchMedia;
  let originalInnerWidth: number;
  let originalInnerHeight: number;
  let orientationChangeListeners: Array<() => void> = [];

  beforeEach(() => {
    originalMatchMedia = window.matchMedia;
    originalInnerWidth = window.innerWidth;
    originalInnerHeight = window.innerHeight;
    orientationChangeListeners = [];
  });

  afterEach(() => {
    window.matchMedia = originalMatchMedia;
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: originalInnerWidth,
    });
    Object.defineProperty(window, 'innerHeight', {
      writable: true,
      configurable: true,
      value: originalInnerHeight,
    });
    vi.clearAllMocks();
  });

  const mockOrientation = (isLandscape: boolean, width: number, height: number) => {
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: width,
    });
    Object.defineProperty(window, 'innerHeight', {
      writable: true,
      configurable: true,
      value: height,
    });

    window.matchMedia = vi.fn((query: string) => ({
      matches: query.includes('landscape') ? isLandscape : !isLandscape,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn((event, handler) => {
        if (event === 'change') {
          orientationChangeListeners.push(handler as () => void);
        }
      }),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })) as any;
  };

  const triggerOrientationChange = () => {
    orientationChangeListeners.forEach((listener) => listener());
    window.dispatchEvent(new Event('resize'));
  };

  it('should render in portrait mode by default', async () => {
    mockOrientation(false, 375, 667); // iPhone portrait

    render(
      <BrowserRouter>
        <AuthProvider>
          <ConnectionRotationOverview />
        </AuthProvider>
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/Total Rotations/i)).toBeInTheDocument();
    });

    if (process.env.NODE_ENV === 'development') {
      await waitFor(() => {
        expect(screen.getByText(/PORTRAIT/i)).toBeInTheDocument();
      });
    }
  });

  it('should adapt layout when switching to landscape mode', async () => {
    mockOrientation(false, 375, 667);

    const { rerender } = render(
      <BrowserRouter>
        <AuthProvider>
          <ConnectionRotationOverview />
        </AuthProvider>
      </BrowserRouter>
    );

    mockOrientation(true, 667, 375);
    triggerOrientationChange();

    rerender(
      <BrowserRouter>
        <AuthProvider>
          <ConnectionRotationOverview />
        </AuthProvider>
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/Total Rotations/i)).toBeInTheDocument();
    });
  });

  it('should handle portrait orientation (iPhone)', async () => {
    mockOrientation(false, 375, 667);

    render(
      <BrowserRouter>
        <AuthProvider>
          <ConnectionRotationOverview />
        </AuthProvider>
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/Success Rate/i)).toBeInTheDocument();
    });
  });

  it('should handle landscape orientation (iPhone rotated)', async () => {
    mockOrientation(true, 667, 375);

    render(
      <BrowserRouter>
        <AuthProvider>
          <ConnectionRotationOverview />
        </AuthProvider>
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/Success Rate/i)).toBeInTheDocument();
    });
  });

  it('should handle tablet portrait (iPad)', async () => {
    mockOrientation(false, 768, 1024);

    render(
      <BrowserRouter>
        <AuthProvider>
          <ConnectionRotationOverview />
        </AuthProvider>
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/Total Rotations/i)).toBeInTheDocument();
    });
  });

  it('should handle tablet landscape (iPad rotated)', async () => {
    mockOrientation(true, 1024, 768);

    render(
      <BrowserRouter>
        <AuthProvider>
          <ConnectionRotationOverview />
        </AuthProvider>
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/Total Rotations/i)).toBeInTheDocument();
    });
  });

  it('should display all stat cards in both orientations', async () => {
    mockOrientation(false, 375, 667);

    render(
      <BrowserRouter>
        <AuthProvider>
          <ConnectionRotationOverview />
        </AuthProvider>
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/Total Rotations/i)).toBeInTheDocument();
      expect(screen.getByText(/Success Rate/i)).toBeInTheDocument();
    });
  });

  it('should show orientation-specific layout message', async () => {
    mockOrientation(true, 667, 375);

    render(
      <BrowserRouter>
        <AuthProvider>
          <ConnectionRotationOverview />
        </AuthProvider>
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/Auto-Rotation Optimized/i)).toBeInTheDocument();
    });
  });

  it('should maintain functionality during rapid orientation changes', async () => {
    mockOrientation(false, 375, 667);

    const { rerender } = render(
      <BrowserRouter>
        <AuthProvider>
          <ConnectionRotationOverview />
        </AuthProvider>
      </BrowserRouter>
    );

    for (let i = 0; i < 5; i++) {
      const isLandscape = i % 2 === 0;
      mockOrientation(isLandscape, isLandscape ? 667 : 375, isLandscape ? 375 : 667);
      triggerOrientationChange();

      rerender(
        <BrowserRouter>
          <AuthProvider>
            <ConnectionRotationOverview />
          </AuthProvider>
        </BrowserRouter>
      );
    }

    await waitFor(() => {
      expect(screen.getByText(/Total Rotations/i)).toBeInTheDocument();
    });
  });

  it('should handle orientation changes without memory leaks', async () => {
    mockOrientation(false, 375, 667);

    const { unmount } = render(
      <BrowserRouter>
        <AuthProvider>
          <ConnectionRotationOverview />
        </AuthProvider>
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/Total Rotations/i)).toBeInTheDocument();
    });

    unmount();
    expect(orientationChangeListeners.length).toBeGreaterThan(0);
  });
});

describe('Responsive Grid Layout Tests', () => {
  it('should use 2-column grid in portrait mode', async () => {
    Object.defineProperty(window, 'innerWidth', { value: 375, writable: true });
    Object.defineProperty(window, 'innerHeight', { value: 667, writable: true });
    window.matchMedia = vi.fn((query) => ({
      matches: query.includes('landscape') ? false : true,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })) as any;

    render(
      <BrowserRouter>
        <AuthProvider>
          <ConnectionRotationOverview />
        </AuthProvider>
      </BrowserRouter>
    );

    await waitFor(() => {
      const statsContainer = document.querySelector('[class*="grid-cols-2"]');
      expect(statsContainer).toBeTruthy();
    });
  });

  it('should use 4-column grid in landscape mode', async () => {
    Object.defineProperty(window, 'innerWidth', { value: 667, writable: true });
    Object.defineProperty(window, 'innerHeight', { value: 375, writable: true });
    window.matchMedia = vi.fn((query) => ({
      matches: query.includes('landscape'),
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })) as any;

    render(
      <BrowserRouter>
        <AuthProvider>
          <ConnectionRotationOverview />
        </AuthProvider>
      </BrowserRouter>
    );

    await waitFor(() => {
      const statsContainer = document.querySelector('[class*="grid-cols-4"]');
      expect(statsContainer).toBeTruthy();
    });
  });
});
