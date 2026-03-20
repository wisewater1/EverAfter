import { supabase } from './supabase';
import { env } from './env';
import { logger } from './logger';
import { NetworkError, IntegrationError, handleError } from './errors';
import type { EdgeFunctionResponse, ChatResponse, DailyQuestionResponseData, FamilyTask, ShoppingItem, CalendarEvent, BulletinMessage, EngramResponse, EngramCreatePayload } from '../types/database.types';
import { API_BASE_URL } from '../lib/env';
import { getFamilyCalendar as getLocalFamilyCalendar } from './joseph/family';

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
const DEFAULT_BACKEND_TIMEOUT_MS = 8000;

class APIClient {
  private pendingRequests: Map<string, Promise<unknown>> = new Map();

  private normalizeCalendarEvent(event: Partial<CalendarEvent>, index: number): CalendarEvent {
    const startTime = event.startTime || new Date(Date.now() + index * 60 * 60 * 1000).toISOString();
    const endTime = event.endTime || new Date(new Date(startTime).getTime() + 60 * 60 * 1000).toISOString();

    return {
      id: event.id || `calendar-event-${index}`,
      title: event.title || 'Family event',
      startTime,
      endTime,
      location: event.location || 'Family Record',
      attendees: Array.isArray(event.attendees) ? event.attendees : [],
      notes: event.notes || event.description || 'No additional notes recorded yet.',
      description: event.description || event.notes,
      url: event.url,
      allDay: Boolean(event.allDay),
      availability: event.availability || 'busy',
      calendarTitle: event.calendarTitle || 'Family Sync',
      recurrenceRule: event.recurrenceRule,
      alarms: Array.isArray(event.alarms) ? event.alarms : [],
      source: event.source || 'Family calendar',
      memberName: event.memberName,
      type: event.type,
      riskSummary: event.riskSummary,
    };
  }

  private async buildAuthHeaders(extraHeaders: HeadersInit = {}): Promise<HeadersInit> {
    const token = await this.getAuthToken();
    return token
      ? { ...extraHeaders, Authorization: `Bearer ${token}` }
      : extraHeaders;
  }

  private async getAuthToken(): Promise<string | null> {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token || null;
  }

  async getAuthHeaders(extraHeaders: HeadersInit = {}): Promise<HeadersInit> {
    return this.buildAuthHeaders(extraHeaders);
  }

  private getBackendCandidateUrls(endpoint: string): string[] {
    const candidates = new Set<string>();

    if (endpoint.startsWith('/')) {
      candidates.add(endpoint);
    }

    if (API_BASE_URL) {
      candidates.add(`${API_BASE_URL}${endpoint}`);
    }

    if (import.meta.env.DEV && endpoint.startsWith('/api/v1')) {
      candidates.add(`http://localhost:8010${endpoint}`);
    }

    return Array.from(candidates);
  }

  private async parseJsonBody<T>(response: Response, endpoint: string): Promise<T> {
    const text = await response.text();

    if (!text) {
      return {} as T;
    }

    try {
      return JSON.parse(text) as T;
    } catch {
      const compact = text.trim().slice(0, 160).replace(/\s+/g, ' ');
      if (compact.startsWith('<!doctype') || compact.startsWith('<html')) {
        throw new Error(`Backend returned HTML for ${endpoint}. Check local API routing.`);
      }
      throw new Error(`Backend returned invalid JSON for ${endpoint}.`);
    }
  }

  private async parseBackendError(response: Response, fallbackLabel: string): Promise<Error> {
    let message = `${fallbackLabel}: ${response.status}`;

    try {
      const text = await response.text();
      if (text) {
        try {
          const data = JSON.parse(text);
          const detail = data?.detail || data?.error || data?.message;
          if (typeof detail === 'string' && detail.trim()) {
            message = detail;
          }
        } catch {
          const compact = text.trim().slice(0, 160).replace(/\s+/g, ' ');
          if (compact.startsWith('<!doctype') || compact.startsWith('<html')) {
            message = `${fallbackLabel}: backend returned HTML instead of JSON`;
          } else if (compact) {
            message = compact;
          }
        }
      }
    } catch {
      // Ignore invalid error payloads and keep the status-based fallback.
    }

    return new Error(message);
  }

