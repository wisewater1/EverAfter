import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'npm:@supabase/supabase-js@2.57.4';

const ALLOWED_ORIGINS = [
  'https://everafterai.net',
  'https://dev--everafterai.netlify.app',
];

function getCorsHeaders(req?: Request): Record<string, string> {
  const origin = req?.headers.get('Origin') ?? null;
  const allowedOrigin = origin && ALLOWED_ORIGINS.includes(origin)
    ? origin
    : ALLOWED_ORIGINS[0];
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
    'Vary': 'Origin',
  };
}

let corsHeaders: Record<string, string>;

function errorResponse(message: string, status = 500): Response {
  return new Response(
    JSON.stringify({ error: message }),
    { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(
    JSON.stringify(data),
    { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

Deno.serve(async (req: Request) => {
  corsHeaders = getCorsHeaders(req);

  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return errorResponse('Missing authorization header', 401);
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      return errorResponse('Unauthorized', 401);
    }

    const url = new URL(req.url);

    // GET: Fetch tasks
    if (req.method === 'GET') {
      const status = url.searchParams.get('status');
      const saintId = url.searchParams.get('saint_id') || 'raphael';
      
      let query = supabase
        .from('agent_tasks')
        .select('*')
        .eq('user_id', user.id)
        .eq('saint_id', saintId)
        .order('created_at', { ascending: false });
      
      if (status) {
        query = query.eq('status', status);
      }
      
      const { data: tasks, error } = await query;

      if (error) {
        console.error('Error fetching tasks:', error);
        return errorResponse('Failed to fetch tasks');
      }

      return jsonResponse({ tasks });
    }

    // POST: Create new task
    if (req.method === 'POST') {
      const body = await req.json();
      const { task_type, title, description, priority, details, scheduled_for, saint_id } = body;
      
      if (!task_type || !title) {
        return errorResponse('Missing required fields: task_type and title', 400);
      }
      
      const { data: task, error } = await supabase
        .from('agent_tasks')
        .insert({
          user_id: user.id,
          saint_id: saint_id || 'raphael',
          task_type,
          title,
          description,
          priority: priority || 'medium',
          details: details || {},
          status: 'pending',
          scheduled_for,
        })
        .select()
        .single();
      
      if (error) {
        console.error('Error creating task:', error);
        return errorResponse('Failed to create task');
      }

      // Create log entry
      await supabase
        .from('agent_task_logs')
        .insert({
          task_id: task.id,
          action: 'task_created',
          details: { task_type, title },
        });

      return jsonResponse({ task }, 201);
    }

    // PUT: Update task
    if (req.method === 'PUT') {
      const body = await req.json();
      const { task_id, status, result, details } = body;
      
      if (!task_id) {
        return errorResponse('Missing task_id', 400);
      }

      const updateData: any = {};
      if (status) updateData.status = status;
      if (result) updateData.result = result;
      if (details) updateData.details = details;
      if (status === 'completed') updateData.completed_at = new Date().toISOString();

      const { data: task, error } = await supabase
        .from('agent_tasks')
        .update(updateData)
        .eq('id', task_id)
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) {
        console.error('Error updating task:', error);
        return errorResponse('Failed to update task');
      }

      // Create log entry
      await supabase
        .from('agent_task_logs')
        .insert({
          task_id,
          action: `task_${status || 'updated'}`,
          details: { status, result },
        });

      return jsonResponse({ task });
    }

    // DELETE: Delete task
    if (req.method === 'DELETE') {
      const taskId = url.searchParams.get('task_id');
      
      if (!taskId) {
        return errorResponse('Missing task_id', 400);
      }

      const { error } = await supabase
        .from('agent_tasks')
        .delete()
        .eq('id', taskId)
        .eq('user_id', user.id);

      if (error) {
        console.error('Error deleting task:', error);
        return errorResponse('Failed to delete task');
      }

      return jsonResponse({ success: true });
    }

    return errorResponse('Method not allowed', 405);

  } catch (error: any) {
    console.error('Error:', error);
    return errorResponse('Internal server error');
  }
});
