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

    const { user_id } = await req.json();

    if (!user_id) {
      return new Response(
        JSON.stringify({ error: 'user_id required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: items, error: itemsError } = await supabase
      .from('vault_items')
      .select('id, payload, updated_at')
      .eq('user_id', user_id);

    if (itemsError) throw itemsError;

    const results = [];
    let passed = 0;
    let failed = 0;

    for (const item of items || []) {
      const contentString = JSON.stringify(item.payload);
      const encoder = new TextEncoder();
      const data = encoder.encode(contentString);
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const currentHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

      const { data: lastAudit } = await supabase
        .from('vault_audit_logs')
        .select('sha256')
        .eq('vault_item_id', item.id)
        .not('sha256', 'is', null)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      const status = !lastAudit || lastAudit.sha256 === currentHash ? 'PASS' : 'FAIL';

      results.push({
        item_id: item.id,
        status,
        current_hash: currentHash.slice(0, 16),
        previous_hash: lastAudit?.sha256?.slice(0, 16) || 'N/A',
      });

      if (status === 'PASS') {
        passed++;
      } else {
        failed++;
      }

      await supabase.from('vault_audit_logs').insert({
        user_id: user_id,
        vault_item_id: item.id,
        action: 'INTEGRITY_CHECK',
        details: { status, current_hash: currentHash },
        sha256: currentHash,
      });
    }

    const summary = {
      total: items?.length || 0,
      passed,
      failed,
      status: failed === 0 ? 'PASS' : 'FAIL',
      checked_at: new Date().toISOString(),
    };

    return new Response(
      JSON.stringify({
        success: true,
        summary,
        results,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Integrity check error:', error);

    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
