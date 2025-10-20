import { supabase } from './supabase';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

class APIClient {
  private async getAuthToken(): Promise<string | null> {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token || null;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const token = await this.getAuthToken();
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE_URL}${endpoint}`, { ...options, headers });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Request failed' }));
      throw new Error(error.detail || `HTTP ${response.status}`);
    }

    if (response.status === 204) {
      return {} as T;
    }

    return response.json();
  }

  async sendChatMessage(engramId: string, content: string) {
    return this.request(`/api/v1/chat/${engramId}/message`, {
      method: 'POST',
      body: JSON.stringify({ content }),
    });
  }

  async listTasks(engramId: string) {
    return this.request(`/api/v1/tasks/${engramId}`, { method: 'GET' });
  }

  async createTask(engramId: string, data: any) {
    return this.request(`/api/v1/tasks/${engramId}/create`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async executeTask(taskId: string) {
    return this.request(`/api/v1/tasks/${taskId}/execute`, { method: 'POST' });
  }

  async deleteTask(taskId: string) {
    return this.request(`/api/v1/tasks/${taskId}`, { method: 'DELETE' });
  }
}

export const apiClient = new APIClient();
