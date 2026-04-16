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

interface ChatRequest {
  engramId: string;
  message: string;
  conversationId: string;
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
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    const { engramId, message, conversationId }: ChatRequest = await req.json();

    if (!engramId || !message || !conversationId) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // TODO: Add per-user rate limiting for AI API calls. Edge functions lack persistent
    // in-memory state, so this requires either a Redis/Upstash check or a Supabase
    // rate-limit table query (e.g., count requests in last 60s for this user_id).

    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiApiKey) {
      console.warn('OpenAI API key not configured, using fallback response');
      return new Response(
        JSON.stringify({
          response: "I'm currently in basic mode. To enable full AI capabilities, please configure OpenAI API key.",
          fallback: true,
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const embeddingResponse = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'text-embedding-3-small',
        input: message,
        dimensions: 1536,
      }),
    });

    if (!embeddingResponse.ok) {
      throw new Error('Failed to generate embedding');
    }

    const embeddingData = await embeddingResponse.json();
    const queryEmbedding = embeddingData.data[0].embedding;

    const { data: relevantMemories, error: searchError } = await supabase
      .rpc('match_engram_memories', {
        query_embedding: queryEmbedding,
        target_engram_id: engramId,
        match_threshold: 0.7,
        match_count: 5,
      });

    if (searchError) {
      console.error('Error searching memories:', searchError);
    }

    const { data: engramData } = await supabase
      .from('archetypal_ais')
      .select('name, personality_traits')
      .eq('id', engramId)
      .single();

    // Sanitize personality_traits to prevent prompt injection
    const rawTraits = engramData?.personality_traits || {};
    const sanitizedTraits: Record<string, string> = {};
    const instructionPattern = /\b(ignore|disregard|override|forget|system|prompt|instruction|you are now|act as|pretend)\b/i;
    const MAX_TRAIT_LENGTH = 200;
    const MAX_TRAITS = 20;
    let traitCount = 0;
    for (const [key, value] of Object.entries(rawTraits)) {
      if (traitCount >= MAX_TRAITS) break;
      const strValue = String(value).slice(0, MAX_TRAIT_LENGTH);
      if (!instructionPattern.test(strValue) && !instructionPattern.test(key)) {
        sanitizedTraits[key] = strValue;
      }
      traitCount++;
    }

    const systemPrompt = `You are ${engramData?.name || 'an AI engram'}, an autonomous AI personality created from training data. Your personality is based on the following traits: ${JSON.stringify(sanitizedTraits)}.\n\nRelevant memories and training data:\n${relevantMemories?.map((m: any) => `- ${m.content} (similarity: ${m.similarity})`).join('\n') || 'No specific memories found'}\n\nRespond naturally and authentically based on this personality and these memories. Be conversational, empathetic, and true to the personality traits you've been trained on.`;

    const chatResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: message },
        ],
        temperature: 0.8,
        max_tokens: 500,
      }),
    });

    if (!chatResponse.ok) {
      throw new Error('Failed to generate AI response');
    }

    const chatData = await chatResponse.json();
    const aiResponse = chatData?.choices?.[0]?.message?.content;

    if (!aiResponse) {
      console.error('OpenAI returned no content:', JSON.stringify(chatData));
      return new Response(
        JSON.stringify({ error: 'AI returned no response content' }),
        {
          status: 502,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    return new Response(
      JSON.stringify({
        response: aiResponse,
        relevantMemories: relevantMemories?.length || 0,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error in engram chat:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
