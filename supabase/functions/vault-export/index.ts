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

    const { item_id, format = 'pdf', user_id } = await req.json();

    if (!item_id || !user_id) {
      return new Response(
        JSON.stringify({ error: 'item_id and user_id required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: item, error: itemError } = await supabase
      .from('vault_items')
      .select('*')
      .eq('id', item_id)
      .eq('user_id', user_id)
      .single();

    if (itemError || !item) {
      return new Response(
        JSON.stringify({ error: 'Item not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: consent } = await supabase
      .from('vault_consents')
      .select('*')
      .eq('user_id', user_id)
      .eq('purpose', 'export')
      .is('revoked_at', null)
      .maybeSingle();

    if (!consent) {
      return new Response(
        JSON.stringify({ error: 'Export consent required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const snapshotId = crypto.randomUUID();
    const contentString = JSON.stringify(item);
    const encoder = new TextEncoder();
    const data = encoder.encode(contentString);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const sha256 = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

    const watermark = {
      snapshot_id: snapshotId,
      consent_id: consent.id,
      timestamp: new Date().toISOString(),
      sha256: sha256.slice(0, 16),
    };

    const exportData = {
      ...item,
      watermark,
      exported_at: new Date().toISOString(),
    };

    await supabase.from('vault_receipts').insert({
      vault_item_id: item_id,
      user_id: user_id,
      receipt_type: 'EXPORT',
      snapshot_id: snapshotId,
      consent_id: consent.id,
      sha256,
      watermark_data: watermark,
    });

    await supabase.from('vault_audit_logs').insert({
      user_id: user_id,
      vault_item_id: item_id,
      action: 'EXPORTED',
      snapshot_id: snapshotId,
      consent_id: consent.id,
      sha256,
    });

    if (consent.interaction_cap) {
      await supabase
        .from('vault_consents')
        .update({
          interaction_count: (consent.interaction_count || 0) + 1,
        })
        .eq('id', consent.id);
    }

    return new Response(
      JSON.stringify({
        success: true,
        data: exportData,
        watermark,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Export error:', error);

    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
