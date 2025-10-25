import { supabase } from './supabase';

export interface EdgeFunctionError {
  code: string;
  message: string;
  hint?: string;
  status?: number;
}

export class EdgeFunctionException extends Error {
  code: string;
  hint?: string;
  status: number;

  constructor(error: EdgeFunctionError) {
    super(error.message);
    this.name = 'EdgeFunctionException';
    this.code = error.code;
    this.hint = error.hint;
    this.status = error.status || 500;
  }
}

/**
 * Call a Supabase Edge Function with proper JWT forwarding and error handling
 *
 * @param functionName - Name of the Edge Function to invoke
 * @param body - Request body (will be JSON stringified)
 * @returns Response data from the Edge Function
 * @throws EdgeFunctionException with structured error details
 */
export async function callEdgeFunction<T = any>(
  functionName: string,
  body: Record<string, any>
): Promise<T> {
  try {
    // Get current session and JWT
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();

    if (sessionError || !session) {
      throw new EdgeFunctionException({
        code: 'NO_SESSION',
        message: 'You must be logged in to perform this action',
        status: 401,
      });
    }

    // Invoke the Edge Function with JWT in Authorization header
    const { data, error } = await supabase.functions.invoke(functionName, {
      body,
      headers: {
        Authorization: `Bearer ${session.access_token}`,
      },
    });

    // Check for invocation errors (network, 500s, etc.)
    if (error) {
      throw new EdgeFunctionException({
        code: 'INVOCATION_ERROR',
        message: error.message || 'Failed to invoke Edge Function',
        status: 500,
      });
    }

    // Check if the response is an error object
    if (data && typeof data === 'object' && 'code' in data && 'message' in data) {
      throw new EdgeFunctionException(data as EdgeFunctionError);
    }

    return data as T;

  } catch (error) {
    // Re-throw EdgeFunctionException as-is
    if (error instanceof EdgeFunctionException) {
      throw error;
    }

    // Wrap unknown errors
    throw new EdgeFunctionException({
      code: 'UNKNOWN_ERROR',
      message: error instanceof Error ? error.message : 'An unknown error occurred',
      status: 500,
    });
  }
}

/**
 * Chat with St. Raphael using the new AI Agent with memory and tool calling
 */
export interface AgentChatRequest {
  input: string;
  conversation_history?: Array<{ role: string; content: string }>;
}

export interface AgentChatResponse {
  reply: string;
  user_id: string;
  tools_used: boolean;
  tool_execution_log?: Array<{
    tool: string;
    args: any;
    result: any;
  }>;
}

export async function chatWithAgent(request: AgentChatRequest): Promise<AgentChatResponse> {
  return callEdgeFunction<AgentChatResponse>('agent', request);
}

/**
 * Legacy Raphael chat (keeping for backward compatibility)
 */
export interface RaphaelChatRequest {
  input: string;
  engramId?: string;
  system?: string;
}

export interface RaphaelChatResponse {
  reply: string;
  user_id: string;
}

export async function chatWithRaphael(request: RaphaelChatRequest): Promise<RaphaelChatResponse> {
  return callEdgeFunction<RaphaelChatResponse>('raphael-chat', request);
}

/**
 * Create a new task for an engram
 */
export interface CreateTaskRequest {
  engramId: string;
  title: string;
  task_description?: string;
  details?: Record<string, any>;
}

export interface CreateTaskResponse {
  task: {
    id: string;
    user_id: string;
    engram_id: string;
    title: string;
    task_description: string | null;
    status: string;
    details: Record<string, any>;
    execution_log: any[];
    created_at: string;
    updated_at: string;
  };
}

export async function createTask(request: CreateTaskRequest): Promise<CreateTaskResponse> {
  return callEdgeFunction<CreateTaskResponse>('task-create', request);
}

/**
 * Get or create daily progress record
 */
export interface DailyProgressResponse {
  progress_id: string;
  user_id: string;
}

export async function getDailyProgress(): Promise<DailyProgressResponse> {
  return callEdgeFunction<DailyProgressResponse>('daily-progress', {});
}
