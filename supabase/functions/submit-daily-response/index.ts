import { createClient } from 'npm:@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface DailyResponseRequest {
  questionId?: string;
  questionText: string;
  responseText: string;
  mood?: string;
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

    const { questionId, questionText, responseText, mood }: DailyResponseRequest = await req.json();

    if (!questionText || !responseText) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: questionText, responseText' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const { data: progressData, error: progressError } = await supabase
      .rpc('get_or_create_user_progress', { target_user_id: user.id });

    if (progressError) {
      console.error('Error getting user progress:', progressError);
      throw progressError;
    }

    const currentDay = progressData?.current_day || 1;

    const { data: existingResponse } = await supabase
      .from('daily_question_responses')
      .select('id')
      .eq('user_id', user.id)
      .eq('day_number', currentDay)
      .gte('created_at', new Date(new Date().setHours(0, 0, 0, 0)).toISOString())
      .maybeSingle();

    if (existingResponse) {
      return new Response(
        JSON.stringify({
          error: 'You have already answered today\'s question',
          existingResponseId: existingResponse.id,
        }),
        {
          status: 409,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const { data: responseData, error: responseError } = await supabase
      .from('daily_question_responses')
      .insert({
        user_id: user.id,
        question_id: questionId || null,
        question_text: questionText,
        response_text: responseText,
        day_number: currentDay,
        mood: mood || null,
        embedding_generated: false,
      })
      .select()
      .single();

    if (responseError) {
      console.error('Error creating response:', responseError);
      throw responseError;
    }

    const { data: memoryData, error: memoryError } = await supabase
      .from('memories')
      .insert({
        user_id: user.id,
        question_id: questionId || null,
        question_text: questionText,
        response_text: responseText,
        category: 'daily',
        time_of_day: (() => {
          const hour = new Date().getHours();
          if (hour < 12) return 'morning';
          if (hour < 17) return 'afternoon';
          if (hour < 21) return 'evening';
          return 'night';
        })(),
        mood: mood || null,
        is_draft: false,
      })
      .select()
      .single();

    if (memoryError) {
      console.error('Error creating memory:', memoryError);
    }

    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    if (openaiApiKey) {
      try {
        const embeddingText = `Question: ${questionText}\nAnswer: ${responseText}`;
        
        const embeddingResponse = await fetch('https://api.openai.com/v1/embeddings', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${openaiApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'text-embedding-3-small',
            input: embeddingText,
            dimensions: 1536,
          }),
        });

        if (embeddingResponse.ok) {
          const embeddingData = await embeddingResponse.json();
          const embedding = embeddingData.data[0].embedding;

          await supabase
            .from('daily_question_embeddings')
            .insert({
              response_id: responseData.id,
              user_id: user.id,
              content: embeddingText,
              embedding,
              metadata: {
                day_number: currentDay,
                mood: mood || null,
                category: 'daily',
              },
            });

          await supabase
            .from('daily_question_responses')
            .update({ embedding_generated: true })
            .eq('id', responseData.id);
        }
      } catch (error) {
        console.error('Error generating embedding:', error);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        response: responseData,
        dayNumber: currentDay,
        message: 'Daily response submitted successfully',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error in submit-daily-response:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
