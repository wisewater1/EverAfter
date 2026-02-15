import { supabase } from './supabase';
import { env } from './env';
import { logger } from './logger';
import { NetworkError, IntegrationError, handleError } from './errors';
import type { EdgeFunctionResponse, ChatResponse, DailyQuestionResponseData } from '../types/database.types';

/**
 * Enhanced API Client with Retry Logic, Error Handling, and Request Deduplication
 */

interface RetryConfig {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
}

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  baseDelay: 1000,
  maxDelay: 10000,
};

class APIClient {
  private pendingRequests: Map<string, Promise<unknown>> = new Map();

  private async getAuthToken(): Promise<string | null> {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token || null;
  }

  /**
   * Exponential backoff with jitter
   */
  private calculateDelay(attempt: number, config: RetryConfig): number {
    const exponentialDelay = Math.min(
      config.baseDelay * Math.pow(2, attempt),
      config.maxDelay
    );
    const jitter = Math.random() * 0.1 * exponentialDelay;
    return exponentialDelay + jitter;
  }

  /**
   * Determine if error is retryable
   */
  private isRetryableError(error: unknown): boolean {
    if (error instanceof NetworkError) {
      return true;
    }
    if (error instanceof Error) {
      const message = error.message.toLowerCase();
      return (
        message.includes('network') ||
        message.includes('timeout') ||
        message.includes('503') ||
        message.includes('502')
      );
    }
    return false;
  }

