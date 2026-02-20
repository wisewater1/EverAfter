// Scaffold implementations for providers pending full integration
// These provide the structure but need complete API implementation

import { Provider } from '@prisma/client';
import { ProviderDriver, OAuthTokens, ProviderProfile, NormalizedMetric } from '../types/index.js';
import { getProviderConfig } from '../config/providers.js';

function createScaffoldProvider(provider: Provider): ProviderDriver {
  return {
    id: provider,
    name: getProviderConfig(provider).name,

    authorizeUrl({ state, redirectUri }) {
      const config = getProviderConfig(provider);
      if (!config.authUrl) throw new Error(`${config.name} does not support standard OAuth authorization`);

      const url = new URL(config.authUrl);
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
      const config = getProviderConfig(provider);
      if (!config.tokenUrl) throw new Error(`${config.name} does not support standard OAuth token exchange`);

      const params = new URLSearchParams({
        client_id: config.clientId,
        client_secret: config.clientSecret,
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri,
      });

      const response = await fetch(config.tokenUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Accept: 'application/json',
        },
        body: params.toString(),
      });

      if (!response.ok) {
        throw new Error(`Failed to exchange token for ${provider}: ${response.statusText}`);
      }

      const data = await response.json();
      return {
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
        expiresAt: data.expires_in ? new Date(Date.now() + data.expires_in * 1000) : undefined,
        scopes: data.scope ? data.scope.split(' ') : undefined,
      };
    },

    async refreshTokens(refreshToken: string): Promise<OAuthTokens> {
      const config = getProviderConfig(provider);
      if (!config.tokenUrl) throw new Error(`${config.name} does not support standard OAuth token refresh`);

      const params = new URLSearchParams({
        client_id: config.clientId,
        client_secret: config.clientSecret,
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
      });

      const response = await fetch(config.tokenUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Accept: 'application/json',
        },
        body: params.toString(),
      });

      if (!response.ok) {
        throw new Error(`Failed to refresh token for ${provider}: ${response.statusText}`);
      }

      const data = await response.json();
      return {
        accessToken: data.access_token,
        refreshToken: data.refresh_token || refreshToken, // Some providers don't return a new refresh token
        expiresAt: data.expires_in ? new Date(Date.now() + data.expires_in * 1000) : undefined,
        scopes: data.scope ? data.scope.split(' ') : undefined,
      };
    },

    async fetchProfile(accessToken: string): Promise<ProviderProfile> {
      // Basic implementation - each provider will need custom mapping
      // For scaffold, we return a mock profile with the provider ID
      console.warn(`[Scaffold] Using mock profile fetch for ${provider}`);
      return {
        externalUserId: `${provider.toLowerCase()}_mock_id_` + Math.random().toString(36).substring(7),
        name: `User mapped from ${provider}`,
      };
    },

    async fetchLatestMetrics({ accessToken, since }): Promise<NormalizedMetric[]> {
      // Basic implementation - each provider will need custom mapping
      console.warn(`[Scaffold] Using mock metrics fetch for ${provider}`);
      return [];
    },
  };
}

// Scaffold providers - pending full implementation
export const withingsProvider = createScaffoldProvider(Provider.WITHINGS);
export const polarProvider = createScaffoldProvider(Provider.POLAR);
export const googleFitProvider = createScaffoldProvider(Provider.GOOGLE_FIT);
export const abbottLibreProvider = createScaffoldProvider(Provider.ABBOTT_LIBRE);
export const validicProvider = createScaffoldProvider(Provider.VALIDIC);
export const humanApiProvider = createScaffoldProvider(Provider.HUMAN_API);
export const metriportProvider = createScaffoldProvider(Provider.METRIPORT);
export const rookProvider = createScaffoldProvider(Provider.ROOK);
export const spikeProvider = createScaffoldProvider(Provider.SPIKE);

// Mobile bridge providers (use different authentication)
export const appleHealthProvider: ProviderDriver = {
  id: Provider.APPLE_HEALTH,
  name: 'Apple HealthKit',

  authorizeUrl() {
    throw new Error('Apple HealthKit uses mobile bridge - no OAuth flow');
  },

  async exchangeCodeForTokens(): Promise<OAuthTokens> {
    throw new Error('Apple HealthKit uses mobile bridge - no OAuth flow');
  },

  async refreshTokens(): Promise<OAuthTokens> {
    throw new Error('Apple HealthKit uses mobile bridge - no token refresh');
  },

  async fetchProfile(): Promise<ProviderProfile> {
    throw new Error('Apple HealthKit profile determined from bridge request');
  },

  async fetchLatestMetrics(): Promise<NormalizedMetric[]> {
    throw new Error('Apple HealthKit data pushed via bridge endpoint');
  },
};

