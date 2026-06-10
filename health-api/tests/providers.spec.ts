import { describe, it, expect, vi, beforeEach } from 'vitest';
import { googleFitProvider, polarProvider } from '../src/providers/scaffold-providers.js';

describe('Health API Providers', () => {
    beforeEach(() => {
        vi.stubGlobal('fetch', vi.fn());
    });

    describe('Google Fit Provider', () => {
        it('should fetch profile correctly', async () => {
            const mockResponse = {
                id: 'google_user_123',
                email: 'user@example.com',
                name: 'Test User'
            };

            (fetch as any).mockResolvedValue({
                ok: true,
                json: () => Promise.resolve(mockResponse)
            });

            const profile = await googleFitProvider.fetchProfile('fake_token');

            expect(profile.externalUserId).toBe('google_user_123');
            expect(profile.email).toBe('user@example.com');
            expect(profile.name).toBe('Test User');
        });

        it('should handle fetch error gracefully', async () => {
            (fetch as any).mockResolvedValue({
                ok: false,
                statusText: 'Unauthorized'
            });

            const profile = await googleFitProvider.fetchProfile('fake_token');

            expect(profile.externalUserId).toContain('googlefit_');
            expect(profile.name).toBe('Google Fit User');
        });
    });

    describe('Polar Provider', () => {
        it('should fetch profile correctly', async () => {
            const mockResponse = {
                'member-id': 'polar_user_456'
            };

            (fetch as any).mockResolvedValue({
                ok: true,
                json: () => Promise.resolve(mockResponse)
            });

            const profile = await polarProvider.fetchProfile('fake_token');

            expect(profile.externalUserId).toBe('polar_user_456');
        });
    });
});
