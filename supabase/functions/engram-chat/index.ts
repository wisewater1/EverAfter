import { createClient } from 'npm:@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface ChatRequest {
  engramId: string;
  message: string;
  conversationId: string;
}

Deno.serve(async (req: Request) => {
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

    const systemPrompt = `You are ${engramData?.name || 'an AI engram'}, an autonomous AI personality created from training data. Your personality is based on the following traits: ${JSON.stringify(engramData?.personality_traits || {})}.\n\nRelevant memories and training data:\n${relevantMemories?.map((m: any) => `- ${m.content} (similarity: ${m.similarity})`).join('\n') || 'No specific memories found'}\n\nRespond naturally and authentically based on this personality and these memories. Be conversational, empathetic, and true to the personality traits you've been trained on.`;

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
    const aiResponse = chatData.choices[0].message.content;

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
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