  private async requestBackendJson<T>(
    endpoint: string,
    init: RequestInit,
    fallbackLabel: string,
  ): Promise<T> {
    let lastError: Error | null = null;

    for (const candidateUrl of this.getBackendCandidateUrls(endpoint)) {
      try {
        const response = await this.withRetry(async () => {
          const controller = new AbortController();
          const timeoutId = window.setTimeout(() => controller.abort(), DEFAULT_BACKEND_TIMEOUT_MS);

          try {
            return await fetch(candidateUrl, {
              ...init,
              signal: init.signal ?? controller.signal,
            });
          } finally {
            window.clearTimeout(timeoutId);
          }
        });

        if (!response.ok) {
          const backendError = await this.parseBackendError(response, fallbackLabel);
          const shouldRetryOnHtml = import.meta.env.DEV && backendError.message.toLowerCase().includes('html');
          if (shouldRetryOnHtml) {
            lastError = backendError;
            continue;
          }
          throw backendError;
        }

        return await this.parseJsonBody<T>(response, endpoint);
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') {
          lastError = new Error(`${fallbackLabel}: request timed out`);
        } else {
          lastError = error instanceof Error ? error : new Error(fallbackLabel);
        }
        if (!import.meta.env.DEV) {
          break;
        }
      }
    }

    throw lastError || new Error(fallbackLabel);
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
      'Bypass-Tunnel-Reminder': 'true',
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
      const headers = await this.buildAuthHeaders({
        'Content-Type': 'application/json',
        'Bypass-Tunnel-Reminder': 'true',
      });

