import axios from 'axios';
import { Provider, MetricType } from '@prisma/client';
import { ProviderDriver, OAuthTokens, ProviderProfile, NormalizedMetric } from '../types/index.js';
import { logger } from '../utils/logger.js';
import { getProviderConfig } from '../config/providers.js';

const STRAVA_API_URL = 'https://www.strava.com/api/v3';

export const stravaProvider: ProviderDriver = {
  id: Provider.STRAVA,
  name: 'Strava',

  authorizeUrl({ state, redirectUri }) {
    const config = getProviderConfig(Provider.STRAVA);
    const params = new URLSearchParams({
      client_id: config.clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: config.scopes.join(','),
      state,
      approval_prompt: 'auto',
    });
    return `${config.authUrl}?${params.toString()}`;
  },

  async exchangeCodeForTokens(code: string, redirectUri: string): Promise<OAuthTokens> {
    const config = getProviderConfig(Provider.STRAVA);

    try {
      const response = await axios.post(config.tokenUrl, {
        client_id: config.clientId,
        client_secret: config.clientSecret,
        code,
        grant_type: 'authorization_code',
      });

      return {
        accessToken: response.data.access_token,
        refreshToken: response.data.refresh_token,
        expiresAt: new Date(response.data.expires_at * 1000),
      };
    } catch (error) {
      logger.error('Strava token exchange failed', error);
      throw new Error('Failed to exchange Strava authorization code');
    }
  },

  async refreshTokens(refreshToken: string): Promise<OAuthTokens> {
    const config = getProviderConfig(Provider.STRAVA);

    try {
      const response = await axios.post(config.tokenUrl, {
        client_id: config.clientId,
        client_secret: config.clientSecret,
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
      });

      return {
        accessToken: response.data.access_token,
        refreshToken: response.data.refresh_token,
        expiresAt: new Date(response.data.expires_at * 1000),
      };
    } catch (error) {
      logger.error('Strava token refresh failed', error);
      throw new Error('Failed to refresh Strava tokens');
    }
  },

  async fetchProfile(accessToken: string): Promise<ProviderProfile> {
    try {
      const response = await axios.get(`${STRAVA_API_URL}/athlete`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      return {
        externalUserId: response.data.id.toString(),
        name: `${response.data.firstname} ${response.data.lastname}`,
        metadata: response.data,
      };
    } catch (error) {
      logger.error('Strava profile fetch failed', error);
      throw new Error('Failed to fetch Strava profile');
    }
  },

  async fetchLatestMetrics({ accessToken, since }): Promise<NormalizedMetric[]> {
    const metrics: NormalizedMetric[] = [];
    const after = since ? Math.floor(since.getTime() / 1000) : undefined;

    try {
      const response = await axios.get(`${STRAVA_API_URL}/athlete/activities`, {
        params: {
          after,
          per_page: 50,
        },
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      for (const activity of response.data || []) {
        const timestamp = new Date(activity.start_date);

        if (activity.distance) {
          metrics.push({
            metric: MetricType.WORKOUT_DISTANCE,
            value: activity.distance / 1000, // Convert to km
            unit: 'km',
            timestamp,
            raw: activity,
          });
        }

        if (activity.average_speed) {
          const paceMinPerKm = 1000 / (activity.average_speed * 60);
          metrics.push({
            metric: MetricType.WORKOUT_PACE,
            value: paceMinPerKm,
            unit: 'min/km',
            timestamp,
            raw: activity,
          });
        }

        if (activity.calories) {
          metrics.push({
            metric: MetricType.CALORIES,
            value: activity.calories,
            unit: 'kcal',
            timestamp,
            raw: activity,
          });
        }

        if (activity.average_heartrate) {
          metrics.push({
            metric: MetricType.HEART_RATE,
            value: activity.average_heartrate,
            unit: 'bpm',
            timestamp,
            raw: activity,
          });
        }
      }

      return metrics;
    } catch (error) {
      logger.error('Strava metrics fetch failed', error);
      throw new Error('Failed to fetch Strava activities');
    }
  },
};
