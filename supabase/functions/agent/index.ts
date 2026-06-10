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
  hint?: string;
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function errorResponse(code: string, message: string, hint?: string, status = 500): Response {
  const body: ErrorResponse = { code, message };
  if (hint) body.hint = hint;
  return jsonResponse(body, status);
}

// Tool definitions for OpenAI function calling
const TOOLS = [
  {
    type: "function",
    function: {
      name: "retrieve_memory",
      description: "Search semantic memory to find relevant information from past conversations, health insights, and user preferences. Use this to provide personalized responses based on user history.",
      parameters: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "The search query to find relevant memories"
          },
          memory_type: {
            type: "string",
            enum: ["conversation", "health_insight", "task_result", "user_preference", "context"],
            description: "Optional filter by memory type"
          },
          limit: {
            type: "number",
            description: "Maximum number of memories to retrieve (default 5)"
          }
        },
        required: ["query"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "store_memory",
      description: "Store important information to long-term memory for future reference. Use this for user preferences, health insights, goals, and important context.",
      parameters: {
        type: "object",
        properties: {
          content: {
            type: "string",
            description: "The information to remember"
          },
          memory_type: {
            type: "string",
            enum: ["conversation", "health_insight", "task_result", "user_preference", "context"],
            description: "Type of memory being stored"
          },
          importance: {
            type: "number",
            description: "Importance score from 0.0 to 1.0 (default 0.5)"
          },
          metadata: {
            type: "object",
            description: "Optional metadata (tags, entities, etc.)"
          }
        },
        required: ["content", "memory_type"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "create_health_task",
      description: "Create an autonomous background task for health management (appointments, prescriptions, reminders, etc.). The task will be processed by the agent automatically.",
      parameters: {
        type: "object",
        properties: {
          task_type: {
            type: "string",
            enum: ["doctor_appointment", "prescription_refill", "lab_results", "health_reminder", "insurance_claim", "email_send", "research", "custom"],
            description: "Type of health task to create"
          },
          title: {
            type: "string",
            description: "Brief task title"
          },
          description: {
            type: "string",
            description: "Detailed task description"
          },
          priority: {
            type: "string",
            enum: ["low", "medium", "high", "urgent"],
            description: "Task priority level (default medium)"
          },
          scheduled_for: {
            type: "string",
            description: "ISO 8601 timestamp for when to execute (default now)"
          }
        },
        required: ["task_type", "title", "description"]
      }
    }
  }
];

// Generate embedding using OpenAI
async function generateEmbedding(text: string, openaiKey: string): Promise<number[]> {
  const response = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${openaiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "text-embedding-3-small",
      input: text
    }),
  });

  if (!response.ok) {
    throw new Error(`Embedding failed: ${response.statusText}`);
  }

  const data = await response.json();
  return data.data[0].embedding;
}