      try {
        const data = await this.requestBackendJson<any>(`/api/v1/chat/${engramId}/message`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            content,
            conversation_id: conversationId
          })
        }, `Unable to send chat message for engram ${engramId}`);

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
    const headers = await this.buildAuthHeaders({
      'Bypass-Tunnel-Reminder': 'true',
    });

    try {
      return await this.requestBackendJson(`/api/v1/health/predictions?lookbackDays=${lookbackDays}`, {
        headers
      }, 'Predictive Analytics API Error');
    } catch (error) {
      console.error("Predictive Analytics API Error:", error);
      throw error;
    }
  }

  /**
   * Get engrams from local backend
   */
  async getEngrams(): Promise<EngramResponse[]> {
    const headers = await this.buildAuthHeaders({
      'Bypass-Tunnel-Reminder': 'true',
    });

    try {
      return await this.requestBackendJson<EngramResponse[]>(`/api/v1/engrams/`, {
        headers
      }, 'Engrams API Error');
    } catch (error) {
      console.error("Engrams API Error:", error);
      throw error;
    }
  }

  /**
   * Get time capsules from local backend
   */
  async getTimeCapsules(): Promise<any[]> {
    const headers = await this.buildAuthHeaders({
      'Bypass-Tunnel-Reminder': 'true',
    });

    try {
      return await this.requestBackendJson<any[]>(`/api/v1/time-capsules/`, {
        headers
      }, 'Time Capsules API Error');
    } catch (error) {
      console.error("Time Capsules API Error:", error);
      throw error;
    }
  }

  /**
   * Get health summary from local backend
   */
  async getHealthSummary() {
    const headers = await this.buildAuthHeaders({
      'Bypass-Tunnel-Reminder': 'true',
    });

    try {
      return await this.requestBackendJson(`/api/v1/health/summary`, {
        headers
      }, 'Health Summary API Error');
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

  // Saint Agent API

  async getSaintsStatus(): Promise<Exclude<EdgeFunctionResponse<any>['data'], undefined>> {
    return this.deduplicate('saints-status', async () => {
      const headers = await this.buildAuthHeaders({
        'Bypass-Tunnel-Reminder': 'true',
      });

      try {
        return await this.requestBackendJson('/api/v1/saints/status', { headers }, 'Unable to load saints status');
      } catch (error) {
        console.error("Get Saints Status Error:", error);
        throw error;
      }
    });
  }

  async bootstrapSaint(saintId: string): Promise<{ engram_id: string, saint_id: string, name: string }> {
    const headers = await this.buildAuthHeaders({
      'Bypass-Tunnel-Reminder': 'true',
    });

    try {
      return await this.requestBackendJson(`/api/v1/saints/${saintId}/bootstrap`, {
        method: 'POST',
        headers
      }, `Unable to bootstrap saint ${saintId}`);
    } catch (error) {
      console.error("Bootstrap Saint Error:", error);
      throw error;
    }
  }

  async chatWithSaint(saintId: string, message: string, coordinationMode: boolean = false, context?: string): Promise<ChatResponse & { saint_id: string, saint_name: string }> {
    const headers = await this.buildAuthHeaders({
      'Content-Type': 'application/json',
      'Bypass-Tunnel-Reminder': 'true',
    });

    try {
      const data = await this.requestBackendJson<any>(`/api/v1/saints/${saintId}/chat`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ message, coordination_mode: coordinationMode, context })
      }, `Unable to chat with saint ${saintId}`);

      // Map backend response to ChatResponse format expected by UI
      return {
        id: data.id,
        message: data.content,
        conversationId: data.conversation_id,
        metrics: {},
        timestamp: data.created_at,
        saint_id: data.saint_id,
        saint_name: data.saint_name,
        role: data.role,
        content: data.content
      } as any;
    } catch (error) {
      console.error("Chat with Saint Error:", error);
      throw error;
    }
  }

  async getSaintKnowledge(saintId: string, category?: string): Promise<any[]> {
    const headers = await this.buildAuthHeaders({
      'Bypass-Tunnel-Reminder': 'true',
    });

    let endpoint = `/api/v1/saints/${saintId}/knowledge`;
    if (category) {
      endpoint += `?category=${category}`;
    }

    try {
      return await this.requestBackendJson(endpoint, { headers }, `Unable to load saint knowledge for ${saintId}`);
    } catch (error) {
      console.error("Get Saint Knowledge Error:", error);
      throw error;
    }
  }

  async registerDynamicAgent(agentData: { name: string, description: string, system_prompt: string, traits: any }): Promise<any> {
    const token = await this.getAuthToken();
    const API_BASE = `${API_BASE_URL}`;

    try {
      const response = await fetch(`${API_BASE}/api/v1/saints/register_dynamic`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Bypass-Tunnel-Reminder': 'true',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(agentData),
        signal: AbortSignal.timeout(15000) // 15s timeout
      });

      if (!response.ok) throw new Error(`Backend error: ${response.status}`);
      return await response.json();
    } catch (error) {
      console.error("Register Dynamic Agent Error:", error);
      throw error;
    }
  }

  async getChatHistory(saintId: string): Promise<any[]> {
    const headers = await this.buildAuthHeaders({
      'Bypass-Tunnel-Reminder': 'true',
    });

    try {
      return await this.requestBackendJson(`/api/v1/saints/${saintId}/history`, { headers }, `Unable to load saint chat history for ${saintId}`);
    } catch (error) {
      console.error("Get Chat History Error:", error);
      throw error;
    }
  }

  async deliberate(query: string, context?: string, coordinationMode: boolean = false): Promise<{ transcript: any[], consensus: string, action_items: string[] }> {
    const headers = await this.buildAuthHeaders({
      'Content-Type': 'application/json',
      'Bypass-Tunnel-Reminder': 'true',
    });

    try {
      return await this.requestBackendJson(`/api/v1/saints/council/deliberate`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ query, context, coordination_mode: coordinationMode }),
        signal: AbortSignal.timeout(60000) // 60s timeout for LLM
      }, 'Unable to deliberate with the financial council');
    } catch (error) {
      console.error("Council Deliberation Error:", error);
      throw error;
    }
  }
  async getActiveMissions(): Promise<any[]> {
    const headers = await this.buildAuthHeaders();

    try {
      return await this.requestBackendJson(`/api/v1/saints/missions/active`, { headers }, 'Unable to load active missions');
    } catch (error) {
      console.error("Get Missions Error:", error);
      // Return empty array on error to prevent UI crash
      return [];
    }
  }

  async getPendingIntercessions(): Promise<any[]> {
    const headers = await this.buildAuthHeaders();

    try {
      return await this.requestBackendJson(`/api/v1/saints/intercessions/pending`, { headers }, 'Unable to load pending intercessions');
    } catch (error) {
      console.error("Get Pending Intercessions Error:", error);
      return [];
    }
  }

  async processIntercession(intercessionId: string, action: 'approve' | 'deny'): Promise<any> {
    const headers = await this.buildAuthHeaders();

    try {
      return await this.requestBackendJson(`/api/v1/saints/intercessions/${intercessionId}/${action}`, {
        method: 'POST',
        headers,
      }, `Unable to ${action} intercession`);
    } catch (error) {
      console.error(`Process Intercession Error (${action}):`, error);
      throw error;
    }
  }

  async getSaintCognitionStatus(saintId: string): Promise<any> {
    const headers = await this.buildAuthHeaders();

    try {
      return await this.requestBackendJson(`/api/v1/saints/${saintId}/cognition/status`, { headers }, `Unable to load cognition status for ${saintId}`);
    } catch (error) {
      console.error("Get Saint Cognition Status Error:", error);
      // Return sensible fallback so PersonalityRadar degrades gracefully
      return {
        personality_scores: {
          Openness: 65,
          Conscientiousness: 70,
          Extraversion: 55,
          Agreeableness: 75,
          Neuroticism: 40,
        },
        last_reflection: null,
      };
    }
  }

  async getSocietyFeed(): Promise<any[]> {
    const token = await this.getAuthToken();
    const API_BASE = `${API_BASE_URL}`;

    try {
      const response = await fetch(`${API_BASE}/api/v1/social/feed`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) throw new Error(`Backend error: ${response.status}`);
      return await response.json();
    } catch (error) {
      console.error("Get Society Feed Error:", error);
      return [];
    }
  }

  async triggerSocietyEvent(): Promise<any> {
    const token = await this.getAuthToken();
    const API_BASE = `${API_BASE_URL}`;

    try {
      const response = await fetch(`${API_BASE}/api/v1/social/interact/random`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) throw new Error(`Backend error: ${response.status}`);
      return await response.json();
    } catch (error) {
      console.error("Trigger Society Event Error:", error);
      throw error;
    }
  }

  async getSocialClusters(): Promise<Record<string, string[]>> {
    const token = await this.getAuthToken();
    const API_BASE = `${API_BASE_URL}`;

    try {
      const response = await fetch(`${API_BASE}/api/v1/social/clusters`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) throw new Error(`Backend error: ${response.status}`);
      return await response.json();
    } catch (error) {
      console.error("Get Social Clusters Error:", error);
      return {};
    }
  }

  async triggerLegacyPropagation(engramId: string, vignette: string): Promise<any> {
    const token = await this.getAuthToken();
    const API_BASE = `${API_BASE_URL}`;

    try {
      const response = await fetch(`${API_BASE}/api/v1/social/propagate/${engramId}?vignette=${encodeURIComponent(vignette)}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) throw new Error(`Backend error: ${response.status}`);
      return await response.json();
    } catch (error) {
      console.error("Trigger Legacy Propagation Error:", error);
      throw error;
    }
  }

  async batchSyncEngrams(members: any[]): Promise<Record<string, string>> {
    const headers = await this.buildAuthHeaders({
      'Content-Type': 'application/json',
      'Bypass-Tunnel-Reminder': 'true'
    });

    try {
      return await this.requestBackendJson<Record<string, string>>(`/api/v1/engrams/batch-sync`, {
        method: 'POST',
        headers,
        body: JSON.stringify(members)
      }, 'Batch Sync Engrams Error');
    } catch (error) {
      console.error("Batch Sync Engrams Error:", error);
      return {};
    }
  }

  async boostSociety(count: number = 5): Promise<any> {
    const token = await this.getAuthToken();
    const API_BASE = `${API_BASE_URL}`;

    try {
      const response = await fetch(`${API_BASE}/api/v1/social/boost?count=${count}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) throw new Error(`Backend error: ${response.status}`);
      return await response.json();
    } catch (error) {
      console.error("Boost Society Error:", error);
      throw error;
    }
  }

  async analyzePersonality(engramId: string): Promise<any> {
    const token = await this.getAuthToken();
    const API_BASE = `${API_BASE_URL}`;

    try {
      const response = await fetch(`${API_BASE}/api/v1/engrams/${engramId}/analyze`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) throw new Error(`Backend error: ${response.status}`);
      return await response.json();
    } catch (error) {
      console.error("Analyze Personality Error:", error);
      throw error;
    }
  }

  async startMentorship(engramId: string, mentorId: string): Promise<any> {
    const token = await this.getAuthToken();
    const API_BASE = `${API_BASE_URL}`;

    try {
      const response = await fetch(`${API_BASE}/api/v1/engrams/${engramId}/mentorship/start?mentor_id=${mentorId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) throw new Error(`Backend error: ${response.status}`);
      return await response.json();
    } catch (error) {
      console.error("Start Mentorship Error:", error);
      throw error;
    }
  }

  async ingestVignette(engramId: string, content: string): Promise<any> {
    const token = await this.getAuthToken();
    const API_BASE = `${API_BASE_URL}`;

    try {
      const response = await fetch(`${API_BASE}/api/v1/engrams/${engramId}/vignette`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Bypass-Tunnel-Reminder': 'true'
        },
        body: JSON.stringify({ content })
      });

      if (!response.ok) throw new Error(`Backend error: ${response.status}`);
      return await response.json();
    } catch (error) {
      console.error("Ingest Vignette Error:", error);
      throw error;
    }
  }
  /** Get family tasks from the backend. */
  async getFamilyTasks(_userId: string): Promise<FamilyTask[]> {
    try {
      const headers = await this.getAuthHeaders({
        'Bypass-Tunnel-Reminder': 'true',
      });
      const data = await this.requestBackendJson<{ tasks?: FamilyTask[] }>(
        '/api/v1/family-home/tasks',
        { headers },
        'Get Family Tasks Error',
      );
      return data.tasks || [];
    } catch (error) {
      console.error("Get Family Tasks Error:", error);
      return [];
    }
  }

  async getPersonalityQuizProfile(memberId: string): Promise<any | null> {
    try {
      const data = await this.requestBackendJson(`/api/v1/personality-quiz/profile/${memberId}`, {
        method: 'GET',
      }, 'Get Personality Quiz Profile Error');
      return data?.error ? null : data;
    } catch (error) {
      console.error('Get Personality Quiz Profile Error:', error);
      return null;
    }
  }

  async submitOceanProfile(
    personId: string,
    scores: { O: number; C: number; E: number; A: number; N: number }
  ): Promise<any> {
    const headers = await this.getAuthHeaders({
      'Content-Type': 'application/json',
      'Bypass-Tunnel-Reminder': 'true',
    });

    return await this.requestBackendJson(`/api/v1/dht/ocean/${personId}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(scores),
    }, 'Submit OCEAN Profile Error');
  }

  /** Mark a task complete. */
  async completeTask(taskId: string): Promise<void> {
    try {
      const headers = await this.getAuthHeaders({
        'Bypass-Tunnel-Reminder': 'true',
      });
      await this.requestBackendJson(`/api/v1/family-home/tasks/${taskId}/complete`, {
        method: 'POST',
        headers,
      }, 'Complete Task Error');
    } catch (error) {
      console.error("Complete Task Error:", error);
      throw error;
    }
  }

  /** Get shopping list. */
  async getShoppingList(_userId: string): Promise<ShoppingItem[]> {
    try {
      const headers = await this.getAuthHeaders({
        'Bypass-Tunnel-Reminder': 'true',
      });
      const data = await this.requestBackendJson<{ items?: ShoppingItem[] }>(
        '/api/v1/family-home/shopping',
        { headers },
        'Get Shopping List Error',
      );
      return data.items || [];
    } catch (error) {
      console.error("Get Shopping List Error:", error);
      return [];
    }
  }

  /** Mark a shopping item as bought. */
  async markItemBought(itemId: string): Promise<void> {
    try {
      const headers = await this.getAuthHeaders({
        'Bypass-Tunnel-Reminder': 'true',
      });
      await this.requestBackendJson(`/api/v1/family-home/shopping/${itemId}/bought`, {
        method: 'POST',
        headers,
      }, 'Mark Item Bought Error');
    } catch (error) {
      console.error("Mark Item Bought Error:", error);
      throw error;
    }
  }

  /** Get family calendar events. */
  async getFamilyCalendar(_userId: string): Promise<CalendarEvent[]> {
    try {
      const headers = await this.getAuthHeaders({
        'Bypass-Tunnel-Reminder': 'true',
      });
      const data = await this.requestBackendJson<{ events?: CalendarEvent[] }>(
        '/api/v1/family-home/calendar',
        { headers },
        'Get Family Calendar Error',
      );
      const events = Array.isArray(data.events) ? data.events : [];
      if (events.length > 0) {
        return events.map((event: CalendarEvent, index: number) => this.normalizeCalendarEvent(event, index));
      }
      return getLocalFamilyCalendar(_userId).map((event, index) => this.normalizeCalendarEvent(event, index));
    } catch (error) {
      console.error("Get Family Calendar Error:", error);
      return getLocalFamilyCalendar(_userId).map((event, index) => this.normalizeCalendarEvent(event, index));
    }
  }

  /** Get family bulletin messages. */
  async getFamilyBulletin(): Promise<BulletinMessage[]> {
    try {
      const headers = await this.getAuthHeaders({
        'Bypass-Tunnel-Reminder': 'true',
      });
      const data = await this.requestBackendJson<{ messages?: BulletinMessage[] }>(
        '/api/v1/family-home/bulletin',
        { headers },
        'Get Family Bulletin Error',
      );
      return data.messages || [];
    } catch (error) {
      console.error("Get Family Bulletin Error:", error);
      return [];
    }
  }

  /** Post a bulletin message. */
  async postBulletinMessage(text: string, author: string): Promise<void> {
    try {
      const headers = await this.getAuthHeaders({
        'Content-Type': 'application/json',
        'Bypass-Tunnel-Reminder': 'true',
      });
      await this.requestBackendJson('/api/v1/family-home/bulletin', {
        method: 'POST',
        headers,
        body: JSON.stringify({ text, author }),
      }, 'Post Bulletin Message Error');
    } catch (error) {
      console.error("Post Bulletin Message Error:", error);
      throw error;
    }
  }

  /** --- Custom Engrams --- */

  // Duplicate getEngrams removed

  /** Create a new custom engram. */
  async createEngram(payload: EngramCreatePayload): Promise<EngramResponse> {
    const token = await this.getAuthToken();
    const API_BASE = `${API_BASE_URL}`;
    try {
      const response = await fetch(`${API_BASE}/api/v1/engrams/create`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Bypass-Tunnel-Reminder': 'true'
        },
        body: JSON.stringify({
          ...payload,
          relationship: payload.relationship || 'custom',
          engram_type: payload.engram_type || 'custom',
        }),
      });
      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.detail || `Backend error: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error("Create Engram Error:", error);
      throw error;
    }
  }

  /** Check if an engram name already exists for the user. */
  async checkEngramNameExists(name: string): Promise<boolean> {
    try {
      const engrams = await this.getEngrams();
      return engrams.some(engram => engram.name.toLowerCase() === name.toLowerCase());
    } catch (e) {
      return false;
    }
  }
  /** Submit a manual training memory / response for an engram */
  async submitEngramResponse(engramId: string, payload: {
    question_text: string;
    response_text: string;
    question_category: string;
    day_number: number;
    mood?: string;
  }): Promise<void> {
    const token = await this.getAuthToken();
    const API_BASE = `${API_BASE_URL}`;
    try {
      const response = await fetch(`${API_BASE}/api/v1/engrams/${engramId}/responses`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Bypass-Tunnel-Reminder': 'true'
        },
        body: JSON.stringify({
          engram_id: engramId,
          ...payload
        })
      });
      if (!response.ok) throw new Error(`Backend error: ${response.status}`);
    } catch (error) {
      console.error("Submit Engram Response Error:", error);
      throw error;
    }
  }
  /** Register a dynamic Saint/Engram (used in Family Tree and Members) */
  async registerDynamicSaint(payload: {
    name: string;
    description: string;
    system_prompt: string;
    traits: Record<string, any>;
  }): Promise<any> {
    const token = await this.getAuthToken();
    const API_BASE = `${API_BASE_URL}`;
    try {
      const response = await fetch(`${API_BASE}/api/v1/saints/register_dynamic`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Bypass-Tunnel-Reminder': 'true'
        },
        body: JSON.stringify(payload)
      });
      if (!response.ok) throw new Error(`Backend error: ${response.status}`);
      return await response.json();
    } catch (error) {
      console.error("Register Dynamic Saint Error:", error);
      throw error;
    }
  }
}

export const apiClient = new APIClient();
