import axios from 'axios';
import { Provider, MetricType } from '@prisma/client';
import { ProviderDriver, OAuthTokens, ProviderProfile, NormalizedMetric } from '../types/index.js';
import { logger } from '../utils/logger.js';
import { getProviderConfig } from '../config/providers.js';

const DEXCOM_API_URL = 'https://api.dexcom.com/v2';

export const dexcomProvider: ProviderDriver = {
  id: Provider.DEXCOM,
  name: 'Dexcom CGM',

  authorizeUrl({ state, redirectUri }) {
    const config = getProviderConfig(Provider.DEXCOM);
    const params = new URLSearchParams({
      client_id: config.clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: config.scopes.join(' '),
      state,
    });
    return `${config.authUrl}?${params.toString()}`;
  },

  async exchangeCodeForTokens(code: string, redirectUri: string): Promise<OAuthTokens> {
    const config = getProviderConfig(Provider.DEXCOM);
    const credentials = Buffer.from(`${config.clientId}:${config.clientSecret}`).toString('base64');

    try {
      const response = await axios.post(
        config.tokenUrl,
        new URLSearchParams({
          grant_type: 'authorization_code',
          code,
          redirect_uri: redirectUri,
        }),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            Authorization: `Basic ${credentials}`,
          },
        }
      );

      return {
        accessToken: response.data.access_token,
        refreshToken: response.data.refresh_token,
        expiresAt: new Date(Date.now() + response.data.expires_in * 1000),
      };
    } catch (error) {
      logger.error('Dexcom token exchange failed', error);
      throw new Error('Failed to exchange Dexcom authorization code');
    }
  },

  async refreshTokens(refreshToken: string): Promise<OAuthTokens> {
    const config = getProviderConfig(Provider.DEXCOM);
    const credentials = Buffer.from(`${config.clientId}:${config.clientSecret}`).toString('base64');

    try {
      const response = await axios.post(
        config.tokenUrl,
        new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: refreshToken,
        }),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            Authorization: `Basic ${credentials}`,
          },
        }
      );

      return {
        accessToken: response.data.access_token,
        refreshToken: response.data.refresh_token,
        expiresAt: new Date(Date.now() + response.data.expires_in * 1000),
      };
    } catch (error) {
      logger.error('Dexcom token refresh failed', error);
      throw new Error('Failed to refresh Dexcom tokens');
    }
  },

  async fetchProfile(accessToken: string): Promise<ProviderProfile> {
    try {
      // Dexcom doesn't have a separate profile endpoint
      // Using a test request to validate token
      await axios.get(`${DEXCOM_API_URL}/users/self/devices`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      return {
        externalUserId: accessToken.substring(0, 20), // Use partial token as ID
        metadata: { provider: 'dexcom' },
      };
    } catch (error) {
      logger.error('Dexcom profile fetch failed', error);
      throw new Error('Failed to fetch Dexcom profile');
    }
  },

  async fetchLatestMetrics({ accessToken, since }): Promise<NormalizedMetric[]> {
    const metrics: NormalizedMetric[] = [];
    const startDate = since || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const endDate = new Date();

    try {
      // Fetch estimated glucose values (EGVs)
      const egvResponse = await axios.get(`${DEXCOM_API_URL}/users/self/egvs`, {
        params: {
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
        },
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      for (const egv of egvResponse.data.egvs || egvResponse.data.records || []) {
        if (egv.value && egv.systemTime) {
          metrics.push({
            metric: MetricType.GLUCOSE,
            value: egv.value,
            unit: 'mg/dL',
            timestamp: new Date(egv.systemTime),
            raw: egv,
          });
        }
      }

      return metrics;
    } catch (error) {
      logger.error('Dexcom metrics fetch failed', error);
      throw new Error('Failed to fetch Dexcom glucose data');
    }
  },
};
