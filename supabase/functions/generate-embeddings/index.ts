import { createClient } from 'npm:@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface EmbeddingRequest {
  text: string;
  engramId?: string;
  familyMemberId?: string;
  metadata?: Record<string, any>;
  type: 'engram_memory' | 'family_member' | 'conversation';
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

    const { text, engramId, familyMemberId, metadata = {}, type }: EmbeddingRequest = await req.json();

    if (!text || !type) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: text, type' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiApiKey) {
      console.warn('OpenAI API key not configured, using mock embeddings');
      const mockEmbedding = Array(1536).fill(0).map(() => Math.random() * 0.1);
      
      let insertResult;
      if (type === 'engram_memory' && engramId) {
        insertResult = await supabase
          .from('engram_memory_embeddings')
          .insert({
            engram_id: engramId,
            content: text,
            embedding: mockEmbedding,
            metadata,
          })
          .select()
          .single();
      } else if (type === 'family_member' && familyMemberId) {
        insertResult = await supabase
          .from('family_member_embeddings')
          .insert({
            family_member_id: familyMemberId,
            content: text,
            embedding: mockEmbedding,
            metadata,
          })
          .select()
          .single();
      }

      return new Response(
        JSON.stringify({
          success: true,
          embedding: mockEmbedding,
          id: insertResult?.data?.id,
          mock: true,
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
        input: text,
        dimensions: 1536,
      }),
    });

    if (!embeddingResponse.ok) {
      const error = await embeddingResponse.text();
      throw new Error(`OpenAI API error: ${error}`);
    }

    const embeddingData = await embeddingResponse.json();
    const embedding = embeddingData.data[0].embedding;

    let insertResult;
    if (type === 'engram_memory' && engramId) {
      insertResult = await supabase
        .from('engram_memory_embeddings')
        .insert({
          engram_id: engramId,
          content: text,
          embedding,
          metadata,
        })
        .select()
        .single();
    } else if (type === 'family_member' && familyMemberId) {
      insertResult = await supabase
        .from('family_member_embeddings')
        .insert({
          family_member_id: familyMemberId,
          content: text,
          embedding,
          metadata,
        })
        .select()
        .single();
    }

    if (insertResult?.error) {
      throw insertResult.error;
    }

    return new Response(
      JSON.stringify({
        success: true,
        id: insertResult?.data?.id,
        embedding,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error generating embedding:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
