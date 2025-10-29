import axios from 'axios';
import { Provider, MetricType } from '@prisma/client';
import { ProviderDriver, OAuthTokens, ProviderProfile, NormalizedMetric } from '../types/index.js';
import { logger } from '../utils/logger.js';
import { getProviderConfig } from '../config/providers.js';
import { verifyHmacSignature } from '../utils/crypto.js';

const FITBIT_API_URL = 'https://api.fitbit.com/1';

export const fitbitProvider: ProviderDriver = {
  id: Provider.FITBIT,
  name: 'Fitbit',

  authorizeUrl({ state, redirectUri }) {
    const config = getProviderConfig(Provider.FITBIT);
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
    const config = getProviderConfig(Provider.FITBIT);
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
        scopes: response.data.scope.split(' '),
      };
    } catch (error) {
      logger.error('Fitbit token exchange failed', error);
      throw new Error('Failed to exchange Fitbit authorization code');
    }
  },

  async refreshTokens(refreshToken: string): Promise<OAuthTokens> {
    const config = getProviderConfig(Provider.FITBIT);
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
      logger.error('Fitbit token refresh failed', error);
      throw new Error('Failed to refresh Fitbit tokens');
    }
  },

  async fetchProfile(accessToken: string): Promise<ProviderProfile> {
    try {
      const response = await axios.get(`${FITBIT_API_URL}/user/-/profile.json`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      return {
        externalUserId: response.data.user.encodedId,
        name: response.data.user.fullName,
        metadata: response.data.user,
      };
    } catch (error) {
      logger.error('Fitbit profile fetch failed', error);
      throw new Error('Failed to fetch Fitbit profile');
    }
  },

  async fetchLatestMetrics({ accessToken, since }): Promise<NormalizedMetric[]> {
    const metrics: NormalizedMetric[] = [];
    const days = 7;
    const headers = { Authorization: `Bearer ${accessToken}` };

    try {
      // Fetch activity data
      const activityResponse = await axios.get(
        `${FITBIT_API_URL}/user/-/activities/date/today/${days}d.json`,
        { headers }
      );

      for (const activity of activityResponse.data['activities-summary'] || []) {
        const date = new Date(activity.dateTime);

        if (activity.steps) {
          metrics.push({
            metric: MetricType.STEPS,
            value: activity.steps,
            unit: 'steps',
            timestamp: date,
            raw: activity,
          });
        }
        if (activity.calories) {
          metrics.push({
            metric: MetricType.CALORIES,
            value: activity.calories,
            unit: 'kcal',
            timestamp: date,
            raw: activity,
          });
        }
      }

      // Fetch heart rate data
      const hrResponse = await axios.get(
        `${FITBIT_API_URL}/user/-/activities/heart/date/today/${days}d.json`,
        { headers }
      );

      for (const hr of hrResponse.data['activities-heart'] || []) {
        if (hr.value?.restingHeartRate) {
          metrics.push({
            metric: MetricType.HEART_RATE,
            value: hr.value.restingHeartRate,
            unit: 'bpm',
            timestamp: new Date(hr.dateTime),
            raw: hr,
          });
        }
      }

      // Fetch sleep data
      const sleepResponse = await axios.get(
        `${FITBIT_API_URL}/user/-/sleep/date/today/${days}d.json`,
        { headers }
      );

      for (const sleep of sleepResponse.data.sleep || []) {
        if (sleep.duration) {
          metrics.push({
            metric: MetricType.SLEEP_DURATION,
            value: sleep.duration / (1000 * 60 * 60),
            unit: 'hours',
            timestamp: new Date(sleep.startTime),
            raw: sleep,
          });
        }
      }

      return metrics;
    } catch (error) {
      logger.error('Fitbit metrics fetch failed', error);
      throw new Error('Failed to fetch Fitbit metrics');
    }
  },

  verifyWebhook(payload: string, signature: string): boolean {
    const secret = process.env.FITBIT_SUBSCRIBER_VERIFICATION_CODE || '';
    return verifyHmacSignature(payload, signature, secret, 'sha1');
  },
};
