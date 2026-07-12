import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface TaskExecution {
  task_id: string;
  step: string;
  status: "started" | "completed" | "failed";
  result?: any;
  error?: string;
  timestamp: string;
}

// Simulate task execution (in production, this would integrate with actual services)
async function executeTask(task: any, supabase: any): Promise<{
  success: boolean;
  result?: any;
  error?: string;
  execution_log: TaskExecution[];
}> {
  const executionLog: TaskExecution[] = [];
  const taskId = task.id;

  try {
    // Log task start
    executionLog.push({
      task_id: taskId,
      step: "task_started",
      status: "started",
      timestamp: new Date().toISOString()
    });

    // Update task status to in_progress
    await supabase
      .from('agent_task_queue')
      .update({ 
        status: 'in_progress',
        started_at: new Date().toISOString(),
        completion_percentage: 10
      })
      .eq('id', taskId);

    // Execute based on task type
    let result: any = {};
    
    // Real-world integrations (appointment booking, pharmacy refills,
    // clinical portals) are NOT built yet. EverAfter never fabricates a
    // completed real-world action: anything but an in-app reminder is
    // declined with an honest, user-facing explanation instead of invented
    // doctors and confirmation numbers.
    if (task.task_type !== 'health_reminder') {
      const capability = ({
        doctor_appointment: 'booking medical appointments with a provider',
        prescription_refill: 'submitting pharmacy refill requests',
        lab_results: 'retrieving lab results from a clinical portal',
      } as Record<string, string>)[task.task_type] || 'autonomously executing this kind of real-world task';

      const message = `EverAfter can't complete this yet: ${capability} isn't connected to a real integration. Nothing was booked, submitted, or sent. This task type will activate once the real integration ships.`;

      const declinedResult = {
        success: false,
        status: 'integration_not_available',
        message,
      };

      await supabase
        .from('agent_task_queue')
        .update({
          status: 'failed',
          error_message: message,
          completed_at: new Date().toISOString(),
          result: declinedResult,
        })
        .eq('id', taskId);

      executionLog.push({
        task_id: taskId,
        step: 'integration_not_available',
        status: 'failed',
        result: declinedResult,
        timestamp: new Date().toISOString(),
      });

      return {
        success: false,
        error: message,
        execution_log: executionLog,
      };
    }

    executionLog.push({
      task_id: taskId,
      step: 'creating_reminder',
      status: 'started',
      timestamp: new Date().toISOString(),
    });

    await supabase
      .from('agent_task_queue')
      .update({ completion_percentage: 50 })
      .eq('id', taskId);

    // The reminder itself is the real action: the task row (and any
    // notification listeners on it) carry the reminder inside the app.
    result = {
      reminder_created: true,
      reminder_details: {
        title: task.task_title,
        description: task.task_description,
        scheduled_for: task.scheduled_for || new Date().toISOString(),
      },
    };

    executionLog.push({
      task_id: taskId,
      step: 'reminder_set',
      status: 'completed',
      result,
      timestamp: new Date().toISOString(),
    });

    // Update task to completed
    await supabase
      .from('agent_task_queue')
      .update({
        status: 'completed',
        completion_percentage: 100,
        completed_at: new Date().toISOString(),
        result
      })
      .eq('id', taskId);

    executionLog.push({
      task_id: taskId,
      step: "task_completed",
      status: "completed",
      result,
      timestamp: new Date().toISOString()
    });

    return {
      success: true,
      result,
      execution_log: executionLog
    };

  } catch (error: any) {
    console.error(`Task execution error [${taskId}]:`, error);

    executionLog.push({
      task_id: taskId,
      step: "task_failed",
      status: "failed",
      error: error.message,
      timestamp: new Date().toISOString()
    });

    // Update task to failed
    await supabase
      .from('agent_task_queue')
      .update({
        status: 'failed',
        error_message: error.message,
        completed_at: new Date().toISOString()
      })
      .eq('id', taskId);

    return {
      success: false,
      error: error.message,
      execution_log: executionLog
    };
  }
}

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    // Create Supabase client with service role key for cron operations
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseServiceKey) {
      return new Response(
        JSON.stringify({ 
          code: "CONFIG_MISSING",
          message: "Supabase configuration missing" 
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Query for pending tasks that are scheduled to run
    const { data: tasks, error: queryError } = await supabase
      .from('agent_task_queue')
      .select('*')
      .in('status', ['pending'])
      .lte('scheduled_for', new Date().toISOString())
      .order('priority', { ascending: false })
      .order('scheduled_for', { ascending: true })
      .limit(10); // Process up to 10 tasks per run

    if (queryError) {
      console.error('Error querying tasks:', queryError);
      return new Response(
        JSON.stringify({ 
          code: "QUERY_ERROR",
          message: queryError.message 
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!tasks || tasks.length === 0) {
      return new Response(
        JSON.stringify({ 
          message: "No pending tasks to process",
          timestamp: new Date().toISOString()
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Process each task
    const results = [];
    for (const task of tasks) {
      console.log(`Processing task ${task.id}: ${task.task_title}`);
      
      const execution = await executeTask(task, supabase);
      
      // Store execution log in agent_task_executions table
      for (const log of execution.execution_log) {
        await supabase
          .from('agent_task_executions')
          .insert({
            task_id: log.task_id,
            execution_step: log.step,
            step_order: execution.execution_log.indexOf(log) + 1,
            status: log.status,
            step_result: log.result || null,
            error_details: log.error || null,
            started_at: log.timestamp,
            completed_at: log.timestamp
          });
      }

      results.push({
        task_id: task.id,
        task_title: task.task_title,
        success: execution.success,
        error: execution.error,
        steps_executed: execution.execution_log.length
      });
    }

    return new Response(
      JSON.stringify({
        processed_tasks: results.length,
        results,
        timestamp: new Date().toISOString()
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error('Cron execution error:', error);
    return new Response(
      JSON.stringify({ 
        code: "CRON_ERROR",
        message: error.message 
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
