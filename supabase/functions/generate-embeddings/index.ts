import { createClient } from 'npm:@supabase/supabase-js@2.57.4';
import { resolveApiKey } from '../_shared/user-api-keys.ts';

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

    // Refuse requests we cannot persist instead of returning a fake success.
    // ('conversation' has no storage table; the other types need a target id.)
    const persistable =
      (type === 'engram_memory' && engramId) ||
      (type === 'family_member' && familyMemberId);
    if (!persistable) {
      return new Response(
        JSON.stringify({
          code: 'INVALID_TARGET',
          message:
            type === 'conversation'
              ? 'Conversation embeddings are not supported: there is no storage table for them, so nothing would be saved.'
              : `Missing ${type === 'engram_memory' ? 'engramId' : 'familyMemberId'} — the embedding would have nowhere to be stored.`,
          hint: 'Send type "engram_memory" with engramId, or "family_member" with familyMemberId.',
        }),
        {
          status: type === 'conversation' ? 501 : 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const { apiKey: openaiApiKey } = await resolveApiKey(supabase, user.id, 'openai', 'OPENAI_API_KEY');
    if (!openaiApiKey) {
      // Fail loudly: random vectors are not embeddings. Persisting them would
      // silently poison similarity search for this engram/family member.
      console.error('generate-embeddings: OPENAI_API_KEY not configured — refusing to store fabricated vectors');
      return new Response(
        JSON.stringify({
          code: 'CONFIG_MISSING',
          message: 'Embedding service is not configured, so this memory was not indexed.',
          hint: 'Set OPENAI_API_KEY in Supabase Edge Function secrets (or add a user OpenAI key), then retry.',
        }),
        {
          status: 503,
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
