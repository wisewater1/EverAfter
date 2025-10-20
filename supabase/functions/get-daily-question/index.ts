import { createClient } from 'npm:@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

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

    const { data: questionData, error: questionError } = await supabase
      .rpc('get_daily_question_for_user', { target_user_id: user.id });

    if (questionError) {
      console.error('Error getting daily question:', questionError);
      throw questionError;
    }

    const question = questionData?.[0];

    if (!question) {
      return new Response(
        JSON.stringify({ error: 'No questions available' }),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const { data: progressData } = await supabase
      .from('user_daily_progress')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    return new Response(
      JSON.stringify({
        question: {
          id: question.question_id,
          text: question.question_text,
          category: question.category,
        },
        progress: {
          currentDay: question.day_number,
          totalResponses: progressData?.total_responses || 0,
          streakDays: progressData?.streak_days || 0,
          alreadyAnswered: question.already_answered,
        },
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error in get-daily-question:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
