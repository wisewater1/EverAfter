/**
 * Comprehensive Input Validation and Sanitization
 * Production-ready validation utilities for edge functions
 */

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  sanitized?: any;
}

/**
 * Validate and sanitize email addresses
 */
export function validateEmail(email: string): ValidationResult {
  const errors: string[] = [];

  if (!email || typeof email !== 'string') {
    return { valid: false, errors: ['Email is required'] };
  }

  const sanitized = email.trim().toLowerCase();

  if (sanitized.length > 254) {
    errors.push('Email exceeds maximum length');
  }

  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

  if (!emailRegex.test(sanitized)) {
    errors.push('Invalid email format');
  }

  return {
    valid: errors.length === 0,
    errors,
    sanitized: errors.length === 0 ? sanitized : undefined,
  };
}

/**
 * Validate UUID format
 */
export function validateUUID(uuid: string): ValidationResult {
  const errors: string[] = [];

  if (!uuid || typeof uuid !== 'string') {
    return { valid: false, errors: ['UUID is required'] };
  }

  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

  if (!uuidRegex.test(uuid)) {
    errors.push('Invalid UUID format');
  }

  return {
    valid: errors.length === 0,
    errors,
    sanitized: uuid,
  };
}

/**
 * Validate provider name
 */
export function validateProvider(provider: string): ValidationResult {
  const errors: string[] = [];
  const validProviders = ['fitbit', 'oura', 'terra', 'dexcom', 'garmin', 'whoop', 'withings', 'polar', 'manual'];

  if (!provider || typeof provider !== 'string') {
    return { valid: false, errors: ['Provider is required'] };
  }

  const sanitized = provider.toLowerCase().trim();

  if (!validProviders.includes(sanitized)) {
    errors.push(`Invalid provider. Must be one of: ${validProviders.join(', ')}`);
  }

  return {
    valid: errors.length === 0,
    errors,
    sanitized,
  };
}

/**
 * Validate metric type
 */
export function validateMetricType(metric: string): ValidationResult {
  const errors: string[] = [];
  const validMetrics = [
    'glucose', 'heart_rate', 'resting_hr', 'steps', 'sleep_hours',
    'sleep_score', 'hrv', 'spo2', 'weight', 'body_temp',
    'calories_burned', 'distance', 'readiness_score', 'recovery_score', 'strain'
  ];

  if (!metric || typeof metric !== 'string') {
    return { valid: false, errors: ['Metric type is required'] };
  }

  const sanitized = metric.toLowerCase().trim();

  if (!validMetrics.includes(sanitized)) {
    errors.push(`Invalid metric type. Must be one of: ${validMetrics.join(', ')}`);
  }

  return {
    valid: errors.length === 0,
    errors,
    sanitized,
  };
}

/**
 * Validate numeric value with range
 */
export function validateNumericValue(
  value: any,
  fieldName: string,
  options: { min?: number; max?: number; required?: boolean } = {}
): ValidationResult {
  const errors: string[] = [];

  if (value === null || value === undefined) {
    if (options.required) {
      return { valid: false, errors: [`${fieldName} is required`] };
    }
    return { valid: true, errors: [], sanitized: null };
  }

  const numValue = typeof value === 'string' ? parseFloat(value) : value;

  if (isNaN(numValue) || !isFinite(numValue)) {
    errors.push(`${fieldName} must be a valid number`);
    return { valid: false, errors };
  }

  if (options.min !== undefined && numValue < options.min) {
    errors.push(`${fieldName} must be at least ${options.min}`);
  }

  if (options.max !== undefined && numValue > options.max) {
    errors.push(`${fieldName} must be at most ${options.max}`);
  }

  return {
    valid: errors.length === 0,
    errors,
    sanitized: numValue,
  };
}

/**
 * Validate date/timestamp
 */
