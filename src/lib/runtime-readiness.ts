import { buildAccessTokenHeaders } from './auth-session';
import { requestBackendJson } from './backend-request';

export type RuntimeCapabilityStatus = 'healthy' | 'degraded' | 'unavailable';

export interface RuntimeCapability {
  id: string;
  status: RuntimeCapabilityStatus;
  blocking: boolean;
  deps: string[];
  reason?: string | null;
  checked_at: string;
  details?: Record<string, unknown>;
}

export interface RuntimeReadinessResponse {
  status: RuntimeCapabilityStatus | 'starting';
  checked_at: string;
  bootstrap_complete: boolean;
  capabilities: RuntimeCapability[];
  capability_map: Record<string, RuntimeCapability>;
  summary: {
    healthy: number;
    degraded: number;
    unavailable: number;
  };
}

export async function getRuntimeReadiness(): Promise<RuntimeReadinessResponse> {
  const headers = await buildAccessTokenHeaders({
    'Bypass-Tunnel-Reminder': 'true',
  });
  return requestBackendJson<RuntimeReadinessResponse>(
    '/api/v1/runtime/readiness',
    { headers },
    'Failed to load runtime readiness.',
  );
}

export function getCapability(
  readiness: RuntimeReadinessResponse | null | undefined,
  capabilityId: string,
): RuntimeCapability | null {
  if (!readiness) return null;
  return readiness.capability_map?.[capabilityId] || readiness.capabilities.find((capability) => capability.id === capabilityId) || null;
}
