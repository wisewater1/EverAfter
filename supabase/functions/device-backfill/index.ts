import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { user_id, provider, days = 7 } = await req.json();

    if (!user_id || !provider) {
      return new Response(
        JSON.stringify({ error: 'user_id and provider required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const now = new Date();
    const windowStart = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

    const { data: job, error: jobError } = await supabase
      .from('sync_jobs')
      .insert({
        user_id,
        provider,
        job_type: 'backfill',
        window_start: windowStart.toISOString(),
        window_end: now.toISOString(),
        status: 'pending',
      })
      .select()
      .single();

    if (jobError) {
      throw jobError;
    }

    return new Response(
      JSON.stringify({
        success: true,
        job_id: job.id,
        message: `Backfill job queued for ${days} days of ${provider} data`
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Backfill error:', error);

    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