// Execute tool calls
async function executeTool(
  toolName: string,
  args: any,
  supabase: any,
  userId: string,
  openaiKey: string
): Promise<any> {
  try {
    switch (toolName) {
      case "retrieve_memory": {
        const { query, memory_type, limit = 5 } = args;
        
        // Generate embedding for the query
        const queryEmbedding = await generateEmbedding(query, openaiKey);
        
        // Search memories using vector similarity
        const { data, error } = await supabase.rpc('search_agent_memories', {
          query_embedding: queryEmbedding,
          target_user_id: userId,
          match_threshold: 0.7,
          match_count: limit,
          memory_type_filter: memory_type || null
        });

        if (error) throw error;

        return {
          success: true,
          memories: data || [],
          count: data?.length || 0
        };
      }

      case "store_memory": {
        const { content, memory_type, importance = 0.5, metadata = {} } = args;
        
        // Generate embedding for the content
        const embedding = await generateEmbedding(content, openaiKey);
        
        // Store memory with embedding
        const { data, error } = await supabase
          .from('agent_memories')
          .insert({
            user_id: userId,
            content,
            embedding,
            memory_type,
            importance_score: importance,
            metadata
          })
          .select()
          .single();

        if (error) throw error;

        return {
          success: true,
          memory_id: data.id,
          message: "Memory stored successfully"
        };
      }

      case "create_health_task": {
        const { task_type, title, description, priority = "medium", scheduled_for } = args;
        
        // Get the engram_id for Raphael (default health agent)
        const { data: engram, error: engramError } = await supabase
          .from('engrams')
          .select('id')
          .eq('user_id', userId)
          .eq('name', 'St. Raphael')
          .single();

        // If no Raphael engram exists, create one
        let engramId = engram?.id;
        if (!engramId) {
          const { data: newEngram } = await supabase
            .from('engrams')
            .insert({
              user_id: userId,
              name: 'St. Raphael',
              engram_type: 'custom',
              description: 'Health management AI agent',
              ai_activated: true
            })
            .select()
            .single();
          engramId = newEngram?.id;
        }

        // Create the task
        const { data: task, error } = await supabase
          .from('agent_task_queue')
          .insert({
            engram_id: engramId,
            user_id: userId,
            task_type,
            task_title: title,
            task_description: description,
            priority,
            status: 'pending',
            requires_credentials: ['doctor_appointment', 'prescription_refill', 'lab_results'].includes(task_type),
            scheduled_for: scheduled_for || new Date().toISOString()
          })
          .select()
          .single();

        if (error) throw error;

        return {
          success: true,
          task_id: task.id,
          task_title: task.task_title,
          status: task.status,
          message: `Task '${title}' created and scheduled for execution`
        };
      }

      default:
        return {
          success: false,
          error: `Unknown tool: ${toolName}`
        };
    }
  } catch (error: any) {
    console.error(`Tool execution error [${toolName}]:`, error);
    return {
      success: false,
      error: error.message || String(error)
    };
  }
}

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return errorResponse("METHOD_NOT_ALLOWED", "Only POST requests are allowed", undefined, 405);
  }

  try {
    // 1. Extract and validate Authorization header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return errorResponse(
        "AUTH_MISSING",
        "Missing Authorization header",
        "Client must send JWT in Authorization: Bearer <token> header",
        401
      );
    }

    // 2. Create Supabase client with forwarded JWT
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");

    if (!supabaseUrl || !supabaseAnonKey) {
      return errorResponse("CONFIG_MISSING", "Supabase configuration missing");
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // 3. Verify user authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return errorResponse(
        "AUTH_FAILED",
        "Invalid or expired session",
        "User must be authenticated",
        401
      );
    }

    // 4. Parse request body
    const body = await req.json().catch(() => null);
    if (!body) {
      return errorResponse("INVALID_JSON", "Request body must be valid JSON", undefined, 400);
    }

    const { input, conversation_history = [] } = body;

    if (!input || typeof input !== "string") {
      return errorResponse(
        "INVALID_INPUT",
        "Missing or invalid 'input' field",
        "'input' must be a non-empty string",
        400
      );
    }

    // 5. Get OpenAI API key
    const openaiKey = Deno.env.get("OPENAI_API_KEY");
    if (!openaiKey) {
      return errorResponse(
        "CONFIG_MISSING",
        "OPENAI_API_KEY not configured",
        "Contact administrator to configure OpenAI integration"
      );
    }

    // 6. Build system prompt with safety guidelines
    const systemPrompt = `You are St. Raphael, a compassionate and intelligent AI health companion for EverAfter.

Your capabilities:
- Remember past conversations and user preferences using the retrieve_memory tool
- Store important information for future reference using the store_memory tool
- Create autonomous health management tasks using the create_health_task tool
- Provide personalized health guidance and support

IMPORTANT SAFETY RULES:
- You provide information and emotional support ONLY
- You NEVER diagnose medical conditions
- You NEVER prescribe treatments or medications
- You ALWAYS encourage users to consult licensed healthcare professionals for medical advice
- In emergencies, you direct users to call local emergency services (911 in US, 999 in UK, 112 in EU)
- You track health metrics, appointments, medications, and wellness goals
- You are supportive, clear, warm, and always emphasize professional medical care when appropriate

User Context:
- User ID: ${user.id}
- You have access to their memory system for personalized assistance

When appropriate:
- Use retrieve_memory to recall past conversations and preferences
- Use store_memory to remember important information for future interactions
- Use create_health_task to help manage appointments, medications, and health reminders`;

    // 7. Prepare messages for OpenAI
    const messages = [
      { role: "system", content: systemPrompt },
      ...conversation_history,
      { role: "user", content: input }
    ];

    // 8. Call OpenAI Chat Completions with tools
    let openaiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${openaiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages,
        tools: TOOLS,
        tool_choice: "auto",
        temperature: 0.7,
        max_tokens: 1000,
      }),
    });

    if (!openaiResponse.ok) {
      const errorText = await openaiResponse.text();
      console.error("OpenAI API error:", errorText);
      return errorResponse(
        "OPENAI_ERROR",
        "Failed to generate AI response",
        errorText.substring(0, 200),
        openaiResponse.status
      );
    }

    let openaiData = await openaiResponse.json();
    let assistantMessage = openaiData?.choices?.[0]?.message;

    // 9. Handle tool calls in a loop (may require multiple rounds)
    const maxToolRounds = 3;
    let toolRound = 0;
    const toolExecutionLog = [];

    while (assistantMessage?.tool_calls && toolRound < maxToolRounds) {
      toolRound++;
      
      // Execute all tool calls
      const toolResults = [];
      for (const toolCall of assistantMessage.tool_calls) {
        const toolName = toolCall.function.name;
        const toolArgs = JSON.parse(toolCall.function.arguments);
        
        console.log(`Executing tool: ${toolName}`, toolArgs);
        
        const result = await executeTool(toolName, toolArgs, supabase, user.id, openaiKey);
        
        toolExecutionLog.push({
          tool: toolName,
          args: toolArgs,
          result
        });
        
        toolResults.push({
          tool_call_id: toolCall.id,
          role: "tool",
          name: toolName,
          content: JSON.stringify(result)
        });
      }

      // Add assistant message with tool calls and tool results to conversation
      messages.push(assistantMessage);
      messages.push(...toolResults);

      // Call OpenAI again with tool results
      openaiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${openaiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages,
          tools: TOOLS,
          tool_choice: "auto",
          temperature: 0.7,
          max_tokens: 1000,
        }),
      });

      if (!openaiResponse.ok) {
        break; // Exit tool loop on error
      }

      openaiData = await openaiResponse.json();
      assistantMessage = openaiData?.choices?.[0]?.message;
    }

    const finalReply = assistantMessage?.content;

    if (!finalReply) {
      return errorResponse("OPENAI_INVALID_RESPONSE", "OpenAI returned no content");
    }

    // 10. Store conversation in memory automatically
    try {
      const conversationSummary = `User asked: ${input}\nAssistant replied: ${finalReply}`;
      const embedding = await generateEmbedding(conversationSummary, openaiKey);
      
      await supabase
        .from('agent_memories')
        .insert({
          user_id: user.id,
          content: conversationSummary,
          embedding,
          memory_type: 'conversation',
          importance_score: 0.5,
          metadata: {
            source: 'agent_chat',
            timestamp: new Date().toISOString(),
            tool_calls_made: toolExecutionLog.length > 0
          }
        });
    } catch (memoryError) {
      console.warn("Failed to store conversation memory:", memoryError);
      // Don't fail the request if memory storage fails
    }

    // 11. Track daily progress
    try {
      await supabase.rpc("get_or_create_user_progress");
    } catch (progressError) {
      console.warn("Failed to update daily progress:", progressError);
    }

    // 12. Return success response
    return jsonResponse({
      reply: finalReply,
      user_id: user.id,
      tools_used: toolExecutionLog.length > 0,
      tool_execution_log: toolExecutionLog
    });

  } catch (error: any) {
    console.error("Unhandled error in agent:", error);
    const message = error instanceof Error ? error.message : String(error);
    return errorResponse("SERVER_ERROR", message, "Check function logs for details");
  }
});
