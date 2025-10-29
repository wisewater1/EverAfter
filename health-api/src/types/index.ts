import { Request } from 'express';
import { Provider, MetricType, AccountStatus } from '@prisma/client';

export { Provider, MetricType, AccountStatus };

export interface AuthenticatedRequest extends Request {
  userId?: string;
  user?: {
    id: string;
    email: string;
  };
}

export interface ProviderConfig {
  id: Provider;
  name: string;
  authUrl: string;
  tokenUrl: string;
  clientId: string;
  clientSecret: string;
  scopes: string[];
  supportsWebhooks: boolean;
  supportsPolling: boolean;
}

export interface OAuthTokens {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: Date;
  scopes?: string[];
}

export interface ProviderDriver {
  id: Provider;
  name: string;
  authorizeUrl: (params: { state: string; redirectUri: string }) => string;
  exchangeCodeForTokens: (code: string, redirectUri: string) => Promise<OAuthTokens>;
  refreshTokens: (refreshToken: string) => Promise<OAuthTokens>;
  fetchProfile: (accessToken: string) => Promise<ProviderProfile>;
  fetchDevices?: (accessToken: string) => Promise<ProviderDevice[]>;
  fetchLatestMetrics: (params: {
    accessToken: string;
    since?: Date;
  }) => Promise<NormalizedMetric[]>;
  verifyWebhook?: (payload: string, signature: string) => boolean;
}

export interface ProviderProfile {
  externalUserId: string;
  email?: string;
  name?: string;
  metadata?: Record<string, any>;
}

export interface ProviderDevice {
  providerDeviceId: string;
  name?: string;
  model?: string;
  manufacturer?: string;
  lastSeenAt?: Date;
}

export interface NormalizedMetric {
  metric: MetricType;
  value: number;
  unit?: string;
  timestamp: Date;
  deviceId?: string;
  raw?: Record<string, any>;
}

export interface WebhookPayload {
  provider: Provider;
  eventId?: string;
  userId?: string;
  externalUserId?: string;
  data: any;
  signature?: string;
}

export interface JobData {
  userId: string;
  provider: Provider;
  accountId: string;
  webhookEventId?: string;
}

export interface SyncJobData extends JobData {
  since?: Date;
  fullBackfill?: boolean;
}

export interface TokenRefreshJobData {
  accountId: string;
  provider: Provider;
}

export interface MetricsQueryParams {
  types?: MetricType[];
  since?: Date;
  until?: Date;
  provider?: Provider;
  limit?: number;
  offset?: number;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  meta?: {
    total?: number;
    page?: number;
    limit?: number;
  };
}

export interface ConnectionStatus {
  provider: Provider;
  status: AccountStatus;
  lastSyncAt?: Date;
  deviceCount?: number;
  error?: string;
}

export interface DailySummary {
  date: string;
  steps?: number;
  calories?: number;
  heartRateAvg?: number;
  sleepDuration?: number;
  glucose?: {
    avg: number;
    min: number;
    max: number;
  };
}
