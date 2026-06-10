/**
 * Comprehensive Error Handling and Recovery System for Health Connectors
 *
 * This module provides centralized error handling, automatic recovery mechanisms,
 * and user-friendly error messages for all health connector operations.
 */

export type ErrorSeverity = 'info' | 'warning' | 'error' | 'critical';

export type ErrorCategory =
  | 'authentication'
  | 'authorization'
  | 'network'
  | 'rate_limit'
  | 'data_quality'
  | 'provider_api'
  | 'configuration'
  | 'internal';

export interface ConnectionError {
  code: string;
  message: string;
  severity: ErrorSeverity;
  category: ErrorCategory;
  provider?: string;
  recoverable: boolean;
  retryable: boolean;
  userMessage: string;
  technicalDetails?: string;
  suggestedActions: string[];
  timestamp: string;
}

export interface RecoveryStrategy {
  canRecover: boolean;
  shouldRetry: boolean;
  retryDelay?: number;
  maxRetries?: number;
  recoverySteps: string[];
}

/**
 * Error code definitions with recovery strategies
 */
const ERROR_DEFINITIONS: Record<
  string,
  {
    severity: ErrorSeverity;
    category: ErrorCategory;
    userMessage: string;
    suggestedActions: string[];
    retryable: boolean;
  }
> = {
  TOKEN_EXPIRED: {
    severity: 'warning',
    category: 'authentication',
    userMessage: 'Your connection token has expired.',
    suggestedActions: [
      'We will automatically refresh your token',
      'If the issue persists, please reconnect your device',
    ],
    retryable: true,
  },
  INVALID_TOKEN: {
    severity: 'error',
    category: 'authentication',
    userMessage: 'Your connection credentials are invalid.',
    suggestedActions: [
      'Please reconnect your device',
      'Make sure you authorize all requested permissions',
    ],
    retryable: false,
  },
  RATE_LIMIT_EXCEEDED: {
    severity: 'warning',
    category: 'rate_limit',
    userMessage: 'We are making too many requests to the provider.',
    suggestedActions: [
      'Please wait a few minutes before trying again',
      'Your data will sync automatically when the limit resets',
    ],
    retryable: true,
  },
  NETWORK_ERROR: {
    severity: 'warning',
    category: 'network',
    userMessage: 'Unable to connect to the health provider.',
    suggestedActions: [
      'Check your internet connection',
      'We will automatically retry when connection is restored',
    ],
    retryable: true,
  },
  PROVIDER_API_ERROR: {
    severity: 'error',
    category: 'provider_api',
    userMessage: 'The health provider is experiencing issues.',
    suggestedActions: [
      'This is a temporary issue with the provider',
      'We will retry automatically',
      'Your data will sync when the provider is back online',
    ],
    retryable: true,
  },
  INSUFFICIENT_PERMISSIONS: {
    severity: 'error',
    category: 'authorization',
    userMessage: 'Missing required permissions.',
    suggestedActions: [
      'Please reconnect and grant all requested permissions',
      'Some features may not work without full access',
    ],
    retryable: false,
  },
  DATA_VALIDATION_ERROR: {
    severity: 'info',
    category: 'data_quality',
    userMessage: 'Some health data was rejected due to quality issues.',
    suggestedActions: [
      'This typically happens with outlier readings',
      'Check your device for any unusual readings',
      'Contact support if this happens frequently',
    ],
    retryable: false,
  },
  PROVIDER_NOT_CONFIGURED: {
    severity: 'error',
    category: 'configuration',
    userMessage: 'This health provider is not properly configured.',
    suggestedActions: [
      'Contact support to enable this provider',
      'Try a different provider in the meantime',
    ],
    retryable: false,
  },
  CONNECTION_NOT_FOUND: {
    severity: 'error',
    category: 'configuration',
    userMessage: 'Connection not found.',
    suggestedActions: [
      'Please reconnect your device',
      'Make sure you completed the connection process',
    ],
    retryable: false,
  },
  SYNC_FAILED: {
    severity: 'warning',
    category: 'internal',
    userMessage: 'Failed to sync your health data.',
    suggestedActions: [
      'We will retry automatically',
      'Check your device connection status',
    ],
    retryable: true,
  },
};

/**
 * Parse and classify error from various sources
 */
