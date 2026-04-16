import { Provider } from '../generated/prisma/client.js';
import { ProviderDriver, OAuthTokens, ProviderProfile, NormalizedMetric } from '../types/index.js';
import { getProviderConfig } from '../config/providers.js';

export const garminProvider: ProviderDriver = {
    id: Provider.GARMIN,
    name: getProviderConfig(Provider.GARMIN).name,

    authorizeUrl({ state, redirectUri }) {
        const config = getProviderConfig(Provider.GARMIN);
        const url = new URL(config.authUrl!);
        url.searchParams.append('client_id', config.clientId);
        url.searchParams.append('response_type', 'code');
        url.searchParams.append('redirect_uri', redirectUri);
        url.searchParams.append('state', state);
        if (config.scopes.length > 0) {
            url.searchParams.append('scope', config.scopes.join(' '));
        }
        return url.toString();
    },

    async exchangeCodeForTokens(code: string, redirectUri: string): Promise<OAuthTokens> {
        const config = getProviderConfig(Provider.GARMIN);
        const params = new URLSearchParams({
            client_id: config.clientId,
            client_secret: config.clientSecret,
            grant_type: 'authorization_code',
            code,
            redirect_uri: redirectUri,
        });

        const response = await fetch(config.tokenUrl!, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                Accept: 'application/json',
            },
            body: params.toString(),
        });

        if (!response.ok) {
            throw new Error(`Failed to exchange token for GARMIN: ${response.statusText}`);
        }

        const data = (await response.json()) as Record<string, unknown>;
        return {
            accessToken: data.access_token as string,
            refreshToken: data.refresh_token as string | undefined,
            expiresAt: data.expires_in ? new Date(Date.now() + (data.expires_in as number) * 1000) : undefined,
            scopes: data.scope ? (data.scope as string).split(' ') : undefined,
        };
    },

    async refreshTokens(refreshToken: string): Promise<OAuthTokens> {
        const config = getProviderConfig(Provider.GARMIN);
        const params = new URLSearchParams({
            client_id: config.clientId,
            client_secret: config.clientSecret,
            grant_type: 'refresh_token',
            refresh_token: refreshToken,
        });

        const response = await fetch(config.tokenUrl!, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                Accept: 'application/json',
            },
            body: params.toString(),
        });

        if (!response.ok) {
            throw new Error(`Failed to refresh token for GARMIN: ${response.statusText}`);
        }

        const data = (await response.json()) as Record<string, unknown>;
        return {
            accessToken: data.access_token as string,
            refreshToken: (data.refresh_token as string | undefined) || refreshToken,
            expiresAt: data.expires_in ? new Date(Date.now() + (data.expires_in as number) * 1000) : undefined,
            scopes: data.scope ? (data.scope as string).split(' ') : undefined,
        };
    },

    async fetchProfile(_accessToken: string): Promise<ProviderProfile> {
        // Garmin API typically relies on Webhooks for pushing data.
        // The REST API for direct querying requires enterprise approval.
        // This is a placeholder for the REST API if available.
        return {
            externalUserId: `garmin_user_${Date.now()}`,
            name: "Garmin Connected User"
        };
    },

    async fetchLatestMetrics({ accessToken: _accessToken, since: _since }): Promise<NormalizedMetric[]> {
        console.warn("Garmin primarily uses Webhooks for data delivery. REST endpoint fetching is limited without enterprise access.");
        return [];
    }
};
