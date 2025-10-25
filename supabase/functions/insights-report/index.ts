import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface ErrorResponse {
  code: string;
  message: string;
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function errorResponse(code: string, message: string, status = 500): Response {
  const body: ErrorResponse = { code, message };
  return jsonResponse(body, status);
}

function periodWindow(period: string, start?: string, end?: string) {
  if (period === "custom" && start && end) return { start, end };
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const d = new Date(today);
  if (period === "30d") d.setDate(d.getDate() - 29);
  else d.setDate(d.getDate() - 6); // 7d default
  return {
    start: d.toISOString().slice(0, 10),
    end: today.toISOString().slice(0, 10)
  };
}

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return errorResponse("METHOD_NOT_ALLOWED", "Only POST requests are allowed", 405);
  }

  try {
    // 1. Setup Supabase client with JWT forwarding
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return errorResponse("AUTH_MISSING", "Missing Authorization header", 401);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");

    if (!supabaseUrl || !supabaseAnonKey) {
      return errorResponse("CONFIG_MISSING", "Supabase configuration missing");
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // 2. Verify user authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return errorResponse("AUTH_FAILED", "Invalid or expired session", 401);
    }
    const userId = user.id;

    // 3. Parse request body
    const body = await req.json().catch(() => ({}));
    const { engramId, period = "7d", start_at, end_at } = body;

    if (!engramId) {
      return errorResponse("BAD_REQUEST", "Missing engramId", 400);
    }

    // 4. Verify ownership of engram
    const { data: ownedEngram } = await supabase
      .from("engrams")
      .select("id")
      .eq("id", engramId)
      .eq("user_id", userId)
      .limit(1);

    if (!ownedEngram?.length) {
      return errorResponse("FORBIDDEN", "Engram not owned by user", 403);
    }

    // 5. Calculate time window
    const { start, end } = periodWindow(period, start_at, end_at);

    // 6. Compute KPIs and findings (best-effort from available tables)
    const kpis: Record<string, unknown> = {};
    const findings: Array<{ type: string; text: string }> = [];

    // Task stats (from agent_task_queue)
    try {
      const { data: tasks } = await supabase
        .from("agent_task_queue")
        .select("status, created_at")
        .eq("user_id", userId)
        .eq("engram_id", engramId)
        .gte("created_at", `${start}T00:00:00Z`)
        .lte("created_at", `${end}T23:59:59Z`);

      if (tasks) {
        const total = tasks.length;
        const completed = tasks.filter(t => t.status === "completed").length;
        const pending = tasks.filter(t => t.status === "pending").length;
        const inProgress = tasks.filter(t => t.status === "in_progress").length;
        
        kpis["tasks_total"] = total;
        kpis["tasks_completed"] = completed;
        kpis["tasks_pending"] = pending;
        kpis["tasks_in_progress"] = inProgress;

        if (total >= 3 && completed / Math.max(total, 1) >= 0.66) {
          findings.push({ type: "win", text: "Most tasks completed this period." });
        }
        if (pending >= 5) {
          findings.push({ type: "attention", text: "Several pending tasks need attention." });
        }
      }
    } catch (err) {
      console.warn("Could not fetch tasks:", err);
    }

    // Daily check-ins (from user_daily_progress)
    try {
      const { data: progress } = await supabase
        .from("user_daily_progress")
        .select("day")
        .eq("user_id", userId)
        .gte("day", start)
        .lte("day", end);

      if (progress) {
        const days = new Set(progress.map(p => p.day));
        kpis["checkin_days"] = days.size;
        
        if (days.size >= 5) {
          findings.push({ type: "consistency", text: "Strong check-in consistency." });
        } else if (days.size <= 2) {
          findings.push({ type: "engagement", text: "Low check-in frequency. Consider daily engagement." });
        }
      }
    } catch (err) {
      console.warn("Could not fetch daily progress:", err);
    }

    // Health metrics (appointments, medications, health goals)
    try {
      const { data: appointments } = await supabase
        .from("appointments")
        .select("id, status")
        .eq("user_id", userId)
        .gte("created_at", `${start}T00:00:00Z`)
        .lte("created_at", `${end}T23:59:59Z`);

      if (appointments) {
        kpis["appointments_scheduled"] = appointments.length;
        const completed = appointments.filter(a => a.status === "completed").length;
        if (completed > 0) {
          findings.push({ type: "health", text: `${completed} appointment${completed > 1 ? 's' : ''} completed.` });
        }
      }
    } catch (err) {
      console.warn("Could not fetch appointments:", err);
    }

    try {
      const { data: medications } = await supabase
        .from("prescriptions")
        .select("id, is_active")
        .eq("user_id", userId)
        .eq("is_active", true);

      if (medications) {
        kpis["active_medications"] = medications.length;
      }
    } catch (err) {
      console.warn("Could not fetch medications:", err);
    }

    try {
      const { data: goals } = await supabase
        .from("health_goals")
        .select("id, status")
        .eq("user_id", userId)
        .gte("created_at", `${start}T00:00:00Z`)
        .lte("created_at", `${end}T23:59:59Z`);

      if (goals) {
        const achieved = goals.filter(g => g.status === "achieved").length;
        if (achieved > 0) {
          kpis["goals_achieved"] = achieved;
          findings.push({ type: "achievement", text: `${achieved} health goal${achieved > 1 ? 's' : ''} achieved!` });
        }
      }
    } catch (err) {
      console.warn("Could not fetch health goals:", err);
    }

    // Agent memories (engagement with AI)
    try {
      const { data: memories } = await supabase
        .from("agent_memories")
        .select("id, memory_type")
        .eq("user_id", userId)
        .gte("created_at", `${start}T00:00:00Z`)
        .lte("created_at", `${end}T23:59:59Z`);

      if (memories) {
        kpis["ai_interactions"] = memories.length;
        if (memories.length >= 10) {
          findings.push({ type: "engagement", text: "High AI engagement this period." });
        }
      }
    } catch (err) {
      console.warn("Could not fetch agent memories:", err);
    }

    // 7. Optional: Generate narrative from OpenAI
    let narrative: string | undefined;
    const openaiKey = Deno.env.get("OPENAI_API_KEY");
    
    if (openaiKey && Object.keys(kpis).length > 0) {
      try {
        const prompt = `Write a short, compassionate weekly health insight for the user based on these metrics.

KPIs: ${JSON.stringify(kpis)}
Findings: ${JSON.stringify(findings)}

Constraints:
- No medical diagnosis
- Offer 1-2 specific, actionable, low-risk suggestions
- Be warm and encouraging
- Keep it under 150 words
- Focus on positive reinforcement and gentle guidance`;

        const response = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${openaiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "gpt-4o-mini",
            messages: [
              { role: "system", content: "You are St. Raphael, a compassionate health companion. Provide brief, encouraging insights without medical diagnosis." },
              { role: "user", content: prompt }
            ],
            temperature: 0.7,
            max_tokens: 200,
          }),
        });

        if (response.ok) {
          const data = await response.json();
          narrative = data?.choices?.[0]?.message?.content ?? undefined;
        }
      } catch (err) {
        console.warn("Could not generate narrative:", err);
      }
    }

    // 8. Insert report
    const { data: report, error: insertError } = await supabase
      .from("insight_reports")
      .insert({
        user_id: userId,
        engram_id: engramId,
        period,
        start_at: start,
        end_at: end,
        kpis,
        findings,
        narrative
      })
      .select()
      .single();

    if (insertError) {
      console.error("Insert error:", insertError);
      return errorResponse("DB_ERROR", insertError.message, 400);
    }

    return jsonResponse({ report });

  } catch (error: any) {
    console.error("Unhandled error in insights-report:", error);
    const message = error instanceof Error ? error.message : String(error);
    return errorResponse("SERVER_ERROR", message);
  }
});
