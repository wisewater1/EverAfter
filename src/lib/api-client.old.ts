import { supabase } from './supabase';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

class APIClient {
  private async getAuthToken(): Promise<string | null> {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token || null;
  }

  private async callEdgeFunction<T>(functionName: string, body: Record<string, unknown>): Promise<T> {
    const token = await this.getAuthToken();
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${SUPABASE_URL}/functions/v1/${functionName}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Request failed' }));
      throw new Error(error.error || `HTTP ${response.status}`);
    }

    return response.json();
  }

  async sendChatMessage(engramId: string, content: string, conversationId?: string) {
    return this.callEdgeFunction('engram-chat', {
      engramId,
      message: content,
      conversationId: conversationId || `conv_${Date.now()}_${engramId}`,
    });
  }

  async listTasks(engramId: string) {
    const { data, error } = await supabase
      .from('agent_task_queue')
      .select('*')
      .eq('engram_id', engramId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  }

  async createTask(engramId: string, taskData: Record<string, unknown>) {
    const { data, error } = await supabase
      .from('agent_task_queue')
      .insert({
        engram_id: engramId,
        task_type: taskData.task_type || 'general',
        task_description: taskData.task_description || '',
        priority: taskData.priority || 'medium',
        status: 'pending',
        scheduled_for: taskData.scheduled_for || new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async executeTask(taskId: string) {
    return this.callEdgeFunction('manage-agent-tasks', {
      action: 'execute',
      taskId,
    });
  }

  async deleteTask(taskId: string) {
    const { error } = await supabase
      .from('agent_task_queue')
      .delete()
      .eq('id', taskId);

    if (error) throw error;
    return { success: true };
  }

  async getDailyQuestion(userId: string, engramId?: string) {
    return this.callEdgeFunction('get-daily-question', {
      userId,
      engramId,
    });
  }

  async submitDailyResponse(userId: string, questionId: string, response: string, engramId?: string) {
    return this.callEdgeFunction('submit-daily-response', {
      userId,
      questionId,
      response,
      engramId,
    });
  }
}

export const apiClient = new APIClient();