export function parseError(error: any, provider?: string): ConnectionError {
  let errorCode = 'UNKNOWN_ERROR';
  let technicalDetails = '';

  // Extract error information from different error formats
  if (typeof error === 'string') {
    technicalDetails = error;
    errorCode = inferErrorCode(error);
  } else if (error?.message) {
    technicalDetails = error.message;
    errorCode = inferErrorCode(error.message);
  } else if (error?.error) {
    technicalDetails = error.error;
    errorCode = error.code || inferErrorCode(error.error);
  }

  // Get error definition or use default
  const definition = ERROR_DEFINITIONS[errorCode] || {
    severity: 'error' as ErrorSeverity,
    category: 'internal' as ErrorCategory,
    userMessage: 'An unexpected error occurred.',
    suggestedActions: [
      'Please try again',
      'Contact support if the issue persists',
    ],
    retryable: true,
  };

  return {
    code: errorCode,
    message: technicalDetails || definition.userMessage,
    severity: definition.severity,
    category: definition.category,
    provider,
    recoverable: definition.retryable || definition.category === 'network',
    retryable: definition.retryable,
    userMessage: definition.userMessage,
    technicalDetails,
    suggestedActions: definition.suggestedActions,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Infer error code from error message
 */
function inferErrorCode(message: string): string {
  const messageLower = message.toLowerCase();

  if (messageLower.includes('token') && messageLower.includes('expired')) {
    return 'TOKEN_EXPIRED';
  }
  if (messageLower.includes('unauthorized') || messageLower.includes('invalid token')) {
    return 'INVALID_TOKEN';
  }
  if (messageLower.includes('rate limit') || messageLower.includes('too many requests')) {
    return 'RATE_LIMIT_EXCEEDED';
  }
  if (messageLower.includes('network') || messageLower.includes('timeout') || messageLower.includes('connection')) {
    return 'NETWORK_ERROR';
  }
  if (messageLower.includes('permission') || messageLower.includes('forbidden')) {
    return 'INSUFFICIENT_PERMISSIONS';
  }
  if (messageLower.includes('not found')) {
    return 'CONNECTION_NOT_FOUND';
  }
  if (messageLower.includes('validation') || messageLower.includes('invalid data')) {
    return 'DATA_VALIDATION_ERROR';
  }
  if (messageLower.includes('not configured') || messageLower.includes('missing credentials')) {
    return 'PROVIDER_NOT_CONFIGURED';
  }

  return 'PROVIDER_API_ERROR';
}

/**
 * Determine recovery strategy for an error
 */
export function getRecoveryStrategy(error: ConnectionError): RecoveryStrategy {
  const strategy: RecoveryStrategy = {
    canRecover: error.recoverable,
    shouldRetry: error.retryable,
    recoverySteps: [...error.suggestedActions],
  };

  switch (error.category) {
    case 'authentication':
      if (error.code === 'TOKEN_EXPIRED') {
        strategy.shouldRetry = true;
        strategy.retryDelay = 1000;
        strategy.maxRetries = 3;
        strategy.recoverySteps.unshift('Attempting automatic token refresh...');
      } else {
        strategy.canRecover = false;
        strategy.shouldRetry = false;
        strategy.recoverySteps.unshift('Manual reconnection required');
      }
      break;

    case 'rate_limit':
      strategy.shouldRetry = true;
      strategy.retryDelay = 60000; // 1 minute
      strategy.maxRetries = 5;
      break;

    case 'network':
      strategy.shouldRetry = true;
      strategy.retryDelay = 5000; // 5 seconds
      strategy.maxRetries = 10;
      break;

    case 'provider_api':
      strategy.shouldRetry = true;
      strategy.retryDelay = 30000; // 30 seconds
      strategy.maxRetries = 3;
      break;

    case 'authorization':
    case 'configuration':
      strategy.canRecover = false;
      strategy.shouldRetry = false;
      break;

    case 'data_quality':
      strategy.shouldRetry = false;
      break;

    default:
      strategy.retryDelay = 10000; // 10 seconds
      strategy.maxRetries = 3;
  }

  return strategy;
}

/**
 * Calculate exponential backoff delay
 */
export function calculateBackoffDelay(
  baseDelay: number,
  attempt: number,
  maxDelay: number = 300000 // 5 minutes
): number {
  const delay = Math.min(baseDelay * Math.pow(2, attempt - 1), maxDelay);
  // Add jitter to prevent thundering herd
  return delay + Math.random() * 1000;
}

/**
 * Retry operation with exponential backoff
 */
export async function retryWithBackoff<T>(
  operation: () => Promise<T>,
  options: {
    maxRetries: number;
    baseDelay: number;
    onRetry?: (attempt: number, error: any) => void;
  }
): Promise<T> {
  let lastError: any;

  for (let attempt = 1; attempt <= options.maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;

      if (attempt < options.maxRetries) {
        const delay = calculateBackoffDelay(options.baseDelay, attempt);
        options.onRetry?.(attempt, error);

        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError;
}

/**
 * Check if error is retryable based on HTTP status
 */
export function isRetryableHttpStatus(status: number): boolean {
  return status === 429 || status === 503 || status === 504 || status >= 500;
}

/**
 * Format error for logging
 */
export function formatErrorForLogging(error: ConnectionError): string {
  return JSON.stringify({
    code: error.code,
    category: error.category,
    severity: error.severity,
    provider: error.provider,
    message: error.message,
    timestamp: error.timestamp,
  }, null, 2);
}

/**
 * Get user-friendly error notification
 */
export function getErrorNotification(error: ConnectionError): {
  title: string;
  message: string;
  type: 'error' | 'warning' | 'info';
} {
  const typeMap: Record<ErrorSeverity, 'error' | 'warning' | 'info'> = {
    critical: 'error',
    error: 'error',
    warning: 'warning',
    info: 'info',
  };

  return {
    title: error.provider
      ? `${error.provider} Connection Issue`
      : 'Connection Issue',
    message: error.userMessage,
    type: typeMap[error.severity],
  };
}

/**
 * Circuit breaker for preventing cascading failures
 */
export class CircuitBreaker {
  private failureCount: number = 0;
  private lastFailureTime: number = 0;
  private state: 'closed' | 'open' | 'half-open' = 'closed';

  constructor(
    private threshold: number = 5,
    private timeout: number = 60000, // 1 minute
    private resetTimeout: number = 300000 // 5 minutes
  ) {}

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === 'open') {
      if (Date.now() - this.lastFailureTime > this.resetTimeout) {
        this.state = 'half-open';
      } else {
        throw new Error('Circuit breaker is open - too many failures');
      }
    }

    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess(): void {
    this.failureCount = 0;
    this.state = 'closed';
  }

  private onFailure(): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();

    if (this.failureCount >= this.threshold) {
      this.state = 'open';
    }
  }

  getState(): string {
    return this.state;
  }

  reset(): void {
    this.failureCount = 0;
    this.lastFailureTime = 0;
    this.state = 'closed';
  }
}