export function validateTimestamp(timestamp: any, fieldName: string = 'Timestamp'): ValidationResult {
  const errors: string[] = [];

  if (!timestamp) {
    return { valid: false, errors: [`${fieldName} is required`] };
  }

  try {
    const date = new Date(timestamp);
    if (isNaN(date.getTime())) {
      errors.push(`${fieldName} is not a valid date`);
    } else {
      const now = new Date();
      const oneYearAgo = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
      const oneYearFuture = new Date(now.getFullYear() + 1, now.getMonth(), now.getDate());

      if (date < oneYearAgo) {
        errors.push(`${fieldName} is too far in the past`);
      }
      if (date > oneYearFuture) {
        errors.push(`${fieldName} cannot be in the future`);
      }
    }
  } catch (e) {
    errors.push(`${fieldName} is not a valid date`);
  }

  return {
    valid: errors.length === 0,
    errors,
    sanitized: errors.length === 0 ? new Date(timestamp).toISOString() : undefined,
  };
}

/**
 * Sanitize string input (prevent XSS, SQL injection)
 */
export function sanitizeString(input: string, maxLength: number = 1000): string {
  if (!input || typeof input !== 'string') {
    return '';
  }

  return input
    .trim()
    .slice(0, maxLength)
    .replace(/[<>\"']/g, '') // Remove potential XSS characters
    .replace(/[\x00-\x1F\x7F]/g, ''); // Remove control characters
}

/**
 * Validate request body against schema
 */
export function validateRequestBody<T>(
  body: any,
  requiredFields: string[],
  optionalFields: string[] = []
): ValidationResult {
  const errors: string[] = [];

  if (!body || typeof body !== 'object') {
    return { valid: false, errors: ['Request body must be a valid JSON object'] };
  }

  for (const field of requiredFields) {
    if (!(field in body) || body[field] === null || body[field] === undefined) {
      errors.push(`Missing required field: ${field}`);
    }
  }

  const allFields = [...requiredFields, ...optionalFields];
  const extraFields = Object.keys(body).filter(key => !allFields.includes(key));

  if (extraFields.length > 0) {
    errors.push(`Unexpected fields: ${extraFields.join(', ')}`);
  }

  return {
    valid: errors.length === 0,
    errors,
    sanitized: body,
  };
}

/**
 * Validate pagination parameters
 */
export function validatePagination(
  limit?: any,
  offset?: any
): ValidationResult {
  const errors: string[] = [];
  const sanitized: any = {};

  if (limit !== undefined) {
    const limitResult = validateNumericValue(limit, 'limit', { min: 1, max: 1000 });
    if (!limitResult.valid) {
      errors.push(...limitResult.errors);
    } else {
      sanitized.limit = limitResult.sanitized;
    }
  } else {
    sanitized.limit = 50; // Default
  }

  if (offset !== undefined) {
    const offsetResult = validateNumericValue(offset, 'offset', { min: 0 });
    if (!offsetResult.valid) {
      errors.push(...offsetResult.errors);
    } else {
      sanitized.offset = offsetResult.sanitized;
    }
  } else {
    sanitized.offset = 0; // Default
  }

  return {
    valid: errors.length === 0,
    errors,
    sanitized,
  };
}

/**
 * Rate limiting check (simple in-memory implementation)
 */
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

export function checkRateLimit(
  identifier: string,
  maxRequests: number = 100,
  windowMs: number = 60000 // 1 minute
): { allowed: boolean; remaining: number; resetAt: number } {
  const now = Date.now();
  const record = rateLimitMap.get(identifier);

  if (!record || now > record.resetAt) {
    rateLimitMap.set(identifier, {
      count: 1,
      resetAt: now + windowMs,
    });
    return { allowed: true, remaining: maxRequests - 1, resetAt: now + windowMs };
  }

  if (record.count >= maxRequests) {
    return { allowed: false, remaining: 0, resetAt: record.resetAt };
  }

  record.count++;
  rateLimitMap.set(identifier, record);

  return {
    allowed: true,
    remaining: maxRequests - record.count,
    resetAt: record.resetAt,
  };
}

/**
 * Clean up old rate limit entries periodically
 */
export function cleanupRateLimits(): void {
  const now = Date.now();
  for (const [key, value] of rateLimitMap.entries()) {
    if (now > value.resetAt) {
      rateLimitMap.delete(key);
    }
  }
}

// Run cleanup every 5 minutes
if (typeof setInterval !== 'undefined') {
  setInterval(cleanupRateLimits, 5 * 60 * 1000);
}