export const samsungHealthProvider: ProviderDriver = {
  id: Provider.SAMSUNG_HEALTH,
  name: 'Samsung Health Connect',

  authorizeUrl() {
    throw new Error('Samsung Health Connect uses mobile bridge - no OAuth flow');
  },

  async exchangeCodeForTokens(): Promise<OAuthTokens> {
    throw new Error('Samsung Health Connect uses mobile bridge - no OAuth flow');
  },

  async refreshTokens(): Promise<OAuthTokens> {
    throw new Error('Samsung Health Connect uses mobile bridge - no token refresh');
  },

  async fetchProfile(): Promise<ProviderProfile> {
    throw new Error('Samsung Health Connect profile determined from bridge request');
  },

  async fetchLatestMetrics(): Promise<NormalizedMetric[]> {
    throw new Error('Samsung Health Connect data pushed via bridge endpoint');
  },
};

// MyFitnessPal (no official public API)
export const myFitnessPalProvider: ProviderDriver = {
  id: Provider.MYFITNESSPAL,
  name: 'MyFitnessPal',

  authorizeUrl() {
    throw new Error('MyFitnessPal has no public API - use CSV upload or Terra integration');
  },

  async exchangeCodeForTokens(): Promise<OAuthTokens> {
    throw new Error('MyFitnessPal has no public API');
  },

  async refreshTokens(): Promise<OAuthTokens> {
    throw new Error('MyFitnessPal has no public API');
  },

  async fetchProfile(): Promise<ProviderProfile> {
    throw new Error('MyFitnessPal has no public API');
  },

  async fetchLatestMetrics(): Promise<NormalizedMetric[]> {
    throw new Error('MyFitnessPal has no public API - data must be uploaded manually');
  },
};

// --- Custom Implementations for WHOOP and GARMIN ---

export const whoopProvider: ProviderDriver = {
  ...createScaffoldProvider(Provider.WHOOP),
  async fetchProfile(accessToken: string): Promise<ProviderProfile> {
    const response = await fetch('https://api.prod.whoop.com/developer/v1/user/profile.basic', {
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    if (!response.ok) throw new Error(`WHOOP profile fetch failed: ${response.statusText}`);
    const data = await response.json();
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
        const data = await recRes.json();
        const records = data.records || [];
        records.forEach((r: any) => {
          if (r.score) {
            metrics.push({
              provider: Provider.WHOOP,
              type: 'recovery_score',
              value: r.score.recovery_score,
              unit: '%',
              timestamp: new Date(r.created_at),
            });
            metrics.push({
              provider: Provider.WHOOP,
              type: 'resting_hr',
              value: r.score.resting_heart_rate,
              unit: 'bpm',
              timestamp: new Date(r.created_at),
            });
            metrics.push({
              provider: Provider.WHOOP,
              type: 'hrv',
              value: r.score.hrv_rmssd_milli,
              unit: 'ms',
              timestamp: new Date(r.created_at),
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
        const data = await sleepRes.json();
        const records = data.records || [];
        records.forEach((r: any) => {
          if (r.score && r.score.sleep_performance_percentage) {
            metrics.push({
              provider: Provider.WHOOP,
              type: 'sleep_score',
              value: r.score.sleep_performance_percentage,
              unit: '%',
              timestamp: new Date(r.created_at),
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

export const garminProvider: ProviderDriver = {
  ...createScaffoldProvider(Provider.GARMIN),
  async fetchProfile(accessToken: string): Promise<ProviderProfile> {
    // Garmin API typically relies on Webhooks for pushing data. 
    // The REST API for direct querying requires enterprise approval.
    // This is a placeholder for the REST API if available.
    return {
      externalUserId: `garmin_user_${Date.now()}`,
      name: "Garmin Connected User"
    };
  },
  async fetchLatestMetrics({ accessToken, since }): Promise<NormalizedMetric[]> {
    console.warn("Garmin primarily uses Webhooks for data delivery. REST endpoint fetching is limited without enterprise access.");
    return [];
  }
};
