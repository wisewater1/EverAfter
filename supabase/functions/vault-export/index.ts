import {
  corsHeaders,
  corsPreflight,
  jsonResponse,
  errorResponse,
  serviceClient,
  requireUser,
  AuthError,
} from '../_shared/http.ts';

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return corsPreflight(req);
  }

  try {
    // Authenticate the caller and derive user_id from the verified JWT.
    // The request body's user_id (if any) is ignored — trusting it while
    // holding the service-role key was a direct IDOR.
    const user = await requireUser(req);
    const userId = user.id;

    const { item_id, format = 'pdf' } = await req.json();

    if (!item_id) {
      return errorResponse(req, 'item_id required', 400);
    }

    // Service-role client is safe here only because every query below is
    // explicitly scoped to the authenticated userId.
    const supabase = serviceClient();

    const { data: item, error: itemError } = await supabase
      .from('vault_items')
      .select('*')
      .eq('id', item_id)
      .eq('user_id', userId)
      .single();

    if (itemError || !item) {
      return errorResponse(req, 'Item not found', 404);
    }

    const { data: consent } = await supabase
      .from('vault_consents')
      .select('*')
      .eq('user_id', userId)
      .eq('purpose', 'export')
      .is('revoked_at', null)
      .maybeSingle();

    if (!consent) {
      return errorResponse(req, 'Export consent required', 403);
    }

    const snapshotId = crypto.randomUUID();
    const contentString = JSON.stringify(item);
    const encoder = new TextEncoder();
    const data = encoder.encode(contentString);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const sha256 = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');

    const watermark = {
      snapshot_id: snapshotId,
      consent_id: consent.id,
      timestamp: new Date().toISOString(),
      sha256: sha256.slice(0, 16),
      format,
    };

    const exportData = {
      ...item,
      watermark,
      exported_at: new Date().toISOString(),
    };

    await supabase.from('vault_receipts').insert({
      vault_item_id: item_id,
      user_id: userId,
      receipt_type: 'EXPORT',
      snapshot_id: snapshotId,
      consent_id: consent.id,
      sha256,
      watermark_data: watermark,
    });

    await supabase.from('vault_audit_logs').insert({
      user_id: userId,
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
      JSON.stringify({ success: true, data: exportData, watermark }),
      { headers: { ...corsHeaders(req), 'Content-Type': 'application/json' } },
    );
  } catch (error) {
    if (error instanceof AuthError) {
      return errorResponse(req, error.message, error.status);
    }
    console.error('Export error:', error);
    return errorResponse(req, (error as Error).message ?? 'Internal error', 500);
  }
});
