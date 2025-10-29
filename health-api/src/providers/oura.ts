import axios from 'axios';
import { Provider, MetricType } from '@prisma/client';
import { ProviderDriver, OAuthTokens, ProviderProfile, NormalizedMetric } from '../types/index.js';
import { logger } from '../utils/logger.js';
import { getProviderConfig } from '../config/providers.js';

const OURA_API_URL = 'https://api.ouraring.com/v2';

export const ouraProvider: ProviderDriver = {
  id: Provider.OURA,
  name: 'Oura Ring',

  authorizeUrl({ state, redirectUri }) {
    const config = getProviderConfig(Provider.OURA);
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
    const config = getProviderConfig(Provider.OURA);
    try {
      const response = await axios.post(
        config.tokenUrl,
        new URLSearchParams({
          grant_type: 'authorization_code',
          code,
          redirect_uri: redirectUri,
          client_id: config.clientId,
          client_secret: config.clientSecret,
        }),
        {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        }
      );

      return {
        accessToken: response.data.access_token,
        refreshToken: response.data.refresh_token,
        expiresAt: new Date(Date.now() + response.data.expires_in * 1000),
      };
    } catch (error) {
      logger.error('Oura token exchange failed', error);
      throw new Error('Failed to exchange Oura authorization code');
    }
  },

  async refreshTokens(refreshToken: string): Promise<OAuthTokens> {
    const config = getProviderConfig(Provider.OURA);
    try {
      const response = await axios.post(
        config.tokenUrl,
        new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: refreshToken,
          client_id: config.clientId,
          client_secret: config.clientSecret,
        }),
        {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        }
      );

      return {
        accessToken: response.data.access_token,
        refreshToken: response.data.refresh_token,
        expiresAt: new Date(Date.now() + response.data.expires_in * 1000),
      };
    } catch (error) {
      logger.error('Oura token refresh failed', error);
      throw new Error('Failed to refresh Oura tokens');
    }
  },

  async fetchProfile(accessToken: string): Promise<ProviderProfile> {
    try {
      const response = await axios.get(`${OURA_API_URL}/usercollection/personal_info`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      return {
        externalUserId: response.data.id,
        email: response.data.email,
        metadata: response.data,
      };
    } catch (error) {
      logger.error('Oura profile fetch failed', error);
      throw new Error('Failed to fetch Oura profile');
    }
  },

  async fetchLatestMetrics({ accessToken, since }): Promise<NormalizedMetric[]> {
    const metrics: NormalizedMetric[] = [];
    const startDate = since || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const headers = { Authorization: `Bearer ${accessToken}` };

    try {
      // Fetch sleep data
      const sleepResponse = await axios.get(`${OURA_API_URL}/usercollection/sleep`, {
        headers,
        params: { start_date: startDate.toISOString().split('T')[0] },
      });

      for (const sleep of sleepResponse.data.data || []) {
        if (sleep.total_sleep_duration) {
          metrics.push({
            metric: MetricType.SLEEP_DURATION,
            value: sleep.total_sleep_duration / 3600,
            unit: 'hours',
            timestamp: new Date(sleep.bedtime_start),
            raw: sleep,
          });
        }
        if (sleep.average_heart_rate) {
          metrics.push({
            metric: MetricType.HEART_RATE,
            value: sleep.average_heart_rate,
            unit: 'bpm',
            timestamp: new Date(sleep.bedtime_start),
            raw: sleep,
          });
        }
        if (sleep.average_hrv) {
          metrics.push({
            metric: MetricType.HRV,
            value: sleep.average_hrv,
            unit: 'ms',
            timestamp: new Date(sleep.bedtime_start),
            raw: sleep,
          });
        }
      }

      // Fetch readiness data
      const readinessResponse = await axios.get(`${OURA_API_URL}/usercollection/daily_readiness`, {
        headers,
        params: { start_date: startDate.toISOString().split('T')[0] },
      });

      for (const readiness of readinessResponse.data.data || []) {
        if (readiness.score) {
          metrics.push({
            metric: MetricType.READINESS,
            value: readiness.score,
            unit: 'score',
            timestamp: new Date(readiness.day),
            raw: readiness,
          });
        }
      }

      // Fetch activity data
      const activityResponse = await axios.get(`${OURA_API_URL}/usercollection/daily_activity`, {
        headers,
        params: { start_date: startDate.toISOString().split('T')[0] },
      });

      for (const activity of activityResponse.data.data || []) {
        if (activity.steps) {
          metrics.push({
            metric: MetricType.STEPS,
            value: activity.steps,
            unit: 'steps',
            timestamp: new Date(activity.day),
            raw: activity,
          });
        }
        if (activity.total_calories) {
          metrics.push({
            metric: MetricType.CALORIES,
            value: activity.total_calories,
            unit: 'kcal',
            timestamp: new Date(activity.day),
            raw: activity,
          });
        }
      }

      return metrics;
    } catch (error) {
      logger.error('Oura metrics fetch failed', error);
      throw new Error('Failed to fetch Oura metrics');
    }
  },
};
