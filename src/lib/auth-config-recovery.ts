const AUTH_CONFIG_RECOVERY_KEY = 'everafter-auth-config-recovery';
const AUTH_CONFIG_RECOVERY_TTL_MS = 10 * 60 * 1000;

function canUseBrowserApis() {
  return typeof window !== 'undefined' && typeof sessionStorage !== 'undefined';
}

export function isInvalidApiKeyError(message: string | undefined | null) {
  if (!message) return false;
  return /invalid api key/i.test(message) || /No API key found in request/i.test(message);
}

function clearSupabaseAuthStorage() {
  if (typeof window === 'undefined') return;

  const keysToRemove: string[] = [];

  for (let index = 0; index < window.localStorage.length; index += 1) {
    const key = window.localStorage.key(index);
    if (!key) continue;

    if (
      key === 'supabase.auth.token' ||
      key.startsWith('sb-') ||
      key.toLowerCase().includes('supabase')
    ) {
      keysToRemove.push(key);
    }
  }

  for (const key of keysToRemove) {
    window.localStorage.removeItem(key);
  }
}

export function attemptAuthConfigRecovery(targetPath?: string) {
  if (!canUseBrowserApis()) return false;

  const now = Date.now();
  const lastAttemptRaw = sessionStorage.getItem(AUTH_CONFIG_RECOVERY_KEY);
  const lastAttempt = lastAttemptRaw ? Number(lastAttemptRaw) : 0;

  if (Number.isFinite(lastAttempt) && now - lastAttempt < AUTH_CONFIG_RECOVERY_TTL_MS) {
    return false;
  }

  sessionStorage.setItem(AUTH_CONFIG_RECOVERY_KEY, String(now));
  clearSupabaseAuthStorage();

  const nextPath = targetPath || `${window.location.pathname}${window.location.search}`;
  const separator = nextPath.includes('?') ? '&' : '?';
  window.location.replace(`${nextPath}${separator}auth_refresh=${now}`);
  return true;
}

