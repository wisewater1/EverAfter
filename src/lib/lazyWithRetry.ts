import { lazy, type ComponentType, type LazyExoticComponent } from 'react';

const CHUNK_RETRY_KEY = 'everafter:chunk-retry';

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return String(error ?? '');
}

function isChunkLoadError(error: unknown): boolean {
  const message = getErrorMessage(error);

  return [
    'Failed to fetch dynamically imported module',
    'Importing a module script failed',
    'error loading dynamically imported module',
    'ChunkLoadError',
    'Unable to preload CSS',
  ].some((needle) => message.includes(needle));
}

function buildRetryToken(target?: string): string {
  if (typeof window === 'undefined') {
    return 'server';
  }

  return `${window.location.pathname}:${target ?? 'unknown-chunk'}`;
}

function reloadOnce(target?: string): boolean {
  if (typeof window === 'undefined') {
    return false;
  }

  const retryToken = buildRetryToken(target);
  const lastRetry = window.sessionStorage.getItem(CHUNK_RETRY_KEY);

  if (lastRetry === retryToken) {
    window.sessionStorage.removeItem(CHUNK_RETRY_KEY);
    return false;
  }

  window.sessionStorage.setItem(CHUNK_RETRY_KEY, retryToken);
  window.location.reload();
  return true;
}

async function retryableImport<T extends ComponentType<any>>(
  importer: () => Promise<{ default: T }>,
  target?: string,
): Promise<{ default: T }> {
  try {
    const module = await importer();
    if (typeof window !== 'undefined') {
      window.sessionStorage.removeItem(CHUNK_RETRY_KEY);
    }
    return module;
  } catch (error) {
    if (isChunkLoadError(error) && reloadOnce(target)) {
      return new Promise(() => {
        // The page reload is the recovery path. Keep the promise pending until navigation.
      });
    }

    throw error;
  }
}

export function lazyWithRetry<T extends ComponentType<any>>(
  importer: () => Promise<{ default: T }>,
  target?: string,
): LazyExoticComponent<T> {
  return lazy(() => retryableImport(importer, target));
}

export function installChunkLoadRecovery() {
  if (typeof window === 'undefined') {
    return;
  }

  window.addEventListener('vite:preloadError', (event: Event) => {
    const customEvent = event as CustomEvent<{ path?: string; href?: string }>;
    const target = customEvent.detail?.path ?? customEvent.detail?.href;

    if (reloadOnce(target)) {
      event.preventDefault();
    }
  });
}
