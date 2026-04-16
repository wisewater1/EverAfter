import { Provider, MetricType } from '../generated/prisma/client.js';
import { ProviderDriver, OAuthTokens, ProviderProfile, NormalizedMetric } from '../types/index.js';
import { getProviderConfig } from '../config/providers.js';

export const whoopProvider: ProviderDriver = {
    id: Provider.WHOOP,
    name: getProviderConfig(Provider.WHOOP).name,

    authorizeUrl({ state, redirectUri }) {
        const config = getProviderConfig(Provider.WHOOP);
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
        const config = getProviderConfig(Provider.WHOOP);
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
            throw new Error(`Failed to exchange token for WHOOP: ${response.statusText}`);
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
        const config = getProviderConfig(Provider.WHOOP);
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
            throw new Error(`Failed to refresh token for WHOOP: ${response.statusText}`);
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
        const response = await fetch('https://api.prod.whoop.com/developer/v1/user/profile.basic', {
            headers: { Authorization: `Bearer ${accessToken}` }
        });
        if (!response.ok) throw new Error(`WHOOP profile fetch failed: ${response.statusText}`);
        const data = (await response.json()) as Record<string, unknown>;
        return {
            externalUserId: data.user_id?.toString() || `whoop_${Date.now()}`,
            name: `${data.first_name || 'WHOOP'} ${data.last_name || 'User'}`.trim(),
        };
    },

    async fetchLatestMetrics({ accessToken, since }): Promise<NormalizedMetric[]> {
        const metrics: NormalizedMetric[] = [];
        try {
            // Fetch Recovery (which includes HRV, RHR)
            const recoveryUrl = new URL('https://api.prod.whoop.com/developer/v1/recovery');
            if (since) recoveryUrl.searchParams.append('start', since.toISOString());

            const recRes = await fetch(recoveryUrl.toString(), {
                headers: { Authorization: `Bearer ${accessToken}` }
            });

            if (recRes.ok) {
                const data = (await recRes.json()) as { records?: Record<string, unknown>[] };
                const records = data.records || [];
                records.forEach((r) => {
                    const score = r.score as Record<string, unknown> | undefined;
                    if (score) {
                        metrics.push({
                            metric: MetricType.RECOVERY,
                            value: score.recovery_score as number,
                            unit: '%',
                            timestamp: new Date(r.created_at as string),
                        });
                        metrics.push({
                            metric: MetricType.HEART_RATE,
                            value: score.resting_heart_rate as number,
                            unit: 'bpm',
                            timestamp: new Date(r.created_at as string),
                        });
                        metrics.push({
                            metric: MetricType.HRV,
                            value: score.hrv_rmssd_milli as number,
                            unit: 'ms',
                            timestamp: new Date(r.created_at as string),
                        });
                    }
                });
            }

            // Fetch Sleep
            const sleepUrl = new URL('https://api.prod.whoop.com/developer/v1/activity/sleep');
            if (since) sleepUrl.searchParams.append('start', since.toISOString());
            const sleepRes = await fetch(sleepUrl.toString(), {
                headers: { Authorization: `Bearer ${accessToken}` }
            });

            if (sleepRes.ok) {
                const data = (await sleepRes.json()) as { records?: Record<string, unknown>[] };
                const records = data.records || [];
                records.forEach((r) => {
                    const score = r.score as Record<string, unknown> | undefined;
                    if (score && score.sleep_performance_percentage) {
                        metrics.push({
                            metric: MetricType.SLEEP_DURATION,
                            value: score.sleep_performance_percentage as number,
                            unit: '%',
                            timestamp: new Date(r.created_at as string),
                        });
                    }
                });
            }
        } catch (error) {
            console.error("Error fetching WHOOP metrics", error);
        }
        return metrics;
    }
};
