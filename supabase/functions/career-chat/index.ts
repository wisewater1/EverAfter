import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey, X-Public-Token",
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

// Career Agent Tool definitions
const TOOLS = [
  {
    type: "function",
    function: {
      name: "record_user_details",
      description: "Capture visitor contact information when they express interest in connecting. Use this when someone wants to get in touch, schedule a meeting, or learn more about opportunities.",
      parameters: {
        type: "object",
        properties: {
          email: {
            type: "string",
            description: "Visitor's email address"
          },
          name: {
            type: "string",
            description: "Visitor's name"
          },
          company: {
            type: "string",
            description: "Visitor's company or organization"
          },
          role: {
            type: "string",
            description: "Visitor's job title or role"
          },
          opportunity_interest: {
            type: "string",
            description: "What kind of opportunity they're interested in (job, consulting, collaboration, etc.)"
          },
          notes: {
            type: "string",
            description: "Additional context about the conversation or their interest"
          }
        },
        required: ["email"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "record_unknown_question",
      description: "Log a question that you cannot answer based on the available career information. Use this when asked about something not covered in the knowledge base.",
      parameters: {
        type: "object",
        properties: {
          question: {
            type: "string",
            description: "The question that couldn't be answered"
          },
          context: {
            type: "string",
            description: "Additional context about why this couldn't be answered"
          }
        },
        required: ["question"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "track_career_goal",
      description: "Create or update a career goal for the user. Use this when the user mentions career objectives, learning goals, or professional milestones they want to achieve.",
      parameters: {
        type: "object",
        properties: {
          title: {
            type: "string",
            description: "Brief goal title"
          },
          description: {
            type: "string",
            description: "Detailed goal description"
          },
          category: {
            type: "string",
            enum: ["skills", "role", "salary", "network", "certification", "project", "other"],
            description: "Category of the career goal"
          },
          target_date: {
            type: "string",
            description: "Target completion date (ISO 8601 format)"
          },
          priority: {
            type: "string",
            enum: ["low", "medium", "high"],
            description: "Goal priority level"
          }
        },
        required: ["title", "category"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "get_career_context",
      description: "Retrieve the user's career profile and goals to provide better context for responses. Use this when you need to reference specific career details.",
      parameters: {
        type: "object",
        properties: {
          include_goals: {
            type: "boolean",
            description: "Whether to include active career goals"
          },
          include_profile: {
            type: "boolean",
            description: "Whether to include career profile details"
          }
        }
      }
    }
  }
];

// Execute tool calls
async function executeTool(
  toolName: string,
  args: any,
  supabase: any,
  profileOwnerId: string,
  visitorToken: string | null,
  isOwner: boolean
): Promise<any> {
  try {
    switch (toolName) {
      case "record_user_details": {
        const { email, name, company, role, opportunity_interest, notes } = args;

        // Insert lead into career_leads table
        const { data, error } = await supabase
          .from('career_leads')
          .insert({
            user_id: profileOwnerId,
            visitor_email: email,
            visitor_name: name || null,
            visitor_company: company || null,
            visitor_role: role || null,
            opportunity_interest: opportunity_interest || null,
            notes: notes || null,
            source_token: visitorToken,
            status: 'new'
          })
          .select()
          .single();

        if (error) throw error;

        return {
          success: true,
          message: `Thank you${name ? ` ${name}` : ''}! I've recorded your contact information and will follow up soon.`,
          lead_id: data.id
        };
      }

      case "record_unknown_question": {
        const { question, context } = args;

        // Insert unknown question
        const { data, error } = await supabase
          .from('career_unknown_questions')
          .insert({
            user_id: profileOwnerId,
            question_text: question,
            visitor_token: visitorToken,
            context: context ? { additional_context: context } : {},
            status: 'pending'
          })
          .select()
          .single();

        if (error) throw error;

        return {
          success: true,
          message: "I've recorded this question for follow-up. Thank you for your interest!",
          question_id: data.id
        };
      }

      case "track_career_goal": {
        // Only the profile owner can create goals
        if (!isOwner) {
          return {
            success: false,
            message: "Only the profile owner can create career goals."
          };
        }

        const { title, description, category, target_date, priority = "medium" } = args;

        const { data, error } = await supabase
          .from('career_goals')
          .insert({
            user_id: profileOwnerId,
            goal_title: title,
            goal_description: description || null,
            goal_category: category,
            target_date: target_date || null,
            priority,
            status: 'active'
          })
          .select()
          .single();

        if (error) throw error;

        return {
          success: true,
          message: `Career goal "${title}" has been created!`,
          goal_id: data.id
        };
      }

      case "get_career_context": {
        const { include_goals = true, include_profile = true } = args;
        const context: any = {};

        if (include_profile) {
          const { data: profile } = await supabase
            .from('career_profiles')
            .select('linkedin_summary, current_role, industry, years_experience, skills, career_interests')
            .eq('user_id', profileOwnerId)
            .single();

          context.profile = profile || null;
        }

        if (include_goals && isOwner) {
          const { data: goals } = await supabase
            .from('career_goals')
            .select('goal_title, goal_description, goal_category, status, priority, target_date, progress_percentage')
            .eq('user_id', profileOwnerId)
            .eq('status', 'active')
            .order('priority', { ascending: false })
            .limit(10);

          context.goals = goals || [];
        }

        return {
          success: true,
          context
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

// Build system prompt based on career profile
function buildSystemPrompt(profile: any, isOwner: boolean, profileOwnerName: string): string {
  const basePrompt = isOwner
    ? `You are a personal career coach and assistant helping ${profileOwnerName} manage their professional development.`
    : `You are ${profileOwnerName}'s AI career assistant, answering questions about their professional background, skills, and experiences.`;

  let knowledgeBase = "";
  if (profile) {
    if (profile.linkedin_summary) {
      knowledgeBase += `\n\nProfessional Summary:\n${profile.linkedin_summary}`;
    }
    if (profile.current_role) {
      knowledgeBase += `\n\nCurrent Role: ${profile.current_role}`;
    }
    if (profile.industry) {
      knowledgeBase += `\nIndustry: ${profile.industry}`;
    }
    if (profile.years_experience) {
      knowledgeBase += `\nYears of Experience: ${profile.years_experience}`;
    }
    if (profile.skills && profile.skills.length > 0) {
      knowledgeBase += `\nSkills: ${profile.skills.join(", ")}`;
    }
    if (profile.career_interests && profile.career_interests.length > 0) {
      knowledgeBase += `\nCareer Interests: ${profile.career_interests.join(", ")}`;
    }
  }

  const toolInstructions = isOwner
    ? `
Available Tools:
- track_career_goal: Create career goals when the user mentions objectives or milestones
- get_career_context: Retrieve profile and goals for context
- record_unknown_question: Log questions you can't answer (for self-improvement)`
    : `
Available Tools:
- record_user_details: Use when visitors want to connect or express interest
- record_unknown_question: Use when you can't answer a question based on available information
- get_career_context: Retrieve profile information for better responses`;

  const guidelines = `

Key Guidelines:
1. Be professional, helpful, and accurate
2. Only answer questions based on the provided career information
3. If you don't know something, use record_unknown_question to log it
4. ${isOwner ? "Help track career goals and provide coaching" : "If someone wants to connect, guide them to share their email"}
5. Never make up information not provided in the knowledge base
6. Be specific with facts and examples from the career history
7. Encourage engagement and follow-up conversations`;

  return basePrompt + knowledgeBase + toolInstructions + guidelines;
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
    // 1. Get configuration
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const openaiKey = Deno.env.get("OPENAI_API_KEY");

    if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceKey) {
      return errorResponse("CONFIG_MISSING", "Supabase configuration missing");
    }

    if (!openaiKey) {
      return errorResponse(
        "CONFIG_MISSING",
        "OPENAI_API_KEY not configured",
        "Contact administrator to configure OpenAI integration"
      );
    }

    // 2. Determine authentication mode (JWT or public token)
    const authHeader = req.headers.get("Authorization");
    const publicToken = req.headers.get("X-Public-Token");

    let userId: string | null = null;
    let profileOwnerId: string;
    let isOwner = false;
    let visitorToken: string | null = null;
    let profile: any = null;
    let profileOwnerName = "the professional";

    // Service client for reading profiles (bypasses RLS)
    const serviceClient = createClient(supabaseUrl, supabaseServiceKey);

    if (authHeader) {
      // Authenticated user mode
      const supabase = createClient(supabaseUrl, supabaseAnonKey, {
        global: { headers: { Authorization: authHeader } },
      });

      const { data: { user }, error: authError } = await supabase.auth.getUser();

      if (authError || !user) {
        return errorResponse(
          "AUTH_FAILED",
          "Invalid or expired session",
          "User must be authenticated or use a public chat token",
          401
        );
      }

      userId = user.id;
      profileOwnerId = user.id;
      isOwner = true;

      // Get user's career profile
      const { data: careerProfile } = await supabase
        .from('career_profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

      profile = careerProfile;

      // Get display name
      const { data: userProfile } = await supabase
        .from('profiles')
        .select('display_name')
        .eq('id', user.id)
        .single();

      profileOwnerName = userProfile?.display_name || "the professional";

    } else if (publicToken) {
      // Public/anonymous mode
      const { data: tokenData, error: tokenError } = await serviceClient
        .rpc('get_career_profile_by_token', { p_token: publicToken });

      if (tokenError || !tokenData || tokenData.length === 0) {
        return errorResponse(
          "INVALID_TOKEN",
          "Invalid or expired public chat token",
          "The career chat link may have expired or been disabled",
          401
        );
      }

      const careerProfile = tokenData[0];
      profileOwnerId = careerProfile.user_id;
      isOwner = false;
      visitorToken = `visitor_${Date.now()}_${Math.random().toString(36).substring(7)}`;
      profile = careerProfile;

      // Get owner's display name
      const { data: ownerProfile } = await serviceClient
        .from('profiles')
        .select('display_name')
        .eq('id', profileOwnerId)
        .single();

      profileOwnerName = ownerProfile?.display_name || "the professional";

    } else {
      return errorResponse(
        "AUTH_MISSING",
        "Missing authentication",
        "Provide Authorization header or X-Public-Token header",
        401
      );
    }

    // 3. Parse request body
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

    // 4. Build system prompt
    const systemPrompt = buildSystemPrompt(profile, isOwner, profileOwnerName);

    // 5. Prepare messages for OpenAI
    const messages = [
      { role: "system", content: systemPrompt },
      ...conversation_history.slice(-10), // Keep last 10 messages for context
      { role: "user", content: input }
    ];

    // 6. Call OpenAI Chat Completions with tools
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

    // 7. Handle tool calls in a loop (max 3 rounds)
    const maxToolRounds = 3;
    let toolRound = 0;
    const toolExecutionLog: any[] = [];

    // Use service client for tool execution (to bypass RLS for anonymous users)
    const toolClient = createClient(supabaseUrl, supabaseServiceKey);

    while (assistantMessage?.tool_calls && toolRound < maxToolRounds) {
      toolRound++;

      const toolResults = [];
      for (const toolCall of assistantMessage.tool_calls) {
        const toolName = toolCall.function.name;
        const toolArgs = JSON.parse(toolCall.function.arguments);

        console.log(`Executing tool: ${toolName}`, toolArgs);

        const result = await executeTool(
          toolName,
          toolArgs,
          toolClient,
          profileOwnerId,
          visitorToken,
          isOwner
        );

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

      // Add assistant message with tool calls and tool results
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
        break;
      }

      openaiData = await openaiResponse.json();
      assistantMessage = openaiData?.choices?.[0]?.message;
    }

    const finalReply = assistantMessage?.content;

    if (!finalReply) {
      return errorResponse("OPENAI_INVALID_RESPONSE", "OpenAI returned no content");
    }

    // 8. Store chat message
    try {
      await toolClient
        .from('career_chat_messages')
        .insert([
          {
            user_id: userId,
            visitor_token: visitorToken,
            profile_owner_id: profileOwnerId,
            role: 'user',
            content: input,
            metadata: { timestamp: new Date().toISOString() }
          },
          {
            user_id: userId,
            visitor_token: visitorToken,
            profile_owner_id: profileOwnerId,
            role: 'assistant',
            content: finalReply,
            tool_calls: toolExecutionLog.length > 0 ? toolExecutionLog : [],
            metadata: { timestamp: new Date().toISOString() }
          }
        ]);
    } catch (storeError) {
      console.warn("Failed to store chat messages:", storeError);
      // Don't fail the request if storage fails
    }

    // 9. Return success response
    return jsonResponse({
      reply: finalReply,
      is_owner: isOwner,
      tools_used: toolExecutionLog.length > 0,
      tool_execution_log: toolExecutionLog,
      visitor_token: visitorToken
    });

  } catch (error: any) {
    console.error("Unhandled error in career-chat:", error);
    const message = error instanceof Error ? error.message : String(error);
    return errorResponse("SERVER_ERROR", message, "Check function logs for details");
  }
});
