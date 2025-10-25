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
    
    switch (task.task_type) {
      case 'doctor_appointment': {
        executionLog.push({
          task_id: taskId,
          step: "checking_credentials",
          status: "started",
          timestamp: new Date().toISOString()
        });

        // Check if credentials are available
        if (task.requires_credentials && (!task.credential_ids || task.credential_ids.length === 0)) {
          await supabase
            .from('agent_task_queue')
            .update({ status: 'awaiting_credentials' })
            .eq('id', taskId);

          executionLog.push({
            task_id: taskId,
            step: "awaiting_credentials",
            status: "completed",
            result: { message: "Task requires user credentials to proceed" },
            timestamp: new Date().toISOString()
          });

          return {
            success: false,
            error: "Credentials required",
            execution_log: executionLog
          };
        }

        // Simulate appointment booking steps
        await supabase
          .from('agent_task_queue')
          .update({ completion_percentage: 30 })
          .eq('id', taskId);

        executionLog.push({
          task_id: taskId,
          step: "searching_appointments",
          status: "completed",
          result: { available_slots: 5 },
          timestamp: new Date().toISOString()
        });

        await supabase
          .from('agent_task_queue')
          .update({ completion_percentage: 60 })
          .eq('id', taskId);

        executionLog.push({
          task_id: taskId,
          step: "booking_appointment",
          status: "completed",
          result: { 
            appointment_details: {
              date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
              time: "10:00 AM",
              doctor: "Dr. Smith",
              location: "Main Health Center"
            }
          },
          timestamp: new Date().toISOString()
        });

        result = {
          appointment_details: {
            date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            time: "10:00 AM",
            doctor: "Dr. Smith",
            location: "Main Health Center",
            confirmation_number: `APPT-${Date.now()}`
          }
        };

        break;
      }

      case 'prescription_refill': {
        executionLog.push({
          task_id: taskId,
          step: "locating_prescription",
          status: "started",
          timestamp: new Date().toISOString()
        });

        await supabase
          .from('agent_task_queue')
          .update({ completion_percentage: 40 })
          .eq('id', taskId);

        executionLog.push({
          task_id: taskId,
          step: "requesting_refill",
          status: "completed",
          timestamp: new Date().toISOString()
        });

        await supabase
          .from('agent_task_queue')
          .update({ completion_percentage: 70 })
          .eq('id', taskId);

        result = {
          refill_details: {
            medication: task.task_description.match(/\b[A-Z][a-z]+\b/)?.[0] || "Medication",
            quantity: "30 day supply",
            pharmacy: "Local Pharmacy",
            ready_by: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            confirmation: `RX-${Date.now()}`
          }
        };

        executionLog.push({
          task_id: taskId,
          step: "refill_confirmed",
          status: "completed",
          result,
          timestamp: new Date().toISOString()
        });

        break;
      }

      case 'health_reminder': {
        executionLog.push({
          task_id: taskId,
          step: "creating_reminder",
          status: "started",
          timestamp: new Date().toISOString()
        });

        await supabase
          .from('agent_task_queue')
          .update({ completion_percentage: 50 })
          .eq('id', taskId);

        result = {
          reminder_created: true,
          reminder_details: {
            title: task.task_title,
            description: task.task_description,
            scheduled_for: task.scheduled_for || new Date().toISOString(),
            notification_sent: true
          }
        };

        executionLog.push({
          task_id: taskId,
          step: "reminder_set",
          status: "completed",
          result,
          timestamp: new Date().toISOString()
        });

        break;
      }

      case 'lab_results': {
        executionLog.push({
          task_id: taskId,
          step: "checking_lab_portal",
          status: "started",
          timestamp: new Date().toISOString()
        });

        await supabase
          .from('agent_task_queue')
          .update({ completion_percentage: 50 })
          .eq('id', taskId);

        result = {
          lab_check_complete: true,
          new_results_available: false,
          last_checked: new Date().toISOString()
        };

        executionLog.push({
          task_id: taskId,
          step: "lab_check_complete",
          status: "completed",
          result,
          timestamp: new Date().toISOString()
        });

        break;
      }

      default: {
        executionLog.push({
          task_id: taskId,
          step: "processing_custom_task",
          status: "completed",
          result: { message: `Task ${task.task_type} processed` },
          timestamp: new Date().toISOString()
        });

        result = {
          task_processed: true,
          task_type: task.task_type
        };
      }
    }

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