  /**
   * Retry wrapper with exponential backoff
   */
  private async withRetry<T>(
    operation: () => Promise<T>,
    config: RetryConfig = DEFAULT_RETRY_CONFIG
  ): Promise<T> {
    let lastError: unknown;

    for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;

        if (attempt < config.maxRetries && this.isRetryableError(error)) {
          const delay = this.calculateDelay(attempt, config);
          logger.warn(`Request failed, retrying in ${delay}ms`, {
            attempt: attempt + 1,
            maxRetries: config.maxRetries,
            error: handleError(error),
          });
          await new Promise((resolve) => setTimeout(resolve, delay));
        } else {
          break;
        }
      }
    }

    throw lastError;
  }

  /**
   * Request deduplication to prevent duplicate calls
   */
  private async deduplicate<T>(key: string, operation: () => Promise<T>): Promise<T> {
    const pending = this.pendingRequests.get(key);
    if (pending) {
      logger.debug('Reusing pending request', { key });
      return pending as Promise<T>;
    }

    const promise = operation().finally(() => {
      this.pendingRequests.delete(key);
    });

    this.pendingRequests.set(key, promise);
    return promise;
  }

  /**
   * Call Supabase Edge Function with error handling and retries
   */
  private async callEdgeFunction<T>(
    functionName: string,
    body: Record<string, unknown>
  ): Promise<EdgeFunctionResponse<T>> {
    const token = await this.getAuthToken();
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${env.VITE_SUPABASE_ANON_KEY}`,
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    try {
      return await this.withRetry(async () => {
        logger.debug(`Calling edge function: ${functionName}`, { body });

        const response = await fetch(
          `${env.VITE_SUPABASE_URL}/functions/v1/${functionName}`,
          {
            method: 'POST',
            headers,
            body: JSON.stringify(body),
            signal: AbortSignal.timeout(30000), // 30s timeout
          }
        );

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({
            error: { message: 'Request failed', code: 'UNKNOWN_ERROR' },
          }));

          throw new IntegrationError(
            functionName,
            errorData.error?.message || `HTTP ${response.status}`,
            errorData.error?.hint
          );
        }

        const data = await response.json();
        logger.debug(`Edge function response: ${functionName}`, { data });
        return data;
      });
    } catch (error) {
      logger.error(`Edge function failed: ${functionName}`, error, { body });
      throw error;
    }
  }

  /**
   * Send chat message to engram AI
   */
  async sendChatMessage(
    engramId: string,
    content: string,
    conversationId?: string
  ): Promise<EdgeFunctionResponse<ChatResponse>> {
    const dedupeKey = `chat-${engramId}-${content}`;

    // Redirect to local backend instead of Edge Function
    return this.deduplicate(dedupeKey, async () => {
      const token = await this.getAuthToken();
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };

      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      // Use VITE_API_BASE_URL from env or default to localhost:8001
      const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8001';

      try {
        const response = await fetch(`${API_BASE}/api/v1/chat/${engramId}/message`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            content,
            conversation_id: conversationId
          })
        });

        if (!response.ok) {
          throw new Error(`Backend error: ${response.status}`);
        }

        const data = await response.json();

        // Transform backend response to match expected EdgeFunctionResponse structure
        return {
          data: {
            message: data.content,
            conversationId: data.conversation_id,
            metrics: {},
            timestamp: data.created_at
          },
          error: undefined
        };

      } catch (error) {
        console.error("Chat API Error:", error);
        throw error;
      }
    });
  }

  /**
   * Get predictive health analytics from local backend
   */
  async getPredictiveAnalytics(lookbackDays: number = 30) {
    const token = await this.getAuthToken();
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8001';

    try {
      const response = await fetch(`${API_BASE}/api/v1/health/predictions?lookbackDays=${lookbackDays}`, {
        headers
      });

      if (!response.ok) {
        throw new Error(`Backend error: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error("Predictive Analytics API Error:", error);
      throw error;
    }
  }

  /**
   * Get engrams from local backend
   */
  async getEngrams() {
    const token = await this.getAuthToken();
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8001';

    try {
      const response = await fetch(`${API_BASE}/api/v1/engrams/`, {
        headers
      });

      if (!response.ok) {
        throw new Error(`Backend error: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error("Engrams API Error:", error);
      throw error;
    }
  }

  /**
   * Get health summary from local backend
   */
  async getHealthSummary() {
    const token = await this.getAuthToken();
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8001';

    try {
      const response = await fetch(`${API_BASE}/api/v1/health/summary`, {
        headers
      });

      if (!response.ok) {
        throw new Error(`Backend error: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error("Health Summary API Error:", error);
      throw error;
    }
  }

  /**
   * Get daily question for user
   */
  async getDailyQuestion(
    userId: string,
    engramId?: string
  ): Promise<EdgeFunctionResponse<DailyQuestionResponseData>> {
    const dedupeKey = `daily-question-${userId}-${engramId || 'default'}`;
    return this.deduplicate(dedupeKey, () =>
      this.callEdgeFunction<DailyQuestionResponseData>('get-daily-question', {
        userId,
        engramId,
      })
    );
  }

  /**
   * Submit daily question response
   */
  async submitDailyResponse(
    userId: string,
    questionId: string,
    response: string,
    engramId?: string
  ): Promise<EdgeFunctionResponse<void>> {
    return this.callEdgeFunction<void>('submit-daily-response', {
      userId,
      questionId,
      response,
      engramId,
    });
  }

  /**
   * List tasks for engram
   */
  async listTasks(engramId: string) {
    try {
      const { data, error } = await supabase
        .from('agent_task_queue')
        .select('*')
        .eq('engram_id', engramId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    } catch (error) {
      logger.error('Failed to list tasks', error, { engramId });
      throw error;
    }
  }

  /**
   * Create new task
   */
  async createTask(engramId: string, taskData: Record<string, unknown>) {
    try {
      const { data, error } = await supabase
        .from('agent_task_queue')
        .insert({
          engram_id: engramId,
          task_type: (taskData.task_type as string) || 'general',
          task_description: (taskData.task_description as string) || '',
          priority: (taskData.priority as string) || 'medium',
          status: 'pending',
          scheduled_for: (taskData.scheduled_for as string) || new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;
      logger.info('Task created successfully', { taskId: data?.id, engramId });
      return data;
    } catch (error) {
      logger.error('Failed to create task', error, { engramId, taskData });
      throw error;
    }
  }

  /**
   * Execute task
   */
  async executeTask(taskId: string) {
    return this.callEdgeFunction('manage-agent-tasks', {
      action: 'execute',
      taskId,
    });
  }

  /**
   * Delete task
   */
  async deleteTask(taskId: string) {
    try {
      const { error } = await supabase.from('agent_task_queue').delete().eq('id', taskId);

      if (error) throw error;
      logger.info('Task deleted successfully', { taskId });
      return { success: true };
    } catch (error) {
      logger.error('Failed to delete task', error, { taskId });
      throw error;
    }
  }
}

export const apiClient = new APIClient();
