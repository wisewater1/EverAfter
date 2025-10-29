import axios from 'axios';
import { Provider, MetricType } from '@prisma/client';
import { ProviderDriver, OAuthTokens, ProviderProfile, NormalizedMetric } from '../types/index.js';
import { verifyHmacSignature } from '../utils/crypto.js';
import { logger } from '../utils/logger.js';

const TERRA_API_URL = 'https://api.tryterra.co/v2';
const TERRA_WEBHOOK_URL = 'https://ws.tryterra.co/webhooks';

export const terraProvider: ProviderDriver = {
  id: Provider.TERRA,
  name: 'Terra',

  authorizeUrl({ state, redirectUri }) {
    const devId = process.env.TERRA_DEV_ID;
    const resource = 'FITBIT'; // Default, can be made dynamic
    return `${TERRA_API_URL}/auth/authenticateUser?resource=${resource}&auth_success_redirect_url=${encodeURIComponent(redirectUri)}&state=${state}&dev_id=${devId}`;
  },

  async exchangeCodeForTokens(code: string, redirectUri: string): Promise<OAuthTokens> {
    try {
      const response = await axios.post(
        `${TERRA_API_URL}/auth/generateAuthToken`,
        {
          code,
          redirect_uri: redirectUri,
        },
        {
          headers: {
            'dev-id': process.env.TERRA_DEV_ID,
            'x-api-key': process.env.TERRA_API_KEY,
          },
        }
      );

      return {
        accessToken: response.data.user_id,
        expiresAt: undefined, // Terra tokens don't expire
      };
    } catch (error) {
      logger.error('Terra token exchange failed', error);
      throw new Error('Failed to exchange Terra authorization code');
    }
  },

  async refreshTokens(refreshToken: string): Promise<OAuthTokens> {
    // Terra tokens don't expire, return as-is
    return {
      accessToken: refreshToken,
    };
  },

  async fetchProfile(accessToken: string): Promise<ProviderProfile> {
    try {
      const response = await axios.get(`${TERRA_API_URL}/user/${accessToken}`, {
        headers: {
          'dev-id': process.env.TERRA_DEV_ID,
          'x-api-key': process.env.TERRA_API_KEY,
        },
      });

      return {
        externalUserId: accessToken,
        metadata: response.data,
      };
    } catch (error) {
      logger.error('Terra profile fetch failed', error);
      throw new Error('Failed to fetch Terra profile');
    }
  },

  async fetchLatestMetrics({ accessToken, since }): Promise<NormalizedMetric[]> {
    const metrics: NormalizedMetric[] = [];
    const startDate = since || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const endDate = new Date();

    try {
      // Fetch daily data
      const dailyResponse = await axios.get(`${TERRA_API_URL}/daily`, {
        params: {
          user_id: accessToken,
          start_date: startDate.toISOString().split('T')[0],
          end_date: endDate.toISOString().split('T')[0],
        },
        headers: {
          'dev-id': process.env.TERRA_DEV_ID,
          'x-api-key': process.env.TERRA_API_KEY,
        },
      });

      for (const day of dailyResponse.data.data || []) {
        if (day.steps_data?.steps) {
          metrics.push({
            metric: MetricType.STEPS,
            value: day.steps_data.steps,
            unit: 'steps',
            timestamp: new Date(day.metadata.start_time),
            raw: day,
          });
        }
        if (day.calories_data?.total_burned_calories) {
          metrics.push({
            metric: MetricType.CALORIES,
            value: day.calories_data.total_burned_calories,
            unit: 'kcal',
            timestamp: new Date(day.metadata.start_time),
            raw: day,
          });
        }
      }

      // Fetch sleep data
      const sleepResponse = await axios.get(`${TERRA_API_URL}/sleep`, {
        params: {
          user_id: accessToken,
          start_date: startDate.toISOString().split('T')[0],
          end_date: endDate.toISOString().split('T')[0],
        },
        headers: {
          'dev-id': process.env.TERRA_DEV_ID,
          'x-api-key': process.env.TERRA_API_KEY,
        },
      });

      for (const sleep of sleepResponse.data.data || []) {
        if (sleep.sleep_durations_data?.asleep?.duration_asleep_state_seconds) {
          metrics.push({
            metric: MetricType.SLEEP_DURATION,
            value: sleep.sleep_durations_data.asleep.duration_asleep_state_seconds / 3600,
            unit: 'hours',
            timestamp: new Date(sleep.metadata.start_time),
            raw: sleep,
          });
        }
      }

      return metrics;
    } catch (error) {
      logger.error('Terra metrics fetch failed', error);
      throw new Error('Failed to fetch Terra metrics');
    }
  },

  verifyWebhook(payload: string, signature: string): boolean {
    const secret = process.env.TERRA_WEBHOOK_SECRET || '';
    return verifyHmacSignature(payload, signature, secret, 'sha256');
  },
};
