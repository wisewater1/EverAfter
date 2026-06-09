/**
 * Production-Grade Logging and Monitoring System
 * Structured logging with performance tracking and error reporting
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'critical';

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  function: string;
  message: string;
  data?: any;
  userId?: string;
  requestId?: string;
  duration?: number;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
}

export class Logger {
  private functionName: string;
  private requestId: string;
  private userId?: string;
  private startTime: number;

  constructor(functionName: string, requestId?: string, userId?: string) {
    this.functionName = functionName;
    this.requestId = requestId || this.generateRequestId();
    this.userId = userId;
    this.startTime = Date.now();
  }

  private generateRequestId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private formatLog(level: LogLevel, message: string, data?: any, error?: Error): LogEntry {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      function: this.functionName,
      message,
      requestId: this.requestId,
      userId: this.userId,
    };

    if (data) {
      entry.data = this.sanitizeData(data);
    }

    if (error) {
      entry.error = {
        name: error.name,
        message: error.message,
        stack: error.stack,
      };
    }

    return entry;
  }

  private sanitizeData(data: any): any {
    if (!data) return data;

    const sensitive = ['password', 'token', 'secret', 'apikey', 'api_key', 'access_token', 'refresh_token'];

    if (typeof data === 'object') {
      const sanitized = Array.isArray(data) ? [] : {};

      for (const [key, value] of Object.entries(data)) {
        const keyLower = key.toLowerCase();
        if (sensitive.some(s => keyLower.includes(s))) {
          (sanitized as any)[key] = '[REDACTED]';
        } else if (typeof value === 'object' && value !== null) {
          (sanitized as any)[key] = this.sanitizeData(value);
        } else {
          (sanitized as any)[key] = value;
        }
      }

      return sanitized;
    }

    return data;
  }

  private output(entry: LogEntry): void {
    const output = JSON.stringify(entry);

    switch (entry.level) {
      case 'debug':
      case 'info':
        console.log(output);
        break;
      case 'warn':
        console.warn(output);
        break;
      case 'error':
      case 'critical':
        console.error(output);
        break;
    }
  }

  debug(message: string, data?: any): void {
    const entry = this.formatLog('debug', message, data);
    this.output(entry);
  }

  info(message: string, data?: any): void {
    const entry = this.formatLog('info', message, data);
    this.output(entry);
  }

  warn(message: string, data?: any): void {
    const entry = this.formatLog('warn', message, data);
    this.output(entry);
  }

  error(message: string, error?: Error, data?: any): void {
    const entry = this.formatLog('error', message, data, error);
    this.output(entry);
  }

  critical(message: string, error?: Error, data?: any): void {
    const entry = this.formatLog('critical', message, data, error);
    this.output(entry);
  }

  performance(operation: string, durationMs?: number): void {
    const duration = durationMs ?? Date.now() - this.startTime;
    const entry = this.formatLog('info', `Performance: ${operation}`, { duration_ms: duration });
    entry.duration = duration;
    this.output(entry);
  }

  async trackAsync<T>(operation: string, fn: () => Promise<T>): Promise<T> {
    const start = Date.now();
    try {
      const result = await fn();
      this.performance(operation, Date.now() - start);
      return result;
    } catch (error) {
      this.error(`${operation} failed`, error as Error);
      throw error;
    }
  }

  getRequestId(): string {
    return this.requestId;
  }

  getDuration(): number {
    return Date.now() - this.startTime;
  }
}

/**
 * Performance monitoring utilities
 */
export class PerformanceMonitor {
  private marks: Map<string, number> = new Map();

  mark(label: string): void {
    this.marks.set(label, Date.now());
  }

  measure(startLabel: string, endLabel?: string): number | null {
    const start = this.marks.get(startLabel);
    if (!start) return null;

    const end = endLabel ? this.marks.get(endLabel) : Date.now();
    if (!end) return null;

    return end - start;
  }

  clear(): void {
    this.marks.clear();
  }

  getMarks(): Record<string, number> {
    return Object.fromEntries(this.marks);
  }
}

/**
 * Error tracking with context
 */
export interface ErrorContext {
  function: string;
  operation: string;
  userId?: string;
  provider?: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  metadata?: Record<string, any>;
}

export function trackError(error: Error, context: ErrorContext, logger: Logger): void {
  logger.error(
    `Error in ${context.operation}`,
    error,
    {
      severity: context.severity,
      provider: context.provider,
      metadata: context.metadata,
    }
  );

  if (context.severity === 'critical') {
    logger.critical(
      `CRITICAL ERROR: ${context.operation}`,
      error,
      {
        provider: context.provider,
        metadata: context.metadata,
      }
    );
  }
}

/**
 * Request/Response logging middleware
 */
export async function logRequest(
  req: Request,
  logger: Logger
): Promise<void> {
  const url = new URL(req.url);
  logger.info('Incoming request', {
    method: req.method,
    path: url.pathname,
    query: Object.fromEntries(url.searchParams),
    headers: {
      'content-type': req.headers.get('content-type'),
      'user-agent': req.headers.get('user-agent'),
    },
  });
}

export function logResponse(
  status: number,
  logger: Logger,
  metadata?: any
): void {
  logger.info('Response sent', {
    status,
    duration_ms: logger.getDuration(),
    ...metadata,
  });
}

/**
 * Database query logging
 */
export async function logQuery<T>(
  query: string,
  params: any,
  executor: () => Promise<T>,
  logger: Logger
): Promise<T> {
  const start = Date.now();

  try {
    const result = await executor();
    const duration = Date.now() - start;

    logger.debug('Database query executed', {
      query: query.substring(0, 100),
      duration_ms: duration,
      params_count: params ? Object.keys(params).length : 0,
    });

    if (duration > 1000) {
      logger.warn('Slow query detected', {
        query: query.substring(0, 100),
        duration_ms: duration,
      });
    }

    return result;
  } catch (error) {
    logger.error('Database query failed', error as Error, {
      query: query.substring(0, 100),
    });
    throw error;
  }
}

/**
 * Health check logging
 */
export interface HealthCheckResult {
  service: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  responseTime: number;
  message?: string;
}

export function logHealthCheck(result: HealthCheckResult, logger: Logger): void {
  const level = result.status === 'healthy' ? 'info' : result.status === 'degraded' ? 'warn' : 'error';

  const entry = {
    service: result.service,
    status: result.status,
    response_time_ms: result.responseTime,
    message: result.message,
  };

  switch (level) {
    case 'info':
      logger.info('Health check passed', entry);
      break;
    case 'warn':
      logger.warn('Health check degraded', entry);
      break;
    case 'error':
      logger.error('Health check failed', undefined, entry);
      break;
  }
}
