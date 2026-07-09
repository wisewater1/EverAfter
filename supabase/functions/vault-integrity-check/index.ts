import {
  jsonResponse,
  errorResponse,
  corsPreflight,
  serviceClient,
  requireUser,
  AuthError,
} from '../_shared/http.ts';

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return corsPreflight(req);
  }

  try {
    // Authenticate and derive user_id from the JWT — never from the body.
    const user = await requireUser(req);
    const userId = user.id;

    // Service-role client is safe here only because the query is scoped to
    // the authenticated userId.
    const supabase = serviceClient();

    const { data: items, error: itemsError } = await supabase
      .from('vault_items')
      .select('id, payload, updated_at')
      .eq('user_id', userId);

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
      const currentHash = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');

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
        user_id: userId,
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

    return jsonResponse(req, { success: true, summary, results });
  } catch (error) {
    if (error instanceof AuthError) {
      return errorResponse(req, error.message, error.status);
    }
    console.error('Integrity check error:', error);
    return errorResponse(req, (error as Error).message ?? 'Internal error', 500);
  }
});
