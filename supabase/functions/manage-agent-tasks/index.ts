import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'npm:@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

Deno.serve(async (req: Request) => {
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
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const url = new URL(req.url);
    const action = url.searchParams.get('action');

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
        return new Response(
          JSON.stringify({ error: error.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      return new Response(
        JSON.stringify({ tasks }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // POST: Create new task
    if (req.method === 'POST') {
      const body = await req.json();
      const { task_type, title, description, priority, details, scheduled_for, saint_id } = body;
      
      if (!task_type || !title) {
        return new Response(
          JSON.stringify({ error: 'Missing required fields: task_type and title' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
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
        return new Response(
          JSON.stringify({ error: error.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      // Create log entry
      await supabase
        .from('agent_task_logs')
        .insert({
          task_id: task.id,
          action: 'task_created',
          details: { task_type, title },
        });
      
      return new Response(
        JSON.stringify({ task }),
        { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // PUT: Update task
    if (req.method === 'PUT') {
      const body = await req.json();
      const { task_id, status, result, details } = body;
      
      if (!task_id) {
        return new Response(
          JSON.stringify({ error: 'Missing task_id' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
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
        return new Response(
          JSON.stringify({ error: error.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      // Create log entry
      await supabase
        .from('agent_task_logs')
        .insert({
          task_id,
          action: `task_${status || 'updated'}`,
          details: { status, result },
        });
      
      return new Response(
        JSON.stringify({ task }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // DELETE: Delete task
    if (req.method === 'DELETE') {
      const taskId = url.searchParams.get('task_id');
      
      if (!taskId) {
        return new Response(
          JSON.stringify({ error: 'Missing task_id' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      const { error } = await supabase
        .from('agent_tasks')
        .delete()
        .eq('id', taskId)
        .eq('user_id', user.id);
      
      if (error) {
        return new Response(
          JSON.stringify({ error: error.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      return new Response(
        JSON.stringify({ success: true }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
