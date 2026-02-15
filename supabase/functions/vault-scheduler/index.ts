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

    const now = new Date().toISOString();
    let processed = 0;

    const { data: items, error } = await supabase
      .from('vault_items')
      .select('*')
      .eq('status', 'SCHEDULED')
      .lte('unlock_at', now);

    if (error) throw error;

    for (const item of items || []) {
      if (item.type === 'MESSAGE') {
        const { error: updateError } = await supabase
          .from('vault_items')
          .update({
            status: 'SENT',
            delivered_at: now,
          })
          .eq('id', item.id);

        if (updateError) {
          console.error(`Error updating message ${item.id}:`, updateError);
          continue;
        }

        await supabase.from('vault_audit_logs').insert({
          user_id: item.user_id,
          vault_item_id: item.id,
          action: 'DELIVERED',
          details: { delivered_at: now },
        });

        processed++;
      } else if (item.type === 'CAPSULE' || item.type === 'WILL' || item.type === 'MEMORIAL') {
        const nextStatus = item.type === 'MEMORIAL' ? 'PUBLISHED' : 'LOCKED';
        const { error: updateError } = await supabase
          .from('vault_items')
          .update({
            status: nextStatus,
            locked_at: now,
          })
          .eq('id', item.id);

        if (updateError) {
          console.error(`Error unlocking ${item.type} ${item.id}:`, updateError);
          continue;
        }

        await supabase.from('vault_audit_logs').insert({
          user_id: item.user_id,
          vault_item_id: item.id,
          action: item.type === 'MEMORIAL' ? 'PUBLISHED' : 'UNLOCKED',
          details: { status: nextStatus, processed_at: now },
        });

        processed++;
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        processed,
        message: `Processed ${processed} scheduled items`,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Scheduler error:', error);

    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
