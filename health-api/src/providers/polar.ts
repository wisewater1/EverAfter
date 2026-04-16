import { Provider } from '../generated/prisma/client.js';
import { ProviderDriver, OAuthTokens, ProviderProfile, NormalizedMetric } from '../types/index.js';
import { getProviderConfig } from '../config/providers.js';

export const polarProvider: ProviderDriver = {
    id: Provider.POLAR,
    name: getProviderConfig(Provider.POLAR).name,

    authorizeUrl({ state, redirectUri }) {
        const config = getProviderConfig(Provider.POLAR);
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
        const config = getProviderConfig(Provider.POLAR);
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
            throw new Error(`Failed to exchange token for POLAR: ${response.statusText}`);
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
        const config = getProviderConfig(Provider.POLAR);
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
            throw new Error(`Failed to refresh token for POLAR: ${response.statusText}`);
        }

        const data = (await response.json()) as Record<string, unknown>;
        return {
            accessToken: data.access_token as string,
            refreshToken: (data.refresh_token as string | undefined) || refreshToken,
            expiresAt: data.expires_in ? new Date(Date.now() + (data.expires_in as number) * 1000) : undefined,
            scopes: data.scope ? (data.scope as string).split(' ') : undefined,
        };
    },

    async fetchProfile(accessToken: string): Promise<ProviderProfile> {
        const response = await fetch('https://www.polaraccesslink.com/v3/users', {
            headers: { Authorization: `Bearer ${accessToken}` }
        });
        if (response.ok) {
            const data = (await response.json()) as Record<string, unknown>;
            return {
                externalUserId: data['member-id'] || `polar_${Date.now()}`,
                name: "Polar User",
                metadata: data
            };
        }
        return {
            externalUserId: `polar_${Date.now()}`,
            name: "Polar User"
        };
    },

    async fetchLatestMetrics({ accessToken: _accessToken, since: _since }): Promise<NormalizedMetric[]> {
        return [];
    }
};
