import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'npm:@supabase/supabase-js@2.57.4';

// CRUD + execute over engram_ai_tasks — the single user-facing task table.
// (agent_task_queue remains St. Raphael's internal execution queue, driven
// by the `agent` chat tool and agent-cron; the legacy `agent_tasks` table
// this function previously used has no other consumers.)
//
// Execution is truthful: reminder/notification tasks are genuinely delivered
// as an agent_notifications row (the frontend HealthAlertListener surfaces
// inserts live). Task types with no real integration are marked failed with
// an explicit explanation — never a fabricated success.

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

const VALID_STATUSES = ['pending', 'in_progress', 'done', 'failed', 'cancelled'];
const DELIVERABLE_TYPES = ['reminder', 'notification', 'health_reminder'];

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return json({ code: 'AUTH_MISSING', message: 'Missing authorization header' }, 401);
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      return json({ code: 'AUTH_FAILED', message: 'Unauthorized' }, 401);
    }

    const url = new URL(req.url);

    // GET: list the user's tasks (optionally by engram and/or status)
    if (req.method === 'GET') {
      const status = url.searchParams.get('status');
      const engramId = url.searchParams.get('engram_id');

      let query = supabase
        .from('engram_ai_tasks')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (engramId) query = query.eq('engram_id', engramId);
      if (status) query = query.eq('status', status);

      const { data: tasks, error } = await query;
      if (error) return json({ code: 'DB_ERROR', message: error.message }, 500);

      return json({ tasks });
    }

    // POST: either execute an existing task ({action:'execute', taskId})
    // or create a new one ({engramId, title, ...})
    if (req.method === 'POST') {
      const body = await req.json().catch(() => ({}));

      if (body.action === 'execute') {
        const taskId = body.taskId || body.task_id;
        if (!taskId) {
          return json({ code: 'INVALID_REQUEST', message: 'Missing taskId for execute action' }, 400);
        }

        const { data: task, error: taskError } = await supabase
          .from('engram_ai_tasks')
          .select('*')
          .eq('id', taskId)
          .eq('user_id', user.id)
          .single();

        if (taskError || !task) {
          return json({ code: 'TASK_NOT_FOUND', message: 'Task not found or not owned by user' }, 404);
        }
        if (task.status === 'cancelled') {
          return json({ code: 'TASK_CANCELLED', message: 'This task was cancelled and cannot be executed.' }, 409);
        }

        const taskType = String(task.details?.task_type || 'general');
        const executionLog: unknown[] = Array.isArray(task.execution_log) ? task.execution_log : [];
        const now = new Date().toISOString();

        if (DELIVERABLE_TYPES.includes(taskType)) {
          // Real capability: deliver the reminder as an in-app notification.
          // HealthAlertListener subscribes to inserts and surfaces it live.
          const { data: notification, error: notifyError } = await supabase
            .from('agent_notifications')
            .insert({
              user_id: user.id,
              engram_id: task.engram_id,
              notification_type: 'health_reminder',
              title: task.title,
              message: task.task_description || task.title,
              priority: 'normal',
              is_actionable: false,
            })
            .select('id')
            .single();

          if (notifyError) {
            executionLog.push({ at: now, action: 'execute', result: 'delivery_failed', error: notifyError.message });
            await supabase
              .from('engram_ai_tasks')
              .update({ status: 'failed', execution_log: executionLog })
              .eq('id', taskId);
            return json({
              code: 'DELIVERY_FAILED',
              executed: false,
              message: 'The reminder could not be delivered — nothing was sent. Try again shortly.',
            }, 502);
          }

          executionLog.push({ at: now, action: 'execute', result: 'reminder_delivered', notification_id: notification?.id });
          const { data: updated, error: updateError } = await supabase
            .from('engram_ai_tasks')
            .update({ status: 'done', execution_log: executionLog })
            .eq('id', taskId)
            .select()
            .single();
          if (updateError) {
            // The reminder DID go out; report that truthfully even though the
            // status write failed.
            return json({
              executed: true,
              result: 'reminder_delivered',
              message: 'Reminder delivered, but the task status could not be updated.',
              warning: updateError.message,
            });
          }

          return json({
            executed: true,
            result: 'reminder_delivered',
            message: 'Reminder delivered to your notifications.',
            task: updated,
          });
        }

        // No real integration exists for this task type: decline honestly.
        const message =
          `EverAfter has no integration that can perform "${taskType}" tasks yet — ` +
          'nothing was booked, submitted, or sent. The task is marked failed so it is not silently forgotten.';
        executionLog.push({ at: now, action: 'execute', result: 'integration_not_available', message });
        const { data: updated } = await supabase
          .from('engram_ai_tasks')
          .update({ status: 'failed', execution_log: executionLog })
          .eq('id', taskId)
          .select()
          .single();

        return json({
          executed: false,
          result: 'integration_not_available',
          message,
          task: updated ?? { ...task, status: 'failed' },
        });
      }

      // Create
      const { engramId, engram_id, title, task_description, details } = body;
      const targetEngram = engramId || engram_id;
      if (!targetEngram || !title) {
        return json({ code: 'INVALID_REQUEST', message: 'Missing required fields: engramId and title' }, 400);
      }

      const { data: engram, error: engramError } = await supabase
        .from('engrams')
        .select('id')
        .eq('id', targetEngram)
        .eq('user_id', user.id)
        .single();
      if (engramError || !engram) {
        return json({ code: 'ENGRAM_NOT_FOUND', message: 'Engram not found or not owned by user' }, 404);
      }

      const { data: task, error } = await supabase
        .from('engram_ai_tasks')
        .insert({
          user_id: user.id,
          engram_id: targetEngram,
          title,
          task_description: task_description || null,
          details: details || {},
          status: 'pending',
        })
        .select()
        .single();

      if (error) return json({ code: 'DB_ERROR', message: error.message }, 500);
      return json({ task }, 201);
    }

    // PUT: update status/details (status values enforced to the table's CHECK set)
    if (req.method === 'PUT') {
      const body = await req.json().catch(() => ({}));
      const { task_id, status, details } = body;

      if (!task_id) {
        return json({ code: 'INVALID_REQUEST', message: 'Missing task_id' }, 400);
      }
      if (status && !VALID_STATUSES.includes(status)) {
        return json({
          code: 'INVALID_STATUS',
          message: `Invalid status "${status}". Allowed: ${VALID_STATUSES.join(', ')}`,
        }, 400);
      }

      const updateData: Record<string, unknown> = {};
      if (status) updateData.status = status;
      if (details) updateData.details = details;
      if (Object.keys(updateData).length === 0) {
        return json({ code: 'INVALID_REQUEST', message: 'Nothing to update' }, 400);
      }

      const { data: task, error } = await supabase
        .from('engram_ai_tasks')
        .update(updateData)
        .eq('id', task_id)
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) return json({ code: 'DB_ERROR', message: error.message }, 500);
      return json({ task });
    }

    // DELETE
    if (req.method === 'DELETE') {
      const taskId = url.searchParams.get('task_id');
      if (!taskId) {
        return json({ code: 'INVALID_REQUEST', message: 'Missing task_id' }, 400);
      }

      const { error } = await supabase
        .from('engram_ai_tasks')
        .delete()
        .eq('id', taskId)
        .eq('user_id', user.id);

      if (error) return json({ code: 'DB_ERROR', message: error.message }, 500);
      return json({ success: true });
    }

    return json({ code: 'METHOD_NOT_ALLOWED', message: 'Method not allowed' }, 405);
  } catch (error: unknown) {
    console.error('manage-agent-tasks error:', error);
    const message = error instanceof Error ? error.message : String(error);
    return json({ code: 'SERVER_ERROR', message }, 500);
  }
});
