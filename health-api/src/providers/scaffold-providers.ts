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
      // TODO: Implement OAuth authorization URL
      const config = getProviderConfig(provider);
      throw new Error(`${config.name} integration pending - OAuth not yet implemented`);
    },

    async exchangeCodeForTokens(code: string, redirectUri: string): Promise<OAuthTokens> {
      // TODO: Implement token exchange
      throw new Error(`${provider} token exchange not yet implemented`);
    },

    async refreshTokens(refreshToken: string): Promise<OAuthTokens> {
      // TODO: Implement token refresh
      throw new Error(`${provider} token refresh not yet implemented`);
    },

    async fetchProfile(accessToken: string): Promise<ProviderProfile> {
      // TODO: Implement profile fetching
      throw new Error(`${provider} profile fetch not yet implemented`);
    },

    async fetchLatestMetrics({ accessToken, since }): Promise<NormalizedMetric[]> {
      // TODO: Implement metrics fetching
      throw new Error(`${provider} metrics fetch not yet implemented`);
    },
  };
}

// Scaffold providers - pending full implementation
export const whoopProvider = createScaffoldProvider(Provider.WHOOP);
export const garminProvider = createScaffoldProvider(Provider.GARMIN);
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
