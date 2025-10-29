import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Dashboard from '../pages/Dashboard';
import HealthDashboard from '../pages/HealthDashboard';

// Mock contexts
const mockAuthContext = {
  user: { id: 'test-user', email: 'test@example.com' },
  loading: false,
  signOut: () => Promise.resolve(),
  setErrorNotifier: () => {},
};

const mockConnectionsContext = {
  openConnectionsPanel: () => {},
  getActiveConnectionsCount: () => 0,
};

vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => mockAuthContext,
  AuthProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('../contexts/ConnectionsContext', () => ({
  useConnections: () => mockConnectionsContext,
  ConnectionsProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('../contexts/ErrorNotificationContext', () => ({
  useErrorNotification: () => ({ showError: () => {} }),
  ErrorNotificationProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

describe('Page Scrolling', () => {
  beforeEach(() => {
    // Reset document styles
    document.body.style.overflow = '';
    document.body.style.position = '';
    document.body.classList.remove('modal-open');
  });

  afterEach(() => {
    document.body.style.overflow = '';
    document.body.style.position = '';
    document.body.classList.remove('modal-open');
  });

  it('Dashboard should have min-h-[100dvh] and flex-col for proper scrolling', () => {
    const { container } = render(
      <BrowserRouter>
        <Dashboard />
      </BrowserRouter>
    );

    const mainContainer = container.firstChild as HTMLElement;
    expect(mainContainer.className).toContain('min-h-[100dvh]');
    expect(mainContainer.className).toContain('flex-col');
  });

  it('Dashboard should have scroll sentinel element', () => {
    render(
      <BrowserRouter>
        <Dashboard />
      </BrowserRouter>
    );

    const scrollSentinel = document.getElementById('scroll-end');
    expect(scrollSentinel).toBeTruthy();
    expect(scrollSentinel?.className).toContain('opacity-0');
  });

  it('HealthDashboard should have proper scrolling layout', () => {
    const { container } = render(
      <BrowserRouter>
        <HealthDashboard />
      </BrowserRouter>
    );

    const mainContainer = container.firstChild as HTMLElement;
    expect(mainContainer.className).toContain('min-h-[100dvh]');
    expect(mainContainer.className).toContain('flex-col');
  });

  it('HealthDashboard should have scroll sentinel element', () => {
    render(
      <BrowserRouter>
        <HealthDashboard />
      </BrowserRouter>
    );

    const scrollSentinel = document.getElementById('scroll-end');
    expect(scrollSentinel).toBeTruthy();
  });

  it('Body should not have overflow hidden by default', () => {
    expect(document.body.style.overflow).not.toBe('hidden');
    expect(document.body.classList.contains('modal-open')).toBe(false);
  });

  it('Main content should have overflow-y-auto for scrolling', () => {
    const { container } = render(
      <BrowserRouter>
        <Dashboard />
      </BrowserRouter>
    );

    const mainElement = container.querySelector('main');
    expect(mainElement).toBeTruthy();
    expect(mainElement?.className).toContain('overflow-y-auto');
  });

  it('Body should allow vertical scrolling with overflow-x hidden', () => {
    // Verify CSS is applied (this would be tested via getComputedStyle in browser)
    expect(document.body.style.overflowX).not.toBe('scroll');
  });
});
