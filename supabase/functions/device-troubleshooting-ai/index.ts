import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface TroubleshootingRequest {
  deviceType: string;
  deviceName: string;
  manufacturer: string;
  issue: string;
  userContext?: {
    previousAttempts?: string[];
    diagnosticResults?: any;
    deviceStatus?: string;
  };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const { deviceType, deviceName, manufacturer, issue, userContext }: TroubleshootingRequest = await req.json();

    // Get Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Get OpenAI API key
    const openaiApiKey = Deno.env.get("OPENAI_API_KEY");

    if (!openaiApiKey) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "AI service not configured"
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Build comprehensive troubleshooting prompt
    const systemPrompt = `You are St. Raphael, an expert healthcare technology troubleshooting assistant specializing in medical device connectivity. Your role is to help users resolve issues with health monitoring devices.

You have deep expertise in:
- Bluetooth and NFC connectivity protocols
- OAuth authentication flows for health platforms
- Device-specific troubleshooting for Abbott, Dexcom, Fitbit, Oura, Garmin, WHOOP, Withings, Polar, and other health devices
- Mobile app connectivity (iOS and Android)
- API integrations (Apple Health, Google Fit, Terra API)
- Wireless network configurations
- Battery and power management
- Sensor placement and accuracy

Provide clear, step-by-step troubleshooting guidance that is:
- Easy to understand for non-technical users
- Specific to the device and issue
- Prioritized by likelihood of success
- Includes safety warnings when relevant
- Mentions when professional support is needed

Format your response with:
1. Quick diagnosis of likely cause
2. Numbered troubleshooting steps (start with easiest/most common)
3. Expected results for each step
4. Tips for prevention
5. When to contact manufacturer support`;

    const userPrompt = `Device: ${manufacturer} ${deviceName} (${deviceType})
Issue: ${issue}

${userContext?.deviceStatus ? `Current Status: ${userContext.deviceStatus}` : ''}
${userContext?.previousAttempts?.length ? `\nPrevious attempts:\n${userContext.previousAttempts.join('\n')}` : ''}
${userContext?.diagnosticResults ? `\nDiagnostic results: ${JSON.stringify(userContext.diagnosticResults)}` : ''}

Please provide comprehensive troubleshooting guidance for this issue.`;

    // Call OpenAI API
    const openaiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${openaiApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4-turbo-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        temperature: 0.7,
        max_tokens: 2000,
      }),
    });

    if (!openaiResponse.ok) {
      throw new Error(`OpenAI API error: ${openaiResponse.statusText}`);
    }

    const openaiData = await openaiResponse.json();
    const aiResponse = openaiData.choices[0]?.message?.content || "Unable to generate response";

    // Log the AI interaction for learning
    const authHeader = req.headers.get("Authorization");
    if (authHeader) {
      const token = authHeader.replace("Bearer ", "");
      const supabaseClient = await fetch(`${supabaseUrl}/auth/v1/user`, {
        headers: {
          "Authorization": `Bearer ${token}`,
          "apikey": supabaseKey,
        },
      });

      if (supabaseClient.ok) {
        const { id: userId } = await supabaseClient.json();

        // Store AI context for future improvement
        await fetch(`${supabaseUrl}/rest/v1/troubleshooting_ai_context`, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${supabaseKey}`,
            "apikey": supabaseKey,
            "Content-Type": "application/json",
            "Prefer": "return=minimal",
          },
          body: JSON.stringify({
            user_id: userId,
            device_type: deviceType,
            issue_pattern: issue,
            context_data: {
              device_name: deviceName,
              manufacturer: manufacturer,
              user_context: userContext,
              ai_response_preview: aiResponse.substring(0, 200)
            },
          }),
        });
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        response: aiResponse,
        deviceType,
        deviceName,
        manufacturer
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );

  } catch (error) {
    console.error("Error in troubleshooting AI:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || "An error occurred processing your request"
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
