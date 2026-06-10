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

export interface RuntimeRouteGate {
  path: string;
  status: RuntimeCapabilityStatus;
  blocking: boolean;
  deps: string[];
  reason?: string | null;
  checked_at: string;
  prod_exposed: boolean;
  feature_flag?: string | null;
}

export interface RuntimeReadinessResponse {
  status: RuntimeCapabilityStatus | 'starting';
  checked_at: string;
  bootstrap_complete: boolean;
  capabilities: RuntimeCapability[];
  capability_map: Record<string, RuntimeCapability>;
  routes: RuntimeRouteGate[];
  route_map: Record<string, RuntimeRouteGate>;
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

function pathMatches(pattern: string, pathname: string): boolean {
  if (pattern === pathname) return true;
  if (!pattern.includes(':')) return false;

  const patternParts = pattern.split('/').filter(Boolean);
  const pathParts = pathname.split('/').filter(Boolean);
  if (patternParts.length !== pathParts.length) return false;

  return patternParts.every((part, index) => part.startsWith(':') || part === pathParts[index]);
}

export function getRouteGate(
  readiness: RuntimeReadinessResponse | null | undefined,
  pathname: string,
): RuntimeRouteGate | null {
  if (!readiness) return null;
  const exact = readiness.route_map?.[pathname];
  if (exact) return exact;
  return readiness.routes?.find((route) => pathMatches(route.path, pathname)) || null;
}
