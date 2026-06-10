/**
 * Custom Error Classes for Better Error Handling
 */

export class AppError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 500,
    public hint?: string
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export class AuthenticationError extends AppError {
  constructor(message: string = 'Authentication required', hint?: string) {
    super(message, 'AUTH_ERROR', 401, hint);
    this.name = 'AuthenticationError';
  }
}

export class AuthorizationError extends AppError {
  constructor(message: string = 'Permission denied', hint?: string) {
    super(message, 'AUTHORIZATION_ERROR', 403, hint);
    this.name = 'AuthorizationError';
  }
}

export class ValidationError extends AppError {
  constructor(message: string, hint?: string) {
    super(message, 'VALIDATION_ERROR', 400, hint);
    this.name = 'ValidationError';
  }
}

export class NetworkError extends AppError {
  constructor(message: string = 'Network request failed', hint?: string) {
    super(message, 'NETWORK_ERROR', 503, hint);
    this.name = 'NetworkError';
  }
}

export class IntegrationError extends AppError {
  constructor(public provider: string, message: string, hint?: string) {
    super(message, 'INTEGRATION_ERROR', 502, hint);
    this.name = 'IntegrationError';
  }
}

/**
 * Error Handler Utility
 */
export function handleError(error: unknown): { message: string; code: string; hint?: string } {
  if (error instanceof AppError) {
    return {
      message: error.message,
      code: error.code,
      hint: error.hint,
    };
  }

  if (error instanceof Error) {
    return {
      message: error.message,
      code: 'UNKNOWN_ERROR',
    };
  }

  return {
    message: 'An unexpected error occurred',
    code: 'UNKNOWN_ERROR',
  };
}

/**
 * User-Friendly Error Messages
 */
export function getUserFriendlyErrorMessage(error: unknown): string {
  const errorInfo = handleError(error);

  const friendlyMessages: Record<string, string> = {
    AUTH_ERROR: 'Please sign in to continue',
    AUTHORIZATION_ERROR: 'You do not have permission to perform this action',
    VALIDATION_ERROR: 'Please check your input and try again',
    NETWORK_ERROR: 'Unable to connect. Please check your internet connection',
    INTEGRATION_ERROR: 'Connection to external service failed. Please try again later',
  };

  return friendlyMessages[errorInfo.code] || errorInfo.message;
}
