import { createClient, SupabaseClient } from 'jsr:@supabase/supabase-js@2';
import { crypto } from 'https://deno.land/std@0.224.0/crypto/mod.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

export function getCorsHeaders() {
  return corsHeaders;
}

export function supabaseFromRequest(req: Request): SupabaseClient {
  const authHeader = req.headers.get('Authorization');

  return createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    {
      global: {
        headers: authHeader ? { Authorization: authHeader } : {},
      },
    }
  );
}

export function serviceSupabase(): SupabaseClient {
  return createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  );
}

export function jsonResponse(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

export function errorResponse(message: string, status = 400) {
  return jsonResponse({ error: message }, status);
}

export async function verifyTerraSignature(
  req: Request,
  body: string
): Promise<boolean> {
  const signature = req.headers.get('terra-signature');
  if (!signature) return false;

  const secret = Deno.env.get('TERRA_WEBHOOK_SECRET');
  if (!secret) return false;

  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signatureBuffer = await crypto.subtle.sign(
    'HMAC',
    key,
    encoder.encode(body)
  );

  const computedSignature = Array.from(new Uint8Array(signatureBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');

  return computedSignature === signature;
}

export async function verifyFitbitSignature(
  req: Request,
  body: string
): Promise<boolean> {
  const signature = req.headers.get('x-fitbit-signature');
  if (!signature) return false;

  const secret = Deno.env.get('FITBIT_SUBSCRIBER_VERIFICATION_CODE');
  if (!secret) return false;

  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-1' },
    false,
    ['sign']
  );

  const signatureBuffer = await crypto.subtle.sign(
    'HMAC',
    key,
    encoder.encode(body)
  );

  const computedSignature = btoa(String.fromCharCode(...new Uint8Array(signatureBuffer)));

  return computedSignature === signature;
}

export function generateDedupKey(provider: string, eventId: string, timestamp: string): string {
  const encoder = new TextEncoder();
  const data = encoder.encode(`${provider}:${eventId}:${timestamp}`);
  const hashBuffer = crypto.subtle.digestSync('SHA-256', data);
  return Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

export interface MetricIngestion {
  user_id: string;
  engram_id?: string;
  source: string;
  metric: string;
  value: number;
  unit: string;
  ts: string;
  raw: any;
}

export async function ingestMetric(
  supabase: SupabaseClient,
  data: MetricIngestion
): Promise<{ success: boolean; error?: string; isDuplicate?: boolean }> {
  try {
    // Check for duplicate data within 5-minute window
    const timeWindow = 5 * 60 * 1000; // 5 minutes in milliseconds
    const ts = new Date(data.ts);
    const startWindow = new Date(ts.getTime() - timeWindow);
    const endWindow = new Date(ts.getTime() + timeWindow);

    const { data: existingMetrics, error: checkError } = await supabase
      .from('health_metrics')
      .select('id, value, ts')
      .eq('user_id', data.user_id)
      .eq('source', data.source)
      .eq('metric', data.metric)
      .gte('ts', startWindow.toISOString())
      .lte('ts', endWindow.toISOString())
      .limit(10);

    if (!checkError && existingMetrics && existingMetrics.length > 0) {
      // Check for exact duplicates (same value and timestamp within 1 minute)
      const isDuplicate = existingMetrics.some(existing => {
        const existingTs = new Date(existing.ts).getTime();
        const currentTs = ts.getTime();
        const timeDiff = Math.abs(existingTs - currentTs);
        const valueDiff = Math.abs(existing.value - data.value);

        return timeDiff < 60000 && valueDiff < 0.1; // Within 1 minute and same value
      });

      if (isDuplicate) {
        console.log(`Duplicate metric detected: ${data.metric} from ${data.source} at ${data.ts}`);
        return { success: true, isDuplicate: true };
      }
    }

    // Validate data quality
    const qualityValidation = await validateMetricQuality(data);

    const { error } = await supabase.from('health_metrics').insert({
      user_id: data.user_id,
      engram_id: data.engram_id || null,
      source: data.source,
      metric: data.metric,
      value: data.value,
      unit: data.unit,
      ts: data.ts,
      raw: data.raw || {},
      quality_score: qualityValidation.qualityScore,
      is_anomaly: qualityValidation.isAnomaly,
      anomaly_reason: qualityValidation.anomalyReason,
    });

    if (error) {
      console.error('Metric ingestion error:', error);
      return { success: false, error: error.message };
    }

    // Log data quality issues if detected
    if (qualityValidation.isAnomaly) {
      await logDataQualityIssue(supabase, data, qualityValidation);
    }

    return { success: true, isDuplicate: false };
  } catch (err: any) {
    console.error('Metric ingestion exception:', err);
    return { success: false, error: err.message };
  }
}

async function validateMetricQuality(data: MetricIngestion): Promise<{
  qualityScore: number;
  isAnomaly: boolean;
  anomalyReason?: string;
}> {
  const metricRanges: Record<string, { min: number; max: number }> = {
    glucose: { min: 40, max: 400 },
    heart_rate: { min: 30, max: 220 },
    resting_hr: { min: 30, max: 120 },
    steps: { min: 0, max: 100000 },
    sleep_hours: { min: 0, max: 24 },
    weight: { min: 20, max: 300 },
    spo2: { min: 70, max: 100 },
    body_temp: { min: 32, max: 43 },
  };

  const range = metricRanges[data.metric];

  if (!range) {
    return { qualityScore: 1.0, isAnomaly: false };
  }

  if (data.value < range.min || data.value > range.max) {
    return {
      qualityScore: 0.0,
      isAnomaly: true,
      anomalyReason: `Value ${data.value} outside valid range [${range.min}, ${range.max}]`,
    };
  }

  return { qualityScore: 1.0, isAnomaly: false };
}

async function logDataQualityIssue(
  supabase: SupabaseClient,
  data: MetricIngestion,
  validation: { anomalyReason?: string }
): Promise<void> {
  try {
    await supabase.from('data_quality_issues').insert({
      user_id: data.user_id,
      provider: data.source,
      metric_type: data.metric,
      issue_type: 'invalid_range',
      issue_description: validation.anomalyReason,
      detected_value: data.value,
    });
  } catch (err) {
    console.error('Failed to log data quality issue:', err);
  }
}

export async function getUserIdFromExternalId(
  supabase: SupabaseClient,
  provider: string,
  externalUserId: string
): Promise<string | null> {
  const { data, error } = await supabase
    .from('provider_accounts')
    .select('user_id')
    .eq('provider', provider)
    .eq('external_user_id', externalUserId)
    .maybeSingle();

  if (error || !data) {
    console.error('Failed to get user_id:', error);
    return null;
  }

  return data.user_id;
}

export interface ProviderConfig {
  clientId: string;
  clientSecret: string;
  authUrl: string;
  tokenUrl: string;
  scopes: string[];
  redirectUri: string;
}

export function getProviderConfig(provider: string): ProviderConfig | null {
  const baseUrl = Deno.env.get('APP_BASE_URL') || 'http://localhost:5173';
  const redirectUri = `${baseUrl}/api/connect-callback`;

  switch (provider.toLowerCase()) {
    case 'terra':
      return {
        clientId: Deno.env.get('TERRA_CLIENT_ID') || '',
        clientSecret: Deno.env.get('TERRA_CLIENT_SECRET') || '',
        authUrl: 'https://api.tryterra.co/v2/auth/authenticateUser',
        tokenUrl: 'https://api.tryterra.co/v2/auth/token',
        scopes: ['ACTIVITY', 'BODY', 'DAILY', 'NUTRITION', 'SLEEP'],
        redirectUri,
      };

    case 'fitbit':
      return {
        clientId: Deno.env.get('FITBIT_CLIENT_ID') || '',
        clientSecret: Deno.env.get('FITBIT_CLIENT_SECRET') || '',
        authUrl: 'https://www.fitbit.com/oauth2/authorize',
        tokenUrl: 'https://api.fitbit.com/oauth2/token',
        scopes: ['activity', 'heartrate', 'sleep', 'weight'],
        redirectUri,
      };

    case 'oura':
      return {
        clientId: Deno.env.get('OURA_CLIENT_ID') || '',
        clientSecret: Deno.env.get('OURA_CLIENT_SECRET') || '',
        authUrl: 'https://cloud.ouraring.com/oauth/authorize',
        tokenUrl: 'https://api.ouraring.com/oauth/token',
        scopes: ['daily', 'heartrate', 'workout', 'sleep'],
        redirectUri,
      };

    case 'dexcom':
      return {
        clientId: Deno.env.get('DEXCOM_CLIENT_ID') || '',
        clientSecret: Deno.env.get('DEXCOM_CLIENT_SECRET') || '',
        authUrl: 'https://sandbox-api.dexcom.com/v2/oauth2/login',
        tokenUrl: 'https://sandbox-api.dexcom.com/v2/oauth2/token',
        scopes: ['offline_access'],
        redirectUri,
      };

    default:
      return null;
  }
}

export async function exchangeCodeForTokens(
  provider: string,
  code: string
): Promise<{ access_token: string; refresh_token?: string; external_user_id?: string } | null> {
  const config = getProviderConfig(provider);
  if (!config) return null;

  try {
    const body = new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: config.redirectUri,
      client_id: config.clientId,
      client_secret: config.clientSecret,
    });

    const response = await fetch(config.tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: body.toString(),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Token exchange failed for ${provider}:`, errorText);
      return null;
    }

    const data = await response.json();

    return {
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      external_user_id: data.user_id || data.userId || data.user?.id || 'unknown',
    };
  } catch (err) {
    console.error(`Token exchange error for ${provider}:`, err);
    return null;
  }
}
